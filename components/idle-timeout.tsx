"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// Auto-sign-out after a stretch of zero user input. The clock resets on
// keyboard / mouse / scroll / touch events; if the tab loses focus and
// returns after the threshold, we sign out on return too. Mounted once
// from the dashboard layout — never from a customer-facing page.

type Props = {
  /** Idle time before logout, in minutes. */
  timeoutMinutes?: number;
  /** Seconds before logout to flash a warning toast. */
  warnSeconds?: number;
};

export function IdleTimeout({
  timeoutMinutes = 15,
  warnSeconds = 30,
}: Props) {
  const router = useRouter();
  const lastActivity = useRef<number>(Date.now());
  const warned = useRef<boolean>(false);
  const signingOut = useRef<boolean>(false);

  useEffect(() => {
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warnMs = timeoutMs - warnSeconds * 1000;

    async function doSignOut(reason: string) {
      if (signingOut.current) return;
      signingOut.current = true;
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      toast.info(reason);
      router.replace("/login?error=idle");
    }

    function bump() {
      lastActivity.current = Date.now();
      warned.current = false;
    }

    function check() {
      const idle = Date.now() - lastActivity.current;
      if (idle >= timeoutMs) {
        doSignOut("خرجنا من حسابك تلقائياً بعد فترة خمول.");
        return;
      }
      if (idle >= warnMs && !warned.current) {
        warned.current = true;
        toast.warning(
          `سيتم تسجيل خروجك خلال ${warnSeconds} ثانية. حرّك الفأرة للبقاء.`,
        );
      }
    }

    // Listen for any meaningful user input. `passive: true` keeps scroll
    // performance untouched even on long pages.
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    for (const ev of events) {
      window.addEventListener(ev, bump, { passive: true });
    }
    // If the tab was hidden past the threshold and the user comes back,
    // sign them out on return rather than silently extending the session.
    const onVis = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVis);

    const interval = setInterval(check, 10_000); // poll every 10s
    return () => {
      for (const ev of events) window.removeEventListener(ev, bump);
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(interval);
    };
  }, [router, timeoutMinutes, warnSeconds]);

  return null;
}
