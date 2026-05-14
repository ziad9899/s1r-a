"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  BOOKING_STATUSES,
  STATUS_LABELS,
  STATUS_TONES,
  type BookingStatus,
} from "@/lib/bookings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateBookingStatus } from "./actions";

export function StatusCell({
  bookingId,
  initial,
}: {
  bookingId: string;
  initial: BookingStatus;
}) {
  const [status, setStatus] = useState<BookingStatus>(initial);
  const [pending, startTransition] = useTransition();

  function change(next: BookingStatus) {
    if (next === status) return;
    const previous = status;
    setStatus(next);
    startTransition(async () => {
      const result = await updateBookingStatus(bookingId, next);
      if (!result.ok) {
        setStatus(previous);
        toast.error(`تعذّر التحديث: ${result.error}`);
        return;
      }
      toast.success(`الحالة: ${STATUS_LABELS[next]}`);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            disabled={pending}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors hover:opacity-80 disabled:opacity-50 ${STATUS_TONES[status]}`}
          >
            {pending && <Loader2 className="size-3 animate-spin" />}
            {STATUS_LABELS[status]}
          </button>
        }
      />
      <DropdownMenuContent align="end">
        {BOOKING_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            disabled={s === status}
            onClick={() => change(s)}
            className={s === status ? "font-bold" : ""}
          >
            {STATUS_LABELS[s]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
