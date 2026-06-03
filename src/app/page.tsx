import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Game from "@/components/Game";

export default async function Home() {
  let user = null;
  try {
    const supabase = await createClient();
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    redirect("/login");
  }

  if (!user) redirect("/login");

  const userName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    "Jogador";

  return <Game userId={user.id} userName={userName} />;
}
