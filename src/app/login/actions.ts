"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Preencha email e senha." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (
      error.code === "email_not_confirmed" ||
      /not confirmed/i.test(error.message)
    ) {
      return {
        error:
          "Seu email ainda não foi confirmado. Abra o link que o Supabase enviou e tente de novo.",
      };
    }
    return { error: "Email ou senha inválidos." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return { error: "Preencha nome, email e senha." };
  }
  if (password.length < 6) {
    return { error: "A senha precisa ter ao menos 6 caracteres." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });

  if (error) {
    if (
      error.code === "user_already_exists" ||
      /already registered|already exists/i.test(error.message)
    ) {
      return {
        error: "Essa conta já existe. Use a aba “Entrar” pra fazer login.",
      };
    }
    return { error: error.message };
  }

  // Se a confirmação de email estiver desligada, já vem com sessão ativa.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  return {
    message:
      "Conta criada! Confirme pelo link enviado ao seu email e depois faça login.",
  };
}
