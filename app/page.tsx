export default async function Home() {
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

  const data = await res.json()

  const latest = data.decisions?.[0]

  const stance =
    latest?.stance === "DENIED" ? "STAND DOWN" :
    latest?.stance === "HOLD" ? "HOLD" :
    latest?.stance === "ENTER" ? "ENTER" :
    "STAND DOWN"

  return (
    <main style={{ padding: 24 }}>
      <h1>Ω PRIME — Decision Dashboard</h1>

      <p><strong>User:</strong> {process.env.NEXT_PUBLIC_USER_ID}</p>

      <p><strong>Current Stance:</strong> {stance}</p>

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
