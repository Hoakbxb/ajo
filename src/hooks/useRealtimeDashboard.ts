"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/client";

/**
 * Subscribes to Supabase Realtime for member + contribution changes,
 * then calls `onUpdate` so the dashboard can refetch fresh API data.
 */
export function useRealtimeDashboard(
  memberId: string,
  onUpdate: () => void
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!memberId) return;

    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`dashboard:${memberId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "members",
          filter: `id=eq.${memberId}`,
        },
        () => onUpdateRef.current()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contributions",
          filter: `from_member_id=eq.${memberId}`,
        },
        () => onUpdateRef.current()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contributions",
          filter: `to_member_id=eq.${memberId}`,
        },
        () => onUpdateRef.current()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [memberId]);
}
