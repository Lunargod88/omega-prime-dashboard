export default async function Home() {
  const CORE = process.env.NEXT_PUBLIC_OMEGA_CORE_URL

  // --- Fetch identity ---
  const meRes = await fetch(`${CORE}/me`, {
    cache: "no-store",
    headers: {
      // Browser users will not have headers yet → READ by default
      // Later you can add these via middleware or cookies
    }
  })

  const me = await meRes.json()

  // --- Fetch decisions ---
  const res = await fetch(`${CORE}/ledger/decisions`, {
    cache: "no-store"
  })

  const data = await res.json()

  // --- Stance logic ---
  const latest = data.decisions?.[0]

  const stance =
    latest?.stance === "STAND_DOWN" ? "STAND DOWN" :
    latest?.stance === "HOLD" ? "HOLD" :
    latest?.stance === "ENTER" ? "ENTER" :
    "STAND DOWN"

  const isAdmin = me.role === "ADMIN"
  const isConfirm = me.role === "CONFIRM"

  return (
    <main style={{ padding: 24 }}>
      <h1>Ω PRIME — Decision Dashboard</h1>

      {/* IDENTITY */}
      <div style={{ marginBottom: 16 }}>
        <strong>User:</strong> {me.user_id} <br />
        <strong>Role:</strong> {me.role}
      </div>

      {/* ADMIN BANNER */}
      {isAdmin && (
        <div style={{
          padding: 12,
          marginBottom: 16,
          border: "2px solid red",
          background: "#fff5f5"
        }}>
          <strong>ADMIN MODE</strong><br />
          You have execution and control privileges.
        </div>
      )}

      {/* CONFIRM MODE BANNER */}
      {isConfirm && (
        <div style={{
          padding: 12,
          marginBottom: 16,
          border: "2px solid #999",
          background: "#f7f7f7"
        }}>
          <strong>CONFIRM MODE</strong><br />
          View + confirm only. No execution.
        </div>
      )}

      {/* STANCE */}
      <p><strong>Current Stance:</strong> {stance}</p>

      {/* DECISIONS */}
      <p>Total Decisions: {data.count}</p>

      <ul>
        {data.decisions.map((d: any) => (
          <li key={d.id}>
            <strong>{d.symbol}</strong> — {d.decision} ({d.confidence})
          </li>
        ))}
      </ul>

      {/* ADMIN-ONLY CONTROLS PLACEHOLDER */}
      {isAdmin && (
        <div style={{ marginTop: 32 }}>
          <h3>Admin Controls</h3>
          <p>(Execution, kill switch, mode toggle live here)</p>
        </div>
      )}
    </main>
  )
}
