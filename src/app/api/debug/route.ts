import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(não definida)";

  let apiReachable = false;
  let apiError = "";
  try {
    const res = await fetch(`${url}/auth/v1/health`, { signal: AbortSignal.timeout(5000) });
    apiReachable = res.ok;
  } catch (e: unknown) {
    apiError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({ url, apiReachable, apiError });
}
