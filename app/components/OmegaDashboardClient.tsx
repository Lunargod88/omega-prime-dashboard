"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "./OmegaStyles.module.css";
import { useMe } from "../../src/lib/useMe";

type Decision = {
  id: string;
  created_at?: string;
  createdAt?: string;

  symbol?: string;
  timeframe?: string;

  side?: "LONG" | "SHORT" | string;
  tier?: string; // S+++, S++, etc
  confidence?: number;

  stance?: string;
  rr_stop?: number;
  rr_min?: number;
  rr_max?: number;

  status?: string; // PENDING / CONFIRMED / REJECTED / ACK / FLAG_RISK etc
  reason?: string;

  payload?: any;
};

type DecisionsResponse = {
  items: Decision[];
  total?: number;
  next_cursor?: string | null;
};

function safeNum(n: any): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

function fmtTime(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleString();
}

async function coreGET(path: string) {
  const res = await fetch(`/api/core${path}`, { cache: "no-store" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`GET ${path} failed (${res.status}) ${txt}`);
  }
  return res.json();
}

async function corePOST(path: string, body: any) {
  const res = await fetch(`/api/core${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`POST ${path} failed (${res.status}) ${txt}`);
  }
  return res.json();
}

export default function OmegaDashboardClient() {
  const { me, loading: meLoading, error: meError } = useMe();

  // --- Filters / paging (Step 19.3 vibes)
  const [symbol, setSymbol] = useState("");
  const [status, setStatus] = useState("");
  const [limit, setLimit] = useState(25);
  const [cursor, setCursor] = useState<string | null>(null);

  const [items, setItems] = useState<Decision[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // --- Modal (decision replay)
  const [openDecision, setOpenDecision] = useState<Decision | null>(null);

  const role = (me?.role || "").toUpperCase(); // ADMIN / CONFIRM / WIFE / etc

  const canAdmin = role === "ADMIN";
  const canConfirm = role === "CONFIRM" || canAdmin;
  const canWife = role === "WIFE" || canAdmin;

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (symbol.trim()) p.set("symbol", symbol.trim().toUpperCase());
    if (status.trim()) p.set("status", status.trim().toUpperCase());
    p.set("limit", String(limit));
    if (cursor) p.set("cursor", cursor);
    return `?${p.toString()}`;
  }, [symbol, status, limit, cursor]);

  async function load() {
    setBusy(true);
    setErr(null);
    try {
      // Expected: { items: [...], total?, next_cursor? }
      // NOTE: Runtime endpoint mapping depends on your core proxy. This compiles regardless.
      const data: DecisionsResponse = await coreGET(`/decisions${query}`);
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(typeof data.total === "number" ? data.total : null);
      setNextCursor(data.next_cursor ?? null);
    } catch (e: any) {
      setErr(e?.message || "Failed to load decisions");
      setItems([]);
      setTotal(null);
      setNextCursor(null);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function resetPaging() {
    setCursor(null);
  }

  async function act(decisionId: string, action: string) {
    setBusy(true);
    setErr(null);
    try {
      // POST /decisions/{id}/action { action: "CONFIRM" | "REJECT" | "ACK" | "FLAG_RISK" }
      await corePOST(`/decisions/${encodeURIComponent(decisionId)}/action`, { action });
      await load();
    } catch (e: any) {
      setErr(e?.message || `Action failed: ${action}`);
    } finally {
      setBusy(false);
    }
  }

  function copyJSON(obj: any) {
    const text = JSON.stringify(obj, null, 2);
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Ω PRIME — Decision Operations Console</div>
          <div className={styles.sub}>
            Identity:{" "}
            {meLoading ? "loading…" : meError ? "unknown" : me?.label || me?.name || me?.user_id || "unknown"}{" "}
            <span className={styles.dim}>({role || "NO_ROLE"})</span>
          </div>
        </div>

        {/* Top status strip placeholder (Mode / Kill / Sync) */}
        <div className={styles.strip}>
          <span className={styles.badge}>Mode: {me?.mode || me?.market_mode || "—"}</span>
          <span className={styles.badge}>Kill: {me?.kill_switch ? "ON" : "OFF"}</span>
          <span className={styles.badge}>Sync: {me?.sync || "—"}</span>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.panel}>
        <div className={styles.row}>
          <div className={styles.field}>
            <label>Symbol</label>
            <input
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value);
                resetPaging();
              }}
              placeholder="e.g. TSLA"
            />
          </div>

          <div className={styles.field}>
            <label>Status</label>
            <input
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                resetPaging();
              }}
              placeholder="e.g. PENDING"
            />
          </div>

          <div className={styles.field}>
            <label>Limit</label>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                resetPaging();
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className={styles.actions}>
            <button disabled={busy} onClick={() => load()}>
              Refresh
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setSymbol("");
                setStatus("");
                setLimit(25);
                setCursor(null);
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {err && <div className={styles.error}>{err}</div>}
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <div className={styles.dim}>
            {busy ? "Loading…" : `${items.length} item(s)`}
            {typeof total === "number" ? ` • total ${total}` : ""}
          </div>

          <div className={styles.pager}>
            <button disabled={busy || !cursor} onClick={() => setCursor(null)}>
              First
            </button>
            <button disabled={busy || !nextCursor} onClick={() => setCursor(nextCursor)}>
              Next
            </button>
          </div>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Symbol</th>
              <th>TF</th>
              <th>Side</th>
              <th>Tier</th>
              <th>Ω Conf</th>
              <th>Stance</th>
              <th>RR Stop</th>
              <th>RR Min</th>
              <th>RR Max</th>
              <th>Status</th>
              <th>Ops</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => {
              const created = d.created_at || d.createdAt;
              return (
                <tr key={d.id}>
                  <td>{fmtTime(created)}</td>
                  <td>{d.symbol || "—"}</td>
                  <td>{d.timeframe || "—"}</td>
                  <td>{d.side || "—"}</td>
                  <td>{d.tier || "—"}</td>
                  <td>{safeNum(d.confidence)}</td>
                  <td>{d.stance || "—"}</td>
                  <td>{safeNum(d.rr_stop)}</td>
                  <td>{safeNum(d.rr_min)}</td>
                  <td>{safeNum(d.rr_max)}</td>
                  <td>{d.status || "—"}</td>
                  <td>
                    <div className={styles.ops}>
                      <button onClick={() => setOpenDecision(d)}>Replay</button>

                      {canConfirm && (
                        <>
                          <button disabled={busy} onClick={() => act(d.id, "CONFIRM")}>
                            Confirm
                          </button>
                          <button disabled={busy} onClick={() => act(d.id, "REJECT")}>
                            Reject
                          </button>
                        </>
                      )}

                      {canWife && (
                        <>
                          <button disabled={busy} onClick={() => act(d.id, "ACK")}>
                            ACK
                          </button>
                          <button disabled={busy} onClick={() => act(d.id, "FLAG_RISK")}>
                            FLAG_RISK
                          </button>
                        </>
                      )}

                      {canAdmin && (
                        <button disabled={busy} onClick={() => act(d.id, "ADMIN_OVERRIDE")}>
                          Admin Override
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {!busy && items.length === 0 && (
              <tr>
                <td colSpan={12} className={styles.empty}>
                  No decisions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {openDecision && (
        <div className={styles.modalBackdrop} onClick={() => setOpenDecision(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>
              Decision Replay — <span className={styles.dim}>{openDecision.id}</span>
            </div>

            <div className={styles.modalButtons}>
              <button onClick={() => copyJSON(openDecision)}>Copy JSON</button>
              <button onClick={() => setOpenDecision(null)}>Close</button>
            </div>

            <pre className={styles.pre}>{JSON.stringify(openDecision, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
