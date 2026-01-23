"use client";

import React, { useEffect, useMemo, useState } from "react";
import styles from "./OmegaStyles.module.css";
import { useMe } from "../../src/lib/useMe";

type Decision = {
  id: string;
  symbol: string;
  timeframe?: string;
  decision?: string; // LONG/SHORT/STAND_DOWN etc
  side?: string;
  tier?: string;
  confidence?: number;
  stance?: string; // PRIME / STAND_DOWN etc
  regime?: string;
  session?: string;
  rr_stop?: number;
  rr_min?: number;
  rr_max?: number;
  status?: string;
  payload?: any;
  created_at?: string;
};

type SystemStatus = {
  execution_enabled?: boolean;
  kill_switch?: boolean;
  market_mode?: "EQUITY" | "CRYPTO";
};

type ControlsResponse = {
  kill_switch: boolean;
  market_mode: "EQUITY" | "CRYPTO";
  equity_symbols?: string[];
  crypto_symbols?: string[];
};

function safeUpper(x?: string) {
  return (x || "").toUpperCase();
}

export default function OmegaDashboardClient() {
  const { me } = useMe();

  // --- System status (authoritative)
  const [sys, setSys] = useState<SystemStatus>({
    execution_enabled: false,
    kill_switch: true,
    market_mode: "EQUITY",
  });
  const [sysErr, setSysErr] = useState<string | null>(null);
  const [sysLoading, setSysLoading] = useState(false);

  // --- Controls payload (for allowed symbols display)
  const [controls, setControls] = useState<ControlsResponse | null>(null);

  // --- Decisions
  const [items, setItems] = useState<Decision[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- UI controls (matches your screenshots)
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [everySec, setEverySec] = useState(8);

  // --- Telemetry filters
  const [q, setQ] = useState("");
  const [stance, setStance] = useState("ALL");
  const [tier, setTier] = useState("ALL");
  const [regime, setRegime] = useState("ALL");
  const [session, setSession] = useState("ALL");
  const [limit, setLimit] = useState(20);

  const role = safeUpper(me?.role);
  const canAdmin = role === "ADMIN";
  const canConfirm = role === "CONFIRM" || canAdmin;

  const userId = me?.user_id || "—";

  const derivedStanceBadge = safeUpper(items[0]?.stance) || "STAND DOWN";

  // Allowed symbols: source of truth = /controls because env-backed lists live there.
  const allowedSymbols = useMemo(() => {
    const mode = sys.market_mode || controls?.market_mode || "EQUITY";
    const list =
      mode === "CRYPTO" ? controls?.crypto_symbols || [] : controls?.equity_symbols || [];
    return list.length ? list.join(", ") : (me?.allowedSymbols || []).join(", ");
  }, [controls, me?.allowedSymbols, sys.market_mode]);

  async function loadSystem() {
    try {
      setSysErr(null);
      setSysLoading(true);

      // CORE endpoint you already have:
      // GET /controls -> { kill_switch, market_mode, equity_symbols, crypto_symbols }
      const res = await fetch("/api/core/controls", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as ControlsResponse;

      setControls(data);

      setSys({
        execution_enabled: !data.kill_switch,
        kill_switch: !!data.kill_switch,
        market_mode: (data.market_mode || "EQUITY") as any,
      });
    } catch (e: any) {
      setSysErr(e?.message || "System status failed");
    } finally {
      setSysLoading(false);
    }
  }

  async function loadDecisions() {
    try {
      setError(null);

      const params = new URLSearchParams();
      params.set("limit", String(limit));

      if (q.trim()) params.set("q", q.trim());
      if (stance !== "ALL") params.set("stance", stance);
      if (tier !== "ALL") params.set("tier", tier);
      if (regime !== "ALL") params.set("regime", regime);
      if (session !== "ALL") params.set("session", session);

      const res = await fetch(`/api/core/ledger/decisions?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(data.decisions || []);
    } catch (e: any) {
      setError(e?.message || "Decisions failed");
    }
  }

  async function syncNow() {
    await Promise.all([loadSystem(), loadDecisions()]);
  }

  // Auto refresh loop
  useEffect(() => {
    // initial
    syncNow();

    if (!autoRefresh) return;

    const ms = Math.max(2, Number(everySec) || 8) * 1000;
    const t = setInterval(() => {
      syncNow();
    }, ms);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, everySec, q, stance, tier, regime, session, limit]);

  // --- Admin actions (wired to Core endpoints via proxy)
  async function toggleKillSwitch() {
    try {
      setSysErr(null);

      // CORE endpoint:
      // POST /controls/kill-switch  body { enabled: boolean }
      const res = await fetch("/api/core/controls/kill-switch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: !sys.kill_switch }),
        cache: "no-store",
      });

      if (!res.ok) throw new Error(await res.text());
      await loadSystem();
    } catch (e: any) {
      setSysErr(e?.message || "Kill switch toggle failed");
    }
  }

  async function setMode(nextMode: "EQUITY" | "CRYPTO") {
    try {
      setSysErr(null);

      // CORE endpoint:
      // POST /controls/mode  body { mode: "EQUITY" | "CRYPTO" }
      const res = await fetch("/api/core/controls/mode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: nextMode }),
        cache: "no-store",
      });

      if (!res.ok) throw new Error(await res.text());
      await loadSystem();
    } catch (e: any) {
      setSysErr(e?.message || "Mode set failed");
    }
  }

  // Confirm action (CONFIRM + ADMIN can do)
  async function confirmDecision(decisionId: string) {
    try {
      setError(null);
      const res = await fetch(`/api/core/ledger/confirm/${decisionId}`, {
        method: "POST",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      await loadDecisions();
    } catch (e: any) {
      setError(e?.message || "Confirm failed");
    }
  }

  function copyDiagnostics() {
    const diag = {
      user: userId,
      role,
      allowedSymbols: allowedSymbols ? allowedSymbols.split(",").map((s) => s.trim()) : [],
      system: sys,
      ui: { autoRefresh, everySec, q, stance, tier, regime, session, limit },
      lastDecision: items[0] || null,
      time: new Date().toISOString(),
    };
    navigator.clipboard.writeText(JSON.stringify(diag, null, 2));
  }

  const filteredForDisplay = items; // server does filtering if supported; if not, still renders

  const lastDecisionLine = useMemo(() => {
    const d = items[0];
    if (!d) return "—";
    const conf = typeof d.confidence === "number" ? `${d.confidence}%` : "—";
    return `${d.symbol} · ${d.decision} · ${conf}`;
  }, [items]);

  const killLabel = sys.kill_switch ? "ARMED" : "DISARMED";
  const modeLabel = sys.market_mode || "EQUITY";

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
            {derivedStanceBadge}
          </span>

          <span className={styles.badge}>Mode: {modeLabel}</span>
          <span className={styles.badge}>Kill Switch: {killLabel}</span>

          <span className={styles.badgeBtn} onClick={syncNow} role="button">
            Sync: <span className={styles.badgeBtnInner}>refresh</span>
          </span>
        </div>
      </header>

      <main className={styles.main}>
        {/* IDENTITY */}
        <section className={`${styles.panel} ${styles.panelGlow}`}>
          <div className={styles.panelTop}>
            <div className={styles.panelTitle}>Identity</div>
          </div>

          <div className={styles.identityGrid}>
            <div className={styles.kv}>
              <div className={styles.k}>User</div>
              <div className={styles.v}>{userId}</div>
            </div>

            <div className={styles.kv}>
              <div className={styles.k}>Role</div>
              <div className={styles.v}>{role || "—"}</div>
            </div>

            <div className={styles.kv}>
              <div className={styles.k}>Allowed Symbols</div>
              <div className={styles.vSmall}>{allowedSymbols || "—"}</div>
            </div>

            <div className={styles.kv}>
              <div className={styles.k}>Last Decision</div>
              <div className={styles.v}>{lastDecisionLine}</div>
            </div>
          </div>
        </section>

        {/* SYSTEM ALERT + ADMIN/CONFIRM CONTROLS */}
        <section className={styles.panel}>
          <div className={styles.panelTop}>
            <div className={styles.panelTitle}>System Alert</div>
            <div className={styles.panelMeta}>
              {sysLoading ? "Refreshing…" : "Connected to Core"}
            </div>
          </div>

          {(sysErr || error) && (
            <div className={styles.errorBox}>
              <div className={styles.errorTitle}>Error</div>
              <div className={styles.errorText}>{sysErr || error}</div>
            </div>
          )}

          <div className={styles.controlGrid}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <span>Auto-refresh</span>
            </label>

            <div className={styles.everyRow}>
              <div className={styles.everyLabel}>Every</div>
              <input
                className={styles.inputMini}
                value={everySec}
                onChange={(e) => setEverySec(Number(e.target.value))}
                inputMode="numeric"
              />
              <div className={styles.everyLabel}>s</div>
            </div>
          </div>

          {/* Role-specific */}
          {canAdmin ? (
            <>
              <div className={styles.sectionTitle}>Admin Controls</div>
              <div className={styles.adminGrid}>
                <button className={styles.btn} onClick={toggleKillSwitch}>
                  Toggle Kill Switch
                </button>

                <div className={styles.modeRow}>
                  <div className={styles.modeLabel}>{modeLabel}</div>
                  <button
                    className={styles.btnGhost}
                    onClick={() =>
                      setMode(modeLabel === "EQUITY" ? "CRYPTO" : "EQUITY")
                    }
                  >
                    Switch Mode
                  </button>
                </div>

                <button className={styles.btnGhost} onClick={copyDiagnostics}>
                  Copy Diagnostics
                </button>
              </div>

              <div className={styles.note}>
                These buttons hit real Core endpoints. Governance lives here.
              </div>
            </>
          ) : canConfirm ? (
            <>
              <div className={styles.sectionTitle}>Confirm Console</div>
              <div className={styles.note}>
                You can review signal quality + reasoning. Execution authority remains
                ADMIN-only.
              </div>
            </>
          ) : null}
        </section>

        {/* TELEMETRY */}
        <section className={styles.panel}>
          <div className={styles.panelTop}>
            <div className={styles.panelTitle}>Telemetry</div>
            <div className={styles.panelMeta}>
              Auto-refresh every {Math.max(2, Number(everySec) || 8)}s
            </div>
          </div>

          <div className={styles.filters}>
            <input
              className={styles.search}
              placeholder="Search symbol / session / regime…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <select
              className={styles.select}
              value={stance}
              onChange={(e) => setStance(e.target.value)}
            >
              <option value="ALL">All stances</option>
              <option value="STAND_DOWN">STAND_DOWN</option>
              <option value="PRIME">PRIME</option>
              <option value="S+++">S+++</option>
              <option value="S++">S++</option>
              <option value="S+">S+</option>
              <option value="S">S</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>

            <select
              className={styles.select}
              value={tier}
              onChange={(e) => setTier(e.target.value)}
            >
              <option value="ALL">All tiers</option>
              <option value="PRIME">PRIME</option>
              <option value="S+++">S+++</option>
              <option value="S++">S++</option>
              <option value="S+">S+</option>
              <option value="S">S</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>

            <select
              className={styles.select}
              value={regime}
              onChange={(e) => setRegime(e.target.value)}
            >
              <option value="ALL">All regimes</option>
              <option value="BULL">BULL</option>
              <option value="BEAR">BEAR</option>
              <option value="RANGE">RANGE</option>
              <option value="CHOP">CHOP</option>
              <option value="VOLATILE">VOLATILE</option>
            </select>

            <select
              className={styles.select}
              value={session}
              onChange={(e) => setSession(e.target.value)}
            >
              <option value="ALL">All sessions</option>
              <option value="ASIA">ASIA</option>
              <option value="LONDON">LONDON</option>
              <option value="NY">NY</option>
              <option value="OVERLAP">OVERLAP</option>
            </select>

            <input
              className={styles.inputMini}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              inputMode="numeric"
            />
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Stance</th>
                  <th>Decision</th>
                  <th>Tier</th>
                  <th>Confidence</th>
                  <th>Regime</th>
                  {canConfirm ? <th>Confirm</th> : null}
                </tr>
              </thead>

              <tbody>
                {filteredForDisplay.map((d) => (
                  <React.Fragment key={d.id}>
                    <tr
                      className={styles.row}
                      onClick={() =>
                        setExpanded(expanded === d.id ? null : d.id)
                      }
                    >
                      <td className={styles.symbolCell}>{d.symbol}</td>
                      <td>{d.stance || "—"}</td>
                      <td>{d.decision || "—"}</td>
                      <td>
                        <span className={styles.tierBadge}>{d.tier || "—"}</span>
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
                            {typeof d.confidence === "number"
                              ? `${d.confidence}%`
                              : "—"}
                          </span>
                        </div>
                      </td>
                      <td>{d.regime || "—"}</td>

                      {canConfirm ? (
                        <td>
                          <button
                            className={styles.btnTiny}
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDecision(d.id);
                            }}
                          >
                            Confirm
                          </button>
                        </td>
                      ) : null}
                    </tr>

                    {expanded === d.id && (
                      <tr className={styles.expandRow}>
                        <td colSpan={canConfirm ? 7 : 6}>
                          <div className={styles.expandCard}>
                            <div className={styles.expandTitle}>
                              Forensic Replay
                            </div>

                            <div className={styles.replayGrid}>
                              <div className={styles.replayKV}>
                                <div className={styles.k}>RR Stop</div>
                                <div className={styles.v}>{d.rr_stop ?? "—"}</div>
                              </div>
                              <div className={styles.replayKV}>
                                <div className={styles.k}>RR Min</div>
                                <div className={styles.v}>{d.rr_min ?? "—"}</div>
                              </div>
                              <div className={styles.replayKV}>
                                <div className={styles.k}>RR Max</div>
                                <div className={styles.v}>{d.rr_max ?? "—"}</div>
                              </div>
                              <div className={styles.replayKV}>
                                <div className={styles.k}>Session</div>
                                <div className={styles.v}>{d.session ?? "—"}</div>
                              </div>
                            </div>

                            <pre className={styles.pre}>
                              {JSON.stringify(d.payload ?? d, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}

                {!filteredForDisplay.length && (
                  <tr>
                    <td colSpan={canConfirm ? 7 : 6} className={styles.empty}>
                      No decisions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.showing}>
            Showing {filteredForDisplay.length} / {filteredForDisplay.length}
          </div>

          <div className={styles.bottomHint}>
            Click a row to expand forensic replay. Auto-refresh runs every{" "}
            {Math.max(2, Number(everySec) || 8)}s.
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        Governance lives here. Execution authority remains ADMIN-only.
      </footer>
    </div>
  );
}
