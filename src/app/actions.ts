"use server";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export type ActionResult = { ok: boolean; error?: string };
export type ProfileResult = { ok: boolean; profile?: Profile; error?: string };

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

// Troca o prato escolhido pela outra opção (durante a fase de cozinhar).
export async function swapFood(
  matchId: string,
  foodId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("swap_food", {
    p_match_id: matchId,
    p_food_id: foodId,
  });
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

// Busca (ou cria) o perfil do usuário logado com o código de convite.
export async function getOrCreateProfile(): Promise<ProfileResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_or_create_profile");
  if (error) return { ok: false, error: error.message };
  return { ok: true, profile: data as Profile };
}

// Adiciona amigo pelo código de convite. Retorna o perfil do amigo.
export async function addFriendByCode(
  code: string,
): Promise<{ ok: boolean; friend?: Profile; error?: string }> {
  const clean = code.trim().toUpperCase();
  if (!clean) return { ok: false, error: "Digite o código." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_friend_by_code", {
    p_code: clean,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, friend: data as Profile };
}

// Toggle de curtida em um prato do feed social.
export async function toggleLike(
  matchId: string,
): Promise<{ ok: boolean; liked?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_like", {
    p_match_id: matchId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, liked: data as boolean };
}
