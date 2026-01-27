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
};

const CORE_BASE =
  process.env.NEXT_PUBLIC_CORE_BASE_URL ||
  ""; // if you're proxying via /api/core, leave this empty

function buildUrl(path: string) {
  // If you already proxy Core through Next route.ts, you likely call `/api/core/...`
  // Example: buildUrl("/api/core/api/decisions")
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
