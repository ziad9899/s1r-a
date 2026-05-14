"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Send, Clock, Beaker } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  sendPushNotification,
  scheduleNotification,
} from "./actions";
import { NOTIFICATION_TEMPLATES } from "./templates";
import { NotificationPreview } from "./notification-preview";

type Recipient = {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
};

type SegmentKind =
  | "all"
  | "selected"
  | "new_30d"
  | "never_booked"
  | "vip_3plus";

const SEGMENT_LABELS: Record<SegmentKind, string> = {
  all: "جميع العملاء",
  selected: "مستلمون محدّدون",
  new_30d: "عملاء جدد (آخر 30 يوم)",
  never_booked: "لم يحجزوا بعد",
  vip_3plus: "عملاء VIP (3 حجوزات فأكثر)",
};

export function NotificationsForm({
  recipients,
  currentUserId,
}: {
  recipients: Recipient[];
  currentUserId: string | null;
}) {
  const [segment, setSegment] = useState<SegmentKind>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetRoute, setTargetRoute] = useState("");
  const [sendAt, setSendAt] = useState("");
  const [pending, start] = useTransition();
  const [pendingTest, startTest] = useTransition();
  const [pendingSchedule, startSchedule] = useTransition();

  const filtered = useMemo(() => {
    if (!search) return recipients;
    return recipients.filter((r) => {
      const name = `${r.first_name} ${r.last_name ?? ""}`.trim();
      return (
        name.includes(search) ||
        r.phone.includes(search.replace(/\D/g, "") || search)
      );
    });
  }, [recipients, search]);

  function applyTemplate(key: string) {
    const t = NOTIFICATION_TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    setTitle(t.title);
    setBody(t.body);
  }

  function buildSegment() {
    if (segment === "selected") {
      return { kind: "selected" as const, user_ids: selected };
    }
    return { kind: segment } as const;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (segment === "selected" && selected.length === 0) {
      toast.error("اختر مستلم واحد على الأقل أو غيّر الفئة.");
      return;
    }
    start(async () => {
      const res = await sendPushNotification({
        segment: buildSegment(),
        title,
        body,
        target_route: targetRoute || undefined,
      });
      if (!res.ok) {
        toast.error(`تعذّر الإرسال: ${res.error}`);
        return;
      }
      toast.success(
        `أُرسل لـ ${res.sent} جهاز${res.removedInvalid ? ` (نُظّفت ${res.removedInvalid} رموز)` : ""}.`,
      );
      setTitle("");
      setBody("");
      setTargetRoute("");
      setSelected([]);
    });
  }

  function onTestSend() {
    if (!currentUserId) {
      toast.error("تعذّر التعرّف على هويتك.");
      return;
    }
    if (!title.trim() || !body.trim()) {
      toast.error("اكتب العنوان والنص أولاً.");
      return;
    }
    startTest(async () => {
      const res = await sendPushNotification({
        segment: { kind: "test", user_id: currentUserId } as never,
        title,
        body,
        target_route: targetRoute || undefined,
      });
      if (!res.ok) {
        toast.error(`تعذّر الإرسال التجريبي: ${res.error}`);
        return;
      }
      if (res.sent === 0) {
        toast.info("لم يُرسل — لا يوجد جهاز مسجّل لحسابك بعد.");
      } else {
        toast.success("أُرسلت لك الآن — تحقق من جوّالك.");
      }
    });
  }

  function onSchedule() {
    if (!sendAt) {
      toast.error("اختر وقت الإرسال أولاً.");
      return;
    }
    if (segment === "selected" && selected.length === 0) {
      toast.error("اختر مستلم واحد على الأقل أو غيّر الفئة.");
      return;
    }
    startSchedule(async () => {
      const res = await scheduleNotification({
        segment: buildSegment(),
        title,
        body,
        target_route: targetRoute || undefined,
        send_at: new Date(sendAt).toISOString(),
      });
      if (!res.ok) {
        toast.error(`تعذّر الجدولة: ${res.error}`);
        return;
      }
      toast.success("تمت الجدولة. يصل في الوقت المحدّد.");
      setTitle("");
      setBody("");
      setTargetRoute("");
      setSendAt("");
      setSelected([]);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>الرسالة</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="template">قالب جاهز (اختياري)</Label>
              <select
                id="template"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) applyTemplate(e.target.value);
                  e.target.value = "";
                }}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">— اختر قالبًا لتعبئة العنوان والنص —</option>
                {NOTIFICATION_TEMPLATES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="title">العنوان</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={50}
                required
                placeholder="تم تأكيد حجزك"
              />
              <p className="text-xs text-muted-foreground">
                {title.length} / 50
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="body">النص</Label>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={150}
                rows={3}
                required
                placeholder="موعدك يوم الأحد الساعة 10 صباحاً في فرع الرياض."
                className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {body.length} / 150 — أبقها قصيرة لتظهر كاملة على شاشة القفل.
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="target_route">رابط داخلي (اختياري)</Label>
              <Input
                id="target_route"
                dir="ltr"
                value={targetRoute}
                onChange={(e) => setTargetRoute(e.target.value)}
                placeholder="/booking/bk-1234"
              />
              <p className="text-xs text-muted-foreground">
                عند الضغط على الإشعار يفتح هذا المسار داخل التطبيق.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>المستلمون</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="segment">الفئة</Label>
              <select
                id="segment"
                value={segment}
                onChange={(e) => setSegment(e.target.value as SegmentKind)}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                {Object.entries(SEGMENT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {segment === "selected" && (
              <>
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث بالاسم أو الجوال…"
                />
                <div className="max-h-72 overflow-y-auto rounded-md border divide-y bg-background">
                  {filtered.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      لا توجد نتائج.
                    </div>
                  )}
                  {filtered.map((r) => {
                    const name =
                      `${r.first_name} ${r.last_name ?? ""}`.trim() || "—";
                    const checked = selected.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelected((s) =>
                              s.includes(r.id)
                                ? s.filter((x) => x !== r.id)
                                : [...s, r.id],
                            )
                          }
                          className="size-4"
                        />
                        <span className="flex-1 font-medium">{name}</span>
                        <span
                          dir="ltr"
                          className="text-xs text-muted-foreground font-mono"
                        >
                          {r.phone}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {selected.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selected.length} مستلم محدّد.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الجدولة (اختياري)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Label htmlFor="send_at">وقت الإرسال</Label>
            <Input
              id="send_at"
              type="datetime-local"
              value={sendAt}
              onChange={(e) => setSendAt(e.target.value)}
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">
              اتركه فارغًا للإرسال الفوري. تحتاج تشغيل cron job يستدعي
              <code className="mx-1 font-mono">process-scheduled-notifications</code>
              كل دقيقة.
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onTestSend}
            disabled={pendingTest}
          >
            {pendingTest ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Beaker className="size-4" />
            )}
            إرسال تجريبي لي
          </Button>
          {sendAt && (
            <Button
              type="button"
              variant="secondary"
              onClick={onSchedule}
              disabled={pendingSchedule}
            >
              {pendingSchedule ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Clock className="size-4" />
              )}
              جدولة
            </Button>
          )}
          <Button type="submit" disabled={pending || !!sendAt}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            إرسال الآن
          </Button>
        </div>
      </form>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>المعاينة</CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationPreview title={title} body={body} />
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
