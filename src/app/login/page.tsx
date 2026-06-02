"use client";

import { useActionState, useState } from "react";
import { login, signup, type AuthState } from "./actions";

const initial: AuthState = {};

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-700 via-green-800 to-yellow-700 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white/95 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 text-center">
          <div className="text-5xl">🍽️⚽</div>
          <h1 className="mt-2 text-2xl font-black text-green-900">
            Comidas da Copa
          </h1>
          <p className="text-sm text-gray-500">
            {mode === "login" ? "Entre para jogar" : "Crie sua conta"}
          </p>
        </div>

        <form action={formAction} className="space-y-3">
          {mode === "signup" && (
            <input
              name="name"
              type="text"
              placeholder="Seu nome"
              autoComplete="name"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-green-600"
            />
          )}
          <input
            name="email"
            type="email"
            placeholder="Email"
            autoComplete="email"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-green-600"
          />
          <input
            name="password"
            type="password"
            placeholder="Senha"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-green-600"
          />

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}
          {state.message && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-green-700 py-3 font-bold text-white transition hover:bg-green-800 disabled:opacity-60"
          >
            {pending
              ? "Aguarde..."
              : mode === "login"
                ? "Entrar"
                : "Criar conta"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 w-full text-center text-sm text-green-700 hover:underline"
        >
          {mode === "login"
            ? "Não tem conta? Cadastre-se"
            : "Já tem conta? Entrar"}
        </button>
      </div>
    </main>
  );
}
