"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";

export function UsersSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The last query WE pushed to the URL — so the sync effect below only reacts
  // to external URL changes (back/forward nav) and never snaps the field back
  // to a just-committed shorter value while the user is still typing.
  const lastPushed = useRef<string>(searchParams.get("q") ?? "");

  // Keep the field in sync when the URL changes from elsewhere (e.g. back nav),
  // but skip echoes of our own debounced pushes.
  useEffect(() => {
    const urlQ = searchParams.get("q") ?? "";
    if (urlQ !== lastPushed.current) {
      lastPushed.current = urlQ;
      setValue(urlQ);
    }
  }, [searchParams]);

  function navigate(next: string) {
    const trimmed = next.trim();
    lastPushed.current = trimmed;
    startTransition(() => {
      router.push(
        trimmed ? `/dashboard/users?q=${encodeURIComponent(trimmed)}` : "/dashboard/users",
      );
    });
  }

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => navigate(next), 350);
  }

  function clear() {
    if (timer.current) clearTimeout(timer.current);
    setValue("");
    navigate("");
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ابحث بالاسم أو رقم الجوال"
        className={`pe-9 ps-9 text-right [&::-webkit-search-cancel-button]:appearance-none ${isPending ? "opacity-70" : ""}`}
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="مسح البحث"
          className="absolute end-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <X className="size-4" />
          )}
        </button>
      )}
    </div>
  );
}
