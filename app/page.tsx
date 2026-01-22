"use client"
import React from "react"

const CORE = process.env.NEXT_PUBLIC_OMEGA_CORE_URL!
const UID = process.env.NEXT_PUBLIC_USER_ID ?? ""
const TOKEN = process.env.NEXT_PUBLIC_USER_TOKEN ?? ""

async function fetchJSON(url: string) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "X-User-Id": UID,
      "X-User-Token": TOKEN,
    },
  })
  return res.json()
}

async function getMe() {
  return fetchJSON(`${CORE}/me`)
}

async function getControls() {
  return fetchJSON(`${CORE}/controls`)
}

async function getDecisions() {
  return fetchJSON(`${CORE}/ledger/decisions`)
}

function stanceColor(stance: string) {
  if (stance === "ENTER") return "#00ffd5"
  if (stance === "HOLD") return "#ffb703"
  return "#ff4d6d"
}

export default async function Home() {
  const me = await getMe()
  const controls = await getControls()
  const data = await getDecisions()

  const latest = data.decisions?.[0]
  const stance =
    latest?.stance === "ENTER"
      ? "ENTER"
      : latest?.stance === "HOLD"
      ? "HOLD"
      : "STAND DOWN"

  const stanceClr = stanceColor(stance)

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 32,
        background:
          "radial-gradient(circle at top, #0b132b 0%, #020617 60%)",
        color: "#e5e7eb",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
        }}
      >
        <h1 style={{ fontSize: 28, letterSpacing: 1 }}>
          Ω PRIME <span style={{ opacity: 0.6 }}>Command</span>
        </h1>

        <div style={{ display: "flex", gap: 16 }}>
          <Badge label={controls.market_mode} />
          <Badge label={me.role} />
        </div>
      </header>

      {/* STANCE CARD */}
      <section
        style={{
          border: `1px solid ${stanceClr}`,
          boxShadow: `0 0 30px ${stanceClr}40`,
          borderRadius: 16,
          padding: 24,
          marginBottom: 32,
        }}
      >
        <h2 style={{ marginBottom: 8 }}>Current Stance</h2>
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: stanceClr,
            marginBottom: 12,
          }}
        >
          {stance}
        </div>

        {latest && (
          <>
            <p>
              <strong>{latest.symbol}</strong> — {latest.decision}
            </p>

            <ConfidenceBar value={latest.confidence} />
          </>
        )}
      </section>

      {/* ADMIN CONTROLS */}
      {me.role === "ADMIN" && (
        <section
          style={{
            borderRadius: 16,
            padding: 24,
            marginBottom: 32,
            background: "#020617",
            border: "1px solid #334155",
          }}
        >
          <h2 style={{ marginBottom: 16 }}>Admin Controls</h2>

          <div style={{ display: "flex", gap: 24 }}>
            <ControlToggle
              label="Kill Switch"
              value={controls.kill_switch}
              endpoint="/controls/kill-switch"
            />
            <ModeToggle current={controls.market_mode} />
          </div>
        </section>
      )}

      {/* DECISION HISTORY */}
      <section>
        <h2 style={{ marginBottom: 16 }}>Decision History</h2>

        <div style={{ display: "grid", gap: 12 }}>
          {data.decisions.map((d: any) => (
            <div
              key={d.id}
              style={{
                padding: 16,
                borderRadius: 12,
                background: "#020617",
                borderLeft: `4px solid ${stanceColor(d.stance)}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong>{d.symbol}</strong> · {d.decision}
                <div style={{ fontSize: 12, opacity: 0.6 }}>
                  {new Date(d.created_at).toLocaleTimeString()}
                </div>
              </div>

              <ConfidenceMini value={d.confidence} />
            </div>
          ))}
        </div>
      </section>

      {/* AUTO REFRESH */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            setTimeout(() => location.reload(), 8000);
          `,
        }}
      />
    </main>
  )
}

/* ---------------- COMPONENTS ---------------- */

function Badge({ label }: { label: string }) {
  return (
    <span
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        background: "#020617",
        border: "1px solid #334155",
        fontSize: 12,
        letterSpacing: 1,
      }}
    >
      {label}
    </span>
  )
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, marginBottom: 4 }}>Confidence</div>
      <div
        style={{
          height: 10,
          background: "#1e293b",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${value}%`,
            height: "100%",
            background:
              "linear-gradient(90deg, #00ffd5, #38bdf8)",
          }}
        />
      </div>
    </div>
  )
}

function ConfidenceMini({ value }: { value: number }) {
  return (
    <div style={{ minWidth: 60, textAlign: "right" }}>
      <div style={{ fontSize: 14 }}>{value}%</div>
    </div>
  )
}

function ControlToggle({
  label,
  value,
  endpoint,
}: {
  label: string
  value: boolean
  endpoint: string
}) {
  async function toggle() {
    await fetch(`${CORE}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": UID,
        "X-User-Token": TOKEN,
      },
      body: JSON.stringify({ enabled: !value }),
    })
    location.reload()
  }

  return (
    <button
      onClick={toggle}
      style={{
        padding: "12px 20px",
        borderRadius: 12,
        border: "1px solid #334155",
        background: value ? "#7c2d12" : "#064e3b",
        color: "#fff",
        cursor: "pointer",
      }}
    >
      {label}: {value ? "ON" : "OFF"}
    </button>
  )
}

function ModeToggle({ current }: { current: string }) {
  async function flip() {
    await fetch(`${CORE}/controls/mode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": UID,
        "X-User-Token": TOKEN,
      },
      body: JSON.stringify({
        mode: current === "EQUITY" ? "CRYPTO" : "EQUITY",
      }),
    })
    location.reload()
  }

  return (
    <button
      onClick={flip}
      style={{
        padding: "12px 20px",
        borderRadius: 12,
        border: "1px solid #334155",
        background: "#1e293b",
        color: "#fff",
        cursor: "pointer",
      }}
    >
      Mode: {current}
    </button>
  )
}
