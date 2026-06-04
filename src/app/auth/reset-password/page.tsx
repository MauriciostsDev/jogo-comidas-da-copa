"use client";

import { useActionState, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updatePassword, type AuthState } from "@/app/login/actions";
import { useRouter } from "next/navigation";

const initial: AuthState = {};

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [state, formAction, pending] = useActionState(updatePassword, initial);
  const router = useRouter();

  useEffect(() => {
    // Supabase embeds the recovery token in the URL hash — exchange it for a session
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    // Trigger hash parsing (needed when landing directly from email link)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      else setSessionError("Link inválido ou expirado. Solicite um novo.");
    });
  }, []);

  if (sessionError) {
    return (
      <main className="stage center">
        <div className="card bolts accent" style={{ maxWidth: 420, width: "100%" }}>
          <div className="card-title">⚠ LINK EXPIRADO</div>
          <p className="help">{sessionError}</p>
          <button className="btn block lg mt20" onClick={() => router.push("/login")}>
            VOLTAR AO LOGIN ▸
          </button>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="stage center">
        <p className="help">Verificando link…</p>
      </main>
    );
  }

  return (
    <main className="stage center">
      <div className="card bolts accent" style={{ maxWidth: 420, width: "100%" }}>
        <div className="card-title">🔑 NOVA SENHA</div>
        <p className="help" style={{ marginBottom: 14 }}>
          Escolha uma nova senha para sua conta.
        </p>

        <form action={formAction} className="col" style={{ textAlign: "left" }}>
          <div className="field">
            <label className="label">NOVA SENHA</label>
            <input
              className="input"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <div className="field">
            <label className="label">CONFIRMAR SENHA</label>
            <input
              className="input"
              name="confirm"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          {state.error && (
            <p className="tiny" style={{ color: "var(--pink)", marginTop: 4 }}>
              ⚠ {state.error}
            </p>
          )}

          <button type="submit" disabled={pending} className="btn block lg mt8">
            {pending ? "SALVANDO…" : "SALVAR SENHA ▸"}
          </button>
        </form>
      </div>
    </main>
  );
}
