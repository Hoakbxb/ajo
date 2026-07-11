"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

/** Auto-refresh admin list pages when members or contributions change. */
export function useAdminRealtime(onRefresh: () => void, enabled = true) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const debouncedRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onRefreshRef.current(), 600);
    };

    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel("admin-portal")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "members" },
        debouncedRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contributions" },
        debouncedRefresh
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_activity_log" },
        debouncedRefresh
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [enabled]);
}
