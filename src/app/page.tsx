import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Game from "@/components/Game";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const userName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    "Jogador";

  return <Game userId={user.id} userName={userName} />;
}
