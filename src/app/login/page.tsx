"use client";

import { useActionState, useEffect, useState } from "react";
import { login, signup, type AuthState } from "./actions";
import { TEAMS } from "@/lib/teams";

const initial: AuthState = {};

// Two copies of the flag row for infinite marquee
const FLAGS = TEAMS.map((t) => t.f).join(" ");
const MARQUEE_ROW = FLAGS + " " + FLAGS;

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const action = mode === "login" ? login : signup;
  const [state, formAction, pending] = useActionState(action, initial);

  function switchMode(e: React.MouseEvent) {
    e.preventDefault();
    setMode((m) => (m === "login" ? "signup" : "login"));
  }

  return (
    <>
      {/* Topbar */}
      <header className="topbar">
        <div className="brand">
          <span className="ball">⚽</span> COMIDAS <b>DA COPA</b>
        </div>
        <div className="right">
          <ThemeToggle />
        </div>
      </header>

      <main className="stage center">
        {/* Stepper — login = step 0 */}
        <div className="steps">
          {[
            { type: "dot", n: 1 }, { type: "bar" },
            { type: "dot", n: 2 }, { type: "bar" },
            { type: "dot", n: 3 }, { type: "bar" },
            { type: "dot", n: 4 }, { type: "bar" },
            { type: "dot", n: 5 },
          ].map((el, i) => (
            <div key={i} className={`step ${i === 0 ? "cur" : ""}`}>
              {el.type === "dot" ? <span className="dot">{(el as { n: number }).n}</span> : <span className="bar" />}
            </div>
          ))}
        </div>

        {/* Marquee de bandeiras */}
        <div className="flags-marquee" style={{ width: "100%" }}>
          <div>{MARQUEE_ROW}</div>
        </div>

        <h1 className="neon floaty" style={{ marginTop: 8 }}>
          COMIDAS DA COPA
        </h1>
        <p className="lead">Sorteie · Cozinhe · Avalie 🏆</p>

        {/* Card de auth */}
        <div className="card bolts accent" style={{ width: "100%", maxWidth: 420, marginTop: 8 }}>
          <div className="card-title">
            {mode === "login" ? "INSERT COIN" : "NEW PLAYER"}
          </div>
          <p className="help" style={{ marginBottom: 14 }}>
            {mode === "login"
              ? "Faça login pra entrar na sala"
              : "Crie seu jogador pra começar"}
          </p>

          <form action={formAction} className="col" style={{ textAlign: "left" }}>
            {mode === "signup" && (
              <div className="field">
                <label className="label">NOME DE JOGADOR</label>
                <input
                  className="input"
                  name="name"
                  type="text"
                  placeholder="Chef..."
                  maxLength={14}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="field">
              <label className="label">E-MAIL</label>
              <input
                className="input"
                name="email"
                type="email"
                placeholder="voce@email.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="field">
              <label className="label">SENHA</label>
              <input
                className="input"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
            </div>

            {state.error && (
              <p
                className="tiny"
                style={{ color: "var(--pink)", marginTop: 4 }}
              >
                ⚠ {state.error}
              </p>
            )}
            {state.message && (
              <p
                className="tiny"
                style={{ color: "var(--green)", marginTop: 4 }}
              >
                ✓ {state.message}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="btn block lg mt8"
            >
              {pending
                ? "AGUARDE…"
                : mode === "login"
                  ? "ENTRAR ▸"
                  : "CRIAR CONTA ▸"}
            </button>
          </form>

          <div className="divider mt20">OU</div>
          <a
            href="#"
            onClick={switchMode}
            className="tiny"
            style={{
              display: "block",
              textAlign: "center",
              color: "var(--accent-2)",
              marginTop: 12,
            }}
          >
            {mode === "login"
              ? "Não tem conta? CADASTRE-SE"
              : "Já tem conta? ENTRAR"}
          </a>
        </div>

        <p className="tiny" style={{ color: "var(--muted)", marginTop: 18 }}>
          🔒 Autenticação segura
        </p>
      </main>
    </>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme") ?? "dark";
    setTheme(t as "dark" | "light");
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("cc-theme", next);
    setTheme(next);
  }

  return (
    <button className="toggle" onClick={toggle} aria-label="Alternar tema">
      <span>{theme === "light" ? "☀️" : "🌙"}</span>{" "}
      <span>{theme === "light" ? "CLARO" : "ESCURO"}</span>
    </button>
  );
}
