"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/types";
import { addFriendByCode, getOrCreateProfile } from "@/app/actions";
import { showToast } from "@/lib/toast";
import { fireConfetti } from "@/lib/confetti";

type Props = {
  onClose: () => void;
  onFriendAdded?: (friend: Profile) => void;
};

export default function FriendInvite({ onClose, onFriendAdded }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getOrCreateProfile().then((r) => {
      if (r.ok && r.profile) setProfile(r.profile);
    });
  }, []);

  async function handleAdd() {
    setErr("");
    setBusy(true);
    const r = await addFriendByCode(code);
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Erro ao adicionar."); return; }
    fireConfetti(40);
    showToast(`🤝 ${r.friend?.display_name} adicionado como dupla!`);
    onFriendAdded?.(r.friend!);
    onClose();
  }

  function copyCode() {
    if (!profile) return;
    navigator.clipboard.writeText(profile.invite_code).then(() => {
      setCopied(true);
      showToast("📋 Código copiado!");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card bolts accent modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="card-title">🤝 ADICIONAR DUPLA</div>
        <p className="help" style={{ marginBottom: 16 }}>
          Compartilhe seu código ou insira o código do seu amigo.
        </p>

        {/* Meu código */}
        <div className="field" style={{ marginBottom: 20 }}>
          <label className="label">SEU CÓDIGO DE CONVITE</label>
          {profile ? (
            <div className="row gap8">
              <div
                className="input"
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontFamily: "var(--display)",
                  fontSize: 22,
                  color: "var(--accent)",
                  letterSpacing: 6,
                  cursor: "pointer",
                  userSelect: "all",
                }}
                onClick={copyCode}
              >
                {profile.invite_code}
              </div>
              <button className="btn ghost sm" onClick={copyCode} style={{ minWidth: 80 }}>
                {copied ? "✓ OK" : "COPIAR"}
              </button>
            </div>
          ) : (
            <div className="input" style={{ opacity: 0.5 }}>carregando…</div>
          )}
        </div>

        <div className="divider">OU</div>

        {/* Código do amigo */}
        <div className="field" style={{ marginTop: 16 }}>
          <label className="label">CÓDIGO DO SEU AMIGO</label>
          <input
            ref={inputRef}
            className="input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ex: ABC123"
            maxLength={6}
            style={{ textAlign: "center", fontFamily: "var(--display)", fontSize: 22, letterSpacing: 6 }}
            onKeyDown={(e) => { if (e.key === "Enter" && code.length === 6) handleAdd(); }}
          />
        </div>

        {err && (
          <p className="tiny" style={{ color: "var(--pink)", marginTop: 8 }}>⚠ {err}</p>
        )}

        <div className="row gap8 mt20" style={{ justifyContent: "center" }}>
          <button className="btn ghost" onClick={onClose}>FECHAR</button>
          <button
            className="btn green"
            onClick={handleAdd}
            disabled={busy || code.length < 4}
          >
            {busy ? "ADICIONANDO…" : "ADICIONAR 🤝"}
          </button>
        </div>
      </div>
    </div>
  );
}
