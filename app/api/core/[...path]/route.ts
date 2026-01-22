import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORE = process.env.NEXT_PUBLIC_OMEGA_CORE_URL!;
const USER_ID = process.env.NEXT_PUBLIC_USER_ID!;
const USER_TOKEN = process.env.NEXT_PUBLIC_USER_TOKEN!;

async function proxy(req: NextRequest) {
  const url = new URL(req.url);
  const target =
    CORE +
    url.pathname.replace("/api/core", "") +
    url.search;

  const headers = new Headers(req.headers);

  headers.set("x-user-id", USER_ID);
  headers.set("x-user-token", USER_TOKEN);
  headers.set("authorization", `Bearer ${USER_TOKEN}`);

  const res = await fetch(target, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method)
      ? undefined
      : await req.text(),
    cache: "no-store",
  });

  return new NextResponse(res.body, {
    status: res.status,
    headers: res.headers,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
