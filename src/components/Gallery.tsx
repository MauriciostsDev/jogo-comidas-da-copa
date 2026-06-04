"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Comment, GalleryDish, Like, Profile, Review } from "@/lib/types";
import {
  addComment,
  getFriends,
  setPublished,
  submitReview,
  toggleLike,
  updateGalleryEntry,
} from "@/app/actions";
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

function CommentsList({ comments, userId }: { comments: Comment[]; userId: string }) {
  return (
    <>
      {comments.map((c) => (
        <div key={c.id} className="review">
          <span className="who">
            💬 {c.author_name}
            {c.user_id === userId && (
              <span className="tiny" style={{ color: "var(--muted)", marginLeft: 6 }}>(você)</span>
            )}
          </span>
          <div>{c.text}</div>
        </div>
      ))}
    </>
  );
}

// Estrelas + comentário — só quem participou avalia (na galeria).
function RatingBox({
  dish, userId, onChange,
}: {
  dish: GalleryDish;
  userId: string;
  onChange: () => void;
}) {
  const myReview = dish.reviews.find((r) => r.user_id === userId) ?? null;
  const [stars, setStars] = useState(myReview?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(myReview?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const shown = hover || stars;

  async function send() {
    if (!stars) { showToast("Escolha as estrelas ⭐"); return; }
    setBusy(true);
    const r = await submitReview(dish.match_id, stars, comment);
    setBusy(false);
    if (!r.ok) { showToast(r.error ?? "Não rolou salvar."); return; }
    fireConfetti(24);
    showToast(`Avaliação enviada! ★${stars}`);
    onChange();
  }

  return (
    <div className="rate-box">
      <div className="rlabel">{myReview ? "SUA AVALIAÇÃO" : "AVALIE O PRATO DE VOCÊS"}</div>
      <div className="stars input-stars" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`star ${n <= shown ? "on" : ""}`}
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
          placeholder="Comente o prato de vocês…"
        />
        <button className="btn pink sm" onClick={send} disabled={busy}>
          {busy ? "…" : myReview ? "ATUALIZAR ★" : "AVALIAR ★"}
        </button>
      </div>
    </div>
  );
}

// Caixa de comentário (texto, sem estrela) — usada no feed.
function CommentBox({
  matchId, onChange,
}: {
  matchId: string;
  onChange: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!text.trim()) { showToast("Escreva um comentário 💬"); return; }
    setBusy(true);
    const r = await addComment(matchId, text);
    setBusy(false);
    if (!r.ok) { showToast(r.error ?? "Não rolou."); return; }
    setText("");
    showToast("💬 Comentário enviado!");
    onChange();
  }

  return (
    <div className="rate-box">
      <div className="rlabel">COMENTAR</div>
      <div className="rrow">
        <textarea
          className="input grow"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
          placeholder="Escreva um comentário…"
        />
        <button className="btn pink sm" onClick={send} disabled={busy}>
          {busy ? "…" : "ENVIAR 💬"}
        </button>
      </div>
    </div>
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
      `id, photo_url, created_at, caption, published, partner_id,
       country:countries!matches_country_id_fkey ( name_pt, flag, confederation ),
       chosen:foods!matches_chosen_food_id_fkey ( text, author_name ),
       partner:profiles!matches_partner_id_fkey ( user_id, display_name ),
       reviews ( id, match_id, user_id, author_name, rating, comment, created_at ),
       comments ( id, match_id, user_id, author_name, text, created_at ),
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
    const p = one(m.partner) as { user_id: string; display_name: string } | null;
    return {
      match_id: m.id,
      photo_url: m.photo_url,
      created_at: m.created_at,
      country_name: c?.name_pt ?? "—",
      country_flag: c?.flag ?? "🏳️",
      confederation: c?.confederation ?? "",
      dish: f?.text ?? "Prato surpresa",
      cook: f?.author_name ?? "Chef misterioso",
      caption: m.caption ?? null,
      partnerId: m.partner_id ?? null,
      partnerName: p?.display_name ?? null,
      published: !!m.published,
      reviews: ((m.reviews as Review[]) ?? []).sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
      ),
      comments: ((m.comments as Comment[]) ?? []).sort(
        (a, b) => +new Date(a.created_at) - +new Date(b.created_at),
      ),
      likes: ((m.likes as Like[]) ?? []),
      mine: myMatchIds.has(m.id) || m.partner_id === userId,
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
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, load]);

  return { dishes, load };
}

// ═══════════════════════════════════════════════════════════════════════════
//  🏆 MINHA GALERIA — vitrine da dupla (editável: foto, dupla, legenda, feed)
// ═══════════════════════════════════════════════════════════════════════════
export function MyGallery({ supabase, userId }: Props) {
  const { dishes, load } = useDishes(supabase, userId);
  const [friends, setFriends] = useState<Profile[]>([]);

  useEffect(() => {
    getFriends().then((r) => {
      if (r.ok && r.friends) setFriends(r.friends);
    });
  }, []);

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
      <div className="card tight">
        <div className="card-title">🤝 MINHAS DUPLAS ({friends.length})</div>
        {friends.length ? (
          friends.map((f) => (
            <div
              key={f.user_id}
              className="row between"
              style={{ padding: "8px 0", borderTop: "2px solid var(--line)" }}
            >
              <span style={{ fontFamily: "var(--display)", fontSize: 11 }}>👤 {f.display_name}</span>
              <span className="kbd">{f.invite_code}</span>
            </div>
          ))
        ) : (
          <p className="help" style={{ fontSize: 15, marginTop: 6 }}>
            Você ainda não tem duplas. Adicione pelo código no lobby (🤝) pra marcar nos pratos e jogar junto.
          </p>
        )}
      </div>

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
        {mine.map((dish) => (
          <MyGCard
            key={dish.match_id}
            dish={dish}
            supabase={supabase}
            userId={userId}
            friends={friends}
            onChange={load}
          />
        ))}
      </div>
    </>
  );
}

// Card editável da Minha Galeria
function MyGCard({
  dish, supabase, userId, friends, onChange,
}: {
  dish: GalleryDish;
  supabase: SupabaseClient;
  userId: string;
  friends: Profile[];
  onChange: () => void;
}) {
  const a = avg(dish.reviews);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(dish.caption ?? "");
  const [partnerId, setPartnerId] = useState(dish.partnerId ?? "");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pubBusy, setPubBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File) {
    setNewFile(f);
    const r = new FileReader();
    r.onload = () => setNewPreview(r.result as string);
    r.readAsDataURL(f);
  }

  async function uploadPhoto(file: File): Promise<string | null> {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${dish.match_id}/${Date.now()}.${ext}`;
    const up = await supabase.storage.from("fotos").upload(path, file);
    if (up.error) { showToast("Erro ao enviar foto: " + up.error.message); return null; }
    return supabase.storage.from("fotos").getPublicUrl(path).data.publicUrl;
  }

  function cancel() {
    setEditing(false);
    setNewFile(null);
    setNewPreview(null);
    setCaption(dish.caption ?? "");
    setPartnerId(dish.partnerId ?? "");
  }

  async function save() {
    setBusy(true);
    let photoUrl: string | null = null;
    if (newFile) {
      photoUrl = await uploadPhoto(newFile);
      if (!photoUrl) { setBusy(false); return; }
    }
    const r = await updateGalleryEntry(dish.match_id, caption, partnerId || null, photoUrl);
    setBusy(false);
    if (!r.ok) { showToast(r.error ?? "Erro ao salvar."); return; }
    fireConfetti(18);
    showToast("Galeria atualizada! ✨");
    setEditing(false);
    setNewFile(null);
    setNewPreview(null);
    onChange();
  }

  async function togglePublish() {
    setPubBusy(true);
    const r = await setPublished(dish.match_id, !dish.published);
    setPubBusy(false);
    if (!r.ok) { showToast(r.error ?? "Não rolou."); return; }
    if (!dish.published) { fireConfetti(24); showToast("📤 Publicado no feed!"); }
    else showToast("Removido do feed.");
    onChange();
  }

  return (
    <div className="gcard">
      <div className="gphoto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={newPreview ?? dish.photo_url} alt={dish.dish} loading="lazy" />
        <span className="flag">{dish.country_flag}</span>
        <span className="score">★ {a ? a.toFixed(1) : "—"}</span>
        {dish.published && <span className="pub-tag">📡 PUBLICADO</span>}
      </div>
      <div className="gbody">
        <div className="gdish">{dish.dish}</div>
        <div className="gby">
          {dish.partnerName ? <>🤝 com {dish.partnerName} · </> : null}❤️ {dish.likes.length}
        </div>

        {!editing && dish.caption && <p className="gcaption">{dish.caption}</p>}

        {!editing ? (
          <>
            <RatingBox dish={dish} userId={userId} onChange={onChange} />

            {dish.reviews.length > 0 || dish.comments.length > 0 ? (
              <div className="reviews">
                <ReviewsList reviews={dish.reviews} userId={userId} />
                <CommentsList comments={dish.comments} userId={userId} />
              </div>
            ) : (
              <div className="help" style={{ fontSize: 15 }}>
                Avalie o prato e exporte pro feed pra galera comentar 😉
              </div>
            )}

            <div className="row gap8" style={{ flexWrap: "wrap" }}>
              <button className="btn ghost sm" onClick={() => setEditing(true)}>✏️ EDITAR</button>
              <button
                className={`btn sm ${dish.published ? "ghost" : "pink"}`}
                onClick={togglePublish}
                disabled={pubBusy}
              >
                {dish.published ? "✓ TIRAR DO FEED" : "📤 EXPORTAR AO FEED"}
              </button>
            </div>
          </>
        ) : (
          <div className="col gap8">
            <button className="btn ghost sm" onClick={() => fileRef.current?.click()}>
              📷 {newFile ? "FOTO TROCADA ✓" : "TROCAR FOTO"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
            />

            <div className="field">
              <label className="label">QUEM COZINHOU COM VOCÊ</label>
              {friends.length ? (
                <select
                  className="input"
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                >
                  <option value="">— ninguém marcado —</option>
                  {friends.map((f) => (
                    <option key={f.user_id} value={f.user_id}>{f.display_name}</option>
                  ))}
                </select>
              ) : (
                <p className="help" style={{ fontSize: 15 }}>
                  Adicione sua dupla pelo código (no lobby 🤝) pra poder marcar aqui.
                </p>
              )}
            </div>

            <div className="field">
              <label className="label">LEGENDA / COMENTÁRIO</label>
              <textarea
                className="input"
                rows={2}
                maxLength={280}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Conta como foi cozinhar esse prato…"
              />
            </div>

            <div className="row gap8">
              <button className="btn green sm" onClick={save} disabled={busy}>
                {busy ? "SALVANDO…" : "SALVAR ✓"}
              </button>
              <button className="btn ghost sm" onClick={cancel} disabled={busy}>CANCELAR</button>
            </div>
          </div>
        )}
      </div>
    </div>
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

  const social = dishes.filter((d) => d.published);

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
        <p className="help mt8">Quando as duplas exportarem pratos pro feed, eles aparecem aqui pra você curtir e comentar.</p>
      </div>
    );
  }

  return (
    <>
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
  dish, userId, onChange,
}: {
  dish: GalleryDish;
  userId: string;
  userName: string;
  onChange: () => void;
}) {
  const liked = dish.likes.some((l) => l.user_id === userId);
  const a = avg(dish.reviews);
  const commentCount = dish.comments.length;

  const [showComments, setShowComments] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  async function handleLike() {
    setLikeBusy(true);
    const r = await toggleLike(dish.match_id);
    setLikeBusy(false);
    if (!r.ok) return;
    if (r.liked) fireConfetti(14);
    onChange();
  }

  return (
    <article className="post">
      {/* head */}
      <div className="post-head">
        <div className="avatar">{avFor(dish.cook)}</div>
        <div className="meta">
          <div className="pduo">{dish.cook}{dish.partnerName ? ` & ${dish.partnerName}` : ""}</div>
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

      {/* action bar — só curtir e comentar (avaliação é na galeria) */}
      <div className="post-bar">
        <button className={`act like ${liked ? "on" : ""}`} onClick={handleLike} disabled={likeBusy}>
          <span className="ic">{liked ? "❤️" : "🤍"}</span> <span className="lc">{dish.likes.length}</span>
        </button>
        <button className="act cmt" onClick={() => setShowComments((v) => !v)}>
          <span className="ic">💬</span> <span>{commentCount}</span>
        </button>
      </div>

      {/* body */}
      <div className="post-body">
        <div className="post-caption">
          <span className="pdish">{dish.dish}</span>
          {dish.caption && <span>{dish.caption}</span>}
        </div>

        {commentCount > 0 && (
          <button className="toggle-cmt" onClick={() => setShowComments((v) => !v)}>
            {showComments
              ? "ocultar comentários"
              : `ver ${commentCount} comentário${commentCount > 1 ? "s" : ""}`}
          </button>
        )}

        {showComments && (
          <>
            {commentCount > 0 && (
              <div className="post-reviews">
                <CommentsList comments={dish.comments} userId={userId} />
              </div>
            )}
            <CommentBox matchId={dish.match_id} onChange={onChange} />
          </>
        )}
      </div>
    </article>
  );
}

// Default export mantido por compatibilidade (não usado após split)
export default function Gallery(props: Props) {
  return <MyGallery {...props} />;
}
