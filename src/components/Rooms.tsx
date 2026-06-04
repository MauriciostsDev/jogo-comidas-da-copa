"use client";

import { useState } from "react";
import type { Room } from "@/lib/types";
import { createRoom, joinRoom } from "@/app/actions";
import { fireConfetti } from "@/lib/confetti";
import { showToast } from "@/lib/toast";

type Props = {
  onRoomReady: (room: Room) => void;
  onSoloReady: () => void;
};

export default function Rooms({ onRoomReady, onSoloReady }: Props) {
  const [tab, setTab] = useState<"create" | "join">("create");

  const [room, setRoom] = useState<Room | null>(null);
  const [genBusy, setGenBusy] = useState(false);

  const [code, setCode] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);

  async function handleGenerate() {
    setGenBusy(true);
    const r = await createRoom();
    setGenBusy(false);
    if (!r.ok || !r.room) { showToast(r.error ?? "Erro ao criar a sala."); return; }
    setRoom(r.room);
    fireConfetti(16);
  }

  async function handleCopy() {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.code);
      showToast("📋 Código copiado!");
    } catch {
      showToast("Copie manualmente: " + room.code);
    }
  }

  async function handleShare() {
    if (!room) return;
    const msg = "Bora jogar Comidas da Copa! 🍴⚽ Entra na minha sala com o código " + room.code;
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title: "Comidas da Copa", text: msg }); } catch { /* cancelou */ }
    } else {
      try { await navigator.clipboard.writeText(msg); showToast("📤 Convite copiado!"); }
      catch { showToast(room.code); }
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) { showToast("Digite o código da sala 😅"); return; }
    setJoinBusy(true);
    const r = await joinRoom(code);
    setJoinBusy(false);
    if (!r.ok || !r.room) { showToast(r.error ?? "Código inválido — ex: COPA-7X2K"); return; }
    onRoomReady(r.room);
  }

  return (
    <section className="screen active center">
      <h2 className="neon">🎮 MODO DE JOGO</h2>
      <p className="help">Jogue em dupla ou explore sozinho as culinárias do mundo.</p>

      {/* ── MODO DUPLA ─────────────────────────────────────── */}
      <div className="card bolts accent" style={{ width: "100%", maxWidth: 440, marginTop: 14, textAlign: "left" }}>
        <div className="card-title">🤝 MODO DUPLA</div>
        <p className="help" style={{ marginBottom: 12 }}>
          Jogue com alguém — crie uma sala e mande o código, ou entre na sala de um amigo.
        </p>

        <div className="chips" style={{ justifyContent: "center", marginBottom: 14 }}>
          <button className={`chip ${tab === "create" ? "on" : ""}`} onClick={() => setTab("create")}>
            ➕ CRIAR SALA
          </button>
          <button className={`chip ${tab === "join" ? "on" : ""}`} onClick={() => setTab("join")}>
            🔑 ENTRAR COM CÓDIGO
          </button>
        </div>

        {tab === "create" && (
          <>
            <div className="label" style={{ marginBottom: 4 }}>CÓDIGO DA SALA</div>
            <div className="room-code">{room ? room.code : "————"}</div>
            <p className="help" style={{ marginTop: 8 }}>
              {room ? "Mande este código pra sua dupla 👇" : "Gere um código único e compartilhe com sua dupla."}
            </p>
            <div className="row gap8 mt8" style={{ justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn yellow sm" onClick={handleGenerate} disabled={genBusy}>
                {genBusy ? "GERANDO…" : room ? "GERAR OUTRO 🎲" : "GERAR CÓDIGO 🎲"}
              </button>
              {room && (
                <>
                  <button className="btn ghost sm" onClick={handleCopy}>📋 COPIAR</button>
                  <button className="btn ghost sm" onClick={handleShare}>📤 ENVIAR</button>
                </>
              )}
            </div>
            {room && (
              <button className="btn block green lg mt20" onClick={() => onRoomReady(room)}>
                ABRIR SALA ▸
              </button>
            )}
          </>
        )}

        {tab === "join" && (
          <form onSubmit={handleJoin} className="col" style={{ gap: 12 }}>
            <input
              className="input code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="COPA-7X2K"
              maxLength={9}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
            <button className="btn block green lg" type="submit" disabled={joinBusy}>
              {joinBusy ? "ENTRANDO…" : "ENTRAR NA SALA ▸"}
            </button>
            <p className="tiny" style={{ color: "var(--muted)" }}>
              Peça o código pra quem criou a sala.
            </p>
          </form>
        )}
      </div>

      <div className="divider" style={{ width: "100%", maxWidth: 440, margin: "18px 0" }}>OU</div>

      {/* ── MODO SOLO ──────────────────────────────────────── */}
      <div className="card bolts" style={{ width: "100%", maxWidth: 440, textAlign: "left" }}>
        <div className="card-title" style={{ color: "var(--yellow)" }}>🧑‍🍳 MODO SOLO</div>
        <p className="help" style={{ marginBottom: 12 }}>
          Sorteie um país, escreva seu prato e cozinhe sozinho. Sem precisar de dupla.
        </p>
        <button className="btn block yellow lg" onClick={onSoloReady}>
          JOGAR SOLO ▸
        </button>
      </div>
    </section>
  );
}
