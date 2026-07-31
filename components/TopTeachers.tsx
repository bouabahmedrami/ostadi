"use client";
import { useEffect, useState } from "react";
import { getTopTeachers } from "@/lib/firestore";
import { UserProfile } from "@/lib/types";
import { StarDisplay } from "./StarRating";
import { useLang } from "@/lib/lang-context";
import { trSubject, trWilaya } from "@/lib/i18n/translate";
import { MapPin } from "lucide-react";
import Link from "next/link";
import Avatar from "./Avatar";

export default function TopTeachers() {
  const { isRTL } = useLang();
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTopTeachers(6)
      .then(setTeachers)
      .catch(err => {
        // ⚠️ AVANT : .finally() sans .catch() — un index manquant
        // laissait la section vide sans aucune trace
        console.error("Chargement des meilleurs professeurs échoué :", err);
        setTeachers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="tt-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="tt-skeleton">
            <div className="tt-sk-circle" />
            <div className="tt-sk-line" style={{ width: "72%" }} />
            <div className="tt-sk-line" style={{ width: "48%" }} />
          </div>
        ))}
        <style jsx>{SKELETON_STYLES}</style>
      </div>
    );
  }

  if (teachers.length === 0) return null;

  const rankColors = ["#FF8C00", "#7C3AED", "#4C1D95"];

  return (
    <div className="tt-grid">
      {teachers.map((teacher, idx) => {
        const isFirst = idx === 0;
        const verified = teacher.diplomaVerified;

        return (
          <Link
            key={teacher.uid}
            href={`/professeur/${teacher.uid}`}
            className={`tt-card ${isFirst ? "tt-card-first" : ""}`}
          >
            {/* ── Rang ── */}
            {idx < 3 && (
              <span
                className="tt-rank"
                style={{
                  background: rankColors[idx],
                  color: idx === 2 ? "#c4b5fd" : "#ffffff",
                }}
                aria-label={isRTL ? `المرتبة ${idx + 1}` : `Rang ${idx + 1}`}
              >
                {idx + 1}
              </span>
            )}

            {/* ── Avatar ── */}
            <Avatar
              src={teacher.photoURL}
              name={teacher.displayName}
              size={56}
              radius={18}
              accent={isFirst ? "#FF8C00" : "#7C3AED"}
              verified={verified}
              border={2}
            />

            {/* ── Nom ── */}
            <h3 className="tt-name">{teacher.displayName}</h3>

            {/* ── Note ── */}
            <StarDisplay rating={teacher.rating} count={teacher.ratingCount} size="sm" />

            {/* ── Matières ── */}
            {teacher.subjects && teacher.subjects.length > 0 && (
              <p className="tt-subjects">
                {teacher.subjects
                  .slice(0, 2)
                  .map(s => trSubject(s, isRTL))
                  .join(" · ")}
                {teacher.subjects.length > 2 && ` +${teacher.subjects.length - 2}`}
              </p>
            )}

            {/* ── Wilaya ── */}
            {teacher.wilaya && (
              <p className="tt-wilaya">
                <MapPin size={10} />
                {trWilaya(teacher.wilaya, isRTL)}
              </p>
            )}

            {/* ── Badge Premium ── */}
            {teacher.featured && (
              <span className="tt-featured">
                ⭐ {isRTL ? "مميز" : "Populaire"}
              </span>
            )}
          </Link>
        );
      })}

      <style jsx>{`
        .tt-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }
        @media (min-width: 700px) {
          .tt-grid { grid-template-columns: repeat(3, 1fr); }
        }

        .tt-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 7px;
          padding: 20px 14px 16px;
          background: linear-gradient(150deg, rgba(22, 10, 48, 0.9), rgba(14, 6, 30, 0.92));
          border: 1px solid rgba(124, 58, 237, 0.18);
          border-radius: 18px;
          text-decoration: none;
          transition: transform 0.28s cubic-bezier(0.34, 1.3, 0.64, 1),
                      border-color 0.28s ease,
                      box-shadow 0.28s ease;
        }
        .tt-card:hover {
          transform: translateY(-4px);
          border-color: rgba(168, 85, 247, 0.45);
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.38);
        }
        .tt-card-first {
          border-color: rgba(255, 140, 0, 0.4);
          box-shadow: 0 0 0 1px rgba(255, 140, 0, 0.12),
                      0 8px 28px rgba(255, 140, 0, 0.1);
        }
        .tt-card-first:hover {
          border-color: rgba(255, 140, 0, 0.6);
          box-shadow: 0 14px 36px rgba(255, 140, 0, 0.2);
        }

        /* ── Rang ── */
        .tt-rank {
          position: absolute;
          top: 11px;
          inset-inline-end: 11px;
          width: 23px;
          height: 23px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 900;
          line-height: 1;
        }

        /* ── Avatar ── */

        /* ── Textes ── */
        .tt-name {
          color: white;
          font-weight: 700;
          font-size: 13.5px;
          margin: 3px 0 0;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .tt-subjects {
          color: #8b7bb8;
          font-size: 11px;
          margin: 0;
          line-height: 1.4;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .tt-wilaya {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #6d28d9;
          font-size: 10.5px;
          margin: 0;
        }
        .tt-featured {
          margin-top: 3px;
          background: rgba(255, 140, 0, 0.14);
          border: 1px solid rgba(255, 140, 0, 0.28);
          color: #fdba74;
          font-size: 10px;
          font-weight: 700;
          padding: 3px 9px;
          border-radius: 999px;
        }
      `}</style>
    </div>
  );
}

const SKELETON_STYLES = `
  .tt-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  @media (min-width: 700px) {
    .tt-grid { grid-template-columns: repeat(3, 1fr); }
  }
  .tt-skeleton {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 9px;
    padding: 20px 14px;
    background: rgba(20, 8, 45, 0.6);
    border: 1px solid rgba(124, 58, 237, 0.14);
    border-radius: 18px;
  }
  .tt-sk-circle, .tt-sk-line {
    background: linear-gradient(90deg,
      rgba(124, 58, 237, 0.08) 25%,
      rgba(124, 58, 237, 0.2) 50%,
      rgba(124, 58, 237, 0.08) 75%);
    background-size: 200% 100%;
    animation: ttShimmer 1.6s ease-in-out infinite;
  }
  .tt-sk-circle { width: 56px; height: 56px; border-radius: 18px; }
  .tt-sk-line { height: 10px; border-radius: 5px; }
  @keyframes ttShimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;
