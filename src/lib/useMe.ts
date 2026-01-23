"use client";

import { useEffect, useState } from "react";

export type Me = {
  user_id?: string;
  role?: "ADMIN" | "CONFIRM" | "READ" | string;
  market_mode?: string;
  kill_switch?: boolean;

  // optional: keep compatibility if UI shows these
  allowedSymbols?: string[];
};

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/core/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setMe(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { me, loading };
}
