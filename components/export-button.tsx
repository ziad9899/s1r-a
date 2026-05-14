"use client";

import { useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Result =
  | { ok: true; filename: string; content: string }
  | { ok: false; error: string };

export function ExportButton({
  action,
  label = "تصدير CSV",
}: {
  action: () => Promise<Result>;
  label?: string;
}) {
  const [pending, start] = useTransition();

  function onClick() {
    start(async () => {
      const res = await action();
      if (!res.ok) {
        toast.error(`تعذّر التصدير: ${res.error}`);
        return;
      }
      const blob = new Blob([res.content], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("تمّ التحميل");
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      {label}
    </Button>
  );
}
