"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Country, Food, Match } from "@/lib/types";
import {
  attachPhoto,
  chooseFood,
  drawCountry,
  submitFood,
  swapFood,
} from "@/app/actions";
import Gallery from "./Gallery";
import Lobby from "./Lobby";

type Props = { userId: string; userName: string };

const TOTAL_PAISES = 48;
const RODADA_SEGUNDOS = 7 * 60;

export default function Game({ userId, userName }: Props) {
  const [supabase] = useState(() => createClient());

  const [tab, setTab] = useState<"jogar" | "galeria">("jogar");
  const [match, setMatch] = useState<Match | null>(null);
  const [country, setCountry] = useState<Country | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [chosenFood, setChosenFood] = useState<Food | null>(null);
  const [drawnCount, setDrawnCount] = useState(0);

  const [myText, setMyText] = useState("");
  const [partnerTyping, setPartnerTyping] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmSwap, setConfirmSwap] = useState(false);

  const myFoodLoadedFor = useRef<string | null>(null);
  const choosingTriggered = useRef<string | null>(null);

  // ---------- Carrega o estado atual do jogo ----------
  const refresh = useCallback(async () => {
    const { count } = await supabase
      .from("countries")
      .select("*", { count: "exact", head: true })
      .eq("drawn", true);
    setDrawnCount(count ?? 0);

    const { data: m } = await supabase
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setMatch(m ?? null);

    if (!m) {
      setCountry(null);
      setFoods([]);
      setChosenFood(null);
      return;
    }

    const [{ data: c }, { data: f }] = await Promise.all([
      supabase.from("countries").select("*").eq("id", m.country_id).single(),
      supabase
        .from("foods")
        .select("*")
        .eq("match_id", m.id)
        .order("created_at", { ascending: true }),
    ]);

    setCountry(c ?? null);
    setFoods(f ?? []);
    setChosenFood((f ?? []).find((x) => x.id === m.chosen_food_id) ?? null);
  }, [supabase]);

  // ---------- Sincronização ao vivo (Realtime) ----------
  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("jogo-comidas")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "foods" },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, refresh]);

  // ---------- Relógio (1s) ----------
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fecha a confirmação de troca quando o prato ou a fase mudam.
  useEffect(() => {
    setConfirmSwap(false);
  }, [match?.chosen_food_id, match?.status]);

  // ---------- Preenche meu campo com o que já escrevi ----------
  useEffect(() => {
    if (!match) {
      myFoodLoadedFor.current = null;
      setMyText("");
      return;
    }
    if (myFoodLoadedFor.current !== match.id) {
      const mine = foods.find((f) => f.user_id === userId);
      setMyText(mine?.text ?? "");
      myFoodLoadedFor.current = match.id;
    }
  }, [match, foods, userId]);

  // ---------- Canal de "digitando ao vivo" ----------
  useEffect(() => {
    if (!match || match.status !== "writing") return;
    const ch = supabase.channel(`digitando-${match.id}`);
    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload.userId !== userId) setPartnerTyping(payload.text);
    }).subscribe();
    return () => {
      supabase.removeChannel(ch);
      setPartnerTyping("");
    };
  }, [supabase, match, userId]);

  const broadcastTyping = (text: string) => {
    if (!match) return;
    supabase.channel(`digitando-${match.id}`).send({
      type: "broadcast",
      event: "typing",
      payload: { userId, text },
    });
  };

  const myFood = foods.find((f) => f.user_id === userId) ?? null;
  const partnerFood = foods.find((f) => f.user_id !== userId) ?? null;
  const bothSubmitted = foods.length >= 2;
  // A outra opção (prato não sorteado) — só existe se os dois enviaram.
  const otherFood = chosenFood
    ? (foods.find((f) => f.id !== chosenFood.id) ?? null)
    : null;

  const deadline = match ? new Date(match.writing_deadline).getTime() : 0;
  const secondsLeft = Math.max(0, Math.floor((deadline - now) / 1000));
  const timeUp = match?.status === "writing" && secondsLeft <= 0;
  const progress = Math.max(0, Math.min(1, secondsLeft / RODADA_SEGUNDOS));

  // ---------- Sorteia o prato automaticamente ----------
  useEffect(() => {
    if (!match || match.status !== "writing") return;
    if (choosingTriggered.current === match.id) return;
    const ready = bothSubmitted || timeUp;
    if (ready && foods.length >= 1) {
      choosingTriggered.current = match.id;
      chooseFood(match.id);
    }
  }, [match, foods.length, bothSubmitted, timeUp]);

  // ---------- Ações ----------
  async function handleDraw() {
    setError("");
    setBusy(true);
    const r = await drawCountry();
    setBusy(false);
    if (!r.ok) setError(r.error ?? "Erro ao sortear.");
    else refresh();
  }

  async function handleSubmitFood() {
    if (!match) return;
    setError("");
    setBusy(true);
    const r = await submitFood(match.id, myText);
    setBusy(false);
    if (!r.ok) setError(r.error ?? "Erro ao salvar.");
    else refresh();
  }

  async function handleSwap(foodId: string) {
    if (!match) return;
    setError("");
    setBusy(true);
    const r = await swapFood(match.id, foodId);
    setBusy(false);
    setConfirmSwap(false);
    if (!r.ok) setError(r.error ?? "Erro ao trocar o prato.");
    else refresh();
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !match) return;
    setError("");
    setBusy(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${match.id}/${Date.now()}.${ext}`;
    const up = await supabase.storage.from("fotos").upload(path, file, {
      upsert: true,
    });
    if (up.error) {
      setBusy(false);
      setError("Erro ao enviar a foto: " + up.error.message);
      return;
    }
    const { data } = supabase.storage.from("fotos").getPublicUrl(path);
    const r = await attachPhoto(match.id, data.publicUrl);
    setBusy(false);
    if (!r.ok) setError(r.error ?? "Erro ao salvar a foto.");
    else refresh();
  }

  const status = match?.status ?? null;
  const canDraw = !match || status === "done";

  return (
    <div className="relative z-10 mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-28 pt-4">
      {/* ---------- Cabeçalho ---------- */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight">
            <span className="text-gradient">Comidas</span>{" "}
            <span className="text-cream">da Copa</span>
          </h1>
          <p className="text-xs text-muted">Olá, {userName} 👋</p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="rounded-full border border-line bg-card/60 px-4 py-2 text-xs font-semibold text-muted transition active:scale-95">
            Sair
          </button>
        </form>
      </header>

      {/* Progresso de países sorteados */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-card/50 px-4 py-2.5">
        <span className="text-lg">🌍</span>
        <div className="flex-1">
          <div className="flex justify-between text-[0.7rem] font-semibold text-muted">
            <span>Seleções sorteadas</span>
            <span className="font-mono text-cream">
              {drawnCount}/{TOTAL_PAISES}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-coal">
            <div
              className="h-full rounded-full bg-gradient-to-r from-saffron to-paprika transition-all duration-700"
              style={{ width: `${(drawnCount / TOTAL_PAISES) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl border border-paprika/40 bg-paprika/15 px-4 py-2.5 text-sm text-paprika [animation:var(--animate-pop)]">
          {error}
        </p>
      )}

      {/* ---------- Conteúdo ---------- */}
      <main className="mt-5 flex-1">
        {tab === "galeria" ? (
          <Gallery supabase={supabase} userId={userId} userName={userName} />
        ) : (
          <div className="space-y-4">
            {/* Resultado da rodada concluída */}
            {status === "done" && country && chosenFood && (
              <ResultCard
                country={country}
                food={chosenFood}
                photo={match?.photo_url ?? null}
                onSeeGallery={() => setTab("galeria")}
              />
            )}

            {/* Sala de espera + ready-check antes de sortear */}
            {canDraw && (
              <Lobby
                supabase={supabase}
                userId={userId}
                userName={userName}
                isNextRound={status === "done"}
                canDrawMore={drawnCount < TOTAL_PAISES}
                busy={busy}
                onDraw={handleDraw}
              />
            )}

            {/* Fase: escrever o prato */}
            {status === "writing" && country && (
              <div className="space-y-4 [animation:var(--animate-rise)]">
                <div className="overflow-hidden rounded-[1.75rem] border border-line bg-gradient-to-b from-card-2 to-card p-6 text-center shadow-[var(--shadow-warm)]">
                  <p className="text-[0.7rem] font-bold tracking-[0.2em] text-saffron uppercase">
                    {country.confederation}
                  </p>
                  <div className="mt-2 text-7xl [animation:var(--animate-pop)]">
                    {country.flag}
                  </div>
                  <h2 className="mt-1 font-display text-4xl font-black text-cream">
                    {country.name_pt}
                  </h2>

                  {/* Cronômetro */}
                  <div className="mt-5">
                    <div
                      className={`font-mono text-5xl font-black tabular-nums ${
                        secondsLeft <= 60
                          ? "text-paprika [animation:var(--animate-pop)]"
                          : "text-cream"
                      }`}
                    >
                      {Math.floor(secondsLeft / 60)}:
                      {String(secondsLeft % 60).padStart(2, "0")}
                    </div>
                    <div className="mx-auto mt-2 h-1.5 max-w-[12rem] overflow-hidden rounded-full bg-coal">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          secondsLeft <= 60
                            ? "bg-paprika"
                            : "bg-gradient-to-r from-saffron to-paprika"
                        }`}
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                    <p className="mt-3 text-sm text-muted">
                      Qual prato típico representa esse país? 🍴
                    </p>
                  </div>
                </div>

                {/* Meu campo */}
                <div className="rounded-[1.5rem] border border-line bg-card p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold tracking-wide text-saffron-bright uppercase">
                      Seu prato
                    </p>
                    {myFood && (
                      <span className="rounded-full bg-pitch/15 px-2 py-0.5 text-[0.65rem] font-bold text-pitch">
                        ✓ enviado
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={myText}
                      onChange={(e) => {
                        setMyText(e.target.value);
                        broadcastTyping(e.target.value);
                      }}
                      placeholder="Ex.: Feijoada, Tacos, Sushi…"
                      className="w-full rounded-xl border border-line bg-coal/60 px-3.5 py-3 text-cream placeholder:text-faint outline-none focus:border-saffron"
                    />
                    <button
                      onClick={handleSubmitFood}
                      disabled={busy || !myText.trim()}
                      className="shrink-0 rounded-xl bg-saffron px-5 font-black text-ink transition active:scale-95 disabled:opacity-50"
                    >
                      {myFood ? "Salvar" : "Enviar"}
                    </button>
                  </div>
                </div>

                {/* Campo da dupla */}
                <div className="rounded-[1.5rem] border border-line bg-card/40 p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs font-bold tracking-wide text-muted uppercase">
                      Sua dupla
                    </p>
                    {partnerFood && (
                      <span className="rounded-full bg-pitch/15 px-2 py-0.5 text-[0.65rem] font-bold text-pitch">
                        ✓ enviou
                      </span>
                    )}
                  </div>
                  <p className="min-h-[1.75rem] text-lg text-cream">
                    {partnerFood ? (
                      <>🍲 {partnerFood.text}</>
                    ) : partnerTyping ? (
                      <span className="text-muted italic">
                        ✍️ {partnerTyping}
                      </span>
                    ) : (
                      <span className="text-faint">aguardando…</span>
                    )}
                  </p>
                </div>

                {(bothSubmitted || timeUp) && (
                  <p className="text-center font-bold text-saffron-bright [animation:var(--animate-pop)]">
                    🎲 Sorteando qual prato vocês vão fazer…
                  </p>
                )}
              </div>
            )}

            {/* Fase: cozinhar */}
            {status === "cooking" && country && chosenFood && (
              <div className="space-y-4 [animation:var(--animate-rise)]">
                <div className="overflow-hidden rounded-[1.75rem] border border-line bg-gradient-to-b from-card-2 to-card p-6 text-center shadow-[var(--shadow-warm)]">
                  <p className="text-[0.7rem] font-bold tracking-[0.2em] text-saffron uppercase">
                    {country.confederation}
                  </p>
                  <div className="mt-2 text-7xl">{country.flag}</div>
                  <h3 className="mt-1 font-display text-2xl font-black text-cream">
                    {country.name_pt}
                  </h3>
                  <p className="mt-4 text-xs text-muted">
                    O prato sorteado foi (escrito por {chosenFood.author_name}):
                  </p>
                  <h2 className="mt-1 font-display text-4xl font-black text-gradient">
                    🍲 {chosenFood.text}
                  </h2>
                  <p className="mt-4 text-sm text-cream-soft">
                    Agora é só cozinhar! 👨‍🍳 Quando ficar pronto, mande a foto.
                  </p>
                </div>

                {/* A outra opção — dá pra trocar com confirmação */}
                {otherFood && (
                  <div className="rounded-[1.5rem] border border-line bg-card/50 p-4">
                    <p className="text-xs font-bold tracking-wide text-muted uppercase">
                      A outra opção
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-display text-xl font-bold text-cream">
                          🍛 {otherFood.text}
                        </p>
                        <p className="text-xs text-faint">
                          por {otherFood.author_name}
                        </p>
                      </div>
                      {!confirmSwap && (
                        <button
                          onClick={() => setConfirmSwap(true)}
                          disabled={busy}
                          className="shrink-0 rounded-xl border border-saffron/40 bg-saffron/10 px-4 py-2.5 text-sm font-bold text-saffron-bright transition active:scale-95 disabled:opacity-50"
                        >
                          Trocar
                        </button>
                      )}
                    </div>

                    {confirmSwap && (
                      <div className="mt-3 rounded-xl border border-saffron/30 bg-coal/50 p-3 [animation:var(--animate-pop)]">
                        <p className="text-sm text-cream-soft">
                          Trocar pra{" "}
                          <strong className="text-saffron-bright">
                            {otherFood.text}
                          </strong>
                          ? Isso muda o prato da rodada pros dois.
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => setConfirmSwap(false)}
                            disabled={busy}
                            className="flex-1 rounded-xl border border-line py-2.5 text-sm font-bold text-muted transition active:scale-95"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleSwap(otherFood.id)}
                            disabled={busy}
                            className="flex-1 rounded-xl bg-gradient-to-r from-saffron-bright to-paprika py-2.5 text-sm font-black text-ink transition active:scale-95 disabled:opacity-60"
                          >
                            {busy ? "Trocando…" : "Confirmar troca"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[1.75rem] border-2 border-dashed border-saffron/40 bg-saffron/10 p-8 text-center transition active:scale-[0.98]">
                  <span className="text-4xl">📸</span>
                  <span className="font-black text-saffron-bright">
                    {busy ? "Enviando…" : "Enviar foto do prato pronto"}
                  </span>
                  <span className="text-xs text-muted">
                    Ela vai pro quadro de fotos pra galera avaliar.
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhoto}
                    disabled={busy}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ---------- Navegação inferior ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="glass flex items-center gap-1 rounded-2xl p-1.5 shadow-[var(--shadow-warm)]">
          <TabButton
            active={tab === "jogar"}
            onClick={() => setTab("jogar")}
            icon="🍳"
            label="Jogar"
          />
          <TabButton
            active={tab === "galeria"}
            onClick={() => setTab("galeria")}
            icon="🖼️"
            label="Galeria"
          />
        </div>
      </nav>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition active:scale-95 ${
        active
          ? "bg-gradient-to-r from-saffron-bright to-paprika text-ink shadow"
          : "text-muted"
      }`}
    >
      <span className="text-base">{icon}</span>
      {label}
    </button>
  );
}

function ResultCard({
  country,
  food,
  photo,
  onSeeGallery,
}: {
  country: Country;
  food: Food;
  photo: string | null;
  onSeeGallery: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-line bg-card shadow-[var(--shadow-warm)] [animation:var(--animate-rise)]">
      {photo && (
        <div className="relative aspect-[4/3] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt={food.text}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-coal to-transparent" />
          <span className="absolute top-3 left-3 rounded-full bg-pitch px-3 py-1 text-xs font-black text-ink">
            RODADA CONCLUÍDA 🎉
          </span>
        </div>
      )}
      <div className="p-5 text-center">
        <p className="text-4xl">{country.flag}</p>
        <h3 className="font-display text-2xl font-black text-cream">
          {country.name_pt}
        </h3>
        <p className="mt-1 font-display text-xl font-bold text-gradient">
          {food.text}
        </p>
        <p className="text-xs text-muted">por {food.author_name}</p>
        <button
          onClick={onSeeGallery}
          className="mt-4 w-full rounded-2xl border border-saffron/40 bg-saffron/10 py-3 text-sm font-bold text-saffron-bright transition active:scale-95"
        >
          ⭐ Avaliar na galeria
        </button>
      </div>
    </div>
  );
}
