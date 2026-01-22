async function getMe() {
  try {
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

    if (!res.ok) {
      return { user_id: "UNKNOWN", role: "READ", market_mode: "UNKNOWN", kill_switch: false }
    }

    return await res.json()
  } catch {
    return { user_id: "UNKNOWN", role: "READ", market_mode: "UNKNOWN", kill_switch: false }
  }
}

async function getDecisions() {
  try {
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

    if (!res.ok) {
      return { count: 0, decisions: [] }
    }

    const data = await res.json()
    return {
      count: Array.isArray(data?.decisions) ? data.decisions.length : 0,
      decisions: Array.isArray(data?.decisions) ? data.decisions : [],
    }
  } catch {
    return { count: 0, decisions: [] }
  }
}

export default async function Home() {
  const me = await getMe()
  const data = await getDecisions()

  const latest = data.decisions[0]

  const stance =
    latest?.stance === "ENTER"
      ? "ENTER"
      : latest?.stance === "HOLD"
      ? "HOLD"
      : "STAND DOWN"

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Ω PRIME — Decision Dashboard</h1>

      <section style={{ marginBottom: 16 }}>
        <p><strong>User:</strong> {me.user_id}</p>
        <p><strong>Role:</strong> {me.role}</p>
        <p><strong>Market Mode:</strong> {me.market_mode}</p>
        <p><strong>Kill Switch:</strong> {me.kill_switch ? "ARMED" : "DISARMED"}</p>
        <p><strong>Current Stance:</strong> {stance}</p>
      </section>

      {me.role === "ADMIN" && (
        <section
          style={{
            marginTop: 24,
            padding: 16,
            border: "1px solid #444",
            borderRadius: 8,
            background: "#111",
          }}
        >
          <h2>Admin Controls</h2>
          <p>Kill Switch, Market Mode, and execution authority active.</p>
        </section>
      )}

      <hr style={{ margin: "24px 0" }} />

      <p><strong>Total Decisions:</strong> {data.count}</p>

      {data.decisions.length === 0 && (
        <p style={{ opacity: 0.7 }}>No decisions recorded yet.</p>
      )}

      <ul>
        {data.decisions.map((d: any) => (
          <li key={d.id} style={{ marginBottom: 8 }}>
            <strong>{d.symbol}</strong> — {d.decision} ({d.confidence}) — Tier {d.tier}
          </li>
        ))}
      </ul>
    </main>
  )
}
