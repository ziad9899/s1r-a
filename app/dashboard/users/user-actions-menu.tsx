"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MoreHorizontalIcon,
  ShieldOffIcon,
  ShieldXIcon,
  Trash2Icon,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { banUser, unbanUser, deleteUser } from "./actions";
import type { BanPreset } from "./ban-durations";

type Props = {
  userId: string;
  phone: string;
  fullName: string;
  isBanned: boolean;
  isSelf: boolean;
};

const BAN_OPTIONS: { preset: BanPreset; label: string }[] = [
  { preset: "24h", label: "حظر 24 ساعة" },
  { preset: "7d", label: "حظر 7 أيام" },
  { preset: "permanent", label: "حظر دائم" },
];

export function UserActionsMenu({
  userId,
  phone,
  fullName,
  isBanned,
  isSelf,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [phoneConfirm, setPhoneConfirm] = useState("");

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(success);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleBan(preset: BanPreset) {
    run(() => banUser(userId, preset), "تم تطبيق الحظر");
  }

  function handleUnban() {
    run(() => unbanUser(userId), "تم رفع الحظر");
  }

  function handleDeleteSubmit() {
    if (phoneConfirm.trim() !== phone.trim()) {
      toast.error("رقم التأكيد لا يطابق الجوال.");
      return;
    }
    startTransition(async () => {
      const result = await deleteUser(userId, phoneConfirm);
      if (result.ok) {
        toast.success(`تم حذف ${fullName}`);
        setDeleteOpen(false);
        setPhoneConfirm("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (isSelf) {
    return (
      <span className="text-xs text-muted-foreground">حسابك الحالي</span>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MoreHorizontalIcon className="size-4" />
              )}
              <span className="sr-only">إجراءات</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {isBanned ? (
            <DropdownMenuItem onClick={handleUnban}>
              <ShieldOffIcon />
              رفع الحظر
            </DropdownMenuItem>
          ) : (
            BAN_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.preset}
                onClick={() => handleBan(opt.preset)}
              >
                <ShieldXIcon />
                {opt.label}
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2Icon />
            حذف نهائي
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف {fullName} نهائياً</DialogTitle>
            <DialogDescription>
              سيُحذف الحساب وكل بياناته (الملف الشخصي، الحجوزات). هذه عملية
              لا يمكن التراجع عنها. اكتب رقم الجوال للتأكيد:
              <span dir="ltr" className="block font-mono text-foreground mt-1">
                {phone}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="phone-confirm">رقم الجوال</Label>
            <Input
              id="phone-confirm"
              dir="ltr"
              autoComplete="off"
              value={phoneConfirm}
              onChange={(e) => setPhoneConfirm(e.target.value)}
              placeholder={phone}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              إلغاء
            </DialogClose>
            <Button
              variant="destructive"
              disabled={pending || phoneConfirm.trim() !== phone.trim()}
              onClick={handleDeleteSubmit}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2Icon className="size-4" />
              )}
              حذف الحساب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
