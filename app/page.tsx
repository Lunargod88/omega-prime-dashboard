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

async function getExecutionEvents() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_OMEGA_CORE_URL}/execution/events`,
    { cache: "no-store" }
  )
  return res.json()
}

export default async function Home() {
  const data = await getDecisions()
  const events = await getExecutionEvents()

  return (
    <main style={{ padding: 32 }}>
      <h1>Ω PRIME — Execution Observatory</h1>

      <h2 style={{ marginTop: 24 }}>Recent Decisions</h2>
      <ul>
        {data.decisions.map((d: any) => {
          const ev = events.find((e: any) => e.decision_id === d.id)
          return (
            <li key={d.id} style={{ marginBottom: 12 }}>
              <strong>{d.symbol}</strong> — {d.decision} ({d.tier})
              {ev && (
                <span style={{ marginLeft: 12 }}>
                  [{ev.status}
                  {ev.latency_ms && ` · ${ev.latency_ms}ms`}
                  {ev.error && ` · ERROR`}
                  ]
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </main>
  )
}
