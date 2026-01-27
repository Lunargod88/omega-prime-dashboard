export type Account = "JAYLYN" | "WIFE";

export type DecisionRow = {
  id: number;
  created_at: string;
  account: Account;
  symbol: string;
  timeframe?: string | null;
  stance: string;
  tier: string;
  authority: string;
  confidence?: number | null;
  regime?: string | null;

  // PHASE 3 — PRICE CONTEXT
  entry_price?: number | null;
  stop_price?: number | null;
  min_target?: number | null;
  max_target?: number | null;
  current_price?: number | null;
};

const CORE_BASE =
  process.env.NEXT_PUBLIC_CORE_BASE_URL || "";

function buildUrl(path: string) {
  return path;
}

export async function fetchDecisions(opts: {
  account?: Account;
  symbol?: string;
  limit?: number;
}): Promise<{ items: DecisionRow[] }> {
  const qs = new URLSearchParams();
  if (opts.account) qs.set("account", opts.account);
  if (opts.symbol) qs.set("symbol", opts.symbol);
  qs.set("limit", String(opts.limit ?? 50));

  const res = await fetch(
    buildUrl(`/api/core/api/decisions?${qs.toString()}`),
    {
      method: "GET",
      headers: {
        "content-type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`fetchDecisions failed: ${res.status} ${text}`);
  }

  return res.json();
}
