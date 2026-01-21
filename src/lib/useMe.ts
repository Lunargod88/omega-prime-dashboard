"use client";

import { useEffect, useState } from "react";
import { coreGet } from "./core";

type Me = { user_id: string; role: "ADMIN" | "CONFIRM" | "READ" };

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    coreGet<Me>("/me")
      .then(setMe)
      .catch((e) => setErr(String(e?.message || e)));
  }, []);

  return { me, err, isAdmin: me?.role === "ADMIN" };
}
