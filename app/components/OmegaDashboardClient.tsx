// app/components/OmegaDashboardClient.tsx
"use client"

import React, { useEffect, useMemo, useState } from "react"
import styles from "./OmegaStyles.module.css"

type Me = { user_id: string; role: "ADMIN" | "CONFIRM" | "READ" }
type Controls = {
  kill_switch: boolean
  market_mode: "EQUITY" | "CRYPTO"
  equity_symbols: string[]
  crypto_symbols: string[]
}

type Decision = {
  id: number
  created_at?: string
  symbol: string
  timeframe: string
  decision: string
  stance: "ENTER" | "HOLD" | "STAND_DOWN" | "DENIED"
  confidence: number
  tier: string
  regime?: string | null
  session?: string | null
  tf_htf?: string | null
  tf_ltf?: string | null
  reason_codes?: string[] | null
  reasons_text?: string[] | null
  payload?: any
}

const CORE = process.env.NEXT_PUBLIC_OMEGA_CORE_URL || process.env.NEXT_PUBLIC_CORE_URL || ""
const USER_ID = process.env.NEXT_PUBLIC_USER_ID || ""
const USER_TOKEN = process.env.NEXT_PUBLIC_USER_TOKEN || ""

function stanceLabel(s: Decision["stance"] | undefined) {
  if (!s) return "STAND DOWN"
  if (s === "DENIED") return "STAND DOWN"
  if (s === "STAND_DOWN") return "STAND DOWN"
  return s
}

function stanceTone(s: Decision["stance"] | undefined) {
  if (!s) return "danger"
  if (s === "ENTER") return "good"
  if (s === "HOLD") return "warn"
  return "danger"
}

function fmtTime(iso?: string) {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleString()
}

async function apiGET<T>(path: string): Promise<T> {
  const res = await fetch(`${CORE}${path}`, {
    cache: "no-store",
    headers: {
      "X-User-Id": USER_ID,
      "X-User-Token": USER_TOKEN,
    },
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    throw new Error(`GET ${path} failed: ${res.status} ${txt}`)
  }
  return res.json()
}

async function apiPOST<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${CORE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": USER_ID,
      "X-User-Token": USER_TOKEN,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    throw new Error(`POST ${path} failed: ${res.status} ${txt}`)
  }
  return res.json()
}

