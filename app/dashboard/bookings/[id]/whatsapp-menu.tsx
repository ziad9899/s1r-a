"use client";

import { MessageCircle, ChevronDown } from "lucide-react";

import {
  buildWhatsAppMessage,
  defaultTemplateForStatus,
  templatesForStatus,
  TEMPLATE_LABELS,
  whatsAppUrl,
  type WhatsAppTemplate,
} from "@/lib/whatsapp";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BookingRow, CustomerProfile } from "@/lib/bookings";

// Split button: primary fires the template that matches the booking's
// current status (one click for the common case); the chevron opens a
// menu of all templates allowed for that status.
export function WhatsAppMenu({
  booking,
  customer,
}: {
  booking: BookingRow;
  customer: CustomerProfile | null;
}) {
  if (!customer?.phone) return null;

  const defaultTpl = defaultTemplateForStatus(booking.status);
  const templates = templatesForStatus(booking.status);

  function open(tpl: WhatsAppTemplate) {
    const msg = buildWhatsAppMessage(tpl, booking, customer);
    const url = whatsAppUrl(customer!.phone, msg);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-md border border-emerald-300 bg-emerald-50 text-emerald-900">
      <button
        type="button"
        onClick={() => open(defaultTpl)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs hover:bg-emerald-100"
      >
        <MessageCircle className="size-3.5" />
        واتساب: {TEMPLATE_LABELS[defaultTpl]}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="قوالب أخرى"
              className="border-s border-emerald-300 px-1.5 hover:bg-emerald-100"
            >
              <ChevronDown className="size-3.5" />
            </button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-arabic">
            القوالب المتاحة
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {templates.map((tpl) => (
            <DropdownMenuItem key={tpl} onClick={() => open(tpl)}>
              <MessageCircle className="size-4 text-emerald-600" />
              {TEMPLATE_LABELS[tpl]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
