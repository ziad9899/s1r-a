"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Sparkles,
  Building2,
  Users,
  Settings,
  Image as ImageIcon,
  PanelsTopLeft,
  ListFilter,
  ShieldCheck,
  Award,
  Bell,
  BadgeCheck,
  Gift,
  Wallet,
  CreditCard,
  LifeBuoy,
  Scale,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Role = "super_admin" | "admin" | "manager" | "staff";

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  // Roles allowed to see this entry. Missing = visible to all admin tiers.
  allow?: readonly Role[];
};

const items: readonly Item[] = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/bookings", label: "الحجوزات", icon: CalendarDays },
  { href: "/dashboard/services", label: "الخدمات", icon: Sparkles },
  { href: "/dashboard/filters", label: "فلاتر الرئيسية", icon: ListFilter },
  { href: "/dashboard/banners", label: "البنرات", icon: ImageIcon },
  { href: "/dashboard/onboarding", label: "شاشات الترحيب", icon: PanelsTopLeft },
  { href: "/dashboard/trust-items", label: "لماذا S1R", icon: Award },
  { href: "/dashboard/notifications", label: "الإشعارات", icon: Bell },
  { href: "/dashboard/referral", label: "دعوة الأصدقاء", icon: Gift },
  { href: "/dashboard/branches", label: "الفروع", icon: Building2 },
  {
    href: "/dashboard/users",
    label: "المستخدمين",
    icon: Users,
    allow: ["super_admin", "admin"] as const,
  },
  {
    href: "/dashboard/warranties",
    label: "الضمانات",
    icon: BadgeCheck,
    allow: ["super_admin"] as const,
  },
  {
    href: "/dashboard/wallet",
    label: "المحفظة والكاش باك",
    icon: Wallet,
    allow: ["super_admin"] as const,
  },
  {
    href: "/dashboard/payments",
    label: "طرق الدفع",
    icon: CreditCard,
    allow: ["super_admin"] as const,
  },
  {
    href: "/dashboard/admins",
    label: "إدارة الصلاحيات",
    icon: ShieldCheck,
    allow: ["super_admin"] as const,
  },
  {
    href: "/dashboard/support",
    label: "تواصل مع الدعم",
    icon: LifeBuoy,
    allow: ["super_admin", "admin"] as const,
  },
  {
    href: "/dashboard/legal",
    label: "الصفحات النظامية",
    icon: Scale,
    allow: ["super_admin", "admin"] as const,
  },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const visible = items.filter((it) => !it.allow || it.allow.includes(role));
  return (
    <aside className="border-l bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 px-6">
        <img
          src="/icon.png"
          alt="S1R"
          className="h-8 w-8 object-contain"
        />
        <span className="font-bold text-lg">S1R Admin</span>
      </div>
      <nav className="px-3 py-2 space-y-1">
        {visible.map((it) => {
          const active = it.exact
            ? pathname === it.href
            : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <it.icon className="size-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
