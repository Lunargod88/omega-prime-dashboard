// app/api/core/[...path]/route.ts
import { NextRequest } from "next/server"

const CORE = process.env.NEXT_PUBLIC_OMEGA_CORE_URL

function pickHeaders(req: NextRequest) {
  // Forward ONLY the identity headers (nothing else needed)
  const out: Record<string, string> = {}

  const uid = req.headers.get("x-user-id") ?? ""
  const tok = req.headers.get("x-user-token") ?? ""

  if (uid) out["X-User-Id"] = uid
  if (tok) out["X-User-Token"] = tok

  // If you later proxy webhook routes, do NOT forward webhook keys from client.
  return out
}

async function forward(req: NextRequest, method: string) {
  if (!CORE) {
    return new Response(
      JSON.stringify({ error: "NEXT_PUBLIC_OMEGA_CORE_URL is not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }

  const url = new URL(req.url)
  const parts = url.pathname.split("/api/core/")[1] || ""
  const target = `${CORE}/${parts}${url.search}`

  const headers = pickHeaders(req)

  // Body only for non-GET
  let body: string | undefined = undefined
  if (method !== "GET") {
    body = await req.text()
    headers["Content-Type"] = req.headers.get("content-type") || "application/json"
  }

  const upstream = await fetch(target, {
    method,
    headers,
    body,
    cache: "no-store",
  })

  const text = await upstream.text()
  return new Response(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
    },
  })
}

export async function GET(req: NextRequest) {
  return forward(req, "GET")
}

export async function POST(req: NextRequest) {
  return forward(req, "POST")
}
