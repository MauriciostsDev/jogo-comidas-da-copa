"use client";

import { useState } from "react";
import type { Room } from "@/lib/types";
import { createRoom, joinRoom } from "@/app/actions";
import { fireConfetti } from "@/lib/confetti";
import { showToast } from "@/lib/toast";

type Props = {
  // Chamado quando a sala está pronta (host abriu, ou guest entrou).
  onRoomReady: (room: Room) => void;
};

export default function Rooms({ onRoomReady }: Props) {
  const [tab, setTab] = useState<"create" | "join">("create");

  // criar
  const [room, setRoom] = useState<Room | null>(null);
  const [genBusy, setGenBusy] = useState(false);

  // entrar
  const [code, setCode] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);

  async function handleGenerate() {
    setGenBusy(true);
    const r = await createRoom();
    setGenBusy(false);
    if (!r.ok || !r.room) {
      showToast(r.error ?? "Erro ao criar a sala.");
      return;
    }
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
    const msg =
      "Bora jogar Comidas da Copa! 🍴⚽ Entra na minha sala com o código " +
      room.code;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Comidas da Copa", text: msg });
      } catch {
        /* usuário cancelou */
      }
    } else {
      try {
        await navigator.clipboard.writeText(msg);
        showToast("📤 Convite copiado!");
      } catch {
        showToast(room.code);
      }
    }
  }

  function handleOpen() {
    if (!room) return;
    onRoomReady(room);
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      showToast("Digite o código da sala 😅");
      return;
    }
    setJoinBusy(true);
    const r = await joinRoom(code);
    setJoinBusy(false);
    if (!r.ok || !r.room) {
      showToast(r.error ?? "Código inválido — ex: COPA-7X2K");
      return;
    }
    onRoomReady(r.room);
  }

  return (
    <section className="screen active center">
      <h2 className="neon">🎮 SALA DE JOGO</h2>
      <p className="help">
        Crie uma sala e mande o código pra sua dupla — ou entre na sala dela.
      </p>

      {/* abas criar / entrar */}
      <div className="chips" style={{ marginTop: 8, justifyContent: "center" }}>
        <button
          className={`chip ${tab === "create" ? "on" : ""}`}
          onClick={() => setTab("create")}
        >
          ➕ CRIAR SALA
        </button>
        <button
          className={`chip ${tab === "join" ? "on" : ""}`}
          onClick={() => setTab("join")}
        >
          🔑 ENTRAR COM CÓDIGO
        </button>
      </div>

      {/* CRIAR */}
      {tab === "create" && (
        <div
          className="card bolts accent"
          style={{ width: "100%", maxWidth: 440, marginTop: 14 }}
        >
          <div className="card-title">CÓDIGO DA SALA</div>
          <div className="room-code">{room ? room.code : "————"}</div>
          <p className="help">
            {room
              ? "Mande este código pra sua dupla 👇"
              : "Gere um código único e compartilhe com sua dupla."}
          </p>

          <div
            className="row gap8 mt8"
            style={{ justifyContent: "center", flexWrap: "wrap" }}
          >
            <button
              className="btn yellow sm"
              onClick={handleGenerate}
              disabled={genBusy}
            >
              {genBusy
                ? "GERANDO…"
                : room
                  ? "GERAR OUTRO 🎲"
                  : "GERAR CÓDIGO 🎲"}
            </button>
            {room && (
              <>
                <button className="btn ghost sm" onClick={handleCopy}>
                  📋 COPIAR
                </button>
                <button className="btn ghost sm" onClick={handleShare}>
                  📤 ENVIAR
                </button>
              </>
            )}
          </div>

          {room && (
            <button
              className="btn block green lg mt20"
              onClick={handleOpen}
            >
              ABRIR SALA ▸
            </button>
          )}
        </div>
      )}

      {/* ENTRAR */}
      {tab === "join" && (
        <div
          className="card bolts"
          style={{ width: "100%", maxWidth: 440, marginTop: 14 }}
        >
          <div className="card-title">CÓDIGO DO SEU AMIGO</div>
          <form
            onSubmit={handleJoin}
            className="col"
            style={{ gap: 12, marginTop: 6 }}
          >
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
            <button
              className="btn block green lg"
              type="submit"
              disabled={joinBusy}
            >
              {joinBusy ? "ENTRANDO…" : "ENTRAR NA SALA ▸"}
            </button>
          </form>
          <p className="tiny" style={{ color: "var(--muted)", marginTop: 12 }}>
            Peça o código pra quem criou a sala.
          </p>
        </div>
      )}
    </section>
  );
}
