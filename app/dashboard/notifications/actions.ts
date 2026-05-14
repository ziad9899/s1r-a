"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertCallerCanManageContent } from "@/lib/admin-gate";

type SendResult =
  | { ok: true; sent: number; removedInvalid: number }
  | { ok: false; error: string };

type Segment =
  | { kind: "all" }
  | { kind: "selected"; user_ids: string[] }
  | { kind: "test"; user_id: string }
  | { kind: "new_30d" }
  | { kind: "never_booked" }
  | { kind: "vip_3plus" };

type Payload = {
  segment: Segment;
  title: string;
  body: string;
  target_route?: string;
};

async function resolveUserIds(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  segment: Segment,
): Promise<{ ids: string[]; segmentKey: string }> {
  if (segment.kind === "selected") {
    return { ids: segment.user_ids, segmentKey: "selected" };
  }
  if (segment.kind === "test") {
    return { ids: [segment.user_id], segmentKey: "test" };
  }
  if (segment.kind === "all") {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "customer");
    return { ids: (data ?? []).map((r) => r.id as string), segmentKey: "all" };
  }
  if (segment.kind === "new_30d") {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "customer")
      .gte("created_at", since.toISOString());
    return {
      ids: (data ?? []).map((r) => r.id as string),
      segmentKey: "new_30d",
    };
  }
  if (segment.kind === "never_booked") {
    const { data: customers } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "customer");
    const { data: bookings } = await supabase
      .from("bookings")
      .select("user_id");
    const booked = new Set(
      (bookings ?? []).map((b) => b.user_id as string),
    );
    const ids = (customers ?? [])
      .map((r) => r.id as string)
      .filter((id) => !booked.has(id));
    return { ids, segmentKey: "never_booked" };
  }
  if (segment.kind === "vip_3plus") {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("user_id");
    const counts = new Map<string, number>();
    for (const b of bookings ?? []) {
      const uid = b.user_id as string;
      counts.set(uid, (counts.get(uid) ?? 0) + 1);
    }
    const ids = Array.from(counts.entries())
      .filter(([, n]) => n >= 3)
      .map(([id]) => id);
    return { ids, segmentKey: "vip_3plus" };
  }
  return { ids: [], segmentKey: "none" };
}

export async function sendPushNotification(
  payload: Payload,
): Promise<SendResult> {
  const gate = await assertCallerCanManageContent();
  if (!gate.ok) return { ok: false, error: gate.error };

  if (!payload.title.trim() || !payload.body.trim()) {
    return { ok: false, error: "العنوان والنص مطلوبان." };
  }

  const supabase = await createSupabaseServerClient();
  const { ids, segmentKey } = await resolveUserIds(supabase, payload.segment);
  if (!ids.length) return { ok: false, error: "لا يوجد مستلمون." };

  const { data, error } = await supabase.functions.invoke<{
    sent: number;
    removed_invalid?: number;
    error?: string;
  }>("send-push", {
    body: {
      user_ids: ids,
      title: payload.title.trim(),
      body: payload.body.trim(),
      data: payload.target_route ? { route: payload.target_route } : undefined,
      log: {
        mode: payload.segment.kind === "selected"
          ? "selected"
          : payload.segment.kind === "test"
            ? "test"
            : payload.segment.kind === "all"
              ? "all"
              : "segment",
        segment_key: segmentKey,
        target_route: payload.target_route,
        sent_by: gate.callerId,
        recipients_count: ids.length,
      },
    },
  });

  if (error) return { ok: false, error: error.message };
  if (data?.error) return { ok: false, error: data.error };

  return {
    ok: true,
    sent: data?.sent ?? 0,
    removedInvalid: data?.removed_invalid ?? 0,
  };
}

// Schedule a notification for later. The Edge Function
// `process-scheduled-notifications` picks pending rows that are due.
export async function scheduleNotification(
  payload: Payload & { send_at: string },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const gate = await assertCallerCanManageContent();
  if (!gate.ok) return { ok: false, error: gate.error };

  if (!payload.title.trim() || !payload.body.trim() || !payload.send_at) {
    return { ok: false, error: "العنوان والنص والوقت مطلوبان." };
  }

  const sendAt = new Date(payload.send_at);
  if (sendAt.getTime() <= Date.now() + 60_000) {
    return { ok: false, error: "اختر وقتاً بعد دقيقة على الأقل." };
  }

  const supabase = await createSupabaseServerClient();
  const { ids } = await resolveUserIds(supabase, payload.segment);
  if (!ids.length) return { ok: false, error: "لا يوجد مستلمون." };

  const { data, error } = await supabase
    .from("scheduled_notifications")
    .insert({
      title: payload.title.trim(),
      body: payload.body.trim(),
      target_route: payload.target_route ?? null,
      user_ids: ids,
      send_at: sendAt.toISOString(),
      created_by: gate.callerId,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id as string };
}

export async function cancelScheduledNotification(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await assertCallerCanManageContent();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("scheduled_notifications")
    .update({ status: "cancelled", processed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
