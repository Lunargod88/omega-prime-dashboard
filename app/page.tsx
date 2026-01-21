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

export default async function Home() {
  const me = await getMe()
  const data = await getDecisions()

  const latest = data.decisions?.[0]

  const stance =
    latest?.stance === "DENIED" ? "STAND DOWN" :
    latest?.stance === "HOLD" ? "HOLD" :
    latest?.stance === "ENTER" ? "ENTER" :
    "STAND DOWN"

  return (
    <main style={{ padding: 24 }}>
      <h1>Ω PRIME — Decision Dashboard</h1>

      <p><strong>User:</strong> {me.user_id}</p>
      <p><strong>Role:</strong> {me.role}</p>
      <p><strong>Current Stance:</strong> {stance}</p>

      {me.role === "ADMIN" && (
        <section style={{ marginTop: 24, padding: 16, border: "1px solid #444" }}>
          <h2>Admin Controls</h2>
          <p>Kill Switch, Mode Toggle, and execution controls live here.</p>
        </section>
      )}

      <hr style={{ margin: "24px 0" }} />

      <p>Total Decisions: {data.count}</p>

      <ul>
        {data.decisions.map((d: any) => (
          <li key={d.id}>
            <strong>{d.symbol}</strong> — {d.decision} ({d.confidence})
          </li>
        ))}
      </ul>
    </main>
  )
}
