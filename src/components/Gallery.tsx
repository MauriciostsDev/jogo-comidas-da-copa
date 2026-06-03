"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GalleryDish, Like, Review } from "@/lib/types";
import { submitReview, toggleLike } from "@/app/actions";
import { fireConfetti } from "@/lib/confetti";
import { showToast } from "@/lib/toast";

type Props = { supabase: SupabaseClient; userId: string; userName: string };
type SortMode = "hot" | "new" | "top";

function avg(reviews: Review[]) {
  if (!reviews.length) return 0;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
}

// Avatar emoji estável a partir de uma string
const DUO_AV = ["🧑‍🍳", "👩‍🍳", "👨‍🍳", "🧑‍🎤", "👩‍🎤", "🥘", "🍲"];
function avFor(id: string) {
  const sum = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return DUO_AV[sum % DUO_AV.length];
}

function timeAgo(iso: string) {
  const diff = Date.now() - +new Date(iso);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}

function StarRow({ value, size = "1.1em" }: { value: number; size?: string }) {
  return (
    <span className="stars" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`star ${n <= Math.round(value) ? "on" : ""}`}>★</span>
      ))}
    </span>
  );
}

function ReviewsList({ reviews, userId }: { reviews: Review[]; userId: string }) {
  return (
    <>
      {reviews.map((r) => (
        <div key={r.id} className="review">
          <span className="who">
            {r.author_name}
            {r.user_id === userId && (
              <span className="tiny" style={{ color: "var(--muted)", marginLeft: 6 }}>(você)</span>
            )}
            <span className="s">{"★".repeat(r.rating)}</span>
          </span>
          {r.comment && <div>{r.comment}</div>}
        </div>
      ))}
    </>
  );
}

// ─── Data loader (compartilhado) ─────────────────────────────────────────────
async function loadDishes(supabase: SupabaseClient, userId: string) {
  const { data: myFoods } = await supabase
    .from("foods")
    .select("match_id")
    .eq("user_id", userId);
  const myMatchIds = new Set((myFoods ?? []).map((f: { match_id: string }) => f.match_id));

  const { data } = await supabase
    .from("matches")
    .select(
      `id, photo_url, created_at,
       country:countries!matches_country_id_fkey ( name_pt, flag, confederation ),
       chosen:foods!matches_chosen_food_id_fkey ( text, author_name ),
       reviews ( id, match_id, user_id, author_name, rating, comment, created_at ),
       likes ( match_id, user_id, created_at )`,
    )
    .eq("status", "done")
    .not("photo_url", "is", null)
    .order("created_at", { ascending: false });

  const one = <T,>(v: T | T[] | null): T | null =>
    Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

  const mapped: GalleryDish[] = (data ?? []).map((m) => {
    const c = one(m.country) as { name_pt: string; flag: string; confederation: string } | null;
    const f = one(m.chosen) as { text: string; author_name: string } | null;
    return {
      match_id: m.id,
      photo_url: m.photo_url,
      created_at: m.created_at,
      country_name: c?.name_pt ?? "—",
      country_flag: c?.flag ?? "🏳️",
      confederation: c?.confederation ?? "",
      dish: f?.text ?? "Prato surpresa",
      cook: f?.author_name ?? "Chef misterioso",
      reviews: ((m.reviews as Review[]) ?? []).sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
      ),
      likes: ((m.likes as Like[]) ?? []),
      mine: myMatchIds.has(m.id),
    };
  });

  return mapped;
}

function useDishes(supabase: SupabaseClient, userId: string) {
  const [dishes, setDishes] = useState<GalleryDish[] | null>(null);
  const load = useCallback(async () => {
    setDishes(await loadDishes(supabase, userId));
  }, [supabase, userId]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("galeria-v2")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, load]);

  return { dishes, load };
}

