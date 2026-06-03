"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { fireConfetti } from "@/lib/confetti";
import { showToast } from "@/lib/toast";

type Player = { userId: string; userName: string; ready: boolean };

type Props = {
  supabase: SupabaseClient;
  userId: string;
  userName: string;
  isNextRound: boolean;
  canDrawMore: boolean;
  busy: boolean;
  onDraw: () => void;
};

// Simple emoji avatar based on first char
function playerEmoji(name: string) {
  const emojis = ["🧑‍🍳", "👩‍🍳", "👨‍🍳", "🍳", "🥘", "🍲"];
  return emojis[name.charCodeAt(0) % emojis.length];
}

export default function Lobby({
  supabase,
  userId,
  userName,
  isNextRound,
  canDrawMore,
  busy,
  onDraw,
}: Props) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [joined, setJoined] = useState(false);
  const [ready, setReady] = useState(false);
  const prevPlayerCount = useRef(0);
  const prevReadyIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase.channel("sala-comidas", {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<Player>();
      const byUser = new Map<string, Player>();
      for (const presences of Object.values(state)) {
        for (const p of presences) {
          const prev = byUser.get(p.userId);
          byUser.set(p.userId, {
            userId: p.userId,
            userName: p.userName,
            ready: (prev?.ready ?? false) || p.ready,
          });
        }
      }
      const list = [...byUser.values()];

      // notify when partner joins
      if (list.length > prevPlayerCount.current) {
        const newcomer = list.find((p) => p.userId !== userId);
        if (newcomer) {
          showToast(`👋 ${newcomer.userName} entrou na sala!`);
        }
      }
      prevPlayerCount.current = list.length;

      // notify when a partner becomes ready (confetti + toast)
      for (const p of list) {
        if (p.userId !== userId && p.ready && !prevReadyIds.current.has(p.userId)) {
          fireConfetti(20);
          showToast(`🔥 ${p.userName} marcou pronto!`);
          prevReadyIds.current.add(p.userId);
        }
        if (!p.ready) prevReadyIds.current.delete(p.userId);
      }

      setPlayers(list);
    });

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [supabase, userId]);

  async function joinRoom() {
    await channelRef.current?.track({ userId, userName, ready: false });
    setJoined(true);
  }

  async function leaveRoom() {
    await channelRef.current?.untrack();
    setJoined(false);
    setReady(false);
  }

  async function toggleReady() {
    const next = !ready;
    await channelRef.current?.track({ userId, userName, ready: next });
    setReady(next);
  }

  const others = players.filter((p) => p.userId !== userId);
  const everyoneReady = players.length >= 2 && players.every((p) => p.ready);

  // Slot para a dupla (pode ser null = aguardando)
  const matePlayer = others[0] ?? null;

  // -------- Ainda não entrei --------
  if (!joined) {
    return (
      <section className="screen active center">
        <h2 className="neon-pink">🚪 SALA DE ESPERA</h2>
        <p className="lead">
          {others.length
            ? `${others.map((p) => p.userName).join(", ")} está na sala!`
            : "Entre e aguarde sua dupla aparecer ao vivo."}
        </p>
        <button className="btn lg green mt20" onClick={joinRoom}>
          ENTRAR NA SALA 🚪
        </button>
      </section>
    );
  }

  // -------- Já entrei: ready-check --------
  const hint = everyoneReady
    ? "Tudo pronto! Bora sortear ⚽"
    : !matePlayer
      ? "Esperando sua dupla entrar…"
      : "Os dois precisam marcar PRONTO";

  return (
    <section className="screen active">
      <div className="row between wrap">
        <h2 className="neon-pink">🚪 SALA DE ESPERA</h2>
        <span className="badge dot">SALA #2026</span>
      </div>
      <p className="help">{hint}</p>

      <div className="col gap20 mt8">
        {/* Meu slot */}
        <div className="player me">
          <div className="avatar">{playerEmoji(userName)}</div>
          <div>
            <div className="pname">{userName.toUpperCase().slice(0, 14)}</div>
            <div className="pmeta">jogador 1 · você</div>
          </div>
          <span className={`ready-tag ${ready ? "yes" : "no"}`}>
            {ready ? "✓ PRONTO" : "AGUARDANDO"}
          </span>
        </div>

        {/* Slot da dupla */}
        {matePlayer ? (
          <div className="player">
            <div className="avatar">{playerEmoji(matePlayer.userName)}</div>
            <div>
              <div className="pname">
                {matePlayer.userName.toUpperCase().slice(0, 14)}
              </div>
              <div className="pmeta">jogador 2</div>
            </div>
            <span className={`ready-tag ${matePlayer.ready ? "yes" : "no"}`}>
              {matePlayer.ready ? "✓ PRONTO" : "AGUARDANDO"}
            </span>
          </div>
        ) : (
          <div className="player empty-slot">
            <div className="avatar">❓</div>
            <div>
              <div className="pname">PROCURANDO…</div>
              <div className="pmeta" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span className="typing">
                  <span /><span /><span />
                </span>
                aguardando dupla
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="row gap20 mt20 wrap">
        <button
          className={`btn grow ${ready ? "ghost" : "green"}`}
          style={{ minWidth: 200 }}
          onClick={toggleReady}
        >
          {ready ? "CANCELAR" : "ESTOU PRONTO"}
        </button>
        <button
          className="btn yellow grow"
          style={{ minWidth: 200 }}
          disabled={!everyoneReady || busy || !canDrawMore}
          onClick={onDraw}
        >
          {!canDrawMore
            ? "ACABARAM AS SELEÇÕES 🏁"
            : busy
              ? "SORTEANDO…"
              : "LIBERAR SORTEIO 🎲"}
        </button>
      </div>

      <button
        onClick={leaveRoom}
        className="tiny mt20"
        style={{
          background: "none",
          border: "none",
          color: "var(--muted)",
          cursor: "pointer",
          alignSelf: "center",
        }}
      >
        sair da sala
      </button>

      <p className="tiny" style={{ color: "var(--muted)", marginTop: "auto" }}>
        Dica: os dois precisam marcar PRONTO pra liberar o sorteio.
      </p>
    </section>
  );
}
