"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang-context";
import { getTeacherResponseStats, ResponseStats } from "@/lib/firestore";
import { Zap, Clock, TrendingUp } from "lucide-react";

/**
 * Délai de réponse du professeur.
 *
 * Deux effets, dans les deux sens :
 *  • l'élève sait à quoi s'attendre avant d'envoyer sa demande
 *  • le professeur voit son propre score et devient plus réactif
 *
 * Le second compte autant que le premier : un élève qui attend
 * trois jours va voir ailleurs.
 */
export default function ResponseBadge({
  teacherId,
  variant = "public",
}: {
  teacherId: string;
  /** "public" pour l'élève, "self" pour le professeur sur son dashboard */
  variant?: "public" | "self";
}) {
  const { isRTL } = useLang();
  const [stats, setStats] = useState<ResponseStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTeacherResponseStats(teacherId)
      .then(setStats)
      .catch(err => console.warn("Délai de réponse indisponible :", err))
      .finally(() => setLoading(false));
  }, [teacherId]);

  if (loading || !stats) return null;

  // Pas assez de données pour être honnête
  if (!stats.label || stats.sampleSize < 2) {
    if (variant === "self") {
      return (
        <div style={selfBox("rgba(124,58,237,0.06)", "rgba(124,58,237,0.18)")}>
          <Clock size={15} style={{ color: "#8b7bb8", flexShrink: 0 }} />
          <span style={{ color: "#8b7bb8", fontSize: 12.5 }}>
            {isRTL
              ? "لم تُحتسب سرعة ردّك بعد — تحتاج إلى طلبين على الأقل."
              : "Votre délai de réponse n'est pas encore calculé — il faut au moins deux demandes traitées."}
          </span>
        </div>
      );
    }
    return null;
  }

  const fast = (stats.medianMinutes ?? 9999) < 60 * 6;
  const slow = (stats.medianMinutes ?? 0) > 60 * 24;

  const color = fast ? "#22C55E" : slow ? "#FBBF24" : "#60a5fa";
  const label = isRTL ? stats.label.ar : stats.label.fr;

  /* ── Version professeur — avec conseil ── */
  if (variant === "self") {
    return (
      <div style={selfBox(`${color}12`, `${color}38`)}>
        {fast ? <Zap size={15} style={{ color, flexShrink: 0 }} /> : <Clock size={15} style={{ color, flexShrink: 0 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color, fontWeight: 700, fontSize: 13 }}>
            {label}
            <span style={{ color: "#6d28d9", fontWeight: 500, fontSize: 11, marginInlineStart: 8 }}>
              {isRTL
                ? `على ${stats.sampleSize} طلب`
                : `sur ${stats.sampleSize} demandes`}
            </span>
          </div>
          <div style={{ color: "#8b7bb8", fontSize: 11.5, marginTop: 3, lineHeight: 1.55 }}>
            {slow
              ? (isRTL
                  ? "الردّ السريع يزيد التسجيلات — الطالب الذي ينتظر يذهب لأستاذ آخر."
                  : "Répondre vite convertit mieux — un élève qui attend va voir ailleurs.")
              : fast
                ? (isRTL
                    ? "ممتاز. هذه السرعة تظهر على ملفك وتطمئن الأولياء."
                    : "Excellent. Cette réactivité s'affiche sur votre profil et rassure les parents.")
                : (isRTL
                    ? `${stats.responseRate}٪ من الطلبات تمت معالجتها.`
                    : `${stats.responseRate} % de vos demandes ont été traitées.`)}
          </div>
        </div>
      </div>
    );
  }

  /* ── Version publique — badge compact ── */
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: `${color}18`,
      border: `1px solid ${color}35`,
      color,
      fontSize: 11.5, fontWeight: 650,
      padding: "5px 11px", borderRadius: 999,
    }}>
      {fast ? <Zap size={11} /> : <Clock size={11} />}
      {label}
    </span>
  );
}

function selfBox(bg: string, border: string): React.CSSProperties {
  return {
    display: "flex", alignItems: "flex-start", gap: 11,
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 13,
    padding: "12px 14px",
  };
}
