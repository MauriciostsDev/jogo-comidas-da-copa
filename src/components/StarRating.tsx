"use client";

import { useState } from "react";

/** Estrelas de exibição (aceita decimais). */
export function Stars({ value }: { value: number }) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`star ${n <= Math.round(value) ? "on" : ""}`}>★</span>
      ))}
    </span>
  );
}

/** Estrelas interativas para formulário de avaliação. */
export function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div
      className="stars input-stars"
      onMouseLeave={() => setHover(0)}
      style={{ fontSize: "1.6em", justifyContent: "center" }}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`star ${n <= shown ? "on" : ""}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
        >
          ★
        </span>
      ))}
    </div>
  );
}
