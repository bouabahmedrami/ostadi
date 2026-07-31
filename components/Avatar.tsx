"use client";
import { useState } from "react";
import { CheckCircle } from "lucide-react";

interface AvatarProps {
  /** URL de la photo — si absente ou en erreur, l'initiale s'affiche */
  src?: string | null;
  /** Nom complet — sert à l'initiale et au texte alternatif */
  name: string;
  /** Taille en pixels */
  size?: number;
  /** Arrondi : rayon en pixels, ou "circle" */
  radius?: number | "circle";
  /** Couleur d'accent pour le dégradé de repli */
  accent?: string;
  /** Affiche la pastille « vérifié » */
  verified?: boolean;
  /** Épaisseur de la bordure */
  border?: number;
}

export default function Avatar({
  src,
  name,
  size = 40,
  radius,
  accent = "#7C3AED",
  verified = false,
  border = 1,
}: AvatarProps) {
  const [failed, setFailed] = useState(false);

  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "?";
  const showPhoto = src && !failed;
  const br = radius === "circle" ? "50%" : `${radius ?? Math.round(size * 0.3)}px`;

  // Convertit le hex en rgba pour le dégradé de repli
  const rgba = (hex: string, a: number) => {
    const h = hex.replace("#", "");
    return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${a})`;
  };

  const badgeSize = Math.max(Math.round(size * 0.32), 16);

  return (
    <span
      className="av"
      style={{
        width: size,
        height: size,
        borderRadius: br,
        border: `${border}px solid ${rgba(accent, 0.3)}`,
        background: showPhoto
          ? "#1A0A3C"
          : `linear-gradient(140deg, ${rgba(accent, 0.42)}, ${rgba(accent, 0.15)})`,
      }}
    >
      {showPhoto ? (
        <img
          src={src!}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <span
          className="av-initial"
          style={{ fontSize: Math.round(size * 0.42), color: "#e9d5ff" }}
          aria-hidden="true"
        >
          {initial}
        </span>
      )}

      {verified && (
        <span
          className="av-badge"
          style={{
            width: badgeSize,
            height: badgeSize,
            borderWidth: Math.max(Math.round(size * 0.045), 2),
          }}
          title="Vérifié"
        >
          <CheckCircle size={Math.round(badgeSize * 0.65)} />
        </span>
      )}

      <style jsx>{`
        .av {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: visible;
        }
        .av > :global(img) {
          border-radius: inherit;
        }
        .av-initial {
          font-weight: 800;
          line-height: 1;
          user-select: none;
        }
        .av-badge {
          position: absolute;
          bottom: -2px;
          inset-inline-end: -2px;
          border-radius: 50%;
          background: #FF8C00;
          color: white;
          border-style: solid;
          border-color: #0A0014;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </span>
  );
}
