"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

type Player = { userId: string; userName: string; ready: boolean };

type Props = {
  supabase: SupabaseClient;
  userId: string;
  userName: string;
  /** true se já houve uma rodada (muda os textos para "próxima rodada"). */
  isNextRound: boolean;
  /** habilitado quando ainda há seleções para sortear. */
  canDrawMore: boolean;
  busy: boolean;
  onDraw: () => void;
};

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

  // ---------- Canal de presença da sala ----------
  useEffect(() => {
    const channel = supabase.channel("sala-comidas", {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<Player>();
      // Cada chave pode ter mais de uma conexão (abas); deduplica por userId.
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
      setPlayers([...byUser.values()]);
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

  // ---------- Ainda não entrei ----------
  if (!joined) {
    return (
      <div className="glass relative overflow-hidden rounded-[1.75rem] p-8 text-center [animation:var(--animate-rise)]">
        <div className="pointer-events-none absolute -top-8 -right-6 text-[8rem] opacity-10 [animation:var(--animate-float)]">
          🚪
        </div>
        <div className="text-7xl [animation:var(--animate-float)]">
          {others.length ? "👋" : "🛋️"}
        </div>
        <h2 className="mt-4 font-display text-3xl font-black text-cream">
          {isNextRound ? "Sala da próxima rodada" : "Sala de espera"}
        </h2>

        {others.length ? (
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
            <strong className="text-saffron-bright">
              {others.map((p) => p.userName).join(", ")}
            </strong>{" "}
            {others.length > 1 ? "estão" : "está"} na sala esperando você. Entre
            pra começar!
          </p>
        ) : (
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
            Entre na sala e aguarde sua dupla aparecer aqui ao vivo.
          </p>
        )}

        <button
          onClick={joinRoom}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-saffron-bright to-paprika py-4 text-lg font-black text-ink shadow-[var(--shadow-glow)] transition active:scale-[0.98]"
        >
          🚪 Entrar na sala
        </button>
      </div>
    );
  }

  // ---------- Já entrei: lista de jogadores + ready-check ----------
  const slots: (Player | null)[] = [...players];
  if (slots.length < 2) slots.push(null); // mostra a vaga aguardando a dupla

  return (
    <div className="glass rounded-[1.75rem] p-6 [animation:var(--animate-rise)]">
      <div className="text-center">
        <h2 className="font-display text-3xl font-black text-cream">
          {isNextRound ? "Próxima rodada" : "Sala de espera"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {everyoneReady
            ? "Todo mundo pronto! Bora sortear 🎲"
            : players.length < 2
              ? "Aguardando a outra pessoa entrar na sala…"
              : "Esperando os dois ficarem prontos…"}
        </p>
      </div>

      {/* Jogadores */}
      <div className="mt-5 space-y-2.5">
        {slots.map((p, i) =>
          p ? (
            <div
              key={p.userId}
              className="flex items-center gap-3 rounded-2xl border border-line bg-card/60 p-3"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-saffron to-paprika text-lg font-black text-ink uppercase">
                {p.userName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-cream">
                  {p.userName}
                  {p.userId === userId && (
                    <span className="ml-1 text-xs text-faint">(você)</span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {p.ready ? "pronto pra jogar" : "decidindo…"}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  p.ready
                    ? "bg-pitch/15 text-pitch"
                    : "bg-card-2 text-faint"
                }`}
              >
                {p.ready ? "✓ Pronto" : "Aguardando"}
              </span>
            </div>
          ) : (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-3 rounded-2xl border border-dashed border-line bg-card/20 p-3"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card-2 text-lg">
                ⏳
              </div>
              <p className="text-sm text-faint">
                Vaga livre — aguardando sua dupla entrar…
              </p>
            </div>
          ),
        )}
      </div>

      {/* Ações */}
      <div className="mt-5 space-y-2.5">
        {everyoneReady ? (
          <button
            onClick={onDraw}
            disabled={busy || !canDrawMore}
            className="w-full rounded-2xl bg-gradient-to-r from-saffron-bright to-paprika py-4 text-lg font-black text-ink shadow-[var(--shadow-glow)] transition active:scale-[0.98] disabled:opacity-60"
          >
            {!canDrawMore
              ? "Acabaram as seleções! 🏁"
              : busy
                ? "Sorteando…"
                : "🎲 Sortear seleção"}
          </button>
        ) : (
          <button
            onClick={toggleReady}
            className={`w-full rounded-2xl py-4 text-lg font-black transition active:scale-[0.98] ${
              ready
                ? "border border-line bg-card text-muted"
                : "bg-gradient-to-r from-pitch to-saffron text-ink shadow-[var(--shadow-glow)]"
            }`}
          >
            {ready ? "✓ Estou pronto (cancelar)" : "Estou pronto!"}
          </button>
        )}

        <button
          onClick={leaveRoom}
          className="w-full rounded-xl py-2 text-xs font-semibold text-faint transition active:scale-95"
        >
          Sair da sala
        </button>
      </div>
    </div>
  );
}
