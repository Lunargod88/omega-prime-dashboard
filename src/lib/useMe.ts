"use client";

import { useEffect, useState } from "react";

export type Me = {
  user_id?: string;
  role?: string;
  allowedSymbols?: string[];
  kill_switch?: boolean;
};

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/core/me", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d) setMe(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { me, loading };
}
