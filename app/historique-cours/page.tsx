"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { getStudentCourseHistory } from "@/lib/firestore";
import {
  History, Calendar, Clock, CheckCircle, XCircle, Star, Video,
  Banknote, TrendingUp, BookOpen, ArrowLeft, Download, MapPin,
} from "lucide-react";
import Link from "next/link";
import { trSubject, trLevel, trWilaya } from "@/lib/i18n/translate";

export default function HistoriqueCoursPage() {
  const { user, profile, loading } = useAuth();
  const { isRTL } = useLang();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      getStudentCourseHistory(user.uid)
        .then(setData)
        .finally(() => setLoadingData(false));
    }
  }, [user]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
      weekday: "short", day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  function exportCSV() {
    if (!data) return;
    const all = [...data.upcoming, ...data.past];
    if (all.length === 0) return;

    // Échappe les guillemets internes (sinon un titre avec " casse le fichier)
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;

    const headers = isRTL
      ? ["التاريخ", "الدرس", "المادة", "المستوى", "الأستاذ", "السعر (دج)", "الحضور", "تقييمي"]
      : ["Date", "Cours", "Matière", "Niveau", "Professeur", "Prix (DA)", "Présence", "Ma note"];

    const rows = all.map((c: any) => [
      formatDate(c.dateTime),
      c.title,
      trSubject(c.subject, isRTL),
      trLevel(c.level, isRTL),
      c.teacherName,
      c.price,
      c.attended ? (isRTL ? "نعم" : "Oui") : (isRTL ? "لا" : "Non"),
      c.myRating || "—",
    ]);

    // Point-virgule : séparateur attendu par Excel en config FR/AR
    const csv = [headers, ...rows].map(r => r.map(esc).join(";")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historique-ostadi-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // évite la fuite mémoire
  }

  if (loading || loadingData) return (
    <div className="ostadi-hist-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <div style={{ position: 'absolute', inset: 0, border: '3px solid rgba(124,58,237,0.15)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 0, border: '3px solid transparent', borderTopColor: '#FF8C00', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
      <style jsx global>{`@keyframes spin { to { transform: rotate(360deg); } } .ostadi-hist-page { background:#0A0014; min-height:100vh; }`}</style>
    </div>
  );

  const list = tab === "upcoming" ? data?.upcoming || [] : data?.past || [];

  return (
    <div className="ostadi-hist-page" dir={isRTL ? "rtl" : "ltr"}>
      <div className="ostadi-hist-container">

        <Link href="/mes-cours" className="ostadi-back">
          <ArrowLeft size={15} style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
          {isRTL ? "دروسي" : "Mes cours"}
        </Link>

        {/* Header */}
        <div className="ostadi-hist-header">
          <div className="ostadi-hist-icon"><History size={20} /></div>
          <div style={{ flex: 1 }}>
            <h1 className="ostadi-hist-title">{isRTL ? "سجل الدروس" : "Historique des cours"}</h1>
            <p className="ostadi-hist-sub">
              {isRTL ? "كل الدروس التي سجّلت فيها" : "Tous les cours auxquels vous êtes inscrit"}
            </p>
          </div>
          <button onClick={exportCSV} disabled={!data || (data.upcoming.length + data.past.length) === 0} className="ostadi-export">
            <Download size={14} /> CSV
          </button>
        </div>

        {/* Stats */}
        <div className="ostadi-hist-stats">
          <StatBox
            icon={<BookOpen size={17} />} color="#a78bfa"
            value={`${(data?.upcoming.length || 0) + (data?.past.length || 0)}`}
            label={isRTL ? "درس مسجّل" : "Cours inscrits"}
          />
          <StatBox
            icon={<CheckCircle size={17} />} color="#34d399"
            value={`${data?.totalAttended || 0}`}
            label={isRTL ? "حضور" : "Présences"}
          />
          <StatBox
            icon={<Banknote size={17} />} color="#FF8C00"
            value={`${(data?.totalSpent || 0).toLocaleString()}`}
            label={isRTL ? "دج مدفوعة" : "DA investis"}
          />
          <StatBox
            icon={<TrendingUp size={17} />} color="#60a5fa"
            value={`${data?.upcoming.length || 0}`}
            label={isRTL ? "قادمة" : "À venir"}
          />
        </div>

        {/* Tabs */}
        <div className="ostadi-hist-tabs">
          <button
            onClick={() => setTab("upcoming")}
            className={`ostadi-hist-tab ${tab === "upcoming" ? "ostadi-hist-tab-active" : ""}`}
          >
            <Calendar size={14} />
            {isRTL ? "قادمة" : "À venir"} ({data?.upcoming.length || 0})
          </button>
          <button
            onClick={() => setTab("past")}
            className={`ostadi-hist-tab ${tab === "past" ? "ostadi-hist-tab-active" : ""}`}
          >
            <History size={14} />
            {isRTL ? "منتهية" : "Terminés"} ({data?.past.length || 0})
          </button>
        </div>

        {/* List */}
        {list.length === 0 ? (
          <div className="ostadi-hist-empty">
            <div className="ostadi-hist-empty-icon">
              {tab === "upcoming" ? <Calendar size={28} /> : <History size={28} />}
            </div>
            <p className="ostadi-hist-empty-title">
              {tab === "upcoming"
                ? (isRTL ? "لا توجد دروس قادمة" : "Aucun cours à venir")
                : (isRTL ? "لا توجد دروس منتهية" : "Aucun cours terminé")}
            </p>
            {tab === "upcoming" && (
              <Link href="/" className="ostadi-hist-cta">
                {isRTL ? "ابحث عن درس" : "Trouver un cours"}
              </Link>
            )}
          </div>
        ) : (
          <div className="ostadi-hist-list">
            {list.map((c: any) => (
              <div key={c.id} className={`ostadi-hist-card ${c.isPast ? "ostadi-hist-card-past" : ""}`}>
                {/* Left color bar */}
                <div className="ostadi-hist-bar" style={{
                  background: c.status === "live" ? "#ef4444" : (c.isPast ? "#4C1D95" : "#FF8C00"),
                }} />

                <div className="ostadi-hist-body">
                  {/* Badges */}
                  <div className="ostadi-hist-badges">
                    <span className="ostadi-hb ostadi-hb-purple">{trSubject(c.subject, isRTL)}</span>
                    <span className="ostadi-hb ostadi-hb-blue">{trLevel(c.level, isRTL)}</span>
                    {c.status === "live" && <span className="ostadi-hb ostadi-hb-red">🔴 En direct</span>}
                    {c.isPast && !c.attended && <span className="ostadi-hb ostadi-hb-gray">{isRTL ? "لم تحضر" : "Absent"}</span>}
                    {c.attended && <span className="ostadi-hb ostadi-hb-green">✓ {isRTL ? "حضرت" : "Présent"}</span>}
                  </div>

                  {/* Title */}
                  <h3 className="ostadi-hist-card-title">{c.title}</h3>

                  {/* Meta */}
                  <div className="ostadi-hist-meta">
                    <span><Calendar size={12} /> {formatDate(c.dateTime)}</span>
                    <span><Clock size={12} /> {c.durationMinutes} {isRTL ? "د" : "min"}</span>
                    <span><MapPin size={12} /> {trWilaya(c.wilaya, isRTL)}</span>
                  </div>

                  {/* Teacher + price row */}
                  <div className="ostadi-hist-footer">
                    <Link href={`/professeur/${c.teacherId}`} className="ostadi-hist-teacher">
                      <div className="ostadi-hist-avatar">{c.teacherName.charAt(0).toUpperCase()}</div>
                      <span>{c.teacherName}</span>
                    </Link>

                    <div className="ostadi-hist-right">
                      {/* Ma note */}
                      {c.hasRated && (
                        <span className="ostadi-hist-myrating">
                          <Star size={12} style={{ fill: '#FF8C00', color: '#FF8C00' }} />
                          {c.myRating}/5
                        </span>
                      )}
                      <span className="ostadi-hist-price">{c.price.toLocaleString()} {isRTL ? "دج" : "DA"}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="ostadi-hist-actions">
                    <Link href={`/classe/${c.id}`} className="ostadi-hist-btn ostadi-hist-btn-primary">
                      {c.status === "live"
                        ? <><Video size={13} /> {isRTL ? "انضم" : "Rejoindre"}</>
                        : <>{isRTL ? "التفاصيل" : "Voir le cours"}</>}
                    </Link>
                    {c.isPast && c.attended && !c.hasRated && (
                      <Link href={`/classe/${c.id}`} className="ostadi-hist-btn ostadi-hist-btn-outline">
                        <Star size={13} /> {isRTL ? "قيّم" : "Évaluer"}
                      </Link>
                    )}
                    <Link href={`/chat/${c.id}`} className="ostadi-hist-btn ostadi-hist-btn-ghost">
                      {isRTL ? "دردشة" : "Chat"}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        .ostadi-hist-page {
          background: #0A0014; min-height: 100vh;
          background-image:
            radial-gradient(circle at 20% 10%, rgba(124,58,237,0.1) 0%, transparent 50%),
            linear-gradient(rgba(168,85,247,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168,85,247,0.025) 1px, transparent 1px);
          background-size: auto, 44px 44px, 44px 44px;
          padding: 28px 16px 60px;
        }
        .ostadi-hist-container { max-width: 860px; margin: 0 auto; }
        .ostadi-back {
          display: inline-flex; align-items: center; gap: 7px; color: #a78bfa;
          text-decoration: none; font-size: 13px; font-weight: 600; margin-bottom: 20px;
          padding: 7px 12px; border-radius: 9px; transition: all 0.2s ease;
        }
        .ostadi-back:hover { background: rgba(124,58,237,0.12); color: white; }

        .ostadi-hist-header { display: flex; align-items: center; gap: 13px; margin-bottom: 22px; flex-wrap: wrap; }
        .ostadi-hist-icon {
          width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
          background: linear-gradient(135deg, rgba(255,140,0,0.2), rgba(124,58,237,0.15));
          border: 1px solid rgba(255,140,0,0.3);
          display: flex; align-items: center; justify-content: center; color: #FF8C00;
        }
        .ostadi-hist-title { color: white; font-weight: 900; font-size: 21px; margin: 0; letter-spacing: -0.3px; }
        .ostadi-hist-sub { color: #a78bfa; font-size: 12.5px; margin: 2px 0 0; }
        .ostadi-export {
          display: flex; align-items: center; gap: 6px; flex-shrink: 0;
          background: rgba(124,58,237,0.15); color: #d8b4fe;
          border: 1px solid rgba(168,85,247,0.3); padding: 9px 15px; border-radius: 10px;
          font-size: 12.5px; font-weight: 700; cursor: pointer; transition: all 0.2s ease;
        }
        .ostadi-export:hover:not(:disabled) { background: rgba(124,58,237,0.25); }
        .ostadi-export:disabled { opacity: 0.4; cursor: not-allowed; }

        .ostadi-hist-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 11px; margin-bottom: 22px; }
        @media (min-width: 640px) { .ostadi-hist-stats { grid-template-columns: repeat(4, 1fr); } }
        .ostadi-sbox {
          background: linear-gradient(145deg, rgba(20,8,45,0.9), rgba(15,5,30,0.9));
          border: 1px solid rgba(124,58,237,0.2); border-radius: 14px; padding: 14px;
          display: flex; align-items: center; gap: 11px;
        }
        .ostadi-sbox-icon { width: 36px; height: 36px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ostadi-sbox-value { color: white; font-weight: 900; font-size: 19px; line-height: 1.1; }
        .ostadi-sbox-label { color: #8b7bb8; font-size: 11px; margin-top: 2px; }

        .ostadi-hist-tabs { display: flex; gap: 8px; margin-bottom: 18px; }
        .ostadi-hist-tab {
          display: flex; align-items: center; gap: 7px;
          background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.2);
          color: #a78bfa; font-size: 13px; font-weight: 700;
          padding: 10px 17px; border-radius: 11px; cursor: pointer; transition: all 0.2s ease;
        }
        .ostadi-hist-tab-active { background: #FF8C00; border-color: #FF8C00; color: white; }

        .ostadi-hist-list { display: flex; flex-direction: column; gap: 12px; }
        .ostadi-hist-card {
          display: flex; gap: 0; overflow: hidden;
          background: linear-gradient(145deg, rgba(20,8,45,0.9), rgba(15,5,30,0.9));
          border: 1px solid rgba(124,58,237,0.2); border-radius: 16px;
          transition: border-color 0.25s ease, transform 0.25s ease;
        }
        .ostadi-hist-card:hover { border-color: rgba(168,85,247,0.4); transform: translateY(-2px); }
        .ostadi-hist-card-past { opacity: 0.82; }
        .ostadi-hist-bar { width: 4px; flex-shrink: 0; }
        .ostadi-hist-body { flex: 1; padding: 16px 18px; min-width: 0; }

        .ostadi-hist-badges { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 9px; }
        .ostadi-hb { font-size: 10.5px; font-weight: 700; padding: 4px 10px; border-radius: 999px; }
        .ostadi-hb-purple { background: rgba(124,58,237,0.2); color: #d8b4fe; }
        .ostadi-hb-blue { background: rgba(59,130,246,0.15); color: #93c5fd; }
        .ostadi-hb-red { background: rgba(239,68,68,0.18); color: #fca5a5; }
        .ostadi-hb-green { background: rgba(34,197,94,0.15); color: #6ee7b7; }
        .ostadi-hb-gray { background: rgba(124,58,237,0.1); color: #8b7bb8; }

        .ostadi-hist-card-title { color: white; font-weight: 700; font-size: 15px; margin: 0 0 9px; }
        .ostadi-hist-meta { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 12px; }
        .ostadi-hist-meta span {
          display: flex; align-items: center; gap: 5px;
          color: #8b7bb8; font-size: 11.5px;
        }
        .ostadi-hist-meta svg { color: #FF8C00; }

        .ostadi-hist-footer {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding-top: 11px; border-top: 1px solid rgba(124,58,237,0.13);
          margin-bottom: 12px; flex-wrap: wrap;
        }
        .ostadi-hist-teacher { display: flex; align-items: center; gap: 8px; text-decoration: none; }
        .ostadi-hist-teacher span { color: #c4b5fd; font-size: 12.5px; font-weight: 600; }
        .ostadi-hist-teacher:hover span { color: white; }
        .ostadi-hist-avatar {
          width: 28px; height: 28px; border-radius: 9px; flex-shrink: 0;
          background: linear-gradient(135deg, rgba(124,58,237,0.4), rgba(124,58,237,0.15));
          display: flex; align-items: center; justify-content: center;
          color: #e9d5ff; font-weight: 800; font-size: 12px;
        }
        .ostadi-hist-right { display: flex; align-items: center; gap: 11px; }
        .ostadi-hist-myrating {
          display: flex; align-items: center; gap: 4px;
          color: #FF8C00; font-size: 12px; font-weight: 700;
        }
        .ostadi-hist-price { color: #FF8C00; font-weight: 800; font-size: 14px; }

        .ostadi-hist-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .ostadi-hist-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 700; padding: 8px 14px;
          border-radius: 10px; text-decoration: none; transition: all 0.2s ease;
        }
        .ostadi-hist-btn-primary { background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white; }
        .ostadi-hist-btn-primary:hover { transform: translateY(-1px); }
        .ostadi-hist-btn-outline { background: rgba(255,140,0,0.1); color: #FF8C00; border: 1px solid rgba(255,140,0,0.35); }
        .ostadi-hist-btn-ghost { background: rgba(124,58,237,0.12); color: #c4b5fd; border: 1px solid rgba(124,58,237,0.25); }

        .ostadi-hist-empty { text-align: center; padding: 60px 20px; }
        .ostadi-hist-empty-icon {
          width: 62px; height: 62px; border-radius: 18px; margin: 0 auto 15px;
          background: rgba(124,58,237,0.1); display: flex; align-items: center; justify-content: center; color: #7c3aed;
        }
        .ostadi-hist-empty-title { color: #d8b4fe; font-weight: 700; font-size: 15px; margin-bottom: 6px; }
        .ostadi-hist-cta {
          display: inline-block; margin-top: 16px;
          background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white;
          font-weight: 700; padding: 11px 24px; border-radius: 12px;
          text-decoration: none; font-size: 13.5px;
        }
      `}</style>
    </div>
  );
}

function StatBox({ icon, color, value, label }: { icon: React.ReactNode; color: string; value: string; label: string }) {
  return (
    <div className="ostadi-sbox">
      <div className="ostadi-sbox-icon" style={{ background: `${color}22`, color }}>{icon}</div>
      <div>
        <div className="ostadi-sbox-value">{value}</div>
        <div className="ostadi-sbox-label">{label}</div>
      </div>
    </div>
  );
}
