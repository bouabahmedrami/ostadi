"use client";
import { useState } from "react";
import { Star } from "lucide-react";
import { useLang } from "@/lib/lang-context";

const SIZES = {
  sm: { icon: 14, gap: 3, text: 11 },
  md: { icon: 20, gap: 4, text: 13 },
  lg: { icon: 30, gap: 6, text: 15 },
} as const;

const ORANGE = "#FF8C00";
const EMPTY = "#4C1D95";

/* ═══════════════════════════════════════════════════════════
   Sélecteur d'étoiles — interactif
   ═══════════════════════════════════════════════════════════ */
interface StarPickerProps {
  value: number;
  onChange: (v: number) => void;
  size?: keyof typeof SIZES;
  readonly?: boolean;
}

export function StarPicker({
  value,
  onChange,
  size = "md",
  readonly = false,
}: StarPickerProps) {
  const { isRTL } = useLang();
  const [hovered, setHovered] = useState(0);
  const s = SIZES[size];
  const active = hovered || value;

  const labels = isRTL
    ? ["ضعيف جداً", "ضعيف", "مقبول", "جيد", "ممتاز"]
    : ["Très mauvais", "Mauvais", "Moyen", "Bien", "Excellent"];

  return (
    <div
      className="sp"
      role={readonly ? "img" : "radiogroup"}
      aria-label={
        readonly
          ? (isRTL ? `التقييم: ${value} من 5` : `Note : ${value} sur 5`)
          : (isRTL ? "اختر تقييماً" : "Choisir une note")
      }
      onMouseLeave={() => !readonly && setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map(i => {
        const filled = i <= active;
        return (
          <button
            key={i}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange(i)}
            onMouseEnter={() => !readonly && setHovered(i)}
            onFocus={() => !readonly && setHovered(i)}
            className={`sp-btn ${readonly ? "sp-btn-ro" : ""} ${filled ? "sp-btn-on" : ""}`}
            role={readonly ? undefined : "radio"}
            aria-checked={readonly ? undefined : value === i}
            aria-label={`${i} — ${labels[i - 1]}`}
            title={labels[i - 1]}
          >
            <Star
              size={s.icon}
              fill={filled ? ORANGE : "transparent"}
              color={filled ? ORANGE : EMPTY}
              strokeWidth={filled ? 0 : 1.8}
            />
          </button>
        );
      })}

      <style jsx>{`
        .sp {
          display: inline-flex;
          align-items: center;
          gap: ${s.gap}px;
          /* Les étoiles restent dans le même ordre en RTL :
             la 1re étoile est toujours la note la plus basse */
          direction: ltr;
        }
        .sp-btn {
          background: none;
          border: none;
          padding: 2px;
          cursor: pointer;
          display: flex;
          line-height: 0;
          transition: transform 0.18s cubic-bezier(0.34, 1.6, 0.64, 1);
        }
        .sp-btn:hover:not(.sp-btn-ro) { transform: scale(1.18); }
        .sp-btn:active:not(.sp-btn-ro) { transform: scale(0.95); }
        .sp-btn-ro { cursor: default; }
        .sp-btn:focus-visible {
          outline: 2px solid ${ORANGE};
          outline-offset: 1px;
          border-radius: 5px;
        }
        .sp-btn-on { filter: drop-shadow(0 0 5px rgba(255, 140, 0, 0.35)); }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Affichage de note — lecture seule
   ═══════════════════════════════════════════════════════════ */
export function StarDisplay({
  rating,
  count,
  size = "sm",
}: {
  rating?: number;
  count?: number;
  size?: keyof typeof SIZES;
}) {
  const { isRTL } = useLang();
  const r = rating || 0;
  const s = SIZES[size];
  const rounded = Math.round(r);

  return (
    <span
      className="sd"
      role="img"
      aria-label={
        r > 0
          ? (isRTL
              ? `التقييم ${r.toFixed(1)} من 5${count ? `، ${count} تقييم` : ""}`
              : `Note ${r.toFixed(1)} sur 5${count ? `, ${count} avis` : ""}`)
          : (isRTL ? "أستاذ جديد، لا توجد تقييمات" : "Nouveau professeur, aucun avis")
      }
    >
      <span className="sd-stars" aria-hidden="true">
        {[1, 2, 3, 4, 5].map(i => {
          const filled = i <= rounded;
          return (
            <Star
              key={i}
              size={s.icon}
              fill={filled ? ORANGE : "transparent"}
              color={filled ? ORANGE : EMPTY}
              strokeWidth={filled ? 0 : 1.5}
            />
          );
        })}
      </span>

      <span className="sd-text" aria-hidden="true">
        {r > 0 ? r.toFixed(1) : (isRTL ? "جديد" : "Nouveau")}
        {count !== undefined && count > 0 && (
          <span className="sd-count"> ({count})</span>
        )}
      </span>

      <style jsx>{`
        .sd {
          display: inline-flex;
          align-items: center;
          gap: ${s.gap + 2}px;
        }
        .sd-stars {
          display: inline-flex;
          align-items: center;
          gap: ${s.gap}px;
          direction: ltr;
        }
        .sd-text {
          font-size: ${s.text}px;
          font-weight: 600;
          color: #a78bfa;
          white-space: nowrap;
        }
        .sd-count {
          color: #6d28d9;
          font-weight: 400;
        }
      `}</style>
    </span>
  );
}
