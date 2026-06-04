"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import { getFriendData, getFriends } from "@/app/actions";
import FriendInvite from "./FriendInvite";

type Props = { supabase: SupabaseClient; userId: string; userName: string };

type CountryRow = { id: number; name_pt: string; flag: string; confederation: string; status: string };
type DishRow = { match_id: string; photo_url: string | null; dish: string; country_name: string; country_flag: string; caption: string | null };

type FriendProfile = {
  profile: Profile;
  countries: CountryRow[];
  dishes: DishRow[];
};

const AVATARS = ["🧑‍🍳", "👩‍🍳", "👨‍🍳", "🧑‍🎤", "👩‍🎤", "🥘", "🍲", "🏆", "⚽", "🎯"];
function avatarFor(id: string) {
  const sum = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATARS[sum % AVATARS.length];
}

export default function Friends({ supabase, userId, userName }: Props) {
  const [friends, setFriends] = useState<Profile[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [showInvite, setShowInvite] = useState(false);
  const [selected, setSelected] = useState<FriendProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Load friends list
  const loadFriends = useCallback(async () => {
    const r = await getFriends();
    if (r.ok && r.friends) setFriends(r.friends);
  }, []);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  // Realtime presence — track who is online
  useEffect(() => {
    const ch = supabase.channel("presenca-amigos", { config: { presence: { key: userId } } });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<{ userId: string }>();
      const ids = new Set<string>();
      Object.values(state).forEach((list) =>
        list.forEach((p) => { if (p.userId) ids.add(p.userId); })
      );
      setOnlineIds(ids);
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ userId, userName });
      }
    });

    return () => { supabase.removeChannel(ch); };
  }, [supabase, userId, userName]);

  async function openProfile(friend: Profile) {
    setLoadingProfile(true);
    const r = await getFriendData(friend.user_id);
    setLoadingProfile(false);
    if (r.ok) {
      setSelected({ profile: friend, countries: r.countries ?? [], dishes: r.dishes ?? [] });
    }
  }

  const onlineCount = friends.filter((f) => onlineIds.has(f.user_id)).length;

  return (
    <section className="screen active">
      <div className="row between wrap">
        <h2 className="neon-yellow">🤝 AMIGOS</h2>
        {onlineCount > 0 && (
          <span className="badge dot" style={{ borderColor: "var(--green)", color: "var(--green)" }}>
            {onlineCount} online
          </span>
        )}
      </div>
      <p className="help">Veja seus amigos, os países que sortearam e os pratos que publicaram.</p>

      <button className="btn green mt8" onClick={() => setShowInvite(true)}>
        + ADICIONAR AMIGO
      </button>

      {friends.length === 0 ? (
        <div className="card tight" style={{ marginTop: 16, textAlign: "center" }}>
          <p className="help">Nenhum amigo ainda. Adicione pelo código de convite!</p>
        </div>
      ) : (
        <div className="col" style={{ gap: 10, marginTop: 12 }}>
          {friends.map((f) => {
            const online = onlineIds.has(f.user_id);
            return (
              <div
                key={f.user_id}
                className="card tight"
                style={{ cursor: "pointer" }}
                onClick={() => openProfile(f)}
              >
                <div className="row between">
                  <div className="row gap8">
                    <span style={{ fontSize: 28 }}>{avatarFor(f.user_id)}</span>
                    <div>
                      <div style={{ fontFamily: "var(--display)", fontSize: 13 }}>{f.display_name}</div>
                      <div className="tiny" style={{ color: "var(--muted)" }}>#{f.invite_code}</div>
                    </div>
                  </div>
                  <div className="row gap8">
                    {online && (
                      <span className="badge dot" style={{ borderColor: "var(--green)", color: "var(--green)", fontSize: 10 }}>
                        ONLINE
                      </span>
                    )}
                    <span className="tiny" style={{ color: "var(--muted)" }}>VER ▸</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Friend invite modal */}
      {showInvite && (
        <FriendInvite
          onClose={() => setShowInvite(false)}
          onFriendAdded={(f) => setFriends((prev) => [...prev, f])}
        />
      )}

      {/* Friend profile sheet */}
      {(selected || loadingProfile) && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div
            className="card bolts modal-box"
            style={{ maxWidth: 480, width: "100%", maxHeight: "80vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            {loadingProfile ? (
              <div style={{ textAlign: "center", padding: 32 }}>
                <p className="help">Carregando perfil…</p>
              </div>
            ) : selected ? (
              <>
                <div className="row gap8" style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 36 }}>{avatarFor(selected.profile.user_id)}</span>
                  <div>
                    <div className="card-title" style={{ fontSize: 16 }}>{selected.profile.display_name}</div>
                    <div className="tiny" style={{ color: "var(--muted)" }}>
                      #{selected.profile.invite_code} · {onlineIds.has(selected.profile.user_id) ? "🟢 online" : "⚫ offline"}
                    </div>
                  </div>
                </div>

                {/* Countries drawn */}
                <div className="card-title" style={{ marginBottom: 8 }}>
                  🌍 PAÍSES SORTEADOS ({selected.countries.length})
                </div>
                {selected.countries.length === 0 ? (
                  <p className="tiny" style={{ color: "var(--muted)", marginBottom: 12 }}>Ainda não sorteou nenhum país.</p>
                ) : (
                  <div className="row" style={{ flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                    {selected.countries.map((c) => (
                      <span
                        key={c.id}
                        className="badge"
                        style={{
                          borderColor: c.status === "done" ? "var(--green)" : "var(--yellow)",
                          color: c.status === "done" ? "var(--green)" : "var(--yellow)",
                        }}
                        title={c.status === "done" ? "Concluído" : "Em andamento"}
                      >
                        {c.flag} {c.name_pt} {c.status === "done" ? "✓" : "⏳"}
                      </span>
                    ))}
                  </div>
                )}

                {/* Published dishes */}
                <div className="card-title" style={{ marginBottom: 8 }}>
                  📸 PRATOS PUBLICADOS ({selected.dishes.length})
                </div>
                {selected.dishes.length === 0 ? (
                  <p className="tiny" style={{ color: "var(--muted)", marginBottom: 12 }}>Nenhum prato publicado ainda.</p>
                ) : (
                  <div className="col" style={{ gap: 10 }}>
                    {selected.dishes.map((d) => (
                      <div key={d.match_id} className="card tight">
                        {d.photo_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={d.photo_url}
                            alt={d.dish}
                            style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 4, marginBottom: 8 }}
                          />
                        )}
                        <div style={{ fontFamily: "var(--display)", fontSize: 13 }}>
                          {d.country_flag} {d.country_name}
                        </div>
                        <div className="help">{d.dish}</div>
                        {d.caption && <div className="tiny" style={{ color: "var(--muted)", marginTop: 4 }}>{d.caption}</div>}
                      </div>
                    ))}
                  </div>
                )}

                <button className="btn ghost block mt20" onClick={() => setSelected(null)}>FECHAR</button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
