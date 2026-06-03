"use server";

import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: boolean; error?: string };

// Sorteia um país e abre a rodada de 7 minutos.
export async function drawCountry(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("draw_country");
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Salva o prato típico que o jogador escreveu (pode reescrever até o sorteio).
export async function submitFood(
  matchId: string,
  text: string,
): Promise<ActionResult> {
  const clean = text.trim();
  if (!clean) return { ok: false, error: "Escreva um prato." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Você precisa estar logado." };

  const author =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    "Jogador";

  const { error } = await supabase.rpc("submit_food", {
    p_match_id: matchId,
    p_text: clean,
    p_author: author,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Sorteia aleatoriamente um dos pratos escritos.
export async function chooseFood(matchId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("choose_food", { p_match_id: matchId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Anexa a URL da foto do prato pronto e encerra a rodada.
export async function attachPhoto(
  matchId: string,
  url: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("attach_photo", {
    p_match_id: matchId,
    p_url: url,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Salva (ou atualiza) a avaliação de um prato pronto: estrelas + comentário.
export async function submitReview(
  matchId: string,
  rating: number,
  comment: string,
): Promise<ActionResult> {
  if (rating < 1 || rating > 5)
    return { ok: false, error: "Dê de 1 a 5 estrelas." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Você precisa estar logado." };

  const author =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    "Jogador";

  const { error } = await supabase.rpc("submit_review", {
    p_match_id: matchId,
    p_rating: rating,
    p_comment: comment,
    p_author: author,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
