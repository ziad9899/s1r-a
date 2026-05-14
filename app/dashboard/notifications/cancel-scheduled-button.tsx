"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cancelScheduledNotification } from "./actions";

export function CancelScheduledButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onClick() {
    if (!confirm("إلغاء هذا الإشعار المجدول؟")) return;
    start(async () => {
      const res = await cancelScheduledNotification(id);
      if (!res.ok) {
        toast.error(`تعذّر الإلغاء: ${res.error}`);
        return;
      }
      toast.success("تم الإلغاء");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <X className="size-3.5" />
      )}
      إلغاء
    </Button>
  );
}
