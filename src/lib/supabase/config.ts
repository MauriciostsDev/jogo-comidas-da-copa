// Configuração de conexão com o Supabase.
//
// A URL e a "anon key" são PÚBLICAS por design (a anon key já é embutida no
// bundle do navegador e o acesso é protegido por RLS no banco). Por isso ficam
// aqui como fallback — assim o app funciona mesmo que as variáveis de ambiente
// na Vercel estejam ausentes, trocadas de campo ou com espaços.
//
// Se um dia trocar de projeto Supabase, basta atualizar estes valores
// (ou definir as variáveis NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).

const FALLBACK_URL = "https://quzvmwzufiqhtexthjgg.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1enZtd3p1ZmlxaHRleHRoamdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0Mzg3MTcsImV4cCI6MjA5NjAxNDcxN30.pepFupRYwC5YW3hQSHMD-sp1rgGkkuGSSHrvTGrJUNI";

// Usa a variável de ambiente só se ela tiver o formato esperado; senão, fallback.
function pickUrl(): string {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (v && v.startsWith("http") && v.includes(".supabase.")) return v;
  return FALLBACK_URL;
}

function pickKey(): string {
  const v = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  // anon keys começam com "eyJ" (JWT) ou "sb_" (publishable nova).
  if (v && (v.startsWith("eyJ") || v.startsWith("sb_"))) return v;
  return FALLBACK_ANON_KEY;
}

export const SUPABASE_URL = pickUrl();
export const SUPABASE_ANON_KEY = pickKey();
