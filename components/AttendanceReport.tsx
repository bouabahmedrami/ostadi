"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang-context";
import {
  getClasseAttendance, getStudentAttendance,
  MIN_MINUTES_TO_COUNT,
} from "@/lib/firestore";
import {
  Clock, Users, CheckCircle, XCircle, Loader2,
  Calendar, TrendingUp, AlertCircle,
} from "lucide-react";

/**
 * Relevé de présence.
 *
 * Deux lectures : le professeur voit sa classe, l'élève voit son
 * propre suivi — et le parent qui regarde par-dessus son épaule voit
 * exactement combien de temps son enfant est resté sur chaque séance.
 *
 * C'est cette durée qui donne sa valeur au relevé. « Présent » ne
 * distingue pas un élève resté cinquante minutes d'un autre parti au
 * bout de six.
 */
export default function AttendanceReport({
  classeId,
  classeDuration = 60,
  isTeacher,
  studentId,
}: {
  classeId: string;
  /** Durée théorique de la séance, pour calculer le taux */
  classeDuration?: number;
  isTeacher: boolean;
  studentId?: string;
}) {
  const { isRTL } = useLang();
  const [groups, setGroups] = useState<any[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { load(); }, [classeId, studentId]);

  async function load() {
    setLoading(true);
    try {
      if (isTeacher) {
        setGroups(await getClasseAttendance(classeId));
      } else if (studentId) {
        setMine(await getStudentAttendance(classeId, studentId));
      }
    } catch (err) {
      console.error("Chargement des présences échoué :", err);
    } finally {
      setLoading(false);
    }
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
      day: "2-digit", month: "short",
    });
  }

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString(isRTL ? "ar-DZ" : "fr-DZ", {
      hour: "2-digit", minute: "2-digit",
    });
  }

  /** Le taux colore la ligne — un coup d'œil suffit */
  function rateColor(minutes: number): string {
    const pct = (minutes / classeDuration) * 100;
    if (pct >= 75) return "#22C55E";
    if (pct >= 40) return "#FBBF24";
    return "#EF4444";
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 26 }}>
        <Loader2 size={20} style={{ color: "#FF8C00", animation: "atspin 0.8s linear infinite" }} />
        <style>{`@keyframes atspin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ═══════════ VUE ÉLÈVE ═══════════ */
  if (!isTeacher) {
    if (mine.length === 0) return null;

    const counted = mine.filter(s => s.counted);
    const total = counted.reduce((s, x) => s + (x.durationMinutes || 0), 0);

    return (
      <div className="os-glass-2" style={{ padding: 18 }}>
        <h3 style={title}>
          <Clock size={16} style={{ color: "#FF8C00" }} />
          {isRTL ? "حضوري" : "Ma présence"}
        </h3>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: 10, marginBottom: 15,
        }}>
          <Box value={counted.length} label={isRTL ? "حصص" : "séances"} color="#22C55E" />
          <Box value={`${total} ${isRTL ? "د" : "min"}`} label={isRTL ? "المجموع" : "au total"} color="#FF8C00" />
          <Box
            value={counted.length ? `${Math.round(total / counted.length)} ${isRTL ? "د" : "min"}` : "—"}
            label={isRTL ? "المتوسط" : "en moyenne"}
            color="#60a5fa"
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {mine.map(s => (
            <Row key={s.id} s={s} fmtDate={fmtDate} fmtTime={fmtTime}
              rateColor={rateColor} isRTL={isRTL} duration={classeDuration} />
          ))}
        </div>
      </div>
    );
  }

  /* ═══════════ VUE PROFESSEUR ═══════════ */
  if (groups.length === 0) {
    return (
      <div className="os-glass-2" style={{ padding: 18 }}>
        <h3 style={title}>
          <Clock size={16} style={{ color: "#FF8C00" }} />
          {isRTL ? "الحضور" : "Présence"}
        </h3>
        <p style={{ color: "#6d28d9", fontSize: 12.5, textAlign: "center", padding: "18px 0", margin: 0, lineHeight: 1.6 }}>
          {isRTL
            ? "لا حضور مسجّل بعد. يُحتسب تلقائياً عند دخول الطلاب للقاعة."
            : "Aucune présence enregistrée. Elle se comptabilise automatiquement à l'entrée des élèves en salle."}
        </p>
      </div>
    );
  }

  const classTotal = groups.reduce((s, g) => s + g.totalMinutes, 0);
  const classAvg = groups.length ? Math.round(classTotal / groups.length) : 0;

  return (
    <div className="os-glass-2" style={{ padding: 18 }}>
      <h3 style={title}>
        <Clock size={16} style={{ color: "#FF8C00" }} />
        {isRTL ? "الحضور الفعلي" : "Présence réelle"}
      </h3>
      <p style={{ color: "#6d28d9", fontSize: 11.5, margin: "-8px 0 15px", lineHeight: 1.6 }}>
        {isRTL
          ? `تُحتسب تلقائياً عند الدخول للقاعة. الحضور صالح من ${MIN_MINUTES_TO_COUNT} دقائق.`
          : `Comptabilisée à l'entrée en salle. Une présence compte à partir de ${MIN_MINUTES_TO_COUNT} minutes.`}
      </p>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 10, marginBottom: 15,
      }}>
        <Box value={groups.length} label={isRTL ? "طلاب حضروا" : "élèves venus"} color="#a78bfa" />
        <Box value={`${classAvg} ${isRTL ? "د" : "min"}`} label={isRTL ? "متوسط الحضور" : "moyenne"} color="#FF8C00" />
        <Box
          value={`${Math.round((classAvg / classeDuration) * 100)}%`}
          label={isRTL ? "من مدة الدرس" : "de la séance"}
          color={rateColor(classAvg)}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {groups.map(g => {
          const open = expanded === g.studentId;
          const color = rateColor(g.averageMinutes);

          return (
            <div key={g.studentId} style={{
              background: "rgba(10,0,20,0.4)",
              border: "1px solid rgba(124,58,237,0.14)",
              borderRadius: 12, overflow: "hidden",
            }}>
              <button
                onClick={() => setExpanded(open ? null : g.studentId)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 11,
                  background: "none", border: "none", padding: "11px 13px",
                  cursor: "pointer", fontFamily: "inherit",
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                <span style={{
                  width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                  background: `${color}1F`, color,
                  fontWeight: 800, fontSize: 12,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {g.studentName.charAt(0).toUpperCase()}
                </span>

                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", color: "white", fontSize: 13, fontWeight: 650 }}>
                    {g.studentName}
                  </span>
                  <span style={{ display: "block", color: "#6d28d9", fontSize: 10.5, marginTop: 1 }}>
                    {g.sessionsAttended} {isRTL ? "حصة" : g.sessionsAttended > 1 ? "séances" : "séance"}
                    {" · "}{g.totalMinutes} {isRTL ? "د" : "min"}
                  </span>
                </span>

                <span style={{
                  background: `${color}1A`, color,
                  fontSize: 11.5, fontWeight: 800,
                  padding: "5px 11px", borderRadius: 999, flexShrink: 0,
                }}>
                  {g.averageMinutes} {isRTL ? "د" : "min"}
                </span>
              </button>

              {open && (
                <div style={{ padding: "0 13px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {g.sessions.map((s: any) => (
                    <Row key={s.id} s={s} fmtDate={fmtDate} fmtTime={fmtTime}
                      rateColor={rateColor} isRTL={isRTL} duration={classeDuration} small />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════ Sous-composants ═══════════ */

function Row({ s, fmtDate, fmtTime, rateColor, isRTL, duration, small }: any) {
  const color = s.counted ? rateColor(s.durationMinutes) : "#6d28d9";
  const pct = Math.min(Math.round((s.durationMinutes / duration) * 100), 100);

  return (
    <div style={{
      background: small ? "rgba(20,8,45,0.5)" : "rgba(10,0,20,0.4)",
      border: small ? "none" : "1px solid rgba(124,58,237,0.12)",
      borderRadius: 10, padding: "9px 11px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
        <Calendar size={11} style={{ color: "#6d28d9", flexShrink: 0 }} />
        <span style={{ color: "#c4b5fd", fontSize: 11.5 }}>
          {fmtDate(s.sessionDate)}
        </span>
        <span style={{ color: "#4c1d95", fontSize: 10.5 }}>
          {fmtTime(s.joinedAt)}
          {s.leftAt && ` → ${fmtTime(s.leftAt)}`}
        </span>
        <span style={{ flex: 1 }} />
        {s.counted ? (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            color, fontSize: 11.5, fontWeight: 700, flexShrink: 0,
          }}>
            <CheckCircle size={11} />
            {s.durationMinutes} {isRTL ? "د" : "min"}
          </span>
        ) : (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            color: "#6d28d9", fontSize: 11, flexShrink: 0,
          }}>
            <XCircle size={11} />
            {isRTL ? "قصير جداً" : "trop court"}
          </span>
        )}
      </div>

      {/* Barre de proportion — la durée rapportée à la séance */}
      <div style={{
        height: 4, background: "rgba(124,58,237,0.14)",
        borderRadius: 999, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: color, borderRadius: 999,
          transition: "width 400ms ease",
        }} />
      </div>
    </div>
  );
}

function Box({ value, label, color }: any) {
  return (
    <div className="os-glass" style={{ padding: "11px 12px", textAlign: "center" }}>
      <div style={{ color, fontWeight: 800, fontSize: 16 }}>{value}</div>
      <div style={{ color: "#8b7bb8", fontSize: 10.5, marginTop: 2 }}>{label}</div>
    </div>
  );
}

const title: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 9,
  color: "white", fontWeight: 750, fontSize: 14.5, margin: "0 0 14px",
};
