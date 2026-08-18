"use client";
import { Classe } from "@/lib/types";
import { useLang } from "@/lib/lang-context";
import { trSubject, trLevel, trWilaya, trPriceType, formatDateLocal } from "@/lib/i18n/translate";
import {
  Star, Users, Clock, MapPin, MessageCircle, Calendar, ArrowRight, Eye,
} from "lucide-react";
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

/**
 * Une couleur par matière.
 *
 * Sur une grille de vingt cours, c'est ce qui permet à l'œil de
 * repérer les maths sans lire. La teinte traverse la carte : halo,
 * barre latérale, étiquette de statut.
 */
const SUBJECT_ACCENTS: Record<string, string> = {
  "Mathématiques": "#8B5CF6",
  "Physique-Chimie": "#3B82F6",
  "Sciences Naturelles": "#22C55E",
  "Français": "#EC4899",
  "Arabe": "#F59E0B",
  "Anglais": "#06B6D4",
  "Histoire-Géographie": "#F97316",
  "Philosophie": "#A855F7",
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

  // Cours mensuel avec plusieurs séances programmées
  const sessions = (classe as any).sessions as string[] | undefined;
  const isMultiSession = Array.isArray(sessions) && sessions.length > 1;

  const views = (classe as any).viewCount ?? 0;
  const DA = isRTL ? "دج" : "DA";

  return (
    <article
      className={`os-glass-2 os-card ${isEnded ? "" : "os-card-lit"} cc`}
      dir={isRTL ? "rtl" : "ltr"}
      style={{ opacity: isEnded ? 0.62 : 1 }}
    >
      {/* Halo de matière — la teinte qui traverse la carte */}
      <span
        className="cc-glow"
        style={{
          background: `radial-gradient(circle, ${rgba(accent, 0.26)} 0%, transparent 68%)`,
        }}
        aria-hidden="true"
      />

      {/* Barre d'accent latérale */}
      <span
        className="cc-bar"
        style={{ background: `linear-gradient(180deg, ${accent}, transparent 85%)` }}
        aria-hidden="true"
      />

      <div className="cc-inner">

        {/* ── Statut + prix ── */}
        <div className="cc-top">
          {isLive ? (
            <span className="os-chip cc-live">
              <span className="os-pulse" />
              {isRTL ? "مباشر الآن" : "En direct"}
            </span>
          ) : isEnded ? (
            <span className="os-chip">
              {isRTL ? "منتهي" : "Terminé"}
            </span>
          ) : (
            <span
              className="os-chip"
              style={{
                background: rgba(accent, 0.15),
                color: accentSoft,
                borderColor: rgba(accent, 0.3),
              }}
            >
              {isMultiSession
                ? (isRTL ? "اشتراك شهري" : "Abonnement")
                : (isRTL ? "حصة واحدة" : "À la séance")}
            </span>
          )}

          <span className="cc-price">
            {classe.price.toLocaleString("fr-DZ")}
            <span className="cc-price-unit"> {DA}</span>
          </span>
        </div>

        {/* ── Titre ── */}
        <h3 className="cc-title">
          <Link href={`/classe/${classe.id}`} className="cc-title-link">
            {classe.title}
          </Link>
        </h3>

        {/* ── Matière et niveau ── */}
        <div className="cc-tags">
          <span
            className="os-chip"
            style={{
              background: rgba(accent, 0.12),
              color: accentSoft,
              borderColor: rgba(accent, 0.24),
            }}
          >
            {trSubject(classe.subject, isRTL)}
          </span>
          <span className="os-chip">{trLevel(classe.level, isRTL)}</span>
          {isMultiSession && (
            <span className="os-chip os-chip-on">
              <Calendar size={11} />
              {sessions!.length} {isRTL ? "حصص" : "séances"}
            </span>
          )}
        </div>

        {/* ── Détails ── */}
        <div className="cc-meta">
          <span className="cc-meta-item">
            <Calendar size={12} />
            {isMultiSession
              ? (isRTL
                  ? `تبدأ ${formatDateLocal(sessions![0], isRTL)}`
                  : `Dès le ${formatDateLocal(sessions![0], isRTL)}`)
              : formatDateLocal(classe.dateTime, isRTL)}
          </span>
          <span className="cc-meta-item">
            <Clock size={12} />
            {classe.durationMinutes} {isRTL ? "د" : "min"}
          </span>
          <span className="cc-meta-item">
            <MapPin size={12} />
            {trWilaya(classe.wilaya, isRTL)}
          </span>
          {classe.enrolledCount > 0 && (
            <span className="cc-meta-item">
              <Users size={12} />
              {classe.enrolledCount} {isRTL ? "مسجّل" : "inscrits"}
            </span>
          )}
          {views > 0 && (
            <span className="cc-meta-item">
              <Eye size={12} />
              {views}
            </span>
          )}
        </div>

        {/* ── Professeur ── */}
        <Link href={`/professeur/${classe.teacherId}`} className="cc-teacher os-glass">
          <Avatar
            src={(classe as any).teacherPhoto}
            name={classe.teacherName}
            size={34}
            radius={11}
            accent={accent}
          />
          <span className="cc-teacher-info">
            <span className="cc-teacher-name">{classe.teacherName}</span>
            {(classe.teacherRating ?? 0) > 0 ? (
              <span className="cc-rating">
                <Star size={11} style={{ fill: "#FF8C00", color: "#FF8C00" }} />
                {(classe.teacherRating ?? 0).toFixed(1)}
              </span>
            ) : (
              <span className="cc-new">{isRTL ? "أستاذ جديد" : "Nouveau"}</span>
            )}
          </span>
          <ArrowRight size={14} className="cc-arrow os-flip" />
        </Link>

        {/* ── Actions ── */}
        {showActions && !isEnded && (
          <div className="cc-actions">
            <Link
              href={`/classe/${classe.id}`}
              className="os-btn-chalk cc-cta"
            >
              {isLive
                ? (isRTL ? "انضم الآن" : "Rejoindre")
                : (isRTL ? "عرض الدرس" : "Voir le cours")}
            </Link>

            {classe.whatsapp && (
              <a
                href={`https://wa.me/${classe.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                  isRTL
                    ? `مرحباً، أنا مهتم بدرس « ${classe.title} »`
                    : `Bonjour, je suis intéressé par le cours « ${classe.title} »`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cc-wa os-press"
                aria-label="WhatsApp"
                onClick={e => e.stopPropagation()}
              >
                <MessageCircle size={16} />
              </a>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .cc {
          position: relative;
          overflow: hidden;
          border-radius: 20px;
        }

        /* Halo de matière — en haut, du côté de la lecture */
        .cc-glow {
          position: absolute;
          top: -58px;
          inset-inline-end: -58px;
          width: 170px;
          height: 170px;
          border-radius: 50%;
          filter: blur(34px);
          pointer-events: none;
          opacity: 0.85;
          transition: opacity 320ms ease, transform 380ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .cc:hover .cc-glow {
          opacity: 1;
          transform: scale(1.16);
        }

        .cc-bar {
          position: absolute;
          top: 0;
          inset-inline-start: 0;
          width: 3px;
          height: 100%;
          pointer-events: none;
        }

        .cc-inner {
          position: relative;
          z-index: 1;
          padding: 18px;
        }

        /* ── Haut ── */
        .cc-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 13px;
        }
        .cc-live {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.32);
          color: #fca5a5;
        }
        .cc-price {
          color: #FF8C00;
          font-weight: 900;
          font-size: 21px;
          letter-spacing: -0.5px;
          white-space: nowrap;
        }
        .cc-price-unit {
          font-size: 12px;
          font-weight: 700;
          opacity: 0.82;
        }

        /* ── Titre ── */
        .cc-title {
          margin: 0 0 12px;
          font-size: 16px;
          font-weight: 750;
          line-height: 1.36;
          letter-spacing: -0.2px;
        }
        .cc-title-link {
          color: #fff;
          text-decoration: none;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color 200ms ease;
        }
        .cc:hover .cc-title-link { color: #FFD9A0; }

        /* ── Étiquettes ── */
        .cc-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 13px;
        }

        /* ── Détails ── */
        .cc-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 14px;
          margin-bottom: 14px;
        }
        .cc-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #8b7bb8;
          font-size: 11.5px;
          white-space: nowrap;
        }
        .cc-meta-item :global(svg) {
          color: #6d28d9;
          flex-shrink: 0;
        }

        /* ── Professeur ── */
        .cc-teacher {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 11px;
          border-radius: 13px;
          text-decoration: none;
          margin-bottom: 13px;
          transition: background 220ms ease, border-color 220ms ease;
        }
        .cc-teacher:hover {
          background: rgba(139, 92, 246, 0.14);
          border-color: rgba(168, 85, 247, 0.32);
        }
        .cc-teacher-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .cc-teacher-name {
          color: #fff;
          font-size: 13px;
          font-weight: 650;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cc-rating {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #FF8C00;
          font-size: 11.5px;
          font-weight: 700;
        }
        .cc-new {
          color: #6d28d9;
          font-size: 11px;
        }
        .cc-arrow {
          color: #4c1d95;
          flex-shrink: 0;
          transition: transform 260ms cubic-bezier(0.34, 1.42, 0.64, 1), color 220ms ease;
        }
        .cc-teacher:hover .cc-arrow {
          color: #a78bfa;
          transform: translateX(3px);
        }
        :global([dir="rtl"]) .cc-teacher:hover .cc-arrow {
          transform: scaleX(-1) translateX(3px);
        }

        /* ── Actions ── */
        .cc-actions {
          display: flex;
          gap: 8px;
        }
        .cc-cta {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 11px;
          font-size: 13.5px;
          text-decoration: none;
        }
        .cc-wa {
          width: 42px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(34, 197, 94, 0.13);
          border: 1px solid rgba(34, 197, 94, 0.28);
          border-radius: 14px;
          color: #4ade80;
          text-decoration: none;
        }
        .cc-wa:hover {
          background: rgba(34, 197, 94, 0.2);
          border-color: rgba(34, 197, 94, 0.42);
        }

        /* Petits écrans — le halo coûte cher, on le calme */
        @media (max-width: 480px) {
          .cc-glow { filter: blur(26px); opacity: 0.6; }
          .cc-inner { padding: 15px; }
          .cc-price { font-size: 19px; }
        }
      `}</style>
    </article>
  );
}
