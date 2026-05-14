"use client";

// Approximation of how the push looks on the lock screen of an iPhone +
// the heads-up banner on Android. Pure CSS, no external assets.
export function NotificationPreview({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const previewTitle = title || "عنوان الإشعار";
  const previewBody = body || "نص الإشعار يظهر هنا تحت العنوان.";
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">معاينة iOS</p>
        <div className="rounded-2xl bg-zinc-100 p-3 shadow-sm">
          <div className="flex items-start gap-3 rounded-xl bg-white/90 p-3 backdrop-blur">
            <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-white text-xs font-bold">
              S1R
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[13px] font-semibold leading-tight">
                  {previewTitle}
                </p>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  الآن
                </span>
              </div>
              <p className="line-clamp-2 text-[12px] leading-snug text-zinc-700">
                {previewBody}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">
          معاينة Android
        </p>
        <div className="rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <div className="size-3 rounded-sm bg-primary" />
            <span>S1R</span>
            <span>·</span>
            <span>الآن</span>
          </div>
          <p className="mt-1 text-[13px] font-semibold leading-tight">
            {previewTitle}
          </p>
          <p className="text-[12px] leading-snug text-zinc-700">
            {previewBody}
          </p>
        </div>
      </div>
    </div>
  );
}
