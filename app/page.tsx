export default async function Home() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_OMEGA_CORE_URL}/ledger/decisions`, {
  cache: "no-store"
})


  const data = await res.json()

  return (
    <main style={{ padding: 24 }}>
      <h1>Ω PRIME — Decision Dashboard</h1>

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
