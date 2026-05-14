"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MoreHorizontalIcon,
  ShieldCheckIcon,
  UserMinusIcon,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ADMIN_TIER_LABELS_AR,
  type AdminTier,
} from "@/lib/admin-roles";
import { changeAdminRole, revokeAdmin } from "./actions";

type Props = {
  userId: string;
  fullName: string;
  currentRole: AdminTier;
  isSelf: boolean;
};

const ASSIGNABLE: AdminTier[] = ["super_admin", "admin", "manager", "staff"];

export function AdminActionsMenu({
  userId,
  fullName,
  currentRole,
  isSelf,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    success: string,
  ) {
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

  function handlePromote(role: AdminTier) {
    if (role === currentRole) return;
    run(() => changeAdminRole(userId, role), `تم تغيير دور ${fullName} إلى ${ADMIN_TIER_LABELS_AR[role]}`);
  }

  function handleRevoke() {
    if (!confirm(`هل أنت متأكد من إزالة صلاحيات ${fullName}؟ سيُعاد إلى دور عميل عادي.`)) return;
    run(() => revokeAdmin(userId), `أُزيلت صلاحيات ${fullName}`);
  }

  return (
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
        {ASSIGNABLE.filter((r) => r !== currentRole).map((role) => (
          <DropdownMenuItem
            key={role}
            onClick={() => handlePromote(role)}
            disabled={isSelf && role !== "super_admin"}
          >
            <ShieldCheckIcon />
            تعيين كـ {ADMIN_TIER_LABELS_AR[role]}
          </DropdownMenuItem>
        ))}
        {!isSelf && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleRevoke}>
              <UserMinusIcon />
              إزالة الصلاحيات
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
