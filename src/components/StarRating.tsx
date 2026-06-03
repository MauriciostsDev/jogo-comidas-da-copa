"use client";

import { useId, useState } from "react";

function Star({ fill, className = "" }: { fill: number; className?: string }) {
  // fill: 0 (vazio) .. 1 (cheio) — suporta meia estrela via clip
  const id = `g-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id={id}>
          <stop offset={`${fill * 100}%`} stopColor="var(--color-gold)" />
          <stop offset={`${fill * 100}%`} stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.9l-5.81 3.06 1.11-6.47-4.7-4.58 6.5-.95L12 2.5z"
        fill={`url(#${id})`}
        stroke="var(--color-gold)"
        strokeWidth="1.4"
        strokeLinejoin="round"
        opacity={fill > 0 ? 1 : 0.35}
      />
    </svg>
  );
}

/** Estrelas só para exibição (aceita decimais, ex.: 4.3). */
export function Stars({
  value,
  size = "1rem",
}: {
  value: number;
  size?: string;
}) {
  return (
    <span className="inline-flex" style={{ gap: "1px" }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} style={{ width: size, height: size }}>
          <Star fill={Math.max(0, Math.min(1, value - i))} className="h-full w-full" />
        </span>
      ))}
    </span>
  );
}

/** Estrelas interativas para o formulário de avaliação. */
export function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="transition active:scale-90"
          style={{ transform: shown >= n ? "scale(1.06)" : undefined }}
        >
          <span className="block h-8 w-8">
            <Star fill={shown >= n ? 1 : 0} className="h-full w-full" />
          </span>
        </button>
      ))}
    </div>
  );
}