// ═══════════════════════════════════════════════════════════════════════════
//  🏆 MINHA GALERIA — vitrine só da dupla (read-only)
// ═══════════════════════════════════════════════════════════════════════════
export function MyGallery({ supabase, userId, userName }: Props) {
  const { dishes } = useDishes(supabase, userId);

  if (dishes === null) {
    return (
      <div className="grid">
        {[0, 1, 2].map((i) => (
          <div key={i} className="gcard" style={{ minHeight: 300, background: "var(--surface-2)", animation: "none", opacity: 0.5 }} />
        ))}
      </div>
    );
  }

  const mine = dishes.filter((d) => d.mine);

  if (mine.length === 0) {
    return (
      <div className="empty-gallery">
        <div className="big">🍽️</div>
        <div className="pix" style={{ fontSize: 12, color: "var(--accent)" }}>AINDA SEM PRATOS</div>
        <p className="help mt8">Cozinhem o prato sorteado e mandem a foto pra aparecer aqui.</p>
      </div>
    );
  }

  // Stats
  const allReviews = mine.flatMap((d) => d.reviews);
  const media = avg(allReviews);
  const curtidas = mine.reduce((s, d) => s + d.likes.length, 0);

  return (
    <>
      <div className="stats-row">
        <div className="stat">
          <div className="num">{mine.length}</div>
          <div className="lbl">PRATOS</div>
        </div>
        <div className="stat">
          <div className="num">{media ? media.toFixed(1) + "★" : "—"}</div>
          <div className="lbl">MÉDIA GERAL</div>
        </div>
        <div className="stat">
          <div className="num">{curtidas}</div>
          <div className="lbl">❤️ CURTIDAS</div>
        </div>
      </div>

      <div className="grid">
        {mine.map((dish) => {
          const a = avg(dish.reviews);
          return (
            <div key={dish.match_id} className="gcard">
              <div className="gphoto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={dish.photo_url} alt={dish.dish} loading="lazy" />
                <span className="flag">{dish.country_flag}</span>
                <span className="score">★ {a ? a.toFixed(1) : "—"}</span>
              </div>
              <div className="gbody">
                <div className="gdish">{dish.dish}</div>
                <div className="gby">
                  por <span className="neon">VOCÊS</span> · ❤️ {dish.likes.length}
                </div>
                <div className="reviews">
                  {dish.reviews.length ? (
                    <ReviewsList reviews={dish.reviews} userId={userId} />
                  ) : (
                    <div className="help" style={{ fontSize: 15 }}>
                      Ainda sem avaliações — divulguem no Social 😉
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  🌐 SOCIAL — feed das outras duplas (curtir / avaliar / comentar)
// ═══════════════════════════════════════════════════════════════════════════
export function Social({ supabase, userId, userName }: Props) {
  const { dishes, load } = useDishes(supabase, userId);
  const [sort, setSort] = useState<SortMode>("hot");

  if (dishes === null) {
    return (
      <div className="feed">
        {[0, 1].map((i) => (
          <div key={i} className="post" style={{ minHeight: 380, background: "var(--surface-2)", animation: "none", opacity: 0.5 }} />
        ))}
      </div>
    );
  }

  const social = dishes.filter((d) => !d.mine);

  // Pódio: top 3 por média (desempate por curtidas)
  const topSorted = [...social].sort(
    (a, b) => avg(b.reviews) - avg(a.reviews) || b.likes.length - a.likes.length,
  );
  const top3 = topSorted.slice(0, 3);
  // ordem visual: prata · ouro · bronze
  const podiumOrder = [top3[1], top3[0], top3[2]];
  const medals = ["🥈", "🥇", "🥉"];
  const cls = ["p2", "p1", "p3"];

  const sorted = [...social].sort((a, b) => {
    if (sort === "top") return avg(b.reviews) - avg(a.reviews) || b.likes.length - a.likes.length;
    if (sort === "hot") return b.likes.length - a.likes.length;
    return +new Date(b.created_at) - +new Date(a.created_at); // new
  });

  if (social.length === 0) {
    return (
      <div className="empty-gallery">
        <div className="big">🌐</div>
        <div className="pix" style={{ fontSize: 12, color: "var(--accent)" }}>FEED VAZIO</div>
        <p className="help mt8">Quando outras duplas mandarem fotos, elas aparecem aqui pra você curtir e avaliar.</p>
      </div>
    );
  }

  return (
    <>
      {/* Pódio da semana */}
      {top3.some(Boolean) && (
        <div className="podium">
          {podiumOrder.map((p, k) =>
            p ? (
              <div key={p.match_id} className={`pod ${cls[k]}`}>
                <span className="pflag">{p.country_flag}</span>
                <span className="medal">{medals[k]}</span>
                <span className="pemoji">🍽️</span>
                <span className="pduo">{p.cook}</span>
                <span className="pscore">★ {avg(p.reviews) ? avg(p.reviews).toFixed(1) : "—"}</span>
              </div>
            ) : (
              <div key={k} />
            ),
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="chips">
        <button className={`chip ${sort === "hot" ? "on" : ""}`} onClick={() => setSort("hot")}>🔥 EM ALTA</button>
        <button className={`chip ${sort === "new" ? "on" : ""}`} onClick={() => setSort("new")}>🆕 RECENTES</button>
        <button className={`chip ${sort === "top" ? "on" : ""}`} onClick={() => setSort("top")}>🏅 + VOTADOS</button>
      </div>

      {/* Feed */}
      <div className="feed">
        {sorted.map((dish) => (
          <PostCard key={dish.match_id} dish={dish} userId={userId} userName={userName} onChange={load} />
        ))}
      </div>
    </>
  );
}

function PostCard({
  dish, userId, userName, onChange,
}: {
  dish: GalleryDish;
  userId: string;
  userName: string;
  onChange: () => void;
}) {
  const myReview = dish.reviews.find((r) => r.user_id === userId) ?? null;
  const liked = dish.likes.some((l) => l.user_id === userId);
  const a = avg(dish.reviews);

  const [showComments, setShowComments] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [stars, setStars] = useState(myReview?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(myReview?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  async function handleLike() {
    setLikeBusy(true);
    const r = await toggleLike(dish.match_id);
    setLikeBusy(false);
    if (!r.ok) return;
    if (r.liked) fireConfetti(14);
    onChange();
  }

  async function send() {
    if (!stars) { showToast("Escolha as estrelas ⭐"); return; }
    setBusy(true);
    const r = await submitReview(dish.match_id, stars, comment);
    setBusy(false);
    if (!r.ok) { showToast(r.error ?? "Não rolou salvar."); return; }
    fireConfetti(24);
    showToast(`Avaliação enviada! ★${stars}`);
    setRateOpen(false);
  }

  const shownStars = hover || stars;

  return (
    <article className="post">
      {/* head */}
      <div className="post-head">
        <div className="avatar">{avFor(dish.cook)}</div>
        <div className="meta">
          <div className="pduo">{dish.cook}</div>
          <div className="psub">{dish.country_flag} {dish.country_name} · {timeAgo(dish.created_at)}</div>
        </div>
      </div>

      {/* photo */}
      <div className="post-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dish.photo_url} alt={dish.dish} loading="lazy" />
        <span className="pflag">{dish.country_flag}</span>
        {dish.reviews.length > 0 && <span className="pscore">★ {a.toFixed(1)}</span>}
      </div>

      {/* action bar */}
      <div className="post-bar">
        <button className={`act like ${liked ? "on" : ""}`} onClick={handleLike} disabled={likeBusy}>
          <span className="ic">{liked ? "❤️" : "🤍"}</span> <span className="lc">{dish.likes.length}</span>
        </button>
        <button className="act cmt" onClick={() => setShowComments((v) => !v)}>
          <span className="ic">💬</span> <span>{dish.reviews.length}</span>
        </button>
        <button className="act spacer" onClick={() => setRateOpen((v) => !v)}>
          <span className="ic">⭐</span> {myReview ? "EDITAR" : "AVALIAR"}
        </button>
      </div>

      {/* body */}
      <div className="post-body">
        <div className="post-caption">
          <span className="pdish">{dish.dish}</span>
        </div>

        {dish.reviews.length > 0 && (
          <button className="toggle-cmt" onClick={() => setShowComments((v) => !v)}>
            {showComments
              ? "ocultar comentários"
              : `ver ${dish.reviews.length} comentário${dish.reviews.length > 1 ? "s" : ""}`}
          </button>
        )}

        {showComments && dish.reviews.length > 0 && (
          <div className="post-reviews">
            <ReviewsList reviews={dish.reviews} userId={userId} />
          </div>
        )}

        {rateOpen && (
          <div className="rate-box">
            <div className="rlabel">SUA NOTA</div>
            <div
              className="stars input-stars"
              onMouseLeave={() => setHover(0)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={`star ${n <= shownStars ? "on" : ""}`}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => setStars(n)}
                  style={{ cursor: "pointer" }}
                >
                  ★
                </span>
              ))}
            </div>
            <div className="rrow">
              <textarea
                className="input grow"
                rows={1}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={280}
                placeholder="Comente o prato…"
              />
              <button className="btn pink sm" onClick={send} disabled={busy}>
                {busy ? "…" : "ENVIAR ★"}
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

// Default export mantido por compatibilidade (não usado após split)
export default function Gallery(props: Props) {
  return <MyGallery {...props} />;
}
