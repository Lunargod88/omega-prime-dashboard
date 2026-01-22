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

async function postTradeEvent(tradeId: number, eventType: string) {
  await fetch(
    `${process.env.NEXT_PUBLIC_OMEGA_CORE_URL}/trades/${tradeId}/events`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": process.env.NEXT_PUBLIC_USER_ID ?? "",
        "X-User-Token": process.env.NEXT_PUBLIC_USER_TOKEN ?? "",
      },
      body: JSON.stringify({ event_type: eventType }),
    }
  )
}

export default async function Home() {
  const me = await getMe()
  const data = await getDecisions()
  const latest = data.decisions?.[0]

  const stance =
    latest?.stance === "ENTER" ? "ENTER" :
    latest?.stance === "HOLD" ? "HOLD" :
    "STAND DOWN"

  return (
    <main style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28 }}>Ω PRIME — Confirm Dashboard</h1>

      <section style={{ marginTop: 16 }}>
        <p><strong>User:</strong> {me.user_id}</p>
        <p><strong>Role:</strong> {me.role}</p>
        <p>
          <strong>Current Stance:</strong>{" "}
          <span
            style={{
              color:
                stance === "ENTER" ? "#00ff99" :
                stance === "HOLD" ? "#ffaa00" :
                "#ff4444",
              fontWeight: "bold"
            }}
          >
            {stance}
          </span>
        </p>
      </section>

      <hr style={{ margin: "24px 0" }} />

      {latest && (
        <section style={{ padding: 16, border: "1px solid #333", borderRadius: 8 }}>
          <h2>Latest Signal</h2>

          <p><strong>Symbol:</strong> {latest.symbol}</p>
          <p><strong>Decision:</strong> {latest.decision}</p>
          <p><strong>Tier:</strong> {latest.tier}</p>
          <p><strong>Confidence:</strong> {latest.confidence}%</p>

          <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
            <form
              action={async () => {
                "use server"
                await postTradeEvent(latest.trade_id, "ACK")
              }}
            >
              <button
                style={{
                  padding: "10px 16px",
                  background: "#00ff99",
                  color: "#000",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer"
                }}
              >
                ✅ Acknowledge
              </button>
            </form>

            <form
              action={async () => {
                "use server"
                await postTradeEvent(latest.trade_id, "FLAG_RISK")
              }}
            >
              <button
                style={{
                  padding: "10px 16px",
                  background: "#ff4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer"
                }}
              >
                ⚠️ Flag Risk
              </button>
            </form>
          </div>
        </section>
      )}

      <hr style={{ margin: "32px 0" }} />

      <section>
        <h2>Recent Decisions</h2>

        <ul style={{ marginTop: 12 }}>
          {data.decisions.map((d: any) => (
            <li key={d.id} style={{ marginBottom: 8 }}>
              <strong>{d.symbol}</strong> — {d.decision} ({d.confidence}%)
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
