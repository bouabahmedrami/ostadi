"use client";
import { useState, useEffect } from "react";
import { Search, Users, Zap, ChevronDown, Star, BookOpen, TrendingUp } from "lucide-react";
import { getClasses } from "@/lib/firestore";
import { Classe, SUBJECTS, LEVELS } from "@/lib/types";
import { useLang } from "@/lib/lang-context";
import ClasseCard from "@/components/ClasseCard";
import TopTeachers from "@/components/TopTeachers";
import Link from "next/link";

export default function HomePage() {
  const { t, isRTL } = useLang();
  const [classes, setClasses] = useState<Classe[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { loadClasses(); }, [subject, level]);

  async function loadClasses() {
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (subject) filters.subject = subject;
      if (level) filters.level = level;
      const data = await getClasses(Object.keys(filters).length ? filters : undefined);
      setClasses(data);
    } catch { setClasses([]); }
    finally { setLoading(false); }
  }

  return (
    <div className="ostadi-page" dir={isRTL ? "rtl" : "ltr"}>

      {/* ═══ HERO ═══ */}
      <section className="ostadi-hero">
        <div className="ostadi-orb ostadi-orb-1" />
        <div className="ostadi-orb ostadi-orb-2" />
        <div className="ostadi-orb ostadi-orb-3" />

        <div className={`ostadi-hero-inner ${mounted ? 'ostadi-fade-in' : 'ostadi-fade-out'}`}>
          <div className="ostadi-hero-badge">
            <Zap size={13} style={{ color: '#FF8C00' }} />
            {t.home.badge}
          </div>

          <h1 className="ostadi-hero-title">
            <span className="ostadi-text-white">{t.home.title1} </span>
            <span className="ostadi-text-gradient">أستاذي</span>
            <br />
            <span className="ostadi-text-white">{t.home.title2}</span>
          </h1>

          <p className="ostadi-hero-subtitle">{t.home.subtitle}</p>

          {/* Search bar */}
          <div className="ostadi-search-box">
            <div className="ostadi-search-grid">
              <div className="ostadi-select-wrap">
                <select value={level} onChange={(e) => setLevel(e.target.value)} className="ostadi-select">
                  <option value="">{t.home.searchLevel}</option>
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <ChevronDown className="ostadi-select-chevron" size={16} />
              </div>
              <div className="ostadi-select-wrap">
                <select value={subject} onChange={(e) => setSubject(e.target.value)} className="ostadi-select">
                  <option value="">{t.home.searchSubject}</option>
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="ostadi-select-chevron" size={16} />
              </div>
            </div>
            <button onClick={loadClasses} className="ostadi-search-btn">
              <Search size={16} />
              {t.home.searchBtn}
            </button>
          </div>

          {/* Stats */}
          <div className="ostadi-stats-row">
            {[
              { icon: <BookOpen size={15} />, value: "10+", label: t.home.stats.subjects },
              { icon: <Users size={15} />, value: "50+", label: t.home.stats.teachers },
              { icon: <Star size={15} />, value: "4.8★", label: t.home.stats.rating },
              { icon: <Zap size={15} />, value: "Live", label: t.home.stats.live },
            ].map((s, i) => (
              <div key={i} className="ostadi-stat-pill">
                <span className="ostadi-stat-icon">{s.icon}</span>
                <span className="ostadi-stat-value">{s.value}</span>
                <span className="ostadi-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TOP TEACHERS ═══ */}
      <section className="ostadi-section">
        <div className="ostadi-section-header">
          <div className="ostadi-section-icon-badge">
            <TrendingUp size={16} style={{ color: '#FF8C00' }} />
          </div>
          <h2 className="ostadi-section-title">
            {isRTL ? "أفضل الأساتذة" : "Meilleurs Professeurs"}
          </h2>
        </div>
        <TopTeachers />
      </section>

      {/* ═══ CLASSES ═══ */}
      <section className="ostadi-section">
        <div className="ostadi-section-header" style={{ justifyContent: 'space-between' }}>
          <h2 className="ostadi-section-title" style={{ margin: 0 }}>
            {subject || level
              ? `${t.home.courses} — ${level || ""}${subject ? ` · ${subject}` : ""}`
              : t.home.allCourses}
          </h2>
          {(subject || level) && (
            <button onClick={() => { setSubject(""); setLevel(""); }} className="ostadi-reset-btn">
              {t.home.reset}
            </button>
          )}
        </div>

        {loading ? (
          <div className="ostadi-classes-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="ostadi-skeleton-card">
                <div className="ostadi-skeleton-line" style={{ width: '70%', height: '14px' }} />
                <div className="ostadi-skeleton-line" style={{ width: '45%', height: '10px', marginTop: '10px' }} />
                <div className="ostadi-skeleton-line" style={{ width: '100%', height: '10px', marginTop: '14px' }} />
              </div>
            ))}
          </div>
        ) : classes.length === 0 ? (
          <div className="ostadi-empty-state">
            <div className="ostadi-empty-icon"><BookOpen size={32} /></div>
            <p className="ostadi-empty-title">{t.home.noCourses}</p>
            <p className="ostadi-empty-hint">{t.home.noCoursesHint}</p>
            <div style={{ marginTop: '32px', maxWidth: '380px', marginInline: 'auto', textAlign: isRTL ? 'right' : 'left' }}>
              <ClasseCard classe={{
                id: "demo", teacherId: "t1", teacherName: "م. عمراني", teacherRating: 4.8,
                title: "مراجعة بكالوريا — رياضيات",
                subject: "Mathématiques", level: "Terminale",
                dateTime: new Date(Date.now() + 86400000).toISOString(),
                durationMinutes: 60, price: 500, priceType: "session",
                description: "درس مكثف للمراجعة لمترشحي البكالوريا.",
                jitsiRoom: "ostadi-demo", enrolledCount: 12, attendanceCount: 10,
                wilaya: "Alger", status: "scheduled",
                whatsapp: "213XXXXXXXXX", createdAt: new Date().toISOString(),
              }} />
              <p className="ostadi-demo-label">{t.home.demo}</p>
            </div>
          </div>
        ) : (
          <div className="ostadi-classes-grid">
            {classes.map((c) => <ClasseCard key={c.id} classe={c} />)}
          </div>
        )}
      </section>

      {/* ═══ CTA ═══ */}
      <section className="ostadi-cta-section">
        <div className="ostadi-cta-glow" />
        <div className="ostadi-cta-inner">
          <h2 className="ostadi-cta-title">{t.home.ctaTitle}</h2>
          <p className="ostadi-cta-subtitle">
            {t.home.ctaSubtitle} <span className="ostadi-text-gradient" style={{ fontWeight: 800 }}>Ostadi</span>.
          </p>
          <Link href="/auth?mode=register&role=teacher" className="ostadi-cta-btn">
            {t.home.ctaBtn}
          </Link>
        </div>
      </section>

      <style jsx global>{`
        .ostadi-page {
          background: #0A0014;
          min-height: 100vh;
          background-image:
            radial-gradient(circle at 15% 20%, rgba(124,58,237,0.1) 0%, transparent 45%),
            radial-gradient(circle at 85% 15%, rgba(255,140,0,0.06) 0%, transparent 45%),
            linear-gradient(rgba(168,85,247,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168,85,247,0.025) 1px, transparent 1px);
          background-size: auto, auto, 44px 44px, 44px 44px;
          overflow-x: hidden;
        }

        .ostadi-hero { position: relative; overflow: hidden; padding: 72px 16px 56px; }
        .ostadi-orb { position: absolute; border-radius: 50%; filter: blur(60px); pointer-events: none; }
        .ostadi-orb-1 { top: -80px; left: 10%; width: 320px; height: 320px; background: rgba(124,58,237,0.18); animation: floatOrb 8s ease-in-out infinite; }
        .ostadi-orb-2 { top: 40px; right: 8%; width: 240px; height: 240px; background: rgba(255,140,0,0.1); animation: floatOrb 10s ease-in-out infinite reverse; }
        .ostadi-orb-3 { bottom: -100px; left: 50%; width: 280px; height: 280px; background: rgba(59,130,246,0.08); animation: floatOrb 12s ease-in-out infinite; }
        @keyframes floatOrb { 0%,100% { transform: translate(0,0); } 50% { transform: translate(20px,-20px); } }

        .ostadi-hero-inner { position: relative; max-width: 720px; margin: 0 auto; text-align: center; }
        .ostadi-fade-in { opacity: 1; transform: translateY(0); transition: opacity 0.6s ease, transform 0.6s ease; }
        .ostadi-fade-out { opacity: 0; transform: translateY(16px); }

        .ostadi-hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(124,58,237,0.15); border: 1px solid rgba(168,85,247,0.3);
          border-radius: 999px; padding: 8px 18px; font-size: 13px; font-weight: 600;
          color: #d8b4fe; margin-bottom: 28px; backdrop-filter: blur(10px);
        }

        .ostadi-hero-title { font-size: 42px; font-weight: 900; line-height: 1.15; letter-spacing: -1.5px; margin: 0 0 18px; }
        @media (min-width: 640px) { .ostadi-hero-title { font-size: 54px; } }
        .ostadi-text-white { color: white; }
        .ostadi-text-gradient {
          background: linear-gradient(135deg, #FF8C00, #FFB347);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }

        .ostadi-hero-subtitle { color: rgba(196,181,253,0.75); font-size: 16px; line-height: 1.7; margin: 0 0 36px; max-width: 500px; margin-inline: auto; }

        .ostadi-search-box {
          background: linear-gradient(145deg, rgba(20,8,45,0.95), rgba(15,5,30,0.95));
          border: 1px solid rgba(124,58,237,0.3);
          border-radius: 22px; padding: 14px; max-width: 560px; margin: 0 auto;
          box-shadow: 0 20px 60px rgba(124,58,237,0.15), inset 0 1px 0 rgba(255,255,255,0.04);
          backdrop-filter: blur(20px);
        }
        .ostadi-search-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .ostadi-select-wrap { position: relative; }
        .ostadi-select {
          width: 100%; background: rgba(26,10,60,0.8); border: 1px solid rgba(124,58,237,0.25);
          border-radius: 14px; padding: 13px 34px 13px 14px; font-size: 13.5px; color: white;
          appearance: none; outline: none; cursor: pointer; transition: border-color 0.2s ease;
          font-family: inherit;
        }
        .ostadi-select:hover, .ostadi-select:focus { border-color: rgba(168,85,247,0.5); }
        .ostadi-select-chevron { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #a78bfa; pointer-events: none; }
        [dir="rtl"] .ostadi-select-chevron { right: auto; left: 12px; }
        [dir="rtl"] .ostadi-select { padding: 13px 14px 13px 34px; }

        .ostadi-search-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 9px;
          background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white; font-weight: 800;
          padding: 14px; border-radius: 14px; border: none; cursor: pointer; font-size: 14.5px;
          box-shadow: 0 8px 24px rgba(255,140,0,0.35); transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .ostadi-search-btn:hover { transform: translateY(-2px) scale(1.01); box-shadow: 0 12px 30px rgba(255,140,0,0.45); }
        .ostadi-search-btn:active { transform: scale(0.98); }

        .ostadi-stats-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 40px; }
        .ostadi-stat-pill {
          display: flex; align-items: center; gap: 7px;
          background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.18);
          border-radius: 999px; padding: 9px 16px; transition: all 0.2s ease;
        }
        .ostadi-stat-pill:hover { background: rgba(124,58,237,0.15); transform: translateY(-2px); }
        .ostadi-stat-icon { color: #FF8C00; display: flex; }
        .ostadi-stat-value { color: white; font-weight: 800; font-size: 13.5px; }
        .ostadi-stat-label { color: #a78bfa; font-size: 12.5px; }

        .ostadi-section { max-width: 1152px; margin: 0 auto; padding: 44px 16px; }
        .ostadi-section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .ostadi-section-icon-badge {
          width: 34px; height: 34px; border-radius: 10px;
          background: linear-gradient(135deg, rgba(255,140,0,0.2), rgba(255,140,0,0.05));
          display: flex; align-items: center; justify-content: center;
        }
        .ostadi-section-title { font-size: 21px; font-weight: 800; color: white; letter-spacing: -0.3px; }
        .ostadi-reset-btn { color: #a78bfa; font-size: 13px; background: none; border: none; cursor: pointer; text-decoration: underline; }
        .ostadi-reset-btn:hover { color: white; }

        .ostadi-classes-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 640px) { .ostadi-classes-grid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1024px) { .ostadi-classes-grid { grid-template-columns: 1fr 1fr 1fr; } }

        .ostadi-skeleton-card {
          background: rgba(124,58,237,0.06); border: 1px solid rgba(124,58,237,0.12);
          border-radius: 16px; padding: 20px;
        }
        .ostadi-skeleton-line { background: linear-gradient(90deg, rgba(124,58,237,0.1) 25%, rgba(124,58,237,0.25) 50%, rgba(124,58,237,0.1) 75%); background-size: 200% 100%; border-radius: 6px; animation: shimmer 1.6s ease-in-out infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        .ostadi-empty-state { text-align: center; padding: 60px 20px; }
        .ostadi-empty-icon {
          width: 64px; height: 64px; border-radius: 18px; margin: 0 auto 16px;
          background: rgba(124,58,237,0.1); display: flex; align-items: center; justify-content: center;
          color: #7c3aed;
        }
        .ostadi-empty-title { color: #d8b4fe; font-weight: 700; font-size: 15.5px; margin-bottom: 6px; }
        .ostadi-empty-hint { color: #8b7bb8; font-size: 13.5px; }
        .ostadi-demo-label { color: #6d28d9; font-size: 11.5px; text-align: center; margin-top: 10px; }

        .ostadi-cta-section { position: relative; overflow: hidden; margin-top: 20px; border-top: 1px solid rgba(124,58,237,0.15); padding: 72px 16px; text-align: center; }
        .ostadi-cta-glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 500px; height: 300px; background: radial-gradient(ellipse, rgba(255,140,0,0.08), transparent 70%); pointer-events: none; }
        .ostadi-cta-inner { position: relative; max-width: 560px; margin: 0 auto; }
        .ostadi-cta-title { font-size: 30px; font-weight: 900; color: white; margin: 0 0 12px; letter-spacing: -0.5px; }
        .ostadi-cta-subtitle { color: #a78bfa; font-size: 15px; margin-bottom: 32px; line-height: 1.6; }
        .ostadi-cta-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white; font-weight: 800;
          padding: 15px 32px; border-radius: 14px; text-decoration: none; font-size: 15px;
          box-shadow: 0 10px 30px rgba(255,140,0,0.35); transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .ostadi-cta-btn:hover { transform: translateY(-3px) scale(1.03); box-shadow: 0 16px 40px rgba(255,140,0,0.45); }
      `}</style>
    </div>
  );
}
