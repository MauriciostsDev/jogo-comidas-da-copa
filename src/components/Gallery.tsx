"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GalleryDish, Review } from "@/lib/types";
import { submitReview } from "@/app/actions";
import { StarPicker, Stars } from "./StarRating";

type Props = {
  supabase: SupabaseClient;
  userId: string;
  userName: string;
};

function avg(reviews: Review[]) {
  if (!reviews.length) return 0;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
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
      const c = one(m.country) as {
        name_pt: string;
        flag: string;
        confederation: string;
      } | null;
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reviews" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, load]);

  if (dishes === null) {
    return (
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <div key={i} className="skeleton h-72 rounded-[1.75rem]" />
        ))}
      </div>
    );
  }

  if (dishes.length === 0) {
    return (
      <div className="glass mt-4 rounded-[1.75rem] p-10 text-center [animation:var(--animate-rise)]">
        <div className="text-6xl [animation:var(--animate-float)]">🖼️</div>
        <h3 className="mt-4 font-display text-2xl font-black text-cream">
          Galeria vazia
        </h3>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
          Cozinhem o primeiro prato e mandem a foto — ele aparece aqui pra todo
          mundo avaliar.
        </p>
      </div>
    );
  }

  const totalReviews = dishes.reduce((s, d) => s + d.reviews.length, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-muted">
          <span className="font-bold text-cream">{dishes.length}</span>{" "}
          prato{dishes.length > 1 ? "s" : ""} ·{" "}
          <span className="font-bold text-cream">{totalReviews}</span>{" "}
          avaliaç{totalReviews === 1 ? "ão" : "ões"}
        </p>
      </div>

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
  dish,
  userId,
  index,
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
  const [comment, setComment] = useState(mine?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function send() {
    if (!stars) {
      setErr("Escolha de 1 a 5 estrelas.");
      return;
    }
    setBusy(true);
    setErr("");
    const r = await submitReview(dish.match_id, stars, comment);
    setBusy(false);
    if (!r.ok) setErr(r.error ?? "Não rolou salvar.");
    else setOpen(false);
  }

  return (
    <article
      className="group overflow-hidden rounded-[1.75rem] border border-line bg-card shadow-[var(--shadow-warm)] [animation:var(--animate-rise)]"
      style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}
    >
      {/* Foto */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dish.photo_url}
          alt={dish.dish}
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-coal via-coal/10 to-transparent" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-sm font-semibold backdrop-blur">
          <span className="text-lg leading-none">{dish.country_flag}</span>
          {dish.country_name}
        </div>
        {dish.reviews.length > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-gold px-2.5 py-1.5 text-sm font-black text-ink shadow">
            ★ {rating.toFixed(1)}
          </div>
        )}
        <div className="absolute right-4 bottom-3 left-4">
          <h3 className="font-display text-2xl leading-tight font-black text-cream drop-shadow">
            {dish.dish}
          </h3>
          <p className="text-xs text-cream-soft/80">
            por {dish.cook} · {dish.confederation}
          </p>
        </div>
      </div>

      {/* Avaliações */}
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stars value={rating} size="1.05rem" />
            <span className="text-xs text-muted">
              {dish.reviews.length
                ? `${dish.reviews.length} avaliaç${dish.reviews.length === 1 ? "ão" : "ões"}`
                : "Seja o primeiro a avaliar"}
            </span>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-full bg-saffron/15 px-3 py-1.5 text-xs font-bold text-saffron-bright transition active:scale-95"
          >
            {mine ? "Editar nota" : "Avaliar"}
          </button>
        </div>

        {/* Formulário estilo iFood */}
        {open && (
          <div className="space-y-3 rounded-2xl border border-line bg-coal/50 p-4 [animation:var(--animate-pop)]">
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm font-semibold text-cream">
                Quantas estrelas pra esse prato?
              </p>
              <StarPicker value={stars} onChange={setStars} />
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={280}
              placeholder="Conta como ficou… (opcional)"
              className="w-full resize-none rounded-xl border border-line bg-coal/60 px-3 py-2.5 text-sm text-cream placeholder:text-faint outline-none focus:border-saffron"
            />
            {err && <p className="text-xs text-paprika">{err}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-line py-2.5 text-sm font-bold text-muted transition active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={send}
                disabled={busy}
                className="flex-1 rounded-xl bg-gradient-to-r from-saffron-bright to-paprika py-2.5 text-sm font-black text-ink transition active:scale-95 disabled:opacity-60"
              >
                {busy ? "Salvando…" : "Publicar"}
              </button>
            </div>
          </div>
        )}

        {/* Lista de avaliações */}
        {dish.reviews.length > 0 && (
          <ul className="space-y-2.5 pt-1">
            {dish.reviews.map((r) => (
              <li key={r.id} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card-2 text-sm font-black text-saffron-bright uppercase">
                  {r.author_name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2">
                    <span className="text-sm font-bold text-cream">
                      {r.author_name}
                      {r.user_id === userId && (
                        <span className="ml-1 text-[0.65rem] text-faint">
                          (você)
                        </span>
                      )}
                    </span>
                    <Stars value={r.rating} size="0.8rem" />
                  </div>
                  {r.comment && (
                    <p className="mt-0.5 text-sm text-cream-soft">{r.comment}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
