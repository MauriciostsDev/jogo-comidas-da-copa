"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GalleryDish, Review } from "@/lib/types";
import { submitReview } from "@/app/actions";
import { fireConfetti } from "@/lib/confetti";
import { showToast } from "@/lib/toast";

type Props = { supabase: SupabaseClient; userId: string; userName: string };

function avg(reviews: Review[]) {
  if (!reviews.length) return 0;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
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

export default function Gallery({ supabase, userId, userName }: Props) {
  const [dishes, setDishes] = useState<GalleryDish[] | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("matches")
      .select(
        `id, photo_url, created_at,
         country:countries!matches_country_id_fkey ( name_pt, flag, confederation ),
         chosen:foods!matches_chosen_food_id_fkey ( text, author_name ),
         reviews ( id, match_id, user_id, author_name, rating, comment, created_at )`,
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
      };
    });
    setDishes(mapped);
  }, [supabase]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("galeria")
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, load]);

  if (dishes === null) {
    return (
      <div className="grid">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="gcard"
            style={{ minHeight: 300, background: "var(--surface-2)", animation: "none", opacity: 0.5 }}
          />
        ))}
      </div>
    );
  }

  if (dishes.length === 0) {
    return (
      <section className="screen active center" style={{ marginTop: 32 }}>
        <div style={{ fontSize: 64 }}>🖼️</div>
        <h3 className="neon-yellow" style={{ marginTop: 16 }}>GALERIA VAZIA</h3>
        <p className="help" style={{ marginTop: 8, maxWidth: 280, textAlign: "center" }}>
          Cozinhem o primeiro prato e mandem a foto — ele aparece aqui pra todo mundo avaliar.
        </p>
      </section>
    );
  }

  return (
    <div className="grid">
      {dishes.map((dish, i) => (
        <DishCard
          key={dish.match_id}
          dish={dish}
          userId={userId}
          userName={userName}
          index={i}
        />
      ))}
    </div>
  );
}

function DishCard({
  dish, userId, userName, index,
}: {
  dish: GalleryDish;
  userId: string;
  userName: string;
  index: number;
}) {
  const mine = dish.reviews.find((r) => r.user_id === userId) ?? null;
  const rating = avg(dish.reviews);

  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(mine?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(mine?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function send() {
    if (!stars) { showToast("Escolha as estrelas ⭐"); setErr("Escolha de 1 a 5 estrelas."); return; }
    setBusy(true); setErr("");
    const r = await submitReview(dish.match_id, stars, comment);
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Não rolou salvar."); return; }
    fireConfetti(24);
    showToast(`Avaliação enviada! ${"★".repeat(stars)}`);
    setOpen(false);
  }

  const shownStars = hover || stars;

  return (
    <article
      className="gcard"
      style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}
    >
      {/* Photo */}
      <div className="gphoto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dish.photo_url} alt={dish.dish} loading="lazy" />
        <span className="flag">{dish.country_flag}</span>
        {dish.reviews.length > 0 && (
          <span className="score">★ {rating.toFixed(1)}</span>
        )}
      </div>

      {/* Body */}
      <div className="gbody">
        <div className="gdish">{dish.dish}</div>
        <div className="gby">
          {dish.cook}
          {dish.cook === userName && (
            <> · <span className="neon">VOCÊS</span></>
          )}
        </div>

        {/* Existing rating summary */}
        <div className="row between wrap" style={{ gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <StarRow value={rating} />
            <span className="tiny" style={{ color: "var(--muted)" }}>
              {dish.reviews.length
                ? `(${dish.reviews.length})`
                : "sem avaliações"}
            </span>
          </div>
          <button
            className="btn pink sm"
            onClick={() => setOpen((v) => !v)}
          >
            {mine ? "EDITAR ★" : "AVALIAR ★"}
          </button>
        </div>

        {/* Review form */}
        {open && (
          <div className="col gap8 mt8">
            {/* Star picker */}
            <div
              className="stars input-stars"
              onMouseLeave={() => setHover(0)}
              style={{ justifyContent: "center", fontSize: "1.6em" }}
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

            <textarea
              className="input"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={280}
              placeholder="Conta como ficou… (opcional)"
            />

            {err && <p className="tiny" style={{ color: "var(--pink)" }}>{err}</p>}

            <div className="row gap8">
              <button className="btn ghost sm grow" onClick={() => setOpen(false)}>CANCELAR</button>
              <button className="btn pink sm grow" onClick={send} disabled={busy}>
                {busy ? "SALVANDO…" : "AVALIAR ★"}
              </button>
            </div>
          </div>
        )}

        {/* Reviews list */}
        {dish.reviews.length > 0 && (
          <div className="col" style={{ gap: 0 }}>
            {dish.reviews.map((r) => (
              <div key={r.id} className="review">
                <div className="who">
                  {r.author_name}
                  {r.user_id === userId && (
                    <span className="tiny" style={{ color: "var(--muted)", marginLeft: 6 }}>(você)</span>
                  )}
                  <span className="s">{"★".repeat(r.rating)}</span>
                </div>
                {r.comment && <div>{r.comment}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
