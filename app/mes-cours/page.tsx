"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { trSubject, trLevel, trWilaya } from "@/lib/i18n/translate";
import {
  getEnrollmentsByStudent, getClasseById, autoArchiveFinishedClasses,
} from "@/lib/firestore";
import { Classe } from "@/lib/types";
import {
  Video, Calendar, Clock, CheckCircle, BookOpen, MessageCircle,
  History, Search, Star, MapPin, ArrowRight, Radio, Bell,
} from "lucide-react";
import Link from "next/link";
import CertificateButton from "@/components/CertificateButton";

interface EnrolledClasse extends Classe {
  enrollmentId: string;
  attended: boolean;
}

export default function MesCoursPage() {
  const { user, profile, loading } = useAuth();
  const { isRTL } = useLang();
  const router = useRouter();
  const [classes, setClasses] = useState<EnrolledClasse[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => { setMounted(true); }, []);

  // Rafraîchit l'heure toutes les 30s pour détecter les cours qui démarrent
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) loadClasses();
  }, [user]);

  async function loadClasses() {
    setLoadingData(true);
    try {
      await autoArchiveFinishedClasses();
      const enrollments = await getEnrollmentsByStudent(user!.uid);
      const withClasses = await Promise.all(
        enrollments.map(async (e) => {
          const classe = await getClasseById(e.classeId);
          if (!classe) return null;
          return { ...classe, enrollmentId: e.id, attended: e.attended } as EnrolledClasse;
        })
      );
      setClasses(withClasses.filter(Boolean) as EnrolledClasse[]);
    } finally {
      setLoadingData(false);
    }
  }

  /* ── Catégorisation temporelle ─────────────────────────── */
  function getTiming(c: EnrolledClasse) {
    const start = new Date(c.dateTime);
    const end = new Date(start.getTime() + (c.durationMinutes || 60) * 60000);
    const soonWindow = new Date(start.getTime() - 15 * 60000); // 15 min avant

    if (c.status === "live") return "live";
    if (now >= soonWindow && now <= end) return "live";
    if (now > end || c.status === "ended") return "past";

    // Aujourd'hui ?
    const isToday = start.toDateString() === now.toDateString();
    if (isToday) return "today";
    return "upcoming";
  }

  const live = classes.filter(c => getTiming(c) === "live");
  const today = classes.filter(c => getTiming(c) === "today");
  const upcoming = classes.filter(c => getTiming(c) === "upcoming")
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  const past = classes.filter(c => getTiming(c) === "past");

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(isRTL ? "ar-DZ" : "fr-DZ", {
      hour: "2-digit", minute: "2-digit",
    });
  }

  function formatDay(iso: string) {
    const d = new Date(iso);
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    if (d.toDateString() === now.toDateString()) return isRTL ? "اليوم" : "Aujourd'hui";
    if (d.toDateString() === tomorrow.toDateString()) return isRTL ? "غداً" : "Demain";
    return d.toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
      weekday: "long", day: "2-digit", month: "long",
    });
  }

  function countdown(iso: string) {
    const diff = new Date(iso).getTime() - now.getTime();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 24) return null;
    if (h > 0) return `${h}${isRTL ? "س" : "h"} ${m}${isRTL ? "د" : "min"}`;
    return `${m} ${isRTL ? "دقيقة" : "min"}`;
  }

  if (loading || loadingData) return (
    <div className="mc-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <div style={{ position: 'absolute', inset: 0, border: '3px solid rgba(124,58,237,0.15)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 0, border: '3px solid transparent', borderTopColor: '#FF8C00', borderRadius: '50%', animation: 'mcspin 0.8s linear infinite' }} />
      </div>
      <style jsx global>{`
        @keyframes mcspin { to { transform: rotate(360deg); } }
        .mc-page { background: #0A0014; min-height: 100vh; }
      `}</style>
    </div>
  );

  const attendedCount = classes.filter(c => c.attended).length;

  return (
    <div className="mc-page" dir={isRTL ? "rtl" : "ltr"}>
      <div className={`mc-container ${mounted ? 'mc-in' : 'mc-out'}`}>

        {/* ═══ HEADER ═══ */}
        <div className="mc-header">
          <div>
            <h1 className="mc-title">
              {isRTL ? "مرحباً" : "Bonjour"}, <span className="mc-name">{profile?.displayName}</span> 👋
            </h1>
            <p className="mc-sub">
              {classes.length === 0
                ? (isRTL ? "لم تسجّل في أي درس بعد" : "Vous n'êtes inscrit à aucun cours")
                : (isRTL
                    ? `لديك ${classes.length} ${classes.length > 1 ? "دروس" : "درس"}`
                    : `Vous avez ${classes.length} cours`)}
            </p>
          </div>
          <Link href="/historique-cours" className="mc-hist-btn">
            <History size={15} />
            {isRTL ? "السجل" : "Historique"}
          </Link>
        </div>

        {/* ═══ STATS RAPIDES ═══ */}
        {classes.length > 0 && (
          <div className="mc-stats">
            <Stat icon={<BookOpen size={16} />} value={classes.length} label={isRTL ? "دروسي" : "Cours"} color="#8B5CF6" />
            <Stat icon={<Calendar size={16} />} value={upcoming.length + today.length} label={isRTL ? "قادمة" : "À venir"} color="#3B82F6" />
            <Stat icon={<CheckCircle size={16} />} value={attendedCount} label={isRTL ? "حضور" : "Présences"} color="#22C55E" />
            <Stat icon={<Radio size={16} />} value={live.length} label={isRTL ? "مباشر" : "En direct"} color="#EF4444" />
          </div>
        )}

        {/* ═══ EN DIRECT MAINTENANT ═══ */}
        {live.length > 0 && (
          <section className="mc-section">
            <div className="mc-section-head mc-section-head-live">
              <span className="mc-live-dot" />
              <h2>{isRTL ? "مباشر الآن" : "En direct maintenant"}</h2>
            </div>
            <div className="mc-live-grid">
              {live.map(c => (
                <Link key={c.id} href={`/classe/${c.id}`} className="mc-live-card">
                  <span className="mc-live-glow" />
                  <div className="mc-live-badge">
                    <span className="mc-live-dot-sm" />
                    {isRTL ? "مباشر" : "LIVE"}
                  </div>
                  <h3 className="mc-live-title">{c.title}</h3>
                  <div className="mc-live-meta">
                    <span>{trSubject(c.subject, isRTL)}</span>
                    <span className="mc-sep" />
                    <span>{c.teacherName}</span>
                  </div>
                  <div className="mc-live-cta">
                    <Video size={16} />
                    {isRTL ? "انضم الآن" : "Rejoindre maintenant"}
                    <ArrowRight size={15} className={isRTL ? "mc-flip" : ""} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ═══ AUJOURD'HUI ═══ */}
        {today.length > 0 && (
          <section className="mc-section">
            <div className="mc-section-head">
              <Bell size={16} />
              <h2>{isRTL ? "اليوم" : "Aujourd'hui"}</h2>
            </div>
            <div className="mc-list">
              {today.map(c => <CourseRow key={c.id} c={c} isRTL={isRTL} formatTime={formatTime} countdown={countdown} highlight />)}
            </div>
          </section>
        )}

        {/* ═══ À VENIR ═══ */}
        {upcoming.length > 0 && (
          <section className="mc-section">
            <div className="mc-section-head">
              <Calendar size={16} />
              <h2>{isRTL ? "الدروس القادمة" : "Prochains cours"}</h2>
            </div>
            <div className="mc-list">
              {upcoming.map(c => (
                <CourseRow key={c.id} c={c} isRTL={isRTL} formatTime={formatTime} countdown={countdown} dayLabel={formatDay(c.dateTime)} />
              ))}
            </div>
          </section>
        )}

        {/* ═══ ATTESTATIONS ═══
            Un document écrit donne une fin propre à un cours —
            et une raison d'en reprendre un autre. */}
        {user && past.length > 0 && (
          <section style={{ marginBottom: '22px' }}>
            <CertificateButton studentId={user.uid} />
          </section>
        )}

        {/* ═══ TERMINÉS (aperçu) ═══ */}
        {past.length > 0 && (
          <section className="mc-section">
            <div className="mc-section-head">
              <History size={16} />
              <h2>{isRTL ? "دروس منتهية" : "Cours terminés"}</h2>
              <Link href="/historique-cours" className="mc-see-all">
                {isRTL ? "عرض الكل" : "Voir tout"} <ArrowRight size={13} className={isRTL ? "mc-flip" : ""} />
              </Link>
            </div>
            <div className="mc-list">
              {past.slice(0, 3).map(c => (
                <CourseRow key={c.id} c={c} isRTL={isRTL} formatTime={formatTime} countdown={countdown} past />
              ))}
            </div>
          </section>
        )}

        {/* ═══ VIDE ═══ */}
        {classes.length === 0 && (
          <div className="mc-empty">
            <div className="mc-empty-icon"><BookOpen size={30} /></div>
            <h3>{isRTL ? "لا توجد دروس بعد" : "Aucun cours pour l'instant"}</h3>
            <p>
              {isRTL
                ? "ابحث عن درس وأرسل طلباً للأستاذ للانضمام."
                : "Trouvez un cours et envoyez une demande au professeur pour le rejoindre."}
            </p>
            <Link href="/" className="mc-empty-cta">
              <Search size={16} />
              {isRTL ? "ابحث عن درس" : "Trouver un cours"}
            </Link>
          </div>
        )}
      </div>

      <style jsx global>{`
        .mc-page {
          background: #0A0014; min-height: 100vh;
          background-image:
            radial-gradient(circle at 18% 8%, rgba(124,58,237,0.1) 0%, transparent 48%),
            radial-gradient(circle at 85% 20%, rgba(255,140,0,0.05) 0%, transparent 45%),
            linear-gradient(rgba(168,85,247,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168,85,247,0.022) 1px, transparent 1px);
          background-size: auto, auto, 44px 44px, 44px 44px;
          padding: 28px 16px 60px;
        }
        .mc-container { max-width: 880px; margin: 0 auto; }
        .mc-in { opacity: 1; transform: translateY(0); transition: opacity 0.5s ease, transform 0.5s ease; }
        .mc-out { opacity: 0; transform: translateY(12px); }

        /* ── Header ── */
        .mc-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 14px; flex-wrap: wrap; margin-bottom: 22px;
        }
        .mc-title { color: white; font-weight: 900; font-size: 24px; margin: 0; letter-spacing: -0.5px; }
        .mc-name { color: #FF8C00; }
        .mc-sub { color: #8b7bb8; font-size: 13px; margin: 4px 0 0; }
        .mc-hist-btn {
          display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0;
          background: rgba(124,58,237,0.12); color: #c4b5fd;
          border: 1px solid rgba(124,58,237,0.25);
          padding: 9px 16px; border-radius: 11px; text-decoration: none;
          font-size: 12.5px; font-weight: 700; transition: all 0.2s ease;
        }
        .mc-hist-btn:hover { background: rgba(124,58,237,0.2); color: white; }

        /* ── Stats ── */
        .mc-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 26px; }
        @media (min-width: 620px) { .mc-stats { grid-template-columns: repeat(4, 1fr); } }
        .mc-stat {
          background: linear-gradient(145deg, rgba(20,8,45,0.85), rgba(15,5,30,0.85));
          border: 1px solid rgba(124,58,237,0.18);
          border-radius: 14px; padding: 14px;
          display: flex; align-items: center; gap: 11px;
          transition: border-color 0.25s ease, transform 0.25s ease;
        }
        .mc-stat:hover { border-color: rgba(168,85,247,0.35); transform: translateY(-2px); }
        .mc-stat-icon { width: 36px; height: 36px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .mc-stat-val { color: white; font-weight: 900; font-size: 19px; line-height: 1.1; }
        .mc-stat-lbl { color: #8b7bb8; font-size: 11px; margin-top: 1px; }

        /* ── Sections ── */
        .mc-section { margin-bottom: 28px; }
        .mc-section-head {
          display: flex; align-items: center; gap: 9px; margin-bottom: 13px;
        }
        .mc-section-head h2 {
          color: white; font-weight: 800; font-size: 16px; margin: 0; letter-spacing: -0.2px;
        }
        .mc-section-head > svg { color: #FF8C00; }
        .mc-section-head-live h2 { color: #fca5a5; }
        .mc-see-all {
          margin-inline-start: auto;
          display: inline-flex; align-items: center; gap: 4px;
          color: #a78bfa; font-size: 12px; font-weight: 600; text-decoration: none;
          transition: color 0.2s ease, gap 0.2s ease;
        }
        .mc-see-all:hover { color: #FF8C00; gap: 6px; }

        /* ── Live cards ── */
        .mc-live-dot {
          width: 9px; height: 9px; border-radius: 50%; background: #ef4444;
          animation: mcPulse 1.4s ease-in-out infinite;
        }
        .mc-live-dot-sm {
          width: 5px; height: 5px; border-radius: 50%; background: white;
          animation: mcPulse 1.4s ease-in-out infinite;
        }
        @keyframes mcPulse {
          0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          50% { opacity: 0.5; box-shadow: 0 0 0 6px rgba(239,68,68,0); }
        }

        .mc-live-grid { display: grid; grid-template-columns: 1fr; gap: 13px; }
        @media (min-width: 700px) { .mc-live-grid { grid-template-columns: 1fr 1fr; } }
        .mc-live-card {
          position: relative; overflow: hidden;
          background: linear-gradient(150deg, rgba(60,10,30,0.75), rgba(20,8,40,0.9));
          border: 1.5px solid rgba(239,68,68,0.4);
          border-radius: 18px; padding: 18px; text-decoration: none;
          display: flex; flex-direction: column; gap: 10px;
          transition: transform 0.3s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.3s ease;
          box-shadow: 0 0 0 1px rgba(239,68,68,0.1), 0 8px 26px rgba(239,68,68,0.12);
        }
        .mc-live-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 0 0 1px rgba(239,68,68,0.2), 0 14px 36px rgba(239,68,68,0.2);
        }
        .mc-live-glow {
          position: absolute; top: -60px; inset-inline-end: -60px;
          width: 170px; height: 170px; border-radius: 50%;
          background: radial-gradient(circle, rgba(239,68,68,0.22) 0%, transparent 68%);
          pointer-events: none;
        }
        .mc-live-badge {
          position: relative;
          display: inline-flex; align-items: center; gap: 6px; width: fit-content;
          background: #ef4444; color: white;
          font-size: 10.5px; font-weight: 800; letter-spacing: 0.5px;
          padding: 4px 11px; border-radius: 999px;
        }
        .mc-live-title {
          position: relative;
          color: white; font-weight: 750; font-size: 16px; margin: 0; line-height: 1.35;
        }
        .mc-live-meta {
          position: relative;
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          color: #d4a5c8; font-size: 12.5px;
        }
        .mc-sep { width: 3px; height: 3px; border-radius: 50%; background: rgba(239,68,68,0.5); }
        .mc-live-cta {
          position: relative;
          display: flex; align-items: center; gap: 8px; margin-top: 4px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white; font-weight: 700; font-size: 13.5px;
          padding: 11px 16px; border-radius: 12px; justify-content: center;
          transition: filter 0.2s ease;
        }
        .mc-live-card:hover .mc-live-cta { filter: brightness(1.12); }

        /* ── Liste de cours ── */
        .mc-list { display: flex; flex-direction: column; gap: 10px; }
        .mc-row {
          display: flex; align-items: center; gap: 14px;
          background: linear-gradient(145deg, rgba(20,8,45,0.85), rgba(15,5,30,0.85));
          border: 1px solid rgba(124,58,237,0.16);
          border-radius: 15px; padding: 14px 16px;
          text-decoration: none;
          transition: transform 0.26s ease, border-color 0.26s ease;
        }
        .mc-row:hover { transform: translateY(-2px); border-color: rgba(168,85,247,0.35); }
        .mc-row-hl { border-color: rgba(255,140,0,0.3); background: linear-gradient(145deg, rgba(40,20,10,0.5), rgba(15,5,30,0.9)); }
        .mc-row-past { opacity: 0.6; }

        .mc-row-time {
          display: flex; flex-direction: column; align-items: center;
          flex-shrink: 0; min-width: 52px;
          padding-inline-end: 14px;
          border-inline-end: 1px solid rgba(124,58,237,0.15);
        }
        .mc-row-hour { color: white; font-weight: 800; font-size: 15px; letter-spacing: -0.3px; }
        .mc-row-cd { color: #FF8C00; font-size: 10px; font-weight: 700; margin-top: 2px; }
        .mc-row-day { color: #6d28d9; font-size: 9.5px; margin-top: 2px; text-align: center; }

        .mc-row-body { flex: 1; min-width: 0; }
        .mc-row-title {
          color: white; font-weight: 700; font-size: 14px; margin: 0 0 4px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .mc-row-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .mc-chip {
          font-size: 10.5px; font-weight: 600; padding: 3px 9px; border-radius: 7px;
          background: rgba(124,58,237,0.14); color: #c4b5fd;
        }
        .mc-row-teacher { color: #8b7bb8; font-size: 11.5px; }

        .mc-row-actions { display: flex; gap: 7px; flex-shrink: 0; }
        .mc-icon-btn {
          width: 36px; height: 36px; border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(124,58,237,0.12); color: #c4b5fd;
          border: 1px solid rgba(124,58,237,0.22);
          transition: all 0.2s ease;
        }
        .mc-icon-btn:hover { background: rgba(124,58,237,0.24); color: white; transform: translateY(-1px); }
        .mc-icon-btn-main {
          background: linear-gradient(135deg, #FF8C00, #FF6B00);
          color: white; border-color: transparent;
          box-shadow: 0 4px 14px rgba(255,140,0,0.25);
        }
        .mc-icon-btn-main:hover { filter: brightness(1.1); }
        .mc-attended {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 11px;
          background: rgba(34,197,94,0.13); color: #4ade80;
          border: 1px solid rgba(34,197,94,0.25);
        }

        /* ── Empty ── */
        .mc-empty { text-align: center; padding: 70px 20px; }
        .mc-empty-icon {
          width: 68px; height: 68px; border-radius: 20px; margin: 0 auto 16px;
          background: rgba(124,58,237,0.1); display: flex; align-items: center; justify-content: center;
          color: #7c3aed;
        }
        .mc-empty h3 { color: #d8b4fe; font-weight: 700; font-size: 17px; margin: 0 0 8px; }
        .mc-empty p { color: #8b7bb8; font-size: 13.5px; line-height: 1.6; max-width: 380px; margin: 0 auto 24px; }
        .mc-empty-cta {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white;
          font-weight: 700; padding: 13px 26px; border-radius: 13px;
          text-decoration: none; font-size: 14px;
          box-shadow: 0 8px 24px rgba(255,140,0,0.28);
          transition: transform 0.25s cubic-bezier(0.34,1.4,0.64,1);
        }
        .mc-empty-cta:hover { transform: translateY(-2px) scale(1.02); }

        .mc-flip { transform: scaleX(-1); }
      `}</style>
    </div>
  );
}

/* ── Sous-composants ────────────────────────────────────── */

function Stat({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="mc-stat">
      <span className="mc-stat-icon" style={{ background: `${color}1F`, color }}>{icon}</span>
      <span>
        <span className="mc-stat-val" style={{ display: 'block' }}>{value}</span>
        <span className="mc-stat-lbl" style={{ display: 'block' }}>{label}</span>
      </span>
    </div>
  );
}

function CourseRow({
  c, isRTL, formatTime, countdown, dayLabel, highlight, past,
}: {
  c: EnrolledClasse;
  isRTL: boolean;
  formatTime: (iso: string) => string;
  countdown: (iso: string) => string | null;
  dayLabel?: string;
  highlight?: boolean;
  past?: boolean;
}) {
  const cd = countdown(c.dateTime);

  return (
    <div className={`mc-row ${highlight ? "mc-row-hl" : ""} ${past ? "mc-row-past" : ""}`}>
      {/* Heure */}
      <div className="mc-row-time">
        <span className="mc-row-hour">{formatTime(c.dateTime)}</span>
        {cd && !past && <span className="mc-row-cd">{isRTL ? "خلال" : "dans"} {cd}</span>}
        {dayLabel && <span className="mc-row-day">{dayLabel}</span>}
      </div>

      {/* Contenu */}
      <Link href={`/classe/${c.id}`} className="mc-row-body" style={{ textDecoration: 'none' }}>
        <h3 className="mc-row-title">{c.title}</h3>
        <div className="mc-row-meta">
          <span className="mc-chip">{trSubject(c.subject, isRTL)}</span>
          <span className="mc-chip">{trLevel(c.level, isRTL)}</span>
          <span className="mc-row-teacher">{c.teacherName}</span>
        </div>
      </Link>

      {/* Actions */}
      <div className="mc-row-actions">
        {c.attended && (
          <span className="mc-attended" title={isRTL ? "حضرت" : "Présent"}>
            <CheckCircle size={16} />
          </span>
        )}
        <Link href={`/chat/${c.id}`} className="mc-icon-btn" title={isRTL ? "الدردشة" : "Chat"}>
          <MessageCircle size={15} />
        </Link>
        <Link href={`/classe/${c.id}`} className="mc-icon-btn mc-icon-btn-main" title={isRTL ? "عرض" : "Voir"}>
          <ArrowRight size={15} className={isRTL ? "mc-flip" : ""} />
        </Link>
      </div>
    </div>
  );
}
