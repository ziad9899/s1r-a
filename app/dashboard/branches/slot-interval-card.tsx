"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Options for the spacing between booking time slots. Applies to every branch.
const OPTIONS = [
  { value: "15", label: "كل 15 دقيقة" },
  { value: "30", label: "كل 30 دقيقة" },
  { value: "45", label: "كل 45 دقيقة" },
  { value: "60", label: "كل ساعة" },
  { value: "90", label: "كل ساعة ونصف" },
  { value: "120", label: "كل ساعتين" },
];

export function SlotIntervalCard({ initial }: { initial: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Fall back to 60 when the stored value isn't one of the presets.
  const [value, setValue] = useState(
    OPTIONS.some((o) => o.value === initial) ? initial : "60",
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "booking_slot_minutes", value });
      if (error) {
        toast.error(`تعذّر الحفظ: ${error.message}`);
        return;
      }
      toast.success("تمّ الحفظ");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>مدة الفاصل بين المواعيد</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="slot-interval">الفاصل الزمني بين كل موعد وآخر</Label>
            <select
              id="slot-interval"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              يطبَّق على كل الفروع. المواعيد تُولَّد من وقت الفتح إلى وقت الإغلاق
              بهذا الفاصل — ويحترم الدقائق (مثال: فتح 2:30 يظهر 2:30).
            </p>
          </div>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            حفظ
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
