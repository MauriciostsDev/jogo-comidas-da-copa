import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(não definida)";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "(não definida)";

  // Test 1: health
  let healthStatus = 0;
  try {
    const res = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key }, signal: AbortSignal.timeout(8000) });
    healthStatus = res.status;
  } catch (e) { healthStatus = -1; }

  // Test 2: login with admin account
  let loginStatus = 0;
  let loginBody = "";
  try {
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@copalocal.dev", password: "Admin@Copa2026!" }),
      signal: AbortSignal.timeout(8000),
    });
    loginStatus = res.status;
    const data = await res.json() as Record<string, unknown>;
    loginBody = data.access_token ? "✓ token recebido" : JSON.stringify(data).slice(0, 200);
  } catch (e) { loginBody = e instanceof Error ? e.message : String(e); }

  return NextResponse.json({ url, healthStatus, loginStatus, loginBody });
}
