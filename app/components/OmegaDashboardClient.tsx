// app/components/OmegaDashboardClient.tsx
"use client"

import React, { useEffect, useMemo, useState } from "react"
import styles from "./OmegaStyles.module.css"

type Role = "ADMIN" | "CONFIRM" | "READ"
type Me = { user_id: string; role: Role }

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

type DecisionsResponse = {
  count: number
  decisions: Decision[]
}

function tierRank(t: string) {
  // Your official tiers: S+++, S++, S+, S, A, B, C (highest -> lowest)
  const order = ["S+++", "S++", "S+", "S", "A", "B", "C"]
  const idx = order.indexOf((t || "").toUpperCase())
  return idx === -1 ? 999 : idx
}

function stanceBadge(stance: Decision["stance"]) {
  if (stance === "ENTER") return styles.badgeEnter
  if (stance === "HOLD") return styles.badgeHold
  return styles.badgeStandDown
}

function fmtTime(iso?: string) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString()
}

async function apiGet<T>(path: string, uid: string, tok: string) {
  const res = await fetch(`/api/core${path}`, {
    cache: "no-store",
    headers: {
      "X-User-Id": uid,
      "X-User-Token": tok,
    },
  })
  const text = await res.text()
  let data: any = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }
  if (!res.ok) {
    const msg = data?.detail || data?.error || `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data as T
}

async function apiPost<T>(path: string, uid: string, tok: string, body: any) {
  const res = await fetch(`/api/core${path}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-User-Id": uid,
      "X-User-Token": tok,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let data: any = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }
  if (!res.ok) {
    const msg = data?.detail || data?.error || `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data as T
}

export default function OmegaDashboardClient() {
  const UID = (process.env.NEXT_PUBLIC_USER_ID ?? "").trim()
  const TOK = (process.env.NEXT_PUBLIC_USER_TOKEN ?? "").trim()

  const [me, setMe] = useState<Me>({ user_id: "ANON", role: "READ" })
  const [controls, setControls] = useState<Controls | null>(null)
  const [rows, setRows] = useState<Decision[]>([])
  const [systemAlert, setSystemAlert] = useState<string | null>(null)

  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshEvery, setRefreshEvery] = useState(8)

  // 19.3 filters + paging
  const [q, setQ] = useState("")
  const [stanceFilter, setStanceFilter] = useState<"ALL" | Decision["stance"]>("ALL")
  const [tierFilter, setTierFilter] = useState<"ALL" | string>("ALL")
  const [regimeFilter, setRegimeFilter] = useState<"ALL" | string>("ALL")
  const [sessionFilter, setSessionFilter] = useState<"ALL" | string>("ALL")

  const [pageSize, setPageSize] = useState<20 | 50 | 100>(50)
  const [page, setPage] = useState(1)

  // replay modal
  const [openId, setOpenId] = useState<number | null>(null)
  const [replay, setReplay] = useState<any | null>(null)
  const [replayLoading, setReplayLoading] = useState(false)

  const latest = rows?.[0]

  const headerStance =
    latest?.stance === "ENTER" ? "ENTER" :
    latest?.stance === "HOLD" ? "HOLD" :
    "STAND DOWN"

  const mode = controls?.market_mode ?? "—"
  const kill = controls ? (controls.kill_switch ? "ARMED" : "DISARMED") : "—"
  const allowedSymbols =
    controls?.market_mode === "EQUITY" ? controls.equity_symbols :
    controls?.market_mode === "CRYPTO" ? controls.crypto_symbols :
    []

  async function loadAll() {
    setSystemAlert(null)
    try {
      if (!UID || !TOK) {
        setMe({ user_id: "ANON", role: "READ" })
        setControls(null)
        setRows([])
        setSystemAlert("Missing NEXT_PUBLIC_USER_ID / NEXT_PUBLIC_USER_TOKEN in this deployment.")
        return
      }

      const [meData, controlsData, decisionsData] = await Promise.all([
        apiGet<Me>("/me", UID, TOK),
        apiGet<Controls>("/controls", UID, TOK),
        apiGet<DecisionsResponse>(`/ledger/decisions?limit=250`, UID, TOK),
      ])

      setMe(meData)
      setControls(controlsData)
      setRows(decisionsData.decisions || [])
    } catch (e: any) {
      setSystemAlert(e?.message || "Failed to fetch")
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const ms = Math.max(3, refreshEvery) * 1000
    const t = setInterval(() => loadAll(), ms)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshEvery])

  // derive filter option lists from data
  const tierOptions = useMemo(() => {
    const s = new Set<string>()
    rows.forEach(r => r.tier && s.add(String(r.tier).toUpperCase()))
    return Array.from(s).sort((a, b) => tierRank(a) - tierRank(b))
  }, [rows])

  const regimeOptions = useMemo(() => {
    const s = new Set<string>()
    rows.forEach(r => r.regime && s.add(String(r.regime)))
    return Array.from(s).sort()
  }, [rows])

  const sessionOptions = useMemo(() => {
    const s = new Set<string>()
    rows.forEach(r => r.session && s.add(String(r.session)))
    return Array.from(s).sort()
  }, [rows])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter(r => {
      const matchesQ =
        !needle ||
        r.symbol.toLowerCase().includes(needle) ||
        (r.session || "").toLowerCase().includes(needle) ||
        (r.regime || "").toLowerCase().includes(needle)

      const matchesStance = stanceFilter === "ALL" ? true : r.stance === stanceFilter
      const matchesTier = tierFilter === "ALL" ? true : String(r.tier).toUpperCase() === tierFilter
      const matchesRegime = regimeFilter === "ALL" ? true : String(r.regime || "") === regimeFilter
      const matchesSession = sessionFilter === "ALL" ? true : String(r.session || "") === sessionFilter

      return matchesQ && matchesStance && matchesTier && matchesRegime && matchesSession
    })
  }, [rows, q, stanceFilter, tierFilter, regimeFilter, sessionFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    // reset to page 1 whenever filters or page size changes
    setPage(1)
  }, [q, stanceFilter, tierFilter, regimeFilter, sessionFilter, pageSize])

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safePage, pageSize])

  async function openReplay(id: number) {
    setOpenId(id)
    setReplay(null)
    setReplayLoading(true)
    try {
      const data = await apiGet<any>(`/ledger/decision/${id}`, UID, TOK)
      setReplay(data)
    } catch (e: any) {
      setReplay({ error: e?.message || "Replay failed" })
    } finally {
      setReplayLoading(false)
    }
  }

  async function copyJson(obj: any) {
    try {
      const text = JSON.stringify(obj, null, 2)
      await navigator.clipboard.writeText(text)
      setSystemAlert("Copied to clipboard ✅")
      setTimeout(() => setSystemAlert(null), 1500)
    } catch {
      setSystemAlert("Copy failed (browser permissions).")
    }
  }

  // ADMIN actions (real endpoints)
  async function toggleKillSwitch(next: boolean) {
    setSystemAlert(null)
    try {
      await apiPost("/controls/kill-switch", UID, TOK, { enabled: next })
      await loadAll()
    } catch (e: any) {
      setSystemAlert(e?.message || "Kill switch update failed")
    }
  }

  async function setMarketMode(next: "EQUITY" | "CRYPTO") {
    setSystemAlert(null)
    try {
      await apiPost("/controls/mode", UID, TOK, { mode: next })
      await loadAll()
    } catch (e: any) {
      setSystemAlert(e?.message || "Mode update failed")
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} />

      {/* Header / cockpit */}
      <header className={styles.header}>
        <div>
          <div className={styles.brandRow}>
            <div className={styles.brandMark}>Ω</div>
            <div>
              <div className={styles.brandTitle}>Ω PRIME</div>
              <div className={styles.brandSub}>Decision Operations Console</div>
            </div>
          </div>
        </div>

        <div className={styles.headerRight}>
          <span className={`${styles.pill} ${headerStance === "ENTER" ? styles.pillEnter : headerStance === "HOLD" ? styles.pillHold : styles.pillDown}`}>
            {headerStance}
          </span>

          <span className={styles.pill}>Mode: <b>{mode}</b></span>
          <span className={styles.pill}>Kill Switch: <b>{kill}</b></span>

          <span className={styles.pill}>
            Sync:{" "}
            <button className={styles.linkBtn} onClick={loadAll} title="Refresh now">
              refresh
            </button>
          </span>
        </div>
      </header>

      <main className={styles.main}>
        {/* Identity + system status */}
        <section className={styles.gridTop}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Identity</div>
            <div className={styles.kvGrid}>
              <div className={styles.kv}>
                <div className={styles.k}>User</div>
                <div className={styles.v}>{me.user_id}</div>
              </div>
              <div className={styles.kv}>
                <div className={styles.k}>Role</div>
                <div className={styles.v}><span className={styles.role}>{me.role}</span></div>
              </div>
              <div className={styles.kv}>
                <div className={styles.k}>Allowed Symbols</div>
                <div className={styles.vSmall}>
                  {allowedSymbols.length ? allowedSymbols.join(", ") : "—"}
                </div>
              </div>
              <div className={styles.kv}>
                <div className={styles.k}>Last Decision</div>
                <div className={styles.vSmall}>
                  {latest ? `${latest.symbol} • ${latest.decision} • ${latest.confidence}%` : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>System Alert</div>
            <div className={styles.alertBox}>
              {systemAlert ? systemAlert : "Connected to Core"}
            </div>

            <div className={styles.controlsRow}>
              <label className={styles.toggleRow}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <span>Auto-refresh</span>
              </label>

              <div className={styles.inline}>
                <span className={styles.muted}>Every</span>
                <select
                  className={styles.select}
                  value={refreshEvery}
                  onChange={(e) => setRefreshEvery(parseInt(e.target.value, 10))}
                >
                  <option value={5}>5s</option>
                  <option value={8}>8s</option>
                  <option value={10}>10s</option>
                  <option value={15}>15s</option>
                </select>
              </div>
            </div>

            {/* ADMIN controls */}
            {me.role === "ADMIN" && controls && (
              <div className={styles.adminPanel}>
                <div className={styles.adminTitle}>Admin Controls</div>

                <div className={styles.adminControls}>
                  <button
                    className={styles.btn}
                    onClick={() => toggleKillSwitch(!controls.kill_switch)}
                    title="Toggle kill switch (server authority)"
                  >
                    Toggle Kill Switch
                  </button>

                  <select
                    className={styles.select}
                    value={controls.market_mode}
                    onChange={(e) => setMarketMode(e.target.value as any)}
                    title="Set market mode (server authority)"
                  >
                    <option value="EQUITY">EQUITY</option>
                    <option value="CRYPTO">CRYPTO</option>
                  </select>

                  <button
                    className={styles.btnGhost}
                    onClick={() => copyJson({ env: { UID: !!UID, TOK: !!TOK }, me, controls })}
                    title="Copy diagnostics"
                  >
                    Copy Diagnostics
                  </button>
                </div>

                <div className={styles.adminHint}>
                  These buttons hit real Core endpoints. Governance lives here.
                </div>
              </div>
            )}

            {/* CONFIRM guidance */}
            {me.role === "CONFIRM" && (
              <div className={styles.confirmPanel}>
                <div className={styles.confirmTitle}>Confirm Console</div>
                <div className={styles.confirmHint}>
                  You can review signal quality + reasoning. Execution authority remains ADMIN-only.
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Telemetry / filters / table */}
        <section className={styles.card}>
          <div className={styles.cardTitle}>Telemetry</div>

          <div className={styles.filterRow}>
            <input
              className={styles.search}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search symbol / session / regime..."
            />

            <select className={styles.select} value={stanceFilter} onChange={(e) => setStanceFilter(e.target.value as any)}>
              <option value="ALL">All stances</option>
              <option value="ENTER">ENTER</option>
              <option value="HOLD">HOLD</option>
              <option value="STAND_DOWN">STAND_DOWN</option>
              <option value="DENIED">DENIED</option>
            </select>

            <select className={styles.select} value={tierFilter} onChange={(e) => setTierFilter(e.target.value as any)}>
              <option value="ALL">All tiers</option>
              {tierOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select className={styles.select} value={regimeFilter} onChange={(e) => setRegimeFilter(e.target.value as any)}>
              <option value="ALL">All regimes</option>
              {regimeOptions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            <select className={styles.select} value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value as any)}>
              <option value="ALL">All sessions</option>
              {sessionOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select className={styles.select} value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value, 10) as any)}>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
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
                {pageRows.map((d) => (
                  <tr key={d.id} className={styles.row} onClick={() => openReplay(d.id)} title="Click to replay + forensic detail">
                    <td><span className={styles.symbol}>{d.symbol}</span></td>
                    <td><span className={`${styles.badge} ${stanceBadge(d.stance)}`}>{d.stance}</span></td>
                    <td className={styles.mono}>{d.decision}</td>
                    <td><span className={styles.tier}>{String(d.tier).toUpperCase()}</span></td>
                    <td>
                      <div className={styles.confWrap}>
                        <div className={styles.confBar} style={{ width: `${Math.max(0, Math.min(100, d.confidence))}%` }} />
                        <div className={styles.confText}>{d.confidence}%</div>
                      </div>
                    </td>
                    <td>{d.regime ?? "—"}</td>
                    <td>{d.session ?? "—"}</td>
                    <td className={styles.muted}>{fmtTime(d.created_at)}</td>
                  </tr>
                ))}

                {!pageRows.length && (
                  <tr>
                    <td colSpan={8} className={styles.empty}>
                      No results. Adjust filters or wait for telemetry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.pager}>
            <div className={styles.muted}>
              Showing <b>{pageRows.length}</b> / <b>{filtered.length}</b>
            </div>

            <div className={styles.pagerBtns}>
              <button className={styles.btnGhost} disabled={safePage <= 1} onClick={() => setPage(1)}>First</button>
              <button className={styles.btnGhost} disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>Prev</button>
              <span className={styles.pill}>Page <b>{safePage}</b> / <b>{totalPages}</b></span>
              <button className={styles.btnGhost} disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>Next</button>
              <button className={styles.btnGhost} disabled={safePage >= totalPages} onClick={() => setPage(totalPages)}>Last</button>
            </div>
          </div>

          <div className={styles.footerHint}>
            Click a row to expand forensic replay. Auto-refresh runs every {refreshEvery}s.
          </div>
        </section>
      </main>

      {/* Replay Modal */}
      {openId !== null && (
        <div className={styles.modalBackdrop} onClick={() => setOpenId(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalTitle}>Decision Replay</div>
                <div className={styles.muted}>ID: {openId}</div>
              </div>

              <div className={styles.modalActions}>
                <button className={styles.btnGhost} onClick={() => setOpenId(null)}>Close</button>
                <button className={styles.btn} onClick={() => copyJson(replay)}>Copy Payload</button>
              </div>
            </div>

            <div className={styles.modalBody}>
              {replayLoading && <div className={styles.muted}>Loading replay…</div>}

              {!replayLoading && replay && replay.error && (
                <div className={styles.alertBox}>{replay.error}</div>
              )}

              {!replayLoading && replay && !replay.error && (
                <pre className={styles.pre}>
{JSON.stringify(replay, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
