"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Country, Food, Match, Room } from "@/lib/types";
import {
  attachPhoto,
  chooseFood,
  drawCountry,
  getMyRoom,
  leaveRoom,
  submitFood,
  swapFood,
} from "@/app/actions";
import { MyGallery, Social } from "./Gallery";
import Lobby from "./Lobby";
import Rooms from "./Rooms";
import FriendInvite from "./FriendInvite";
import { buildReelSeq, rndTeam, type Team } from "@/lib/teams";
import { fireConfetti } from "@/lib/confetti";
import { showToast } from "@/lib/toast";

type Props = { userId: string; userName: string };

const TOTAL_PAISES = 48;
const RODADA_SEGUNDOS = 7 * 60;
const ITEM_H = 120;
const REEL_LEN = 26;

const STEP_OF: Record<string, number> = {
  rooms: 0,
  lobby: 0,
  draw: 1,
  write: 2,
  pick: 2,
  cook: 3,
  gallery: 4,
  social: 4,
};
type Scene =
  | "rooms"
  | "lobby"
  | "draw"
  | "write"
  | "pick"
  | "cook"
  | "gallery"
  | "social";

// Countries one partner cooked but the other hasn't (for exclusion toggle in lobby)
type ExcludableCountry = {
  id: number;
  name: string;
  flag: string;
  cookedByMe: boolean;
};

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

  // Draw animation
  const [drawPhase, setDrawPhase] = useState<"idle" | "spinning" | "result">("idle");
  const [reelSeq, setReelSeq] = useState<Team[]>([]);
  const [reelOffset, setReelOffset] = useState(0);
  const [reelAnimating, setReelAnimating] = useState(false);

  // Pick / swap
  const [pickConfirmed, setPickConfirmed] = useState(false);
  const [swapConfirm, setSwapConfirm] = useState(false);
  const lastMatchId = useRef<string | null>(null);

  // Aba manual (galeria/social) — null = segue o fluxo do jogo
  const [manualScene, setManualScene] = useState<"gallery" | "social" | null>(null);

  // Sala atual (criar/entrar com código). null = ainda na tela de salas.
  const [room, setRoom] = useState<Room | null>(null);
  const [roomLoaded, setRoomLoaded] = useState(false);

  // Country exclusion (lobby feature)
  const [countriesToExclude, setCountriesToExclude] = useState<ExcludableCountry[]>([]);
  const [exclusions, setExclusions] = useState<Set<number>>(new Set());

  const myFoodLoadedFor = useRef<string | null>(null);
  const choosingTriggered = useRef<string | null>(null);

  // ── Load game state ──────────────────────────────────────────
  const refresh = useCallback(async () => {
    const { count } = await supabase
      .from("countries")
      .select("*", { count: "exact", head: true })
      .eq("drawn", true);
    setDrawnCount(count ?? 0);

    // Find the most recent active match where this user has a food, OR the global last match
    const { data: myFoodMatches } = await supabase
      .from("foods")
      .select("match_id")
      .eq("user_id", userId);

    const myMatchIds = (myFoodMatches ?? []).map((f: { match_id: string }) => f.match_id);

    // Prefer an active (non-done) match the user participated in
    let m: Match | null = null;
    if (myMatchIds.length > 0) {
      const { data: activeOwn } = await supabase
        .from("matches")
        .select("*")
        .in("id", myMatchIds)
        .neq("status", "done")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      m = activeOwn ?? null;
    }

    // Fallback to last global non-done match (for users without a match yet)
    if (!m) {
      const { data: activeGlobal } = await supabase
        .from("matches")
        .select("*")
        .neq("status", "done")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      m = activeGlobal ?? null;
    }

    setMatch(m ?? null);

    if (!m) { setCountry(null); setFoods([]); setChosenFood(null); return; }

    const [{ data: c }, { data: f }] = await Promise.all([
      supabase.from("countries").select("*").eq("id", m.country_id).single(),
      supabase.from("foods").select("*").eq("match_id", m.id).order("created_at", { ascending: true }),
    ]);
    setCountry(c ?? null);
    setFoods(f ?? []);
    setChosenFood((f ?? []).find((x) => x.id === m.chosen_food_id) ?? null);
  }, [supabase, userId]);

  // ── Load country-exclusion candidates for lobby ─────────────
  const loadExcludable = useCallback(async () => {
    // Countries cooked by me
    const { data: myFoods } = await supabase
      .from("foods")
      .select("match_id")
      .eq("user_id", userId);
    const myMatchIds = (myFoods ?? []).map((f: { match_id: string }) => f.match_id);

    if (!myMatchIds.length) { setCountriesToExclude([]); return; }

    const { data: myMatches } = await supabase
      .from("matches")
      .select("country_id, countries!matches_country_id_fkey(name_pt, flag)")
      .in("id", myMatchIds)
      .eq("status", "done");

    // Countries cooked by others (not me) in done matches
    const { data: otherFoods } = await supabase
      .from("foods")
      .select("match_id")
      .neq("user_id", userId);
    const otherMatchIds = new Set((otherFoods ?? []).map((f: { match_id: string }) => f.match_id));

    const myCookedCountryIds = new Set(
      (myMatches ?? []).map((m: { country_id: number }) => m.country_id)
    );

    // Countries others cooked in done matches
    const { data: otherDone } = await supabase
      .from("matches")
      .select("country_id, countries!matches_country_id_fkey(name_pt, flag)")
      .eq("status", "done")
      .not("id", "in", myMatchIds.length ? `(${myMatchIds.join(",")})` : "(null)");

    const otherCookedCountryIds = new Set(
      (otherDone ?? []).map((m: { country_id: number }) => m.country_id)
    );

    const excludable: ExcludableCountry[] = [];

    // Countries I cooked but others haven't
    for (const m of myMatches ?? []) {
      const c = Array.isArray(m.countries) ? m.countries[0] : m.countries;
      if (c && !otherCookedCountryIds.has(m.country_id)) {
        excludable.push({
          id: m.country_id,
          name: (c as { name_pt: string }).name_pt,
          flag: (c as { flag: string }).flag,
          cookedByMe: true,
        });
      }
    }

    // Countries others cooked but I haven't
    const seenIds = new Set(excludable.map((e) => e.id));
    for (const m of otherDone ?? []) {
      if (seenIds.has(m.country_id)) continue;
      if (!myCookedCountryIds.has(m.country_id)) {
        const c = Array.isArray(m.countries) ? m.countries[0] : m.countries;
        if (c) {
          excludable.push({
            id: m.country_id,
            name: (c as { name_pt: string }).name_pt,
            flag: (c as { flag: string }).flag,
            cookedByMe: false,
          });
          seenIds.add(m.country_id);
        }
      }
    }

    // Only countries still marked as drawn (relevant for re-draw scenarios)
    const { data: drawn } = await supabase
      .from("countries")
      .select("id")
      .eq("drawn", true);
    const drawnIds = new Set((drawn ?? []).map((c: { id: number }) => c.id));

    setCountriesToExclude(excludable.filter((e) => drawnIds.has(e.id)));
    void otherMatchIds; // suppress unused warning
  }, [supabase, userId]);

  // ── Realtime ─────────────────────────────────────────────────
  useEffect(() => {
    refresh();
    loadExcludable();
    const ch = supabase
      .channel("jogo-comidas")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "foods" }, () => { refresh(); loadExcludable(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, refresh, loadExcludable]);

  // ── Clock ────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Retoma a sala ativa (host/guest) após reload ─────────────
  useEffect(() => {
    getMyRoom().then((r) => {
      if (r.ok && r.room) setRoom(r.room);
      setRoomLoaded(true);
    });
  }, []);

  async function handleLeaveRoom() {
    const current = room;
    setRoom(null);
    if (current) await leaveRoom(current.id);
  }

  // ── Reset pick / swap when match changes ─────────────────────
  useEffect(() => {
    if (match?.id && match.id !== lastMatchId.current) {
      lastMatchId.current = match.id;
      setPickConfirmed(false);
      setSwapConfirm(false);
    }
  }, [match?.id]);

  useEffect(() => { setSwapConfirm(false); }, [match?.chosen_food_id, match?.status]);

  // ── Pre-fill my food text ────────────────────────────────────
  useEffect(() => {
    if (!match) { myFoodLoadedFor.current = null; setMyText(""); return; }
    if (myFoodLoadedFor.current !== match.id) {
      const mine = foods.find((f) => f.user_id === userId);
      setMyText(mine?.text ?? "");
      myFoodLoadedFor.current = match.id;
    }
  }, [match, foods, userId]);

  // ── Live typing channel ───────────────────────────────────────
  useEffect(() => {
    if (!match || match.status !== "writing") return;
    const ch = supabase.channel(`digitando-${match.id}`);
    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload.userId !== userId) setPartnerTyping(payload.text);
    }).subscribe();
    return () => { supabase.removeChannel(ch); setPartnerTyping(""); };
  }, [supabase, match, userId]);

  function broadcastTyping(text: string) {
    if (!match) return;
    supabase.channel(`digitando-${match.id}`).send({
      type: "broadcast", event: "typing", payload: { userId, text },
    });
  }

  const myFood = foods.find((f) => f.user_id === userId) ?? null;
  const partnerFood = foods.find((f) => f.user_id !== userId) ?? null;
  const bothSubmitted = foods.length >= 2;
  const otherFood = chosenFood ? (foods.find((f) => f.id !== chosenFood.id) ?? null) : null;

  const deadline = match ? new Date(match.writing_deadline).getTime() : 0;
  const secondsLeft = Math.max(0, Math.floor((deadline - now) / 1000));
  const timeUp = match?.status === "writing" && secondsLeft <= 0;
  const timerProgress = Math.max(0, Math.min(1, secondsLeft / RODADA_SEGUNDOS));
  const timerBg = timerProgress < 0.15 ? "var(--orange)" : timerProgress < 0.35 ? "var(--yellow)" : "var(--green)";

  // ── Auto-choose food ──────────────────────────────────────────
  useEffect(() => {
    if (!match || match.status !== "writing") return;
    if (choosingTriggered.current === match.id) return;
    const ready = bothSubmitted || timeUp;
    if (ready && foods.length >= 1) {
      choosingTriggered.current = match.id;
      chooseFood(match.id);
    }
  }, [match, foods.length, bothSubmitted, timeUp]);

  // ── Draw: when country arrives during "spinning" → animate → result ──
  useEffect(() => {
    if (drawPhase !== "spinning" || !country) return;

    setReelSeq((prev) => {
      const next = [...prev];
      next[REEL_LEN - 2] = { f: country.flag, n: country.name_pt, c: country.confederation };
      return next;
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setReelOffset((REEL_LEN - 2) * ITEM_H);
        setReelAnimating(true);
      });
    });

    const t = setTimeout(() => {
      setDrawPhase("result");
      fireConfetti(80);
    }, 3300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawPhase, country?.id]);

  // ── Actions ───────────────────────────────────────────────────
  async function handleDraw() {
    setError("");
    setBusy(true);
    const seq = buildReelSeq(rndTeam(), REEL_LEN);
    setReelSeq(seq);
    setReelOffset(0);
    setReelAnimating(false);
    setDrawPhase("spinning");
    const r = await drawCountry();
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "Erro ao sortear."); setDrawPhase("idle"); return; }
    await refresh();
  }

  async function handleSubmitFood() {
    if (!match) return;
    setError(""); setBusy(true);
    const r = await submitFood(match.id, myText);
    setBusy(false);
    if (!r.ok) setError(r.error ?? "Erro ao salvar.");
    else refresh();
  }

  async function handleSwap(foodId: string) {
    if (!match) return;
    setError(""); setBusy(true);
    const r = await swapFood(match.id, foodId);
    setBusy(false); setSwapConfirm(false);
    if (!r.ok) setError(r.error ?? "Erro ao trocar.");
    else { refresh(); showToast("Prato trocado! ✅"); }
  }

  async function handleUpload(file: File) {
    if (!match) return;
    setError(""); setBusy(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${match.id}/${Date.now()}.${ext}`;
    const up = await supabase.storage.from("fotos").upload(path, file, { upsert: true });
    if (up.error) { setBusy(false); setError("Erro ao enviar: " + up.error.message); return; }
    const { data } = supabase.storage.from("fotos").getPublicUrl(path);
    const r = await attachPhoto(match.id, data.publicUrl);
    setBusy(false);
    if (!r.ok) setError(r.error ?? "Erro ao salvar a foto.");
    else { fireConfetti(100); showToast("📸 Foto enviada pra galeria!"); refresh(); }
  }

  function handleToggleExclusion(countryId: number, exclude: boolean) {
    setExclusions((prev) => {
      const next = new Set(prev);
      if (exclude) next.add(countryId);
      else next.delete(countryId);
      return next;
    });
  }

  const status = match?.status ?? null;
  const canDraw = !match || status === "done";

  // Cena do FLUXO do jogo (independente de abrir Galeria/Social pela nav).
  let flowScene: Scene;
  if (drawPhase === "spinning" || drawPhase === "result") { flowScene = "draw"; }
  else if (status === "writing") { flowScene = "write"; }
  else if (status === "cooking" && !pickConfirmed) { flowScene = "pick"; }
  else if (status === "cooking" && pickConfirmed) { flowScene = "cook"; }
  else if (!room) { flowScene = "rooms"; }
  else { flowScene = "lobby"; }

  // Cena exibida: Galeria/Social são abas manuais e NÃO mexem no stepper.
  const scene: Scene = manualScene ?? flowScene;

  // O stepper só avança conforme o fluxo do jogo (entrar/criar sala → lobby →
  // sorteio → prato → cozinhar), nunca ao espiar Galeria/Social.
  const stepIdx = STEP_OF[flowScene] ?? 0;

  return (
    <>
      {/* ── Topbar ────────────────────────────────────────────── */}
      <header className="topbar">
        <div className="brand">
          <span className="ball">⚽</span> COMIDAS <b>DA COPA</b>
        </div>
        <div className="right">
          <ThemeToggle />
          <form action="/auth/signout" method="post" style={{ display: "inline" }}>
            <button className="toggle" style={{ fontSize: 9 }}>SAIR</button>
          </form>
        </div>
      </header>

      <main className="stage">
        <Stepper stepIdx={stepIdx} />

        {error && (
          <p className="tiny" style={{ color: "var(--pink)" }}>⚠ {error}</p>
        )}

        {/* ── 1b. SALA DE JOGO (criar / entrar com código) ───── */}
        {scene === "rooms" && roomLoaded && (
          <Rooms onRoomReady={(r) => setRoom(r)} />
        )}

        {/* ── 1&2. LOBBY ─────────────────────────────────────── */}
        {scene === "lobby" && (
          <>
            {status === "done" && country && chosenFood && (
              <div className="card accent bolts" style={{ textAlign: "center" }}>
                <div className="card-title">RODADA CONCLUÍDA 🎉</div>
                {match?.photo_url && (
                  <div className="preview-wrap" style={{ marginBottom: 12 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={match.photo_url}
                      alt={chosenFood.text}
                      style={{ aspectRatio: "4/3", objectFit: "cover", width: "100%" }}
                    />
                  </div>
                )}
                <div className="result-flag">{country.flag}</div>
                <h2 style={{ marginTop: 8 }}>{country.name_pt}</h2>
                <p className="lead" style={{ marginTop: 4 }}>🍲 {chosenFood.text}</p>
                <p className="tiny" style={{ color: "var(--muted)", marginTop: 6 }}>
                  por {chosenFood.author_name}
                </p>
              </div>
            )}

            {canDraw && (
              <Lobby
                supabase={supabase}
                userId={userId}
                userName={userName}
                room={room}
                isNextRound={status === "done"}
                canDrawMore={drawnCount < TOTAL_PAISES}
                busy={busy}
                onDraw={handleDraw}
                onLeaveRoom={handleLeaveRoom}
                countriesToExclude={countriesToExclude}
                onToggleExclusion={handleToggleExclusion}
                exclusions={exclusions}
              />
            )}
          </>
        )}

        {/* ── 3. SORTEIO DA SELEÇÃO ──────────────────────────── */}
        {scene === "draw" && (
          <section className="screen active center">
            <h2 className="neon">🎲 SORTEIO DA SELEÇÃO</h2>
            <p className="help">48 seleções na roleta. Boa sorte!</p>

            {drawPhase === "spinning" && (
              <div style={{ width: "100%", maxWidth: 480, marginTop: 8 }}>
                <div className="reel">
                  <div
                    className="reel-track"
                    style={{
                      transform: `translateY(-${reelOffset}px)`,
                      transition: reelAnimating ? "transform 3.1s cubic-bezier(.12,.78,.18,1)" : "none",
                    }}
                  >
                    {reelSeq.map((t, i) => (
                      <div key={i} className="reel-item">
                        <span className="reel-flag">{t.f}</span>
                        <span className="reel-name">{t.n}</span>
                      </div>
                    ))}
                  </div>
                  <div className="reel-line" />
                </div>
              </div>
            )}

            {drawPhase === "result" && country && (
              <div className="card bolts accent" style={{ width: "100%", maxWidth: 480, marginTop: 8 }}>
                <div className="card-title">SUA SELEÇÃO</div>
                <div className="result-flag">{country.flag}</div>
                <h2 style={{ marginTop: 10 }}>{country.name_pt}</h2>
                <span className="badge confed" style={{ marginTop: 8 }}>{country.confederation}</span>
                <div className="col mt20" style={{ gap: 8 }}>
                  <div className="row between">
                    <span className="tiny" style={{ color: "var(--muted)" }}>⏱ TEMPO PRA ESCOLHER</span>
                    <span className={`timer ${secondsLeft <= 60 ? "warn" : ""}`}>
                      {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:
                      {String(secondsLeft % 60).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="timerbar">
                    <i style={{ width: `${timerProgress * 100}%`, background: timerBg }} />
                  </div>
                </div>
              </div>
            )}

            {drawPhase === "result" && (
              <button className="btn lg green mt8" onClick={() => setDrawPhase("idle")}>
                ESCREVER O PRATO ▸
              </button>
            )}
          </section>
        )}

        {/* ── 4. ESCREVER O PRATO ────────────────────────────── */}
        {scene === "write" && country && (
          <section className="screen active">
            <div className="row between wrap">
              <h2 className="neon-yellow">✍️ ESCREVA O PRATO</h2>
              <span className="badge">
                <span>{country.flag}</span> <span>{country.name_pt}</span>
              </span>
            </div>
            <p className="help">Qual prato típico desse país vocês vão encarar?</p>

            <div className="row between" style={{ marginTop: 4 }}>
              <span className="tiny" style={{ color: "var(--muted)" }}>⏱ TEMPO RESTANTE</span>
              <span className={`timer ${secondsLeft <= 60 ? "warn" : ""}`}>
                {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:
                {String(secondsLeft % 60).padStart(2, "0")}
              </span>
            </div>
            <div className="timerbar">
              <i style={{ width: `${timerProgress * 100}%`, background: timerBg }} />
            </div>

            <div className="field mt8">
              <label className="label">SEU PRATO TÍPICO</label>
              <input
                className="input"
                value={myText}
                onChange={(e) => { setMyText(e.target.value); broadcastTyping(e.target.value); }}
                placeholder="ex: Feijoada, Paella, Ramen…"
                maxLength={40}
                disabled={!!myFood}
              />
            </div>
            {myFood && (
              <span className="badge" style={{ color: "var(--green)", borderColor: "var(--green)" }}>
                ✓ ENVIADO
              </span>
            )}

            <div className="card tight" style={{ marginTop: 8 }}>
              <div className="card-title">👩‍🍳 SUA DUPLA</div>
              {partnerFood ? (
                <span className="badge dot" style={{ marginTop: 6 }}>✓ dupla finalizou</span>
              ) : (
                <>
                  <div className="row gap8" style={{ marginBottom: 4 }}>
                    <span className="typing"><span /><span /><span /></span>
                    <span className="help">digitando…</span>
                  </div>
                  {partnerTyping && <div className="live-text caret">{partnerTyping}</div>}
                </>
              )}
            </div>

            {(bothSubmitted || timeUp) && (
              <p className="tiny" style={{ color: "var(--yellow)", textAlign: "center" }}>
                🎲 Sorteando qual prato vocês vão fazer…
              </p>
            )}

            <button
              className="btn lg green mt20"
              onClick={handleSubmitFood}
              disabled={busy || !myText.trim() || !!myFood}
            >
              CONFIRMAR PRATO ▸
            </button>
            <p className="tiny" style={{ color: "var(--muted)", marginTop: "auto" }}>
              O sistema vai sortear entre o seu prato e o da sua dupla.
            </p>
          </section>
        )}

        {/* ── 5. PRATO SORTEADO ──────────────────────────────── */}
        {scene === "pick" && chosenFood && (
          <section className="screen active center">
            <h2 className="neon-pink">🍴 PRATO SORTEADO</h2>
            <p className="help">O sistema escolheu — mas a decisão final é de vocês.</p>

            <div className="col gap20 mt8" style={{ width: "100%", maxWidth: 440 }}>
              <div className="dish win">
                <span className="tag">🎲 SORTEADO</span>
                <div className="emoji">🍽️</div>
                <div className="dname">{chosenFood.text}</div>
                <div className="by">por {chosenFood.author_name}</div>
              </div>

              {otherFood && (
                <div className="dish">
                  <span className="tag">OUTRA OPÇÃO</span>
                  <div className="emoji">🍳</div>
                  <div className="dname">{otherFood.text}</div>
                  <div className="by">por {otherFood.author_name}</div>
                </div>
              )}
            </div>

            {otherFood && !swapConfirm && (
              <button className="btn ghost mt20" onClick={() => setSwapConfirm(true)} disabled={busy}>
                TROCAR PELA OUTRA ⇄
              </button>
            )}

            {swapConfirm && otherFood && (
              <div className="modal-overlay" onClick={() => setSwapConfirm(false)}>
                <div className="card bolts accent modal-box" onClick={(e) => e.stopPropagation()}>
                  <div className="card-title">TROCAR PRATO?</div>
                  <p>Trocar para <strong style={{ color: "var(--accent)" }}>"{otherFood.text}"</strong>?</p>
                  <div className="row gap20 mt20" style={{ justifyContent: "center" }}>
                    <button className="btn ghost" onClick={() => setSwapConfirm(false)}>NÃO</button>
                    <button className="btn green" onClick={() => handleSwap(otherFood.id)} disabled={busy}>
                      SIM, TROCAR
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              className="btn lg yellow mt8"
              onClick={() => { setPickConfirmed(true); fireConfetti(30); }}
            >
              BORA COZINHAR 🔥
            </button>
          </section>
        )}

        {/* ── 6. COZINHAR + FOTO ─────────────────────────────── */}
        {scene === "cook" && chosenFood && country && (
          <CookScreen
            country={country}
            chosenFood={chosenFood}
            otherFood={otherFood}
            busy={busy}
            swapConfirm={swapConfirm}
            onOpenSwap={() => setSwapConfirm(true)}
            onCloseSwap={() => setSwapConfirm(false)}
            onSwap={handleSwap}
            onUpload={handleUpload}
          />
        )}

        {/* ── 7. MINHA GALERIA (só a dupla) ──────────────────── */}
        {scene === "gallery" && (
          <section className="screen active">
            <div className="row between wrap">
              <h2 className="neon-green">🏆 MINHA GALERIA</h2>
            </div>
            <p className="help">A vitrine de vocês dois. Os pratos que cozinharam e as notas que receberam.</p>
            <MyGallery supabase={supabase} userId={userId} userName={userName} />
          </section>
        )}

        {/* ── 8. SOCIAL (feed das outras duplas) ─────────────── */}
        {scene === "social" && (
          <section className="screen active">
            <div className="row between wrap">
              <h2 className="neon-pink">🌐 SOCIAL</h2>
            </div>
            <p className="help">O feed da galera. Curta, avalie e comente os pratos das outras duplas.</p>
            <Social supabase={supabase} userId={userId} userName={userName} />
          </section>
        )}
      </main>

      {/* ── Bottom nav ────────────────────────────────────────── */}
      <nav className="nav">
        {(
          [
            { id: "lobby",   emoji: "🚪", label: "SALA"     },
            { id: "draw",    emoji: "🎲", label: "SORTEIO"  },
            { id: "write",   emoji: "✍️",  label: "PRATO"    },
            { id: "pick",    emoji: "🍴", label: "ESCOLHA"  },
            { id: "cook",    emoji: "📸", label: "COZINHAR" },
            { id: "gallery", emoji: "🏆", label: "GALERIA"  },
            { id: "social",  emoji: "🌐", label: "SOCIAL"   },
          ] as const
        ).map(({ id, emoji, label }) => (
          <button
            key={id}
            className={`nav-btn ${
              scene === id || (id === "lobby" && scene === "rooms") ? "on" : ""
            }`}
            onClick={() => {
              if (id === "gallery") setManualScene("gallery");
              else if (id === "social") setManualScene("social");
              else setManualScene(null);
            }}
          >
            <span className="n">{emoji}</span>
            {label}
          </button>
        ))}
      </nav>
    </>
  );
}

// ─── Cook Screen ─────────────────────────────────────────────────────────────
function CookScreen({
  country, chosenFood, otherFood, busy,
  swapConfirm, onOpenSwap, onCloseSwap, onSwap, onUpload,
}: {
  country: Country;
  chosenFood: Food;
  otherFood: Food | null;
  busy: boolean;
  swapConfirm: boolean;
  onOpenSwap: () => void;
  onCloseSwap: () => void;
  onSwap: (id: string) => void;
  onUpload: (file: File) => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showFriendInvite, setShowFriendInvite] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function readFile(file: File) {
    setSelectedFile(file);
    const r = new FileReader();
    r.onload = () => setPreview(r.result as string);
    r.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) readFile(f);
  }

  function reset() {
    setSelectedFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <section className="screen active">
      <div className="row between wrap">
        <h2 className="neon">📸 COZINHE &amp; FOTOGRAFE</h2>
        <span className="badge"><span>{country.flag}</span></span>
      </div>
      <p className="help">
        Mãos à obra! Quando o prato{" "}
        <strong style={{ color: "var(--ink)" }}>{chosenFood.text}</strong>{" "}
        estiver pronto, mande a foto.
      </p>

      {/* Add friend banner */}
      <div
        className="card tight"
        style={{ borderColor: "var(--accent)", cursor: "pointer" }}
        onClick={() => setShowFriendInvite(true)}
      >
        <div className="row between">
          <div>
            <div className="card-title">🤝 ADICIONAR DUPLA</div>
            <div className="help">Conecte com seu parceiro de cozinha</div>
          </div>
          <span className="badge" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
            + AMIGO
          </span>
        </div>
      </div>

      {/* Swap option */}
      {otherFood && !swapConfirm && (
        <div className="card tight">
          <div className="row between">
            <div>
              <div className="card-title">OUTRA OPÇÃO</div>
              <div style={{ fontFamily: "var(--display)", fontSize: 13 }}>{otherFood.text}</div>
              <div className="help">por {otherFood.author_name}</div>
            </div>
            <button className="btn ghost sm" onClick={onOpenSwap} disabled={busy}>TROCAR ⇄</button>
          </div>
        </div>
      )}

      {swapConfirm && otherFood && (
        <div className="modal-overlay" onClick={onCloseSwap}>
          <div className="card bolts accent modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="card-title">TROCAR PRATO?</div>
            <p>Trocar para <strong style={{ color: "var(--accent)" }}>"{otherFood.text}"</strong>?</p>
            <div className="row gap20 mt20" style={{ justifyContent: "center" }}>
              <button className="btn ghost" onClick={onCloseSwap}>NÃO</button>
              <button className="btn green" onClick={() => onSwap(otherFood.id)} disabled={busy}>
                SIM, TROCAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dropzone / preview */}
      {!preview ? (
        <div
          className={`dropzone${dragOver ? " drag" : ""}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="big">🍳</div>
          <p className="pix" style={{ fontSize: 11 }}>TOQUE PARA ENVIAR</p>
          <p className="help">ou arraste a foto aqui</p>
          <input
            ref={fileRef}
            type="file" accept="image/*" capture="environment"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); }}
          />
        </div>
      ) : (
        <div>
          <div className="preview-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Pré-visualização" />
          </div>
          <button className="btn ghost sm mt8" onClick={reset}>TIRAR OUTRA ↺</button>
        </div>
      )}

      <button
        className="btn lg green block mt8"
        disabled={!selectedFile || busy}
        onClick={() => { if (selectedFile) onUpload(selectedFile); }}
      >
        {busy ? "ENVIANDO…" : "ENVIAR PRA GALERIA ▸"}
      </button>

      {showFriendInvite && (
        <FriendInvite
          onClose={() => setShowFriendInvite(false)}
          onFriendAdded={() => showToast("Dupla adicionada! 🎉")}
        />
      )}
    </section>
  );
}

// ─── Stepper ─────────────────────────────────────────────────────────────────
function Stepper({ stepIdx }: { stepIdx: number }) {
  const els = [
    { type: "dot", n: 1 }, { type: "bar" },
    { type: "dot", n: 2 }, { type: "bar" },
    { type: "dot", n: 3 }, { type: "bar" },
    { type: "dot", n: 4 }, { type: "bar" },
    { type: "dot", n: 5 },
  ] as const;
  return (
    <div className="steps">
      {els.map((el, i) => (
        <div key={i} className={`step ${i < stepIdx ? "done" : i === stepIdx ? "cur" : ""}`}>
          {el.type === "dot" ? <span className="dot">{el.n}</span> : <span className="bar" />}
        </div>
      ))}
    </div>
  );
}

// ─── Theme Toggle ─────────────────────────────────────────────────────────────
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
