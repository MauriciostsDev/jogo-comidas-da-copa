"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Country, Food, Match } from "@/lib/types";
import {
  attachPhoto,
  chooseFood,
  drawCountry,
  resetAll,
  submitFood,
} from "@/app/actions";

type Props = { userId: string; userName: string };

const TOTAL_PAISES = 48;

export default function Game({ userId, userName }: Props) {
  const [supabase] = useState(() => createClient());

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

  const deadline = match ? new Date(match.writing_deadline).getTime() : 0;
  const secondsLeft = Math.max(0, Math.floor((deadline - now) / 1000));
  const timeUp = match?.status === "writing" && secondsLeft <= 0;

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

  async function handleReset() {
    if (!confirm("Recomeçar tudo? Isso apaga a partida atual e zera os sorteios."))
      return;
    setBusy(true);
    await resetAll();
    setBusy(false);
    choosingTriggered.current = null;
    refresh();
  }

  const status = match?.status ?? null;
  const canDraw = !match || status === "done";

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-700 via-green-800 to-yellow-700 px-4 py-6 text-white">
      <div className="mx-auto max-w-xl">
        {/* Cabeçalho */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black">🍽️⚽ Comidas da Copa</h1>
            <p className="text-xs text-green-100">
              Olá, {userName} · {drawnCount}/{TOTAL_PAISES} países sorteados
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="rounded-lg bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
              title="Recomeçar"
            >
              ↺
            </button>
            <form action="/auth/signout" method="post">
              <button className="rounded-lg bg-white/10 px-2 py-1 text-xs hover:bg-white/20">
                Sair
              </button>
            </form>
          </div>
        </header>

        {error && (
          <p className="mb-4 rounded-xl bg-red-500/90 px-4 py-2 text-sm">
            {error}
          </p>
        )}

        {/* ---------- Resultado da rodada anterior ---------- */}
        {status === "done" && country && chosenFood && (
          <ResultCard
            country={country}
            food={chosenFood}
            photo={match?.photo_url ?? null}
          />
        )}

        {/* ---------- Sortear país ---------- */}
        {canDraw && (
          <div className="rounded-3xl bg-white/10 p-8 text-center backdrop-blur">
            <div className="text-6xl">🌍</div>
            <h2 className="mt-3 text-lg font-bold">
              {status === "done" ? "Próxima rodada!" : "Bora jogar?"}
            </h2>
            <p className="mt-1 text-sm text-green-100">
              Clique para sortear um país. Vocês terão 7 minutos para escrever um
              prato típico cada um.
            </p>
            <button
              onClick={handleDraw}
              disabled={busy || drawnCount >= TOTAL_PAISES}
              className="mt-5 rounded-2xl bg-yellow-400 px-8 py-4 text-lg font-black text-green-900 shadow-lg transition hover:bg-yellow-300 disabled:opacity-60"
            >
              {drawnCount >= TOTAL_PAISES
                ? "Todos os países já saíram!"
                : busy
                  ? "Sorteando..."
                  : "🎲 Sortear país"}
            </button>
          </div>
        )}

        {/* ---------- Fase: escrever o prato ---------- */}
        {status === "writing" && country && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white/10 p-6 text-center backdrop-blur">
              <div className="text-7xl">{country.flag}</div>
              <h2 className="mt-2 text-2xl font-black">{country.name_pt}</h2>
              <p className="text-xs text-green-100">{country.confederation}</p>
              <div
                className={`mt-3 inline-block rounded-full px-4 py-1 text-2xl font-black tabular-nums ${
                  secondsLeft <= 60 ? "bg-red-500" : "bg-black/30"
                }`}
              >
                ⏱️ {Math.floor(secondsLeft / 60)}:
                {String(secondsLeft % 60).padStart(2, "0")}
              </div>
              <p className="mt-2 text-sm text-green-100">
                Escreva um prato típico desse país!
              </p>
            </div>

            {/* Meu campo */}
            <div className="rounded-2xl bg-white p-4 text-gray-900">
              <p className="mb-1 text-xs font-bold text-green-700">
                Você {myFood && "✓ enviado"}
              </p>
              <div className="flex gap-2">
                <input
                  value={myText}
                  onChange={(e) => {
                    setMyText(e.target.value);
                    broadcastTyping(e.target.value);
                  }}
                  placeholder="Ex.: Feijoada, Tacos, Sushi..."
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-green-600"
                />
                <button
                  onClick={handleSubmitFood}
                  disabled={busy || !myText.trim()}
                  className="rounded-xl bg-green-700 px-4 font-bold text-white hover:bg-green-800 disabled:opacity-50"
                >
                  {myFood ? "Salvar" : "Enviar"}
                </button>
              </div>
            </div>

            {/* Campo da dupla */}
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
              <p className="mb-1 text-xs font-bold text-yellow-200">
                Sua dupla {partnerFood && "✓ enviou"}
              </p>
              <p className="min-h-[1.5rem] text-lg">
                {partnerFood
                  ? `🍲 ${partnerFood.text}`
                  : partnerTyping
                    ? `✍️ ${partnerTyping}`
                    : "aguardando..."}
              </p>
            </div>

            {(bothSubmitted || timeUp) && (
              <p className="animate-pulse text-center font-bold text-yellow-200">
                🎲 Sorteando qual prato vocês vão fazer...
              </p>
            )}
          </div>
        )}

        {/* ---------- Fase: cozinhar ---------- */}
        {status === "cooking" && country && chosenFood && (
          <div className="space-y-4">
            <div className="rounded-3xl bg-white/10 p-6 text-center backdrop-blur">
              <div className="text-6xl">{country.flag}</div>
              <p className="mt-2 text-sm text-green-100">
                O prato sorteado foi (escrito por {chosenFood.author_name}):
              </p>
              <h2 className="mt-1 text-3xl font-black text-yellow-300">
                🍲 {chosenFood.text}
              </h2>
              <p className="mt-3 text-sm">
                Agora é só cozinhar! 👨‍🍳 Quando ficar pronto, envie uma foto:
              </p>
            </div>

            <label className="block cursor-pointer rounded-2xl bg-yellow-400 p-6 text-center font-black text-green-900 hover:bg-yellow-300">
              {busy ? "Enviando..." : "📸 Enviar foto do prato pronto"}
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
    </main>
  );
}

function ResultCard({
  country,
  food,
  photo,
}: {
  country: Country;
  food: Food;
  photo: string | null;
}) {
  return (
    <div className="mb-6 overflow-hidden rounded-3xl bg-white text-gray-900 shadow-xl">
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={food.text} className="h-56 w-full object-cover" />
      )}
      <div className="p-5 text-center">
        <p className="text-xs font-bold text-green-700">RODADA CONCLUÍDA 🎉</p>
        <p className="mt-1 text-4xl">{country.flag}</p>
        <h3 className="text-lg font-black">{country.name_pt}</h3>
        <p className="mt-1 text-xl font-bold text-green-800">🍲 {food.text}</p>
        <p className="text-xs text-gray-500">por {food.author_name}</p>
      </div>
    </div>
  );
}
