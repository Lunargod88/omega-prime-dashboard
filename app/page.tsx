export const revalidate = 5 // 19.2D — auto-refresh every 5s

async function getMe() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_OMEGA_CORE_URL}/me`,
    {
      cache: "no-store",
      headers: {
        "X-User-Id": process.env.NEXT_PUBLIC_USER_ID ?? "",
        "X-User-Token": process.env.NEXT_PUBLIC_USER_TOKEN ?? "",
      },
    }
  )
  return res.json()
}

async function getDecisions() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_OMEGA_CORE_URL}/ledger/decisions`,
    {
      cache: "no-store",
      headers: {
        "X-User-Id": process.env.NEXT_PUBLIC_USER_ID ?? "",
        "X-User-Token": process.env.NEXT_PUBLIC_USER_TOKEN ?? "",
      },
    }
  )
  return res.json()
}

async function getControls() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_OMEGA_CORE_URL}/controls`,
    { cache: "no-store" }
  )
  return res.json()
}

export default async function Home() {
  const me = await getMe()
  const data = await getDecisions()
  const controls = await getControls()

  const latest = data.decisions?.[0]

  const stance =
    latest?.stance === "ENTER"
      ? "ENTER"
      : latest?.stance === "HOLD"
      ? "HOLD"
      : "STAND DOWN"

  const stanceColor =
    stance === "ENTER"
      ? "#22c55e"
      : stance === "HOLD"
      ? "#facc15"
      : "#ef4444"

  return (
    <main
      style={{
        padding: 32,
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: "radial-gradient(circle at top, #0f172a, #020617)",
        color: "#e5e7eb",
        minHeight: "100vh",
      }}
    >
      {/* HEADER */}
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, letterSpacing: 1 }}>
          Ω PRIME <span style={{ opacity: 0.6 }}>— Decision Core</span>
        </h1>

        <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
          <span>User: <strong>{me.user_id}</strong></span>
          <span>Role: <strong>{me.role}</strong></span>

          <span
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background:
                controls.market_mode === "CRYPTO" ? "#2563eb" : "#16a34a",
              color: "white",
              fontWeight: "bold",
              fontSize: 12,
            }}
          >
            MODE: {controls.market_mode}
          </span>
        </div>
      </header>

      {/* STANCE CARD */}
      <section
        style={{
          border: "1px solid #1f2937",
          borderRadius: 16,
          padding: 24,
          marginBottom: 32,
          background: "linear-gradient(180deg, #020617, #020617cc)",
        }}
      >
        <h2 style={{ marginBottom: 12 }}>Current System Stance</h2>

        <div
          style={{
            fontSize: 28,
            fontWeight: "bold",
            color: stanceColor,
          }}
        >
          {stance}
        </div>

        {latest && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, opacity: 0.8 }}>
              Confidence: {latest.confidence}%
            </div>

            <div
              style={{
                background: "#1f2937",
                borderRadius: 8,
                marginTop: 6,
                height: 10,
                width: 260,
              }}
            >
              <div
                style={{
                  width: `${latest.confidence}%`,
                  height: "100%",
                  borderRadius: 8,
                  background:
                    latest.confidence >= 80
                      ? "linear-gradient(90deg,#22c55e,#16a34a)"
                      : latest.confidence >= 70
                      ? "linear-gradient(90deg,#facc15,#eab308)"
                      : "linear-gradient(90deg,#ef4444,#dc2626)",
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* ADMIN CONTROLS */}
      {me.role === "ADMIN" && (
        <section
          style={{
            border: "1px solid #334155",
            borderRadius: 16,
            padding: 24,
            marginBottom: 32,
            background: "linear-gradient(180deg,#020617,#020617aa)",
          }}
        >
          <h2 style={{ marginBottom: 8 }}>Admin Control Layer</h2>
          <p style={{ opacity: 0.7, fontSize: 14 }}>
            Execution governance, kill switch, and mode controls are active.
          </p>
        </section>
      )}

      {/* DECISION FEED */}
      <section>
        <h2 style={{ marginBottom: 12 }}>
          Decision Ledger <span style={{ opacity: 0.6 }}>({data.count})</span>
        </h2>

        <ul style={{ listStyle: "none", padding: 0 }}>
          {data.decisions.map((d: any) => (
            <li
              key={d.id}
              style={{
                padding: 16,
                borderRadius: 12,
                border: "1px solid #1f2937",
                marginBottom: 12,
                background: "#020617",
                transition: "all .2s ease",
              }}
            >
              <div style={{ fontWeight: "bold" }}>
                {d.symbol} — {d.decision}
              </div>

              <div style={{ fontSize: 13, opacity: 0.7 }}>
                Confidence: {d.confidence}%
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
