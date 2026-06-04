import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(não definida)";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "(não definida)";

  let status = 0;
  let apiError = "";
  let body = "";
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(8000),
    });
    status = res.status;
    body = await res.text();
  } catch (e: unknown) {
    apiError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({ url, key: key.slice(0, 20) + "...", status, body: body.slice(0, 200), apiError });
}
