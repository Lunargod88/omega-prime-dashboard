"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "./OmegaStyles.module.css";
import { useMe } from "../../src/lib/useMe";

type Decision = {
  id: string;
  symbol: string;
  timeframe?: string;
  decision?: string;
  side?: string;
  tier?: string;
  confidence?: number;
  stance?: string;
  regime?: string;
  rr_stop?: number;
  rr_min?: number;
  rr_max?: number;
  status?: string;
  payload?: any;
  created_at?: string;
};

export default function OmegaDashboardClient() {
  const { me, loading } = useMe();

  const [items, setItems] = useState<Decision[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const role = (me?.role || "").toUpperCase();
  const canAdmin = role === "ADMIN";
  const canConfirm = role === "CONFIRM" || canAdmin;

  async function load() {
    try {
      setError(null);
      const res = await fetch("/api/core/ledger/decisions", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(data.decisions || []);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.bg} />

      {/* HEADER */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logo}>Ω</div>
          <div>
            <div className={styles.title}>Ω PRIME</div>
            <div className={styles.subtitle}>Decision Operations Console</div>
          </div>
        </div>

        <div className={styles.statusRow}>
          <span className={`${styles.badge} ${styles.tone_warn}`}>
            {items[0]?.stance || "STAND DOWN"}
          </span>
          <span className={styles.badge}>Mode: EQUITY</span>
          <span className={styles.badge}>Kill Switch: DISARMED</span>
        </div>
      </header>

      {/* MAIN */}
      <main className={styles.main}>
        {/* IDENTITY */}
        <section className={`${styles.panel} ${styles.panelGlow}`}>
          <div className={styles.panelTop}>
            <div className={styles.panelTitle}>Identity</div>
          </div>

          <div className={styles.identityGrid}>
            <div className={styles.kv}>
              <div className={styles.k}>User</div>
              <div className={styles.v}>{me?.user_id || "—"}</div>
            </div>
            <div className={styles.kv}>
              <div className={styles.k}>Role</div>
              <div className={styles.v}>{role || "—"}</div>
            </div>
            <div className={styles.kv}>
              <div className={styles.k}>Allowed Symbols</div>
              <div className={styles.vSmall}>
                {(me?.allowedSymbols || []).join(", ")}
              </div>
            </div>
            <div className={styles.kv}>
              <div className={styles.k}>Last Decision</div>
              <div className={styles.v}>
                {items[0]
                  ? `${items[0].symbol} · ${items[0].decision} · ${items[0].confidence}%`
                  : "—"}
              </div>
            </div>
          </div>
        </section>

        {/* TELEMETRY */}
        <section className={styles.panel}>
          <div className={styles.panelTop}>
            <div className={styles.panelTitle}>Telemetry</div>
            <div className={styles.panelMeta}>Auto-refresh every 8s</div>
          </div>

          {error && (
            <div className={styles.errorBox}>
              <div className={styles.errorTitle}>Error</div>
              <div className={styles.errorText}>{error}</div>
            </div>
          )}

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Decision</th>
                  <th>Tier</th>
                  <th>Confidence</th>
                  <th>Regime</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <React.Fragment key={d.id}>
                    <tr
                      className={styles.row}
                      onClick={() =>
                        setExpanded(expanded === d.id ? null : d.id)
                      }
                    >
                      <td className={styles.symbolCell}>{d.symbol}</td>
                      <td>{d.decision}</td>
                      <td>
                        <span className={styles.tierBadge}>{d.tier}</span>
                      </td>
                      <td>
                        <div className={styles.confWrap}>
                          <div className={styles.confBar}>
                            <div
                              className={styles.confFill}
                              style={{ width: `${d.confidence || 0}%` }}
                            />
                          </div>
                          <span className={styles.confText}>
                            {d.confidence}%
                          </span>
                        </div>
                      </td>
                      <td>{d.regime || "—"}</td>
                    </tr>

                    {expanded === d.id && (
                      <tr className={styles.expandRow}>
                        <td colSpan={5}>
                          <div className={styles.expandCard}>
                            <div className={styles.expandTitle}>
                              Forensic Replay
                            </div>
                            <pre className={styles.pre}>
                              {JSON.stringify(d.payload, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}

                {!items.length && (
                  <tr>
                    <td colSpan={5} className={styles.empty}>
                      No decisions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        Governance lives here. Execution authority remains ADMIN-only.
      </footer>
    </div>
  );
}
