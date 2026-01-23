"use client";

import React, { useEffect, useState } from "react";
import styles from "./OmegaStyles.module.css";
import { useMe } from "../../src/lib/useMe";


type Decision = {
  id: number;
  created_at: string;

  symbol: string;
  timeframe: string;
  decision: string;
  stance: string;

  tier: string;
  confidence: number;

  payload: any;
  trade_id?: string | null;
};

export default function OmegaDashboardClient() {
  const { me, loading } = useMe();

  const [items, setItems] = useState<Decision[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Decision | null>(null);

  const role = (me?.role || "READ").toUpperCase();
  const canConfirm = role === "CONFIRM" || role === "ADMIN";

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/core/ledger/decisions?limit=50", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(Array.isArray(data.decisions) ? data.decisions : []);
    } catch (e: any) {
      setError(e.message || "Failed to load decisions");
      setItems([]);
    } finally {
      setBusy(false);
    }
  }

  async function postTradeEvent(tradeId: string, eventType: string) {
    await fetch(`/api/core/trades/${tradeId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: eventType }),
    });
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Ω PRIME — Decision Console</div>
          <div className={styles.sub}>
            Identity: {loading ? "loading…" : me?.user_id}{" "}
            <span className={styles.dim}>({role})</span>
          </div>
        </div>
      </div>

      {error && <div className={styles.errorBox}>{error}</div>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Symbol</th>
              <th>Decision</th>
              <th>Tier</th>
              <th>Conf</th>
              <th>Ops</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.id}>
                <td>{new Date(d.created_at).toLocaleString()}</td>
                <td>{d.symbol}</td>
                <td>{d.decision}</td>
                <td>{d.tier}</td>
                <td>{d.confidence}%</td>
                <td>
                  <button onClick={() => setOpen(d)}>Replay</button>

                  {canConfirm && d.trade_id && (
                    <>
                      <button onClick={() => postTradeEvent(d.trade_id!, "ACK")}>
                        ACK
                      </button>
                      <button
                        onClick={() =>
                          postTradeEvent(d.trade_id!, "FLAG_RISK")
                        }
                      >
                        FLAG_RISK
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}

            {!busy && items.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  No decisions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className={styles.modalBackdrop} onClick={() => setOpen(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>
              Decision Replay — {open.id}
            </div>
            <pre className={styles.pre}>
              {JSON.stringify(open, null, 2)}
            </pre>
            <button onClick={() => setOpen(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
