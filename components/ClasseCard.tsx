"use client";
import { Classe } from "@/lib/types";
import { useLang } from "@/lib/lang-context";
import { trSubject, trLevel, trWilaya, trPriceType, formatDateLocal } from "@/lib/i18n/translate";
import { Star, Users, Clock, MapPin, MessageCircle, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import Avatar from "./Avatar";

/* ═══════════════════════════════════════════════════════════
   Conversion hex → rgba
   Remplace color-mix(), non supporté avant Chrome 111 (2023).
   Beaucoup de téléphones Android en Algérie ont un navigateur
   plus ancien : sans ça, les badges perdaient toute couleur.
   ═══════════════════════════════════════════════════════════ */
function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Éclaircit une couleur vers le blanc — pour le texte sur fond sombre */
function lighten(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = Math.round(parseInt(h.slice(0, 2), 16) + (255 - parseInt(h.slice(0, 2), 16)) * amount);
  const g = Math.round(parseInt(h.slice(2, 4), 16) + (255 - parseInt(h.slice(2, 4), 16)) * amount);
  const b = Math.round(parseInt(h.slice(4, 6), 16) + (255 - parseInt(h.slice(4, 6), 16)) * amount);
  return `rgb(${r}, ${g}, ${b})`;
}

/* ── Étoiles ─────────────────────────────────────────────── */
function Stars({ rating, isRTL }: { rating?: number; isRTL: boolean }) {
  const r = rating || 0;
  if (r === 0) {
    return <span className="cc-new-badge">{isRTL ? "جديد" : "Nouveau"}</span>;
  }
  return (
    <span className="cc-rating">
      <Star size={12} strokeWidth={0} fill="currentColor" />
      {r.toFixed(1)}
    </span>
  );
}

/* ── Couleurs par matière ────────────────────────────────── */
const SUBJECT_ACCENTS: Record<string, string> = {
  "Mathématiques": "#8B5CF6",
  "Physique-Chimie": "#06B6D4",
  "Sciences Naturelles": "#10B981",
  "Français": "#F59E0B",
  "Arabe": "#EC4899",
  "Anglais": "#6366F1",
  "Histoire-Géographie": "#F97316",
  "Philosophie": "#A78BFA",
  "Informatique": "#14B8A6",
  "Économie": "#EAB308",
};

export default function ClasseCard({
  classe,
  showActions = true,
}: {
  classe: Classe;
  showActions?: boolean;
}) {
  const { isRTL } = useLang();
  const isLive = classe.status === "live";
  const isEnded = classe.status === "ended";

  const accent = SUBJECT_ACCENTS[classe.subject] || "#8B5CF6";
  const accentSoft = lighten(accent, 0.35);

  return (
    <article
      className={`cc ${isLive ? "cc-live" : ""} ${isEnded ? "cc-ended" : ""}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Halo décoratif */}
      <span
        className="cc-glow"
        style={{
          background: `radial-gradient(circle, ${rgba(accent, 0.22)} 0%, transparent 68%)`,
        }}
      />

      {/* Barre d'accent latérale */}
      <span
        className="cc-accent-bar"
        style={{ background: `linear-gradient(180deg, ${accent}, transparent 85%)` }}
      />

      <div className="cc-inner">

        {/* ── Statut + prix ── */}
        <div className="cc-top">
          {isLive ? (
            <span className="cc-status cc-status-live">
              <span className="cc-dot" />
              {isRTL ? "مباشر الآن" : "En direct"}
            </span>
          ) : isEnded ? (
            <span className="cc-status cc-status-ended">
              {isRTL ? "منتهي" : "Terminé"}
            </span>
          ) : (
            <span
              className="cc-status"
              style={{
                background: rgba(accent, 0.13),
                color: accentSoft,
                border: `1px solid ${rgba(accent, 0.26)}`,
              }}
            >
              {isRTL ? "قريباً" : "À venir"}
            </span>
          )}

          <div className="cc-price">
            <span className="cc-price-num">{classe.price.toLocaleString()}</span>
            <span className="cc-price-cur">{isRTL ? "دج" : "DA"}</span>
            <span className="cc-price-per">/ {trPriceType(classe.priceType, isRTL)}</span>
          </div>
        </div>

        {/* ── Titre ── */}
        <h3 className="cc-title">{classe.title}</h3>

        {/* ── Tags ── */}
        <div className="cc-tags">
          <span
            className="cc-tag"
            style={{
              background: rgba(accent, 0.15),
              color: accentSoft,
              borderColor: rgba(accent, 0.28),
              fontWeight: 700,
            }}
          >
            {trSubject(classe.subject, isRTL)}
          </span>
          <span className="cc-tag">{trLevel(classe.level, isRTL)}</span>
          <span className="cc-tag cc-tag-ghost">
            <MapPin size={11} />
            {trWilaya(classe.wilaya, isRTL)}
          </span>
        </div>

        {/* ── Professeur ── */}
        <Link href={`/professeur/${classe.teacherId}`} className="cc-teacher">
          <Avatar
            src={(classe as any).teacherPhoto}
            name={classe.teacherName}
            size={33}
            radius={10}
            accent={accent}
          />
          <span className="cc-teacher-info">
            <span className="cc-teacher-name">{classe.teacherName}</span>
            <Stars rating={classe.teacherRating} isRTL={isRTL} />
          </span>
          <ArrowRight size={13} className="cc-teacher-arrow" />
        </Link>

        {/* ── Métadonnées ── */}
        <div className="cc-meta">
          <span className="cc-meta-item">
            <Calendar size={12} style={{ color: accentSoft }} />
            {formatDateLocal(classe.dateTime, isRTL)}
          </span>
          <span className="cc-meta-sep" />
          <span className="cc-meta-item">
            <Clock size={12} style={{ color: accentSoft }} />
            {classe.durationMinutes} {isRTL ? "د" : "min"}
          </span>
          <span className="cc-meta-sep" />
          <span className="cc-meta-item">
            <Users size={12} style={{ color: accentSoft }} />
            {classe.enrolledCount}
          </span>
        </div>

        {/* ── Description ── */}
        {classe.description && <p className="cc-desc">{classe.description}</p>}

        {/* ── Actions ── */}
        {showActions && !isEnded && (
          <div className="cc-actions">
            <Link href={`/classe/${classe.id}`} className="cc-btn cc-btn-main">
              {isLive
                ? (isRTL ? "انضم الآن" : "Rejoindre")
                : (isRTL ? "عرض الدرس" : "Voir le cours")}
              <ArrowRight size={14} className="cc-btn-arrow" />
            </Link>

            {classe.whatsapp && (
              <a
                href={`https://wa.me/${classe.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                  isRTL
                    ? `مرحباً، أنا مهتم بدرس: ${classe.title}`
                    : `Bonjour, je suis intéressé par : ${classe.title}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cc-btn cc-btn-wa"
                aria-label="WhatsApp"
              >
                <MessageCircle size={15} />
              </a>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .cc {
          position: relative;
          background: linear-gradient(160deg, rgba(24,12,52,0.95), rgba(14,6,30,0.98));
          border: 1px solid rgba(124,58,237,0.18);
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.32s cubic-bezier(0.34,1.3,0.64,1),
                      border-color 0.32s ease,
                      box-shadow 0.32s ease;
        }
        .cc:hover {
          transform: translateY(-4px);
          border-color: rgba(168,85,247,0.4);
          box-shadow: 0 18px 42px rgba(0,0,0,0.42);
        }
        .cc-ended { opacity: 0.62; }
        .cc-live {
          border-color: rgba(239,68,68,0.42);
          box-shadow: 0 0 0 1px rgba(239,68,68,0.14), 0 8px 30px rgba(239,68,68,0.1);
        }

        .cc-glow {
          position: absolute;
          top: -70px;
          inset-inline-end: -70px;
          width: 180px; height: 180px;
          border-radius: 50%;
          pointer-events: none;
          opacity: 0.75;
          transition: opacity 0.35s ease;
        }
        .cc:hover .cc-glow { opacity: 1; }

        .cc-accent-bar {
          position: absolute;
          inset-inline-start: 0; top: 0; bottom: 0;
          width: 3px;
        }

        .cc-inner {
          position: relative;
          padding: 18px 19px 17px;
          display: flex;
          flex-direction: column;
          gap: 13px;
          flex: 1;
        }

        /* ── Haut ── */
        .cc-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .cc-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 10.5px;
          font-weight: 700;
          padding: 5px 11px;
          border-radius: 999px;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .cc-status-live {
          background: rgba(239,68,68,0.14);
          color: #fca5a5;
          border: 1px solid rgba(239,68,68,0.28);
        }
        .cc-status-ended {
          background: rgba(124,58,237,0.08);
          color: #8b7bb8;
          border: 1px solid rgba(124,58,237,0.16);
        }
        .cc-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #ef4444;
          animation: ccPulse 1.5s ease-in-out infinite;
        }
        @keyframes ccPulse {
          0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239,68,68,0.55); }
          50% { opacity: 0.55; box-shadow: 0 0 0 4px rgba(239,68,68,0); }
        }

        .cc-price {
          display: flex;
          align-items: baseline;
          gap: 3px;
          flex-shrink: 0;
        }
        .cc-price-num {
          color: #FF8C00;
          font-size: 21px;
          font-weight: 900;
          letter-spacing: -0.6px;
          line-height: 1;
        }
        .cc-price-cur { color: #FF8C00; font-size: 12px; font-weight: 800; }
        .cc-price-per { color: #6d28d9; font-size: 10.5px; margin-inline-start: 2px; }

        /* ── Titre ── */
        .cc-title {
          color: #ffffff;
          font-size: 16px;
          font-weight: 750;
          line-height: 1.35;
          margin: 0;
          letter-spacing: -0.25px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* ── Tags ── */
        .cc-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .cc-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          padding: 4.5px 10px;
          border-radius: 8px;
          background: rgba(124,58,237,0.11);
          color: #c4b5fd;
          border: 1px solid rgba(124,58,237,0.16);
        }
        .cc-tag-ghost {
          background: transparent;
          color: #8b7bb8;
          border-color: rgba(124,58,237,0.14);
        }

        /* ── Professeur ── */
        .cc-teacher {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 11px;
          margin: 1px 0;
          border-radius: 13px;
          background: rgba(124,58,237,0.055);
          border: 1px solid rgba(124,58,237,0.11);
          text-decoration: none;
          transition: background 0.22s ease, border-color 0.22s ease;
        }
        .cc-teacher:hover {
          background: rgba(124,58,237,0.11);
          border-color: rgba(124,58,237,0.22);
        }
        .cc-teacher-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }
        .cc-teacher-name {
          color: #ffffff;
          font-size: 13px;
          font-weight: 650;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cc-teacher-arrow {
          color: #6d28d9;
          flex-shrink: 0;
          transition: transform 0.22s ease, color 0.22s ease;
        }
        .cc-teacher:hover .cc-teacher-arrow {
          color: #a78bfa;
          transform: translateX(2px);
        }
        :global([dir="rtl"]) .cc-teacher-arrow { transform: scaleX(-1); }
        :global([dir="rtl"]) .cc-teacher:hover .cc-teacher-arrow {
          transform: scaleX(-1) translateX(2px);
        }

        .cc-rating {
          display: inline-flex;
          align-items: center;
          gap: 3.5px;
          color: #FF8C00;
          font-size: 11.5px;
          font-weight: 700;
        }
        .cc-new-badge {
          display: inline-flex;
          align-items: center;
          font-size: 10px;
          font-weight: 700;
          color: #10B981;
          background: rgba(16,185,129,0.12);
          padding: 2px 7px;
          border-radius: 5px;
          width: fit-content;
        }

        /* ── Meta ── */
        .cc-meta {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
        }
        .cc-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #8b7bb8;
          font-size: 11.5px;
          font-weight: 500;
        }
        .cc-meta-sep {
          width: 3px; height: 3px;
          border-radius: 50%;
          background: rgba(124,58,237,0.35);
        }

        /* ── Description ── */
        .cc-desc {
          color: #7a6b9e;
          font-size: 12px;
          line-height: 1.55;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* ── Actions ── */
        .cc-actions {
          display: flex;
          gap: 8px;
          margin-top: auto;
          padding-top: 4px;
        }
        .cc-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 12px;
          text-decoration: none;
          transition: transform 0.22s cubic-bezier(0.34,1.4,0.64,1),
                      box-shadow 0.22s ease, filter 0.22s ease;
        }
        .cc-btn-main {
          flex: 1;
          padding: 11px 16px;
          background: linear-gradient(135deg, #FF8C00, #FF6B00);
          color: #fff;
          box-shadow: 0 5px 18px rgba(255,140,0,0.26);
        }
        .cc-btn-main:hover {
          transform: translateY(-2px);
          box-shadow: 0 9px 26px rgba(255,140,0,0.38);
        }
        .cc-btn-main:active { transform: translateY(0) scale(0.985); }
        .cc-btn-arrow { flex-shrink: 0; }
        :global([dir="rtl"]) .cc-btn-arrow { transform: scaleX(-1); }

        .cc-btn-wa {
          width: 42px;
          padding: 11px 0;
          background: rgba(34,197,94,0.13);
          color: #4ade80;
          border: 1px solid rgba(34,197,94,0.26);
          flex-shrink: 0;
        }
        .cc-btn-wa:hover {
          background: rgba(34,197,94,0.22);
          transform: translateY(-2px);
        }
      `}</style>
    </article>
  );
}