export default function OmegaDashboardClient() {
  const [me, setMe] = useState<Me | null>(null)
  const [controls, setControls] = useState<Controls | null>(null)
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [count, setCount] = useState<number>(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [lastSync, setLastSync] = useState<string>("")

  // UI state
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [q, setQ] = useState("")
  const [stanceFilter, setStanceFilter] = useState<"ALL" | Decision["stance"]>("ALL")
  const [tierFilter, setTierFilter] = useState("ALL")

  const latest = decisions?.[0]
  const currentStance = stanceLabel(latest?.stance)
  const currentTone = stanceTone(latest?.stance)

  const tierOptions = useMemo(() => {
    const set = new Set<string>()
    decisions.forEach(d => d.tier && set.add(d.tier))
    return ["ALL", ...Array.from(set).sort()]
  }, [decisions])

  const filtered = useMemo(() => {
    return decisions.filter(d => {
      const matchQ =
        !q ||
        d.symbol?.toLowerCase().includes(q.toLowerCase()) ||
        d.decision?.toLowerCase().includes(q.toLowerCase()) ||
        (d.regime || "").toLowerCase().includes(q.toLowerCase()) ||
        (d.session || "").toLowerCase().includes(q.toLowerCase())
      const matchStance = stanceFilter === "ALL" ? true : d.stance === stanceFilter
      const matchTier = tierFilter === "ALL" ? true : d.tier === tierFilter
      return matchQ && matchStance && matchTier
    })
  }, [decisions, q, stanceFilter, tierFilter])

  async function refresh() {
    setError("")
    try {
      const [meResp, controlsResp, ledgerResp] = await Promise.all([
        apiGET<Me>("/me"),
        apiGET<Controls>("/controls"),
        apiGET<{ count: number; decisions: Decision[] }>("/ledger/decisions"),
      ])

      setMe(meResp)
      setControls(controlsResp)
      setDecisions(ledgerResp.decisions || [])
      setCount(ledgerResp.count || 0)
      setLastSync(new Date().toLocaleTimeString())
    } catch (e: any) {
      setError(e?.message || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!CORE) {
      setLoading(false)
      setError("Missing NEXT_PUBLIC_OMEGA_CORE_URL (or NEXT_PUBLIC_CORE_URL).")
      return
    }
    refresh()
    const t = setInterval(refresh, 8000) // auto-refresh
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function toggleKillSwitch() {
    if (!controls) return
    setError("")
    try {
      const nextEnabled = !controls.kill_switch
      await apiPOST("/controls/kill-switch", { enabled: nextEnabled })
      await refresh()
    } catch (e: any) {
      setError(e?.message || "Kill switch failed")
    }
  }

  async function changeMode(mode: "EQUITY" | "CRYPTO") {
    setError("")
    try {
      await apiPOST("/controls/mode", { mode })
      await refresh()
    } catch (e: any) {
      setError(e?.message || "Mode change failed")
    }
  }

  const allowedSymbols = useMemo(() => {
    if (!controls) return []
    return controls.market_mode === "EQUITY" ? controls.equity_symbols : controls.crypto_symbols
  }, [controls])

  return (
    <div className={styles.page}>
      <div className={styles.bg} />
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logo}>Ω</div>
          <div>
            <div className={styles.title}>Ω PRIME</div>
            <div className={styles.subtitle}>Decision Operations Console</div>
          </div>
        </div>

        <div className={styles.statusRow}>
          <div className={`${styles.badge} ${styles[`tone_${currentTone}`]}`}>
            {currentStance}
          </div>

          <div className={styles.badgeSoft}>
            Mode: <strong>{controls?.market_mode ?? "—"}</strong>
          </div>

          <div className={styles.badgeSoft}>
            Kill Switch:{" "}
            <strong className={controls?.kill_switch ? styles.dangerText : styles.goodText}>
              {controls?.kill_switch ? "ARMED" : "DISARMED"}
            </strong>
          </div>

          <div className={styles.badgeSoft}>
            Sync: <strong>{lastSync || "—"}</strong>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.panel}>
          <div className={styles.panelTop}>
            <div className={styles.panelTitle}>Identity</div>
            <div className={styles.panelMeta}>
              {loading ? "Booting…" : `Connected to Core`}
            </div>
          </div>

          <div className={styles.identityGrid}>
            <div className={styles.kv}>
              <div className={styles.k}>User</div>
              <div className={styles.v}>{me?.user_id ?? "ANON"}</div>
            </div>
            <div className={styles.kv}>
              <div className={styles.k}>Role</div>
              <div className={styles.v}>{me?.role ?? "READ"}</div>
            </div>
            <div className={styles.kv}>
              <div className={styles.k}>Allowed Symbols</div>
              <div className={styles.vSmall}>{allowedSymbols.join(", ") || "—"}</div>
            </div>
            <div className={styles.kv}>
              <div className={styles.k}>Last Decision</div>
              <div className={styles.vSmall}>
                {latest ? `${latest.symbol} • ${latest.decision} • ${latest.confidence}%` : "—"}
              </div>
            </div>
          </div>

          {error && (
            <div className={styles.errorBox}>
              <div className={styles.errorTitle}>System Alert</div>
              <div className={styles.errorText}>{error}</div>
            </div>
          )}
        </section>

        {me?.role === "ADMIN" && (
          <section className={`${styles.panel} ${styles.panelGlow}`}>
            <div className={styles.panelTop}>
              <div className={styles.panelTitle}>Admin Controls</div>
              <div className={styles.panelMeta}>Live safety + mode governance</div>
            </div>

            <div className={styles.controlsGrid}>
              <button
                className={`${styles.btn} ${controls?.kill_switch ? styles.btnDanger : styles.btnGood}`}
                onClick={toggleKillSwitch}
              >
                {controls?.kill_switch ? "Disable Kill Switch" : "Enable Kill Switch"}
              </button>

              <div className={styles.selectWrap}>
                <label className={styles.selectLabel}>Market Mode</label>
                <select
                  className={styles.select}
                  value={controls?.market_mode ?? "EQUITY"}
                  onChange={(e) => changeMode(e.target.value as any)}
                >
                  <option value="EQUITY">EQUITY</option>
                  <option value="CRYPTO">CRYPTO</option>
                </select>
              </div>

              <div className={styles.note}>
                <div className={styles.noteTitle}>Safety Rules</div>
                <div className={styles.noteText}>
                  Execution only occurs when Kill Switch is <strong>DISARMED</strong> and stance is <strong>ENTER</strong>.
                </div>
              </div>
            </div>
          </section>
        )}

        <section className={styles.panel}>
          <div className={styles.panelTop}>
            <div className={styles.panelTitle}>Telemetry</div>
            <div className={styles.panelMeta}>Decisions: {count}</div>
          </div>

          <div className={styles.filters}>
            <input
              className={styles.search}
              placeholder="Search symbol / session / regime…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            <select
              className={styles.filterSelect}
              value={stanceFilter}
              onChange={(e) => setStanceFilter(e.target.value as any)}
            >
              <option value="ALL">All stances</option>
              <option value="ENTER">ENTER</option>
              <option value="HOLD">HOLD</option>
              <option value="STAND_DOWN">STAND_DOWN</option>
              <option value="DENIED">DENIED</option>
            </select>

            <select
              className={styles.filterSelect}
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
            >
              {tierOptions.map(t => (
                <option key={t} value={t}>{t === "ALL" ? "All tiers" : `Tier ${t}`}</option>
              ))}
            </select>
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
                  <th>Session</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const tone = stanceTone(d.stance)
                  const isOpen = expandedId === d.id
                  return (
                    <React.Fragment key={d.id}>
                      <tr
                        className={styles.row}
                        onClick={() => setExpandedId(isOpen ? null : d.id)}
                      >
                        <td className={styles.symbolCell}>{d.symbol}</td>
                        <td>
                          <span className={`${styles.pill} ${styles[`tone_${tone}`]}`}>
                            {stanceLabel(d.stance)}
                          </span>
                        </td>
                        <td>{d.decision}</td>
                        <td>
                          <span className={styles.tierBadge}>Ω {d.tier}</span>
                        </td>
                        <td>
                          <div className={styles.confWrap}>
                            <div className={styles.confBar}>
                              <div
                                className={styles.confFill}
                                style={{ width: `${Math.max(0, Math.min(100, d.confidence || 0))}%` }}
                              />
                            </div>
                            <div className={styles.confText}>{d.confidence}%</div>
                          </div>
                        </td>
                        <td>{d.regime || "—"}</td>
                        <td>{d.session || d.payload?.session || "—"}</td>
                        <td className={styles.timeCell}>{fmtTime(d.created_at)}</td>
                      </tr>

                      {isOpen && (
                        <tr className={styles.expandRow}>
                          <td colSpan={8}>
                            <div className={styles.expandCard}>
                              <div className={styles.expandTitle}>Decision Detail</div>

                              <div className={styles.expandGrid}>
                                <div className={styles.kv}>
                                  <div className={styles.k}>HTF / LTF</div>
                                  <div className={styles.vSmall}>
                                    {d.tf_htf || "—"} / {d.tf_ltf || "—"}
                                  </div>
                                </div>

                                <div className={styles.kv}>
                                  <div className={styles.k}>Reason Codes</div>
                                  <div className={styles.vSmall}>
                                    {(d.reason_codes || []).join(", ") || "—"}
                                  </div>
                                </div>

                                <div className={styles.kv}>
                                  <div className={styles.k}>Reasons</div>
                                  <div className={styles.vSmall}>
                                    {(d.reasons_text || []).join(" • ") || "—"}
                                  </div>
                                </div>

                                <div className={styles.kv}>
                                  <div className={styles.k}>Payload Snapshot</div>
                                  <pre className={styles.pre}>
                                    {JSON.stringify(d.payload ?? {}, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}

                {!filtered.length && !loading && (
                  <tr>
                    <td colSpan={8} className={styles.empty}>
                      No results. Adjust filters or wait for telemetry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.footerHint}>
            Click a row to expand forensic detail. Auto-refresh runs every 8 seconds.
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>Ω PRIME • Celestial-grade governance • Built for real-world ops</span>
      </footer>
    </div>
  )
}
