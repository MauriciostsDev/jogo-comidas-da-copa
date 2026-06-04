"use client";

import { useEffect } from "react";

type Props = {
  src: string;
  alt?: string;
  onClose: () => void;
};

export default function Lightbox({ src, alt = "", onClose }: Props) {
  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "rgba(0,0,0,.93)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        animation: "screen-in .2s ease both",
        cursor: "zoom-out",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "100%",
          maxHeight: "90dvh",
          objectFit: "contain",
          boxShadow: "0 0 60px rgba(0,0,0,.8)",
          cursor: "default",
        }}
      />
      <button
        onClick={onClose}
        style={{
          position: "fixed", top: 16, right: 16,
          background: "rgba(0,0,0,.6)", border: "2px solid rgba(255,255,255,.3)",
          color: "#fff", fontSize: 20, width: 44, height: 44,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--display)",
        }}
        aria-label="Fechar"
      >
        ✕
      </button>
    </div>
  );
}
