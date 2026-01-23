"use client";

import { useEffect, useState } from "react";

export type Me = {
  // Core truth (from Omega-Prime-Core /me)
  user_id?: string;
  role?: "ADMIN" | "CONFIRM" | "READ" | string;
  market_mode?: string;
  kill_switch?: boolean;

  // UI compatibility fields (so the dashboard NEVER breaks builds)
  allowedSymbols?: string[];
  label?: string;
  name?: string;
  mode?: string;
  sync?: string;
};

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/core/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text().catch(() => "me fetch failed"));
        return res.json();
      })
      .then((data: any) => {
        // Normalize to keep UI stable even if API shape evolves.
        const user_id = data?.user_id ?? data?.id ?? data?.user ?? "unknown";
        const role = data?.role ?? "READ";
        const market_mode = data?.market_mode ?? data?.mode ?? "—";
        const kill_switch = typeof data?.kill_switch === "boolean" ? data.kill_switch : false;

        setMe({
          ...data,
          user_id,
          role,
          market_mode,
          kill_switch,

          // UI “aliases” so OmegaDashboardClient can safely read these:
          name: data?.name ?? user_id,
          label: data?.label ?? user_id,
          mode: data?.mode ?? market_mode,
          sync: data?.sync ?? "LIVE",
        });

        setLoading(false);
      })
      .catch((e: any) => {
        setError(e?.message || "useMe failed");
        setLoading(false);
      });
  }, []);

  return { me, loading, error };
}
