export default async function Home() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_OMEGA_CORE_URL}/ledger/decisions`, {
    cache: "no-store"
  })

  const data = await res.json()

  // STEP 15C — STANCE LOGIC (GOES HERE)
  const latest = data.decisions?.[0]

  const stance =
    latest?.decision === "STAND_DOWN" ? "STAND DOWN" :
    latest?.decision === "HOLD" ? "HOLD" :
    latest?.decision ? "ENTER" : "STAND DOWN"

  return (
    <main style={{ padding: 24 }}>
      <h1>Ω PRIME — Decision Dashboard</h1>
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
