"use client";

import { useActionState, useEffect, useState } from "react";
import { login, signup, forgotPassword, type AuthState } from "./actions";
import { TEAMS } from "@/lib/teams";

const initial: AuthState = {};

// Two copies of the flag row for infinite marquee
const FLAGS = TEAMS.map((t) => t.f).join(" ");
const MARQUEE_ROW = FLAGS + " " + FLAGS;

// Passo a passo do jogo (dashboard da tela inicial)
const HOW_STEPS: { emoji: string; title: string; text: string }[] = [
  { emoji: "🚪", title: "SALA", text: "Crie uma sala (código COPA-XXXX) ou entre na sala da sua dupla." },
  { emoji: "🎲", title: "SORTEIO", text: "Sorteie uma das 48 seleções da Copa 2026 na roleta." },
  { emoji: "✍️", title: "PRATO", text: "Cada um escreve um prato típico do país — 7 minutos no relógio." },
  { emoji: "🎰", title: "ESCOLHA", text: "A roleta sorteia um dos dois pratos. Dá pra trocar pela outra opção." },
  { emoji: "📸", title: "COZINHAR", text: "Cozinhem de verdade e mandem a foto do prato pronto." },
  { emoji: "🏆", title: "GALERIA", text: "A foto entra na galeria de vocês; avaliem com estrelas + comentário." },
  { emoji: "🌐", title: "SOCIAL", text: "A galera curte, comenta e dá nota de apresentação (0–10)." },
];

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const action = mode === "login" ? login : mode === "signup" ? signup : forgotPassword;
  const [state, formAction, pending] = useActionState(action, initial);

  function switchMode(e: React.MouseEvent) {
    e.preventDefault();
    setMode((m) => (m === "login" ? "signup" : "login"));
  }

  function goForgot(e: React.MouseEvent) {
    e.preventDefault();
    setMode("forgot");
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

      <main className="stage center" style={{ maxWidth: 1040 }}>
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

        <div className="login-row">
        {/* Coluna esquerda: login */}
        <div className="login-col">
        {/* Card de auth */}
        <div className="card bolts accent" style={{ width: "100%", maxWidth: 420 }}>
          <div className="card-title">
            {mode === "login" ? "INSERT COIN" : mode === "signup" ? "NEW PLAYER" : "RESET SENHA"}
          </div>
          <p className="help" style={{ marginBottom: 14 }}>
            {mode === "login"
              ? "Faça login pra entrar na sala"
              : mode === "signup"
              ? "Crie seu jogador pra começar"
              : "Digite seu email para receber o link de redefinição"}
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

            {mode !== "forgot" && (
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
            )}

            {state.error && (
              <p className="tiny" style={{ color: "var(--pink)", marginTop: 4 }}>
                ⚠ {state.error}
              </p>
            )}
            {state.message && (
              <p className="tiny" style={{ color: "var(--green)", marginTop: 4 }}>
                ✓ {state.message}
              </p>
            )}

            <button type="submit" disabled={pending} className="btn block lg mt8">
              {pending
                ? "AGUARDE…"
                : mode === "login"
                ? "ENTRAR ▸"
                : mode === "signup"
                ? "CRIAR CONTA ▸"
                : "ENVIAR LINK ▸"}
            </button>
          </form>

          <div className="divider mt20">OU</div>
          {mode === "forgot" ? (
            <a href="#" onClick={(e) => { e.preventDefault(); setMode("login"); }}
              className="tiny" style={{ display: "block", textAlign: "center", color: "var(--accent-2)", marginTop: 12 }}>
              Voltar para LOGIN
            </a>
          ) : (
            <>
              <a href="#" onClick={switchMode} className="tiny"
                style={{ display: "block", textAlign: "center", color: "var(--accent-2)", marginTop: 12 }}>
                {mode === "login" ? "Não tem conta? CADASTRE-SE" : "Já tem conta? ENTRAR"}
              </a>
              {mode === "login" && (
                <a href="#" onClick={goForgot} className="tiny"
                  style={{ display: "block", textAlign: "center", color: "var(--muted)", marginTop: 8 }}>
                  Esqueci minha senha
                </a>
              )}
            </>
          )}
        </div>

        <p className="tiny" style={{ color: "var(--muted)", marginTop: 18 }}>
          🔒 Autenticação segura
        </p>
        </div>{/* fim coluna login */}

        {/* Coluna direita: como funciona o jogo */}
        <div
          className="card bolts howto-card"
          style={{ width: "100%", maxWidth: 460, textAlign: "left" }}
        >
          <div className="card-title">🎮 COMO FUNCIONA</div>
          <p className="help" style={{ marginBottom: 12 }}>
            Um joguinho em dupla: sorteia, cozinha de verdade e a galera avalia. 🏆
          </p>

          <div className="col" style={{ gap: 0 }}>
            {HOW_STEPS.map((s, i) => (
              <div
                key={s.title}
                className="row gap8"
                style={{
                  alignItems: "flex-start",
                  padding: "10px 0",
                  borderTop: i ? "2px solid var(--line)" : "none",
                }}
              >
                <span className="howto-num">{i + 1}</span>
                <div>
                  <div style={{ fontFamily: "var(--display)", fontSize: 11, color: "var(--accent)" }}>
                    {s.emoji} {s.title}
                  </div>
                  <div className="help" style={{ fontSize: 16, marginTop: 4 }}>
                    {s.text}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="tiny" style={{ color: "var(--muted)", marginTop: 12 }}>
            ⚽ Entre pra começar — sua dupla entra com o código da sala.
          </p>
        </div>{/* fim coluna como funciona */}
        </div>{/* fim login-row */}
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
