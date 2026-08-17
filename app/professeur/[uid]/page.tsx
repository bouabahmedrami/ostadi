"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  getPublicTeacherProfile,
  getTeacherClasses,
  getRatingsByTeacher,
} from "@/lib/firestore";
import { useLang } from "@/lib/lang-context";
import { trSubject, trWilaya } from "@/lib/i18n/translate";
import { UserProfile, Classe, Rating } from "@/lib/types";
import { StarDisplay } from "@/components/StarRating";
import ClasseCard from "@/components/ClasseCard";
import Avatar from "@/components/Avatar";
import { AvailabilityDisplay } from "@/components/Availability";
import ReportButton from "@/components/ReportButton";
import TeacherVideo from "@/components/TeacherVideo";
import ResponseBadge from "@/components/ResponseBadge";
import {
  MapPin, BookOpen, Users, Star,
  ArrowLeft, Clock, ShieldCheck, GraduationCap, Briefcase,
} from "lucide-react";
import Link from "next/link";

export default function TeacherProfilePage() {
  const { uid } = useParams();
  const { isRTL } = useLang();
  const [teacher, setTeacher] = useState<UserProfile | null>(null);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"courses" | "reviews">("courses");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (uid) loadProfile(); }, [uid]);

  async function loadProfile() {
    setLoading(true);
    try {
      const [prof, cls, rats] = await Promise.all([
        getPublicTeacherProfile(uid as string),
        getTeacherClasses(uid as string),
        getRatingsByTeacher(uid as string),
      ]);
      setTeacher(prof);
      setClasses(cls.filter(c => c.status !== "ended"));
      setRatings(rats);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
      day: "2-digit", month: "long", year: "numeric",
    });
  }

  if (loading) return (
    <div className="tp-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <div style={{ position: 'absolute', inset: 0, border: '3px solid rgba(124,58,237,0.15)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 0, border: '3px solid transparent', borderTopColor: '#FF8C00', borderRadius: '50%', animation: 'tpspin 0.8s linear infinite' }} />
      </div>
      <style jsx global>{`
        @keyframes tpspin { to { transform: rotate(360deg); } }
        .tp-page { background: #0A0014; min-height: 100vh; }
      `}</style>
    </div>
  );

  if (!teacher) return (
    <div className="tp-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}>
      {isRTL ? "الأستاذ غير موجود" : "Professeur introuvable"}
      <style jsx global>{`.tp-page { background: #0A0014; min-height: 100vh; }`}</style>
    </div>
  );

  const totalStudents = classes.reduce((s, c) => s + (c.enrolledCount || 0), 0);
  const isVerified = (teacher as any).verificationStatus === "approved" || teacher.diplomaVerified;
  const diploma = (teacher as any).diploma;
  const university = (teacher as any).university;
  const yearsExp = (teacher as any).yearsExperience;

  // Répartition des notes pour le graphique
  const ratingBars = [5, 4, 3, 2, 1].map(star => {
    const count = ratings.filter(r => r.stars === star).length;
    const pct = ratings.length ? Math.round((count / ratings.length) * 100) : 0;
    return { star, count, pct };
  });

  return (
    <div className="tp-page" dir={isRTL ? "rtl" : "ltr"}>

      {/* ═══ HERO ═══ */}
      <div className="tp-hero">
        <div className="tp-orb tp-orb-1" />
        <div className="tp-orb tp-orb-2" />

        <div className={`tp-hero-inner ${mounted ? 'tp-in' : 'tp-out'}`}>
          <Link href="/" className="tp-back">
            <ArrowLeft size={15} style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
            {isRTL ? "رجوع" : "Retour"}
          </Link>

          <div className="tp-head">
            {/* Avatar */}
            <Avatar
              src={(teacher as any).photoURL}
              name={teacher.displayName}
              size={90}
              radius={24}
              accent={isVerified ? "#FF8C00" : "#7C3AED"}
              verified={isVerified}
              border={2}
            />

            {/* Infos */}
            <div className="tp-info">
              <div className="tp-name-row">
                <h1 className="tp-name">{teacher.displayName}</h1>
                {teacher.featured && (
                  <span className="tp-badge tp-badge-orange">⭐ {isRTL ? "مميز" : "Populaire"}</span>
                )}
                {isVerified && (
                  <span className="tp-badge tp-badge-green">
                    <ShieldCheck size={11} /> {isRTL ? "موثق" : "Vérifié"}
                  </span>
                )}
                {/* Réactivité — rassure avant même l'envoi de la demande */}
                <ResponseBadge teacherId={uid as string} />
              </div>

              <div className="tp-meta">
                <span><MapPin size={13} /> {trWilaya(teacher.wilaya, isRTL)}</span>
                {yearsExp > 0 && (
                  <span><Briefcase size={13} /> {yearsExp} {isRTL ? "سنوات خبرة" : "ans d'expérience"}</span>
                )}
              </div>

              {teacher.subjects && teacher.subjects.length > 0 && (
                <div className="tp-subjects">
                  {teacher.subjects.map(s => (
                    <span key={s} className="tp-subject-chip">{trSubject(s, isRTL)}</span>
                  ))}
                </div>
              )}

              <div className="tp-stars">
                <StarDisplay rating={teacher.rating} count={teacher.ratingCount} size="md" />
              </div>

              {(diploma || university) && (
                <div className="tp-diploma">
                  <GraduationCap size={14} />
                  <span>
                    {diploma}{diploma && university ? " · " : ""}{university}
                  </span>
                </div>
              )}

              {teacher.bio && <p className="tp-bio">{teacher.bio}</p>}
            </div>

            {/* Stats */}
            <div className="tp-stats">
              {[
                { icon: <Star size={15} />, value: teacher.rating ? teacher.rating.toFixed(1) : "—", label: isRTL ? "التقييم" : "Note", color: "#FF8C00" },
                { icon: <Users size={15} />, value: totalStudents, label: isRTL ? "طالب" : "Élèves", color: "#3B82F6" },
                { icon: <BookOpen size={15} />, value: classes.length, label: isRTL ? "درس" : "Cours", color: "#8B5CF6" },
                { icon: <Clock size={15} />, value: ratings.length, label: isRTL ? "تقييم" : "Avis", color: "#22C55E" },
              ].map((s, i) => (
                <div key={i} className="tp-stat">
                  <span className="tp-stat-icon" style={{ color: s.color }}>{s.icon}</span>
                  <span className="tp-stat-val">{s.value}</span>
                  <span className="tp-stat-lbl">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <div className="tp-container">
        <div className="tp-tabs">
          <button
            onClick={() => setTab("courses")}
            className={`tp-tab ${tab === "courses" ? "tp-tab-on" : ""}`}
          >
            <BookOpen size={14} />
            {isRTL ? `الدروس (${classes.length})` : `Cours (${classes.length})`}
          </button>
          <button
            onClick={() => setTab("reviews")}
            className={`tp-tab ${tab === "reviews" ? "tp-tab-on" : ""}`}
          >
            <Star size={14} />
            {isRTL ? `التقييمات (${ratings.length})` : `Avis (${ratings.length})`}
          </button>
        </div>

        {/* ═══ COURS ═══ */}
        {tab === "courses" && (
          <>
            {/* Vidéo de présentation — le meilleur outil de conversion.
                Le champ était collecté à la vérification sans jamais
                être affiché. */}
            <TeacherVideo
              url={(teacher as any).demoVideoURL}
              teacherName={teacher.displayName}
            />

            {(teacher as any).availability?.length > 0 && (
              <div style={{ marginBottom: '18px' }}>
                <AvailabilityDisplay value={(teacher as any).availability} />
              </div>
            )}
            {classes.length === 0 ? (
            <div className="tp-empty">
              <div className="tp-empty-icon"><BookOpen size={28} /></div>
              <p>{isRTL ? "لا توجد دروس متاحة حالياً" : "Aucun cours disponible pour le moment"}</p>
            </div>
          ) : (
            <div className="tp-courses-grid">
              {classes.map(c => <ClasseCard key={c.id} classe={c} />)}
            </div>
          )}
          </>
        )}

        {/* ═══ AVIS ═══ */}
        {tab === "reviews" && (
          <div className="tp-reviews">
            {ratings.length === 0 ? (
              <div className="tp-empty">
                <div className="tp-empty-icon"><Star size={28} /></div>
                <p>{isRTL ? "لا توجد تقييمات بعد" : "Aucun avis pour le moment"}</p>
              </div>
            ) : (
              <>
                {/* Résumé des notes */}
                <div className="tp-rating-summary">
                  <div className="tp-rating-big">
                    <div className="tp-rating-num">{teacher.rating ? teacher.rating.toFixed(1) : "—"}</div>
                    <StarDisplay rating={teacher.rating} size="md" />
                    <div className="tp-rating-count">
                      {ratings.length} {isRTL ? "تقييم" : ratings.length > 1 ? "avis" : "avis"}
                    </div>
                  </div>
                  <div className="tp-rating-bars">
                    {ratingBars.map(b => (
                      <div key={b.star} className="tp-rating-bar-row">
                        <span className="tp-rating-star-lbl">{b.star}</span>
                        <Star size={11} style={{ fill: '#FF8C00', color: '#FF8C00', flexShrink: 0 }} />
                        <div className="tp-rating-track">
                          <div className="tp-rating-fill" style={{ width: `${b.pct}%` }} />
                        </div>
                        <span className="tp-rating-pct">{b.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Liste des avis */}
                {ratings.map(r => (
                  <div key={r.id} className="tp-review">
                    <div className="tp-review-head">
                      <div className="tp-review-author">
                        <span className="tp-review-avatar">👤</span>
                        <span>{isRTL ? "طالب مجهول" : "Élève anonyme"}</span>
                      </div>
                      <div className="tp-review-right">
                        <StarDisplay rating={r.stars} size="sm" />
                        <span className="tp-review-date">{formatDate(r.createdAt)}</span>
                      </div>
                    </div>
                    {r.comment && <p className="tp-review-text">"{r.comment}"</p>}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
        {/* ═══ SIGNALEMENT ═══
            Placé en bas, volontairement discret : un élève qui hésite
            ne signalera pas si le geste paraît accusateur. */}
        <div style={{
          textAlign: 'center', marginTop: '32px', paddingTop: '20px',
          borderTop: '1px solid rgba(124,58,237,0.12)',
        }}>
          <ReportButton
            targetType="teacher"
            targetId={uid as string}
            targetName={teacher.displayName}
          />
        </div>
      </div>

      <style jsx global>{`
        .tp-page {
          background: #0A0014; min-height: 100vh;
          background-image:
            radial-gradient(circle at 20% 10%, rgba(124,58,237,0.08) 0%, transparent 50%),
            linear-gradient(rgba(168,85,247,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168,85,247,0.025) 1px, transparent 1px);
          background-size: auto, 44px 44px, 44px 44px;
          padding-bottom: 60px;
        }

        /* ── Hero ── */
        .tp-hero {
          position: relative; overflow: hidden;
          background: linear-gradient(180deg, rgba(76,29,149,0.28), transparent);
          border-bottom: 1px solid rgba(124,58,237,0.18);
          padding: 26px 16px 30px;
        }
        .tp-orb { position: absolute; border-radius: 50%; filter: blur(60px); pointer-events: none; }
        .tp-orb-1 { top: -60px; left: 22%; width: 260px; height: 260px; background: rgba(124,58,237,0.2); }
        .tp-orb-2 { top: -30px; right: 20%; width: 200px; height: 200px; background: rgba(255,140,0,0.1); }

        .tp-hero-inner { position: relative; max-width: 940px; margin: 0 auto; }
        .tp-in { opacity: 1; transform: translateY(0); transition: opacity 0.5s ease, transform 0.5s ease; }
        .tp-out { opacity: 0; transform: translateY(12px); }

        .tp-back {
          display: inline-flex; align-items: center; gap: 7px;
          color: #a78bfa; text-decoration: none; font-size: 13px; font-weight: 600;
          margin-bottom: 22px; padding: 7px 13px; border-radius: 10px;
          transition: all 0.2s ease;
        }
        .tp-back:hover { background: rgba(124,58,237,0.12); color: white; gap: 9px; }

        .tp-head { display: flex; gap: 18px; align-items: flex-start; flex-wrap: wrap; }

        /* Avatar */
        /* Infos */
        .tp-info { flex: 1; min-width: 240px; }
        .tp-name-row { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; margin-bottom: 8px; }
        .tp-name { color: white; font-weight: 900; font-size: 24px; margin: 0; letter-spacing: -0.5px; }
        .tp-badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 11px; font-weight: 700; padding: 4px 11px; border-radius: 999px;
        }
        .tp-badge-orange { background: rgba(255,140,0,0.16); color: #fdba74; border: 1px solid rgba(255,140,0,0.3); }
        .tp-badge-green { background: rgba(34,197,94,0.14); color: #6ee7b7; border: 1px solid rgba(34,197,94,0.28); }

        .tp-meta { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 10px; }
        .tp-meta span {
          display: inline-flex; align-items: center; gap: 5px;
          color: #a78bfa; font-size: 13px;
        }
        .tp-meta svg { color: #FF8C00; }

        .tp-subjects { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 11px; }
        .tp-subject-chip {
          background: rgba(124,58,237,0.14); color: #d8b4fe;
          border: 1px solid rgba(124,58,237,0.22);
          font-size: 11.5px; font-weight: 600; padding: 4px 11px; border-radius: 8px;
        }

        .tp-stars { margin-bottom: 11px; }

        .tp-diploma {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.16);
          border-radius: 10px; padding: 8px 13px; margin-bottom: 11px;
        }
        .tp-diploma svg { color: #FF8C00; flex-shrink: 0; }
        .tp-diploma span { color: #c4b5fd; font-size: 12.5px; font-weight: 500; }

        .tp-bio {
          color: rgba(196,181,253,0.7); font-size: 13.5px;
          line-height: 1.65; margin: 0; max-width: 560px;
        }

        /* Stats */
        .tp-stats { display: flex; gap: 9px; flex-wrap: wrap; }
        @media (max-width: 700px) { .tp-stats { width: 100%; } }
        .tp-stat {
          background: rgba(20,8,45,0.75); border: 1px solid rgba(124,58,237,0.2);
          border-radius: 13px; padding: 12px 16px; text-align: center;
          min-width: 76px; flex: 1;
          transition: border-color 0.25s ease, transform 0.25s ease;
        }
        .tp-stat:hover { border-color: rgba(168,85,247,0.4); transform: translateY(-2px); }
        .tp-stat-icon { display: block; margin-bottom: 5px; }
        .tp-stat-val { display: block; color: white; font-weight: 900; font-size: 18px; }
        .tp-stat-lbl { display: block; color: #8b7bb8; font-size: 10.5px; margin-top: 2px; }

        /* ── Container ── */
        .tp-container { max-width: 940px; margin: 0 auto; padding: 26px 16px 0; }

        .tp-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
        .tp-tab {
          display: flex; align-items: center; gap: 7px;
          background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.2);
          color: #a78bfa; font-size: 13px; font-weight: 700;
          padding: 10px 18px; border-radius: 11px; cursor: pointer; transition: all 0.2s ease;
        }
        .tp-tab:hover { background: rgba(124,58,237,0.15); }
        .tp-tab-on { background: #FF8C00; border-color: #FF8C00; color: white; }

        .tp-courses-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 640px) { .tp-courses-grid { grid-template-columns: 1fr 1fr; } }

        /* ── Avis ── */
        .tp-reviews { display: flex; flex-direction: column; gap: 12px; }
        .tp-rating-summary {
          display: flex; gap: 24px; align-items: center; flex-wrap: wrap;
          background: linear-gradient(145deg, rgba(20,8,45,0.9), rgba(15,5,30,0.9));
          border: 1px solid rgba(124,58,237,0.22); border-radius: 18px; padding: 22px;
        }
        .tp-rating-big { text-align: center; flex-shrink: 0; }
        .tp-rating-num { color: #FF8C00; font-weight: 900; font-size: 46px; line-height: 1; margin-bottom: 6px; }
        .tp-rating-count { color: #8b7bb8; font-size: 11.5px; margin-top: 5px; }
        .tp-rating-bars { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 6px; }
        .tp-rating-bar-row { display: flex; align-items: center; gap: 8px; }
        .tp-rating-star-lbl { color: #a78bfa; font-size: 11.5px; width: 10px; text-align: center; flex-shrink: 0; }
        .tp-rating-track { flex: 1; height: 7px; background: rgba(124,58,237,0.14); border-radius: 999px; overflow: hidden; }
        .tp-rating-fill { height: 100%; background: linear-gradient(90deg, #FF8C00, #FFB347); border-radius: 999px; transition: width 0.5s ease; }
        .tp-rating-pct { color: #8b7bb8; font-size: 11px; width: 32px; text-align: end; flex-shrink: 0; }

        .tp-review {
          background: linear-gradient(145deg, rgba(20,8,45,0.85), rgba(15,5,30,0.85));
          border: 1px solid rgba(124,58,237,0.18); border-radius: 16px; padding: 16px;
          transition: border-color 0.25s ease;
        }
        .tp-review:hover { border-color: rgba(168,85,247,0.32); }
        .tp-review-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; flex-wrap: wrap; margin-bottom: 9px;
        }
        .tp-review-author { display: flex; align-items: center; gap: 9px; }
        .tp-review-author span:last-child { color: #c4b5fd; font-size: 13px; font-weight: 600; }
        .tp-review-avatar {
          width: 30px; height: 30px; border-radius: 9px;
          background: rgba(124,58,237,0.22); border: 1px solid rgba(124,58,237,0.28);
          display: flex; align-items: center; justify-content: center; font-size: 14px;
        }
        .tp-review-right { display: flex; align-items: center; gap: 11px; flex-wrap: wrap; }
        .tp-review-date { color: #6d28d9; font-size: 11px; }
        .tp-review-text {
          color: rgba(196,181,253,0.78); font-size: 13px;
          line-height: 1.6; margin: 0; font-style: italic;
        }

        /* ── Empty ── */
        .tp-empty { text-align: center; padding: 60px 20px; }
        .tp-empty-icon {
          width: 62px; height: 62px; border-radius: 18px; margin: 0 auto 14px;
          background: rgba(124,58,237,0.1); display: flex; align-items: center; justify-content: center;
          color: #7c3aed;
        }
        .tp-empty p { color: #8b7bb8; font-size: 14px; margin: 0; }
      `}</style>
    </div>
  );
}
