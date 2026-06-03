"use client";

import { useActionState, useState } from "react";
import { login, signup, type AuthState } from "./actions";

const initial: AuthState = {};

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      {/* prato/bola flutuante decorativo */}
      <div className="pointer-events-none absolute -top-10 -left-10 text-[9rem] opacity-20 blur-[1px] [animation:var(--animate-float)]">
        🍲
      </div>
      <div className="pointer-events-none absolute -right-8 bottom-6 text-[7rem] opacity-20 [animation:var(--animate-float)] [animation-delay:-3s]">
        ⚽
      </div>

      <div className="relative z-10 w-full max-w-sm [animation:var(--animate-rise)]">
        {/* Cabeçalho da marca */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card/70 px-3 py-1 text-[0.7rem] font-semibold tracking-[0.18em] text-saffron uppercase">
            Copa 2026
          </span>
          <h1 className="mt-4 font-display text-5xl leading-[0.95] font-black tracking-tight">
            <span className="text-gradient">Comidas</span>
            <br />
            <span className="text-cream">da Copa</span>
          </h1>
          <p className="mx-auto mt-3 max-w-[16rem] text-sm text-muted">
            Sorteie uma seleção, invente o prato típico e cozinhe de verdade.
          </p>
        </div>

        {/* Cartão */}
        <div className="glass rounded-[1.75rem] p-6 shadow-[var(--shadow-warm)]">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-coal/60 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-xl py-2.5 text-sm font-bold transition ${
                mode === "login"
                  ? "bg-saffron text-ink shadow"
                  : "text-muted hover:text-cream"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-xl py-2.5 text-sm font-bold transition ${
                mode === "signup"
                  ? "bg-saffron text-ink shadow"
                  : "text-muted hover:text-cream"
              }`}
            >
              Criar conta
            </button>
          </div>

          <form action={formAction} className="space-y-3">
            {mode === "signup" && (
              <Field
                name="name"
                type="text"
                placeholder="Seu nome"
                autoComplete="name"
                icon="🙂"
              />
            )}
            <Field
              name="email"
              type="email"
              placeholder="Email"
              autoComplete="email"
              icon="✉️"
            />
            <Field
              name="password"
              type="password"
              placeholder="Senha"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              icon="🔒"
            />

            {state.error && (
              <p className="rounded-xl border border-paprika/40 bg-paprika/15 px-3 py-2 text-sm text-paprika">
                {state.error}
              </p>
            )}
            {state.message && (
              <p className="rounded-xl border border-pitch/40 bg-pitch/15 px-3 py-2 text-sm text-pitch">
                {state.message}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-1 w-full rounded-2xl bg-gradient-to-r from-saffron-bright to-paprika py-3.5 text-base font-black text-ink shadow-[var(--shadow-glow)] transition active:scale-[0.98] disabled:opacity-60"
            >
              {pending
                ? "Aguarde…"
                : mode === "login"
                  ? "Entrar e jogar"
                  : "Criar minha conta"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-faint">
          Feito para jogar em dupla 🍴⚽
        </p>
      </div>
    </main>
  );
}

function Field({
  icon,
  ...props
}: { icon: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-line bg-coal/50 px-4 transition focus-within:border-saffron focus-within:bg-coal/80">
      <span className="text-base opacity-70">{icon}</span>
      <input
        {...props}
        className="w-full bg-transparent py-3.5 text-cream placeholder:text-faint outline-none"
      />
    </div>
  );
}
