const CORE_URL =
  process.env.NEXT_PUBLIC_CORE_URL || "https://omega-core-production.up.railway.app";

const USER_ID = process.env.NEXT_PUBLIC_USER_ID || "";
const USER_TOKEN = process.env.NEXT_PUBLIC_USER_TOKEN || "";

function coreHeaders(extra?: Record<string, string>) {
  return {
    "Content-Type": "application/json",
    "X-User-Id": USER_ID,
    "X-User-Token": USER_TOKEN,
    ...(extra || {}),
  };
}

export async function coreGet<T>(path: string): Promise<T> {
  const res = await fetch(`${CORE_URL}${path}`, {
    method: "GET",
    headers: coreHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export async function corePost<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${CORE_URL}${path}`, {
    method: "POST",
    headers: coreHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}
