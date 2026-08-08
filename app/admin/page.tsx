"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { trSubject, trWilaya } from "@/lib/i18n/translate";
import { useLang } from "@/lib/lang-context";
import {
  getFullPlatformStats, getAllUsersForAdmin, isAdminUser,
  getAllVerifications, getAllPendingSubscriptions,
  approveVerification, rejectVerification,
  activateSubscription, rejectSubscription,
} from "@/lib/firestore";
import {
  Users, GraduationCap, BookOpen, Banknote, TrendingUp, ShieldCheck,
  Crown, Star, AlertTriangle, Eye, Check, X, MapPin, BarChart3,
  Wallet, UserCheck, Video, Lock, Activity,
} from "lucide-react";

export default function AdminPage() {
  const { isRTL } = useLang();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [tab, setTab] = useState<"overview" | "revenue" | "users" | "moderation">("overview");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isAdmin = isAdminUser(user?.uid);

  useEffect(() => {
    if (!loading && !isAdmin) router.push("/");
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin]);

  async function loadAll() {
    setLoadingData(true);
    setLoadError(null);
    try {
      const [s, u, v, sub] = await Promise.all([
        getFullPlatformStats(),
        getAllUsersForAdmin(),
        getAllVerifications(),
        getAllPendingSubscriptions(),
      ]);
      setStats(s);
      setUsers(u);
      setVerifications(v as any[]);
      setSubscriptions(sub as any[]);
    } catch (err: any) {
      console.error("Chargement admin échoué :", err);
      setLoadError(
        err?.code === "permission-denied"
          ? (isRTL
              ? "الوصول مرفوض. تحقق من قواعد Firestore."
              : "Accès refusé. Vérifiez les règles Firestore.")
          : (isRTL ? "فشل تحميل البيانات" : "Échec du chargement des données")
      );
    } finally {
      setLoadingData(false);
    }
  }

  async function handleApproveVerif(id: string, teacherId: string, name: string) {
    const ok = window.confirm(
      isRTL
        ? `تأكيد توثيق ${name}؟\n\nسيحصل على شارة "موثق" وأولوية في نتائج البحث.`
        : `Approuver la vérification de ${name} ?\n\nIl obtiendra le badge "Vérifié" et une priorité dans les résultats.`
    );
    if (!ok) return;

    setActionLoading(id);
    setActionError(null);
    try {
      await approveVerification(id, teacherId);
      await loadAll();
    } catch (err: any) {
      console.error(err);
      setActionError(isRTL ? "فشل التوثيق" : "Échec de l'approbation");
    } finally { setActionLoading(null); }
  }

  async function handleRejectVerif(id: string, teacherId: string) {
    if (!rejectReason.trim()) return;
    setActionLoading(id);
    setActionError(null);
    try {
      await rejectVerification(id, teacherId, rejectReason);
      setRejectingId(null); setRejectReason("");
      await loadAll();
    } catch (err: any) {
      console.error(err);
      setActionError(isRTL ? "فشل الرفض" : "Échec du refus");
    } finally { setActionLoading(null); }
  }

  async function handleActivateSub(sub: any) {
    const ok = window.confirm(
      isRTL
        ? `تفعيل اشتراك ${sub.teacherName}؟\n\nالمبلغ: ${sub.amount} دج\nالمرجع: ${sub.paymentRef || "—"}\n\nتأكد من استلام الدفع.`
        : `Activer l'abonnement de ${sub.teacherName} ?\n\nMontant : ${sub.amount} DA\nRéférence : ${sub.paymentRef || "—"}\n\nVérifiez que le paiement a bien été reçu.`
    );
    if (!ok) return;

    setActionLoading(sub.id);
    setActionError(null);
    try {
      await activateSubscription(sub.id, sub.teacherId, sub.endDate);
      await loadAll();
    } catch (err: any) {
      console.error(err);
      setActionError(isRTL ? "فشل التفعيل" : "Échec de l'activation");
    } finally { setActionLoading(null); }
  }

  async function handleRejectSub(id: string) {
    setActionLoading(id);
    setActionError(null);
    try {
      await rejectSubscription(id);
      await loadAll();
    } catch (err: any) {
      console.error(err);
      setActionError(isRTL ? "فشل الرفض" : "Échec du rejet");
    } finally { setActionLoading(null); }
  }

  function fmt(n: number) { return (n || 0).toLocaleString("fr-DZ"); }

  if (loading || loadingData) return (
    <div className="ad-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        <div style={{ position: 'absolute', inset: 0, border: '3px solid rgba(124,58,237,0.15)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 0, border: '3px solid transparent', borderTopColor: '#FF8C00', borderRadius: '50%', animation: 'adspin 0.8s linear infinite' }} />
      </div>
      <style jsx global>{`@keyframes adspin { to { transform: rotate(360deg); } } .ad-page { background:#0A0014; min-height:100vh; }`}</style>
    </div>
  );

  if (!isAdmin) return (
    <div className="ad-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '14px' }}>
      <Lock size={38} style={{ color: '#f87171' }} />
      <p style={{ color: '#f87171', fontWeight: 700 }}>{isRTL ? "وصول محصور بالمدير" : "Accès réservé à l'administrateur"}</p>
      <style jsx global>{`.ad-page { background:#0A0014; min-height:100vh; }`}</style>
    </div>
  );

  const pendingVerifs = verifications.filter(v => v.status === "pending");
  const alertCount = pendingVerifs.length + subscriptions.length;
  const maxRevenue = Math.max(...(stats?.monthlyGrowth?.map((m: any) => m.revenue) || [1]), 1);
  const maxUsers = Math.max(...(stats?.monthlyGrowth?.map((m: any) => m.teachers + m.students) || [1]), 1);

  return (
    <div className="ad-page" dir={isRTL ? "rtl" : "ltr"}>
      <div className="ad-container">

        {/* ⚠️ MARQUEUR DE VERSION — à retirer une fois le problème réglé.
            S'il ne s'affiche pas sur Vercel, c'est qu'une ancienne
            version du fichier est déployée. */}
        <div style={{
          background: '#22C55E', color: 'white', padding: '8px 14px',
          borderRadius: 10, marginBottom: 16, fontSize: 12, fontWeight: 800,
          textAlign: 'center', letterSpacing: 0.3,
        }}>
          ✅ VERSION 2 — onglets + graphiques · {new Date().toISOString().slice(0, 10)}
        </div>

        {/* ═══ HEADER ═══ */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '14px', marginBottom: '24px', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(255,140,0,0.2), rgba(124,58,237,0.18))',
              border: '1px solid rgba(255,140,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FF8C00', flexShrink: 0,
            }}><BarChart3 size={20} /></div>
            <div>
              <h1 className="ad-title">{isRTL ? "لوحة الإدارة" : "Panneau Administrateur"}</h1>
              <p className="ad-sub">
                <Lock size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> {isRTL ? "وصول آمن · أستاذي" : "Accès sécurisé · Ostadi"}
              </p>
            </div>
          </div>
          {alertCount > 0 && (
            <div className="ad-alert-badge">
              <AlertTriangle size={14} />
              {alertCount} {isRTL ? (alertCount > 1 ? "إجراءات معلقة" : "إجراء معلق") : `action${alertCount > 1 ? 's' : ''} en attente`}
            </div>
          )}
        </div>

        {/* ═══ ERREURS ═══ */}
        {(loadError || actionError) && (
          <div className="ad-error-banner">
            <AlertTriangle size={16} />
            <p>{loadError || actionError}</p>
            <button onClick={() => { setLoadError(null); setActionError(null); }}>
              <X size={15} />
            </button>
          </div>
        )}

        {/* ═══ KPI PRINCIPAUX ═══ */}
        <div className="ad-kpi-grid">
          <KPI icon={<Wallet size={19} />} color="#22C55E"
            value={`${fmt(stats.revenueTotal)} DA`} label={isRTL ? "إجمالي إيرادات أستاذي" : "Revenu total Ostadi"}
            sub={`+${fmt(stats.revenueMonth)} DA ${isRTL ? "هذا الشهر" : "ce mois"}`} />
          <KPI icon={<TrendingUp size={19} />} color="#FF8C00"
            value={`${fmt(stats.gmvTotal)} DA`} label={isRTL ? "حجم الأعمال" : "Volume d'affaires (GMV)"}
            sub={`${fmt(stats.totalEnrollments)} ${isRTL ? "تسجيل" : "inscriptions"}`} />
          <KPI icon={<GraduationCap size={19} />} color="#7C3AED"
            value={fmt(stats.totalTeachers)} label={isRTL ? "أساتذة" : "Professeurs"}
            sub={`${stats.verifiedTeachers} ${isRTL ? "موثق" : "vérifiés"} · ${stats.subscribedTeachers} ${isRTL ? "مشترك" : "abonnés"}`} />
          <KPI icon={<Users size={19} />} color="#3B82F6"
            value={fmt(stats.totalStudents)} label={isRTL ? "طلاب" : "Élèves"}
            sub={`${fmt(stats.totalUsers)} ${isRTL ? "مستخدم إجمالاً" : "utilisateurs au total"}`} />
        </div>

        {/* ═══ TABS ═══ */}
        <div style={{
          display: 'flex', gap: '7px', marginBottom: '20px', flexWrap: 'wrap',
        }}>
          {[
            { id: "overview", label: isRTL ? "نظرة عامة" : "Vue d'ensemble", icon: <Activity size={14} /> },
            { id: "revenue", label: isRTL ? "الإيرادات" : "Revenus", icon: <Banknote size={14} /> },
            { id: "users", label: `${isRTL ? "المستخدمون" : "Utilisateurs"} (${users.length})`, icon: <Users size={14} /> },
            { id: "moderation", label: `${isRTL ? "الإشراف" : "Modération"}${alertCount > 0 ? ` (${alertCount})` : ''}`, icon: <ShieldCheck size={14} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                background: tab === t.id ? '#FF8C00' : 'rgba(124,58,237,0.08)',
                border: `1px solid ${tab === t.id ? '#FF8C00' : 'rgba(124,58,237,0.2)'}`,
                color: tab === t.id ? 'white' : '#a78bfa',
                fontSize: '12.5px', fontWeight: 700,
                padding: '10px 16px', borderRadius: '11px',
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.2s ease',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ═══════════ VUE D'ENSEMBLE ═══════════ */}
        {tab === "overview" && (
          <>
            <div className="ad-mini-grid">
              <Mini icon={<BookOpen size={15} />} value={fmt(stats.totalClasses)} label={isRTL ? "دروس" : "Cours créés"} color="#a78bfa" />
              <Mini icon={<Video size={15} />} value={fmt(stats.liveClasses)} label={isRTL ? "مباشر" : "En direct"} color="#EF4444" />
              <Mini icon={<UserCheck size={15} />} value={`${stats.attendanceRate}%`} label={isRTL ? "نسبة الحضور" : "Taux présence"} color="#22C55E" />
              <Mini icon={<Star size={15} />} value={stats.avgRating || "—"} label={isRTL ? "متوسط التقييم" : "Note moyenne"} color="#FF8C00" />
              <Mini icon={<ShieldCheck size={15} />} value={fmt(stats.verifiedTeachers)} label={isRTL ? "أساتذة موثقون" : "Profs vérifiés"} color="#3B82F6" />
              <Mini icon={<Crown size={15} />} value={fmt(stats.activeSubscriptions)} label={isRTL ? "مشتركون نشطون" : "Abonnés actifs"} color="#FF8C00" />
            </div>

            {/* Croissance */}
            <div style={{
            background: 'linear-gradient(145deg, rgba(20,8,45,0.92), rgba(15,5,30,0.92))',
            border: '1px solid rgba(124,58,237,0.22)',
            borderRadius: '16px', padding: '20px', marginBottom: '16px',
          }}>
              <h3 style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            color: 'white', fontWeight: 800, fontSize: '15px', margin: '0 0 18px',
          }}><TrendingUp size={16} /> {isRTL ? "النمو — آخر 6 أشهر" : "Croissance — 6 derniers mois"}</h3>
              <div className="ad-chart">
                {stats.monthlyGrowth.map((m: any, i: number) => {
                  const total = m.teachers + m.students;
                  const h = Math.max((total / maxUsers) * 100, 3);
                  return (
                    <div key={i} className="ad-bar-col">
                      <div className="ad-bar-value">{total}</div>
                      <div className="ad-bar-wrap">
                        <div className="ad-bar" style={{ height: `${h}%` }}>
                          <div className="ad-bar-teachers" style={{ height: `${total ? (m.teachers / total) * 100 : 0}%` }} />
                        </div>
                      </div>
                      <div className="ad-bar-label">{m.month}</div>
                    </div>
                  );
                })}
              </div>
              <div className="ad-legend">
                <span><i style={{ background: '#7C3AED' }} /> {isRTL ? "أساتذة" : "Professeurs"}</span>
                <span><i style={{ background: '#3B82F6' }} /> {isRTL ? "طلاب" : "Élèves"}</span>
              </div>
            </div>

            <div style={{
          display: 'grid', gridTemplateColumns: '1fr', gap: '16px',
        }}>
              {/* Wilayas */}
              <div style={{
            background: 'linear-gradient(145deg, rgba(20,8,45,0.92), rgba(15,5,30,0.92))',
            border: '1px solid rgba(124,58,237,0.22)',
            borderRadius: '16px', padding: '20px', marginBottom: '16px',
          }}>
                <h3 style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            color: 'white', fontWeight: 800, fontSize: '15px', margin: '0 0 18px',
          }}><MapPin size={16} /> {isRTL ? "أهم الولايات" : "Top wilayas"}</h3>
                {stats.byWilaya.length === 0 ? <p className="ad-empty-txt">{isRTL ? "لا توجد بيانات" : "Aucune donnée"}</p> :
                  stats.byWilaya.map((w: any, i: number) => {
                    const max = stats.byWilaya[0].count || 1;
                    return (
                      <div key={i} className="ad-row-bar">
                        <span className="ad-row-label">{trWilaya(w.wilaya, isRTL)}</span>
                        <div className="ad-row-track">
                          <div className="ad-row-fill" style={{ width: `${(w.count / max) * 100}%`, background: '#7C3AED' }} />
                        </div>
                        <span className="ad-row-val">{w.count}</span>
                      </div>
                    );
                  })}
              </div>

              {/* Matières */}
              <div style={{
            background: 'linear-gradient(145deg, rgba(20,8,45,0.92), rgba(15,5,30,0.92))',
            border: '1px solid rgba(124,58,237,0.22)',
            borderRadius: '16px', padding: '20px', marginBottom: '16px',
          }}>
                <h3 style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            color: 'white', fontWeight: 800, fontSize: '15px', margin: '0 0 18px',
          }}><BookOpen size={16} /> {isRTL ? "المواد الأكثر طلباً" : "Matières populaires"}</h3>
                {stats.bySubject.length === 0 ? <p className="ad-empty-txt">{isRTL ? "لا توجد بيانات" : "Aucune donnée"}</p> :
                  stats.bySubject.slice(0, 8).map((s: any, i: number) => {
                    const max = stats.bySubject[0].count || 1;
                    return (
                      <div key={i} className="ad-row-bar">
                        <span className="ad-row-label">{trSubject(s.subject, isRTL)}</span>
                        <div className="ad-row-track">
                          <div className="ad-row-fill" style={{ width: `${(s.count / max) * 100}%`, background: '#FF8C00' }} />
                        </div>
                        <span className="ad-row-val">{s.count}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </>
        )}

        {/* ═══════════ REVENUS ═══════════ */}
        {tab === "revenue" && (
          <>
            <div className="ad-rev-grid">
              <RevCard title={isRTL ? "إيراد أستاذي" : "Revenu Ostadi"} color="#22C55E"
                rows={[
                  [isRTL ? "هذا الشهر" : "Ce mois", `${fmt(stats.revenueMonth)} DA`],
                  [isRTL ? "الإجمالي" : "Total", `${fmt(stats.revenueTotal)} DA`],
                ]} highlight />
              <RevCard title={isRTL ? "العمولات (10٪)" : "Commissions (10%)"} color="#FF8C00"
                rows={[
                  [isRTL ? "هذا الشهر" : "Ce mois", `${fmt(stats.commissionMonth)} DA`],
                  [isRTL ? "هذه السنة" : "Cette année", `${fmt(stats.commissionYear)} DA`],
                  [isRTL ? "الإجمالي" : "Total", `${fmt(stats.commissionTotal)} DA`],
                ]} />
              <RevCard title={isRTL ? "الاشتراكات" : "Abonnements"} color="#7C3AED"
                rows={[
                  [isRTL ? "هذا الشهر" : "Ce mois", `${fmt(stats.subRevenueMonth)} DA`],
                  [isRTL ? "الإجمالي" : "Total", `${fmt(stats.subRevenueTotal)} DA`],
                  [isRTL ? "مشتركون نشطون" : "Abonnés actifs", fmt(stats.activeSubscriptions)],
                ]} />
              <RevCard title={isRTL ? "حجم الأعمال" : "Volume d'affaires"} color="#3B82F6"
                rows={[
                  [isRTL ? "هذا الشهر" : "Ce mois", `${fmt(stats.gmvMonth)} DA`],
                  [isRTL ? "هذه السنة" : "Cette année", `${fmt(stats.gmvYear)} DA`],
                  [isRTL ? "الإجمالي" : "Total", `${fmt(stats.gmvTotal)} DA`],
                ]} />
            </div>

            {/* Revenus mensuels */}
            <div style={{
            background: 'linear-gradient(145deg, rgba(20,8,45,0.92), rgba(15,5,30,0.92))',
            border: '1px solid rgba(124,58,237,0.22)',
            borderRadius: '16px', padding: '20px', marginBottom: '16px',
          }}>
              <h3 style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            color: 'white', fontWeight: 800, fontSize: '15px', margin: '0 0 18px',
          }}><Banknote size={16} /> {isRTL ? "العمولات الشهرية" : "Commissions mensuelles"}</h3>
              <div className="ad-chart">
                {stats.monthlyGrowth.map((m: any, i: number) => (
                  <div key={i} className="ad-bar-col">
                    <div className="ad-bar-value" style={{ color: '#FF8C00' }}>{fmt(m.revenue)}</div>
                    <div className="ad-bar-wrap">
                      <div className="ad-bar" style={{ height: `${Math.max((m.revenue / maxRevenue) * 100, 3)}%`, background: 'linear-gradient(180deg, #FF8C00, #FF6B00)' }} />
                    </div>
                    <div className="ad-bar-label">{m.month}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top profs par revenu */}
            <div style={{
            background: 'linear-gradient(145deg, rgba(20,8,45,0.92), rgba(15,5,30,0.92))',
            border: '1px solid rgba(124,58,237,0.22)',
            borderRadius: '16px', padding: '20px', marginBottom: '16px',
          }}>
              <h3 style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            color: 'white', fontWeight: 800, fontSize: '15px', margin: '0 0 18px',
          }}><Crown size={16} /> {isRTL ? "الأساتذة الأكثر ربحية" : "Professeurs les plus rentables"}</h3>
              {stats.topTeachers.length === 0 ? <p className="ad-empty-txt">{isRTL ? "لا توجد بيانات" : "Aucune donnée"}</p> : (
                <div className="ad-table">
                  <div className="ad-th">
                    <span>#</span><span>{isRTL ? "الأستاذ" : "Professeur"}</span><span>{isRTL ? "طلاب" : "Élèves"}</span><span>{isRTL ? "التقييم" : "Note"}</span><span>{isRTL ? "الإيراد" : "CA généré"}</span><span>{isRTL ? "العمولة" : "Commission"}</span>
                  </div>
                  {stats.topTeachers.map((t: any, i: number) => (
                    <div key={t.uid} className="ad-tr">
                      <span className={`ad-rank ${i < 3 ? 'ad-rank-top' : ''}`}>{i + 1}</span>
                      <span className="ad-td-name">{t.name}</span>
                      <span>{t.students}</span>
                      <span>{t.rating > 0 ? `★ ${t.rating.toFixed(1)}` : "—"}</span>
                      <span style={{ color: '#3B82F6', fontWeight: 700 }}>{fmt(t.revenue)} DA</span>
                      <span style={{ color: '#22C55E', fontWeight: 700 }}>{fmt(Math.round(t.revenue * 0.1))} DA</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══════════ UTILISATEURS ═══════════ */}
        {tab === "users" && (
          <div style={{
            background: 'linear-gradient(145deg, rgba(20,8,45,0.92), rgba(15,5,30,0.92))',
            border: '1px solid rgba(124,58,237,0.22)',
            borderRadius: '16px', padding: '20px', marginBottom: '16px',
          }}>
            <h3 style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            color: 'white', fontWeight: 800, fontSize: '15px', margin: '0 0 18px',
          }}><Users size={16} /> {isRTL ? "كل المستخدمين" : "Tous les utilisateurs"} ({users.length})</h3>
            <div className="ad-table">
              <div className="ad-th ad-th-users">
                <span>{isRTL ? "الاسم" : "Nom"}</span><span>{isRTL ? "الدور" : "Rôle"}</span><span>{isRTL ? "الولاية" : "Wilaya"}</span><span>{isRTL ? "الهاتف" : "Téléphone"}</span><span>{isRTL ? "الحالة" : "Statut"}</span>
              </div>
              {users.map(u => (
                <div key={u.uid} className="ad-tr ad-tr-users">
                  <span className="ad-td-name">{u.displayName || "—"}</span>
                  <span>
                    <span className={`ad-pill ${u.role === "teacher" ? "ad-pill-purple" : "ad-pill-blue"}`}>
                      {u.role === "teacher" ? (isRTL ? "أستاذ" : "Prof") : (isRTL ? "طالب" : "Élève")}
                    </span>
                  </span>
                  <span>{u.wilaya ? trWilaya(u.wilaya, isRTL) : "—"}</span>
                  <span style={{ fontSize: '11.5px' }}>{u.phone || "—"}</span>
                  <span style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {u.diplomaVerified && <span className="ad-pill ad-pill-green">✓ {isRTL ? "موثق" : "Vérifié"}</span>}
                    {u.subscriptionActive && <span className="ad-pill ad-pill-orange">👑 {isRTL ? "مميز" : "Premium"}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════ MODÉRATION ═══════════ */}
        {tab === "moderation" && (
          <>
            {/* Vérifications */}
            <div style={{
            background: 'linear-gradient(145deg, rgba(20,8,45,0.92), rgba(15,5,30,0.92))',
            border: '1px solid rgba(124,58,237,0.22)',
            borderRadius: '16px', padding: '20px', marginBottom: '16px',
          }}>
              <h3 style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            color: 'white', fontWeight: 800, fontSize: '15px', margin: '0 0 18px',
          }}>
                <ShieldCheck size={16} /> {isRTL ? "طلبات التوثيق" : "Vérifications en attente"} ({pendingVerifs.length})
              </h3>
              {pendingVerifs.length === 0 ? (
                <p className="ad-empty-txt">{isRTL ? "لا توجد طلبات توثيق معلقة ✓" : "Aucune vérification en attente ✓"}</p>
              ) : pendingVerifs.map((v: any) => (
                <div key={v.id} className="ad-mod-card">
                  <div className="ad-mod-head">
                    <div>
                      <div className="ad-mod-name">{v.teacherName}</div>
                      <div className="ad-mod-date">
                        {new Date(v.submittedAt).toLocaleDateString("fr-DZ", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <span className="ad-pill ad-pill-amber">⏳ {isRTL ? "معلق" : "En attente"}</span>
                  </div>
                  {v.bio && <p className="ad-mod-bio">{v.bio}</p>}
                  {v.subjects && (
                    <div className="ad-mod-subjects">
                      {v.subjects.map((s: string) => <span key={s} className="ad-pill ad-pill-purple">{s}</span>)}
                    </div>
                  )}
                  <div className="ad-mod-links">
                    {v.diplomaURL && <a href={v.diplomaURL} target="_blank" rel="noopener noreferrer"><Eye size={12} /> {isRTL ? "الشهادة" : "Diplôme"}</a>}
                    {v.cinURL && <a href={v.cinURL} target="_blank" rel="noopener noreferrer"><Eye size={12} /> {isRTL ? "بطاقة الهوية" : "CIN"}</a>}
                    {v.demoVideoURL && <a href={v.demoVideoURL} target="_blank" rel="noopener noreferrer"><Eye size={12} /> {isRTL ? "فيديو" : "Vidéo"}</a>}
                  </div>
                  {rejectingId !== v.id ? (
                    <div className="ad-mod-actions">
                      <button onClick={() => handleApproveVerif(v.id, v.teacherId, v.teacherName)}
                        disabled={actionLoading === v.id} className="ad-btn ad-btn-green">
                        <Check size={13} /> {isRTL ? "موافقة" : "Approuver"}
                      </button>
                      <button onClick={() => setRejectingId(v.id)} className="ad-btn ad-btn-red-out">
                        <X size={13} /> {isRTL ? "رفض" : "Refuser"}
                      </button>
                    </div>
                  ) : (
                    <div className="ad-reject-box">
                      <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        placeholder={isRTL ? "سبب الرفض..." : "Raison du refus..."} className="ad-input" />
                      <div style={{ display: 'flex', gap: '7px', marginTop: '8px' }}>
                        <button onClick={() => handleRejectVerif(v.id, v.teacherId)}
                          disabled={rejectReason.trim().length < 5 || actionLoading === v.id}
                          className="ad-btn ad-btn-red">{isRTL ? "تأكيد" : "Confirmer"}</button>
                        <button onClick={() => { setRejectingId(null); setRejectReason(""); }}
                          className="ad-btn ad-btn-ghost">{isRTL ? "إلغاء" : "Annuler"}</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Abonnements */}
            <div style={{
            background: 'linear-gradient(145deg, rgba(20,8,45,0.92), rgba(15,5,30,0.92))',
            border: '1px solid rgba(124,58,237,0.22)',
            borderRadius: '16px', padding: '20px', marginBottom: '16px',
          }}>
              <h3 style={{
            display: 'flex', alignItems: 'center', gap: '9px',
            color: 'white', fontWeight: 800, fontSize: '15px', margin: '0 0 18px',
          }}>
                <Crown size={16} /> {isRTL ? "اشتراكات للتفعيل" : "Abonnements à valider"} ({subscriptions.length})
              </h3>
              {subscriptions.length === 0 ? (
                <p className="ad-empty-txt">{isRTL ? "لا توجد اشتراكات معلقة ✓" : "Aucun abonnement en attente ✓"}</p>
              ) : subscriptions.map((s: any) => (
                <div key={s.id} className="ad-mod-card">
                  <div className="ad-mod-head">
                    <div>
                      <div className="ad-mod-name">{s.teacherName}</div>
                      <div className="ad-mod-date">
                        {new Date(s.createdAt).toLocaleDateString("fr-DZ", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <span className="ad-pill ad-pill-amber">⏳ {isRTL ? "معلق" : "En attente"}</span>
                  </div>
                  <div className="ad-sub-grid">
                    <div><span>{isRTL ? "الخطة" : "Plan"}</span><b style={{ textTransform: 'capitalize' }}>{s.plan}</b></div>
                    <div><span>{isRTL ? "المبلغ" : "Montant"}</span><b style={{ color: '#FF8C00' }}>{fmt(s.amount)} DA</b></div>
                    <div><span>{isRTL ? "الطريقة" : "Méthode"}</span><b style={{ textTransform: 'uppercase' }}>{s.paymentMethod}</b></div>
                    <div><span>{isRTL ? "المرجع" : "Référence"}</span><b style={{ fontFamily: 'monospace', fontSize: '11px' }}>{s.paymentRef || "—"}</b></div>
                  </div>
                  <div className="ad-mod-actions">
                    <button onClick={() => handleActivateSub(s)} disabled={actionLoading === s.id}
                      className="ad-btn ad-btn-orange"><Crown size={13} /> {isRTL ? "تفعيل" : "Activer"}</button>
                    <button onClick={() => handleRejectSub(s.id)} disabled={actionLoading === s.id}
                      className="ad-btn ad-btn-red-out"><X size={13} /> {isRTL ? "رفض" : "Rejeter"}</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        .ad-page {
          background: #0A0014; min-height: 100vh;
          background-image:
            radial-gradient(circle at 20% 10%, rgba(124,58,237,0.1) 0%, transparent 50%),
            linear-gradient(rgba(168,85,247,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168,85,247,0.025) 1px, transparent 1px);
          background-size: auto, 44px 44px, 44px 44px;
          padding: 26px 16px 60px;
        }
        .ad-container { max-width: 1180px; margin: 0 auto; }

        .ad-header { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 24px; flex-wrap: wrap; }
        .ad-header-left { display: flex; align-items: center; gap: 13px; }
        .ad-logo {
          width: 46px; height: 46px; border-radius: 14px;
          background: linear-gradient(135deg, rgba(255,140,0,0.2), rgba(124,58,237,0.18));
          border: 1px solid rgba(255,140,0,0.3);
          display: flex; align-items: center; justify-content: center; color: #FF8C00;
        }
        .ad-title { color: white; font-weight: 900; font-size: 21px; margin: 0; letter-spacing: -0.3px; }
        .ad-sub { color: #8b7bb8; font-size: 12px; margin: 2px 0 0; }
        .ad-alert-badge {
          display: flex; align-items: center; gap: 7px;
          background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3);
          color: #f87171; font-size: 12.5px; font-weight: 700;
          padding: 9px 15px; border-radius: 11px;
        }

        .ad-error-banner {
          display: flex; align-items: flex-start; gap: 11px;
          background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.32);
          border-radius: 13px; padding: 13px 15px; margin-bottom: 18px;
        }
        .ad-error-banner > svg { color: #f87171; flex-shrink: 0; margin-top: 1px; }
        .ad-error-banner p { color: #fca5a5; font-size: 13px; margin: 0; flex: 1; line-height: 1.5; }
        .ad-error-banner button {
          background: none; border: none; color: #f87171;
          cursor: pointer; display: flex; padding: 0; flex-shrink: 0; opacity: 0.7;
        }
        .ad-error-banner button:hover { opacity: 1; }

        .ad-kpi-grid { display: grid; grid-template-columns: 1fr; gap: 13px; margin-bottom: 22px; }
        @media (min-width: 640px) { .ad-kpi-grid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1000px) { .ad-kpi-grid { grid-template-columns: repeat(4, 1fr); } }
        .ad-kpi {
          background: linear-gradient(145deg, rgba(20,8,45,0.92), rgba(15,5,30,0.92));
          border: 1px solid rgba(124,58,237,0.22); border-radius: 16px; padding: 18px;
        }
        .ad-kpi-top { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .ad-kpi-icon { width: 38px; height: 38px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ad-kpi-val { color: white; font-weight: 900; font-size: 21px; line-height: 1.1; letter-spacing: -0.5px; }
        .ad-kpi-lbl { color: #a78bfa; font-size: 12px; font-weight: 600; }
        .ad-kpi-sub { color: #6d28d9; font-size: 11px; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(124,58,237,0.15); }

        .ad-tabs { display: flex; gap: 7px; margin-bottom: 20px; flex-wrap: wrap; }
        .ad-tab {
          display: flex; align-items: center; gap: 7px;
          background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.2);
          color: #a78bfa; font-size: 12.5px; font-weight: 700;
          padding: 10px 16px; border-radius: 11px; cursor: pointer; transition: all 0.2s ease;
        }
        .ad-tab:hover { background: rgba(124,58,237,0.15); }
        .ad-tab-on { background: #FF8C00; border-color: #FF8C00; color: white; }

        .ad-mini-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 11px; margin-bottom: 18px; }
        @media (min-width: 720px) { .ad-mini-grid { grid-template-columns: repeat(6, 1fr); } }
        .ad-mini {
          background: rgba(20,8,45,0.7); border: 1px solid rgba(124,58,237,0.18);
          border-radius: 13px; padding: 13px; text-align: center;
        }
        .ad-mini-icon { display: flex; justify-content: center; margin-bottom: 7px; }
        .ad-mini-val { color: white; font-weight: 900; font-size: 17px; }
        .ad-mini-lbl { color: #8b7bb8; font-size: 10.5px; margin-top: 2px; }

        .ad-card {
          background: linear-gradient(145deg, rgba(20,8,45,0.92), rgba(15,5,30,0.92));
          border: 1px solid rgba(124,58,237,0.22); border-radius: 16px;
          padding: 20px; margin-bottom: 16px;
        }
        .ad-card-title {
          display: flex; align-items: center; gap: 9px;
          color: white; font-weight: 800; font-size: 15px; margin: 0 0 18px;
        }
        .ad-card-title svg { color: #FF8C00; }
        .ad-empty-txt { color: #6d28d9; font-size: 13px; text-align: center; padding: 22px 0; margin: 0; }

        .ad-two-col { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 860px) { .ad-two-col { grid-template-columns: 1fr 1fr; } }

        /* Chart */
        .ad-chart { display: flex; align-items: flex-end; gap: 10px; height: 190px; padding: 0 4px; }
        .ad-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
        .ad-bar-value { color: #c4b5fd; font-size: 11px; font-weight: 700; margin-bottom: 6px; }
        .ad-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
        .ad-bar {
          width: 100%; background: linear-gradient(180deg, #3B82F6, #2563EB);
          border-radius: 7px 7px 0 0; position: relative; overflow: hidden;
          transition: height 0.5s cubic-bezier(0.34,1.2,0.64,1);
        }
        .ad-bar-teachers { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(180deg, #7C3AED, #6D28D9); }
        .ad-bar-label { color: #8b7bb8; font-size: 11px; margin-top: 8px; text-transform: capitalize; }
        .ad-legend { display: flex; gap: 18px; justify-content: center; margin-top: 14px; }
        .ad-legend span { display: flex; align-items: center; gap: 6px; color: #a78bfa; font-size: 11.5px; }
        .ad-legend i { width: 11px; height: 11px; border-radius: 3px; display: inline-block; }

        /* Row bars */
        .ad-row-bar { display: flex; align-items: center; gap: 11px; margin-bottom: 11px; }
        .ad-row-label { color: #c4b5fd; font-size: 12.5px; width: 118px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ad-row-track { flex: 1; height: 8px; background: rgba(124,58,237,0.12); border-radius: 999px; overflow: hidden; }
        .ad-row-fill { height: 100%; border-radius: 999px; transition: width 0.5s ease; }
        .ad-row-val { color: white; font-size: 12px; font-weight: 700; width: 32px; text-align: right; flex-shrink: 0; }

        /* Revenue cards */
        .ad-rev-grid { display: grid; grid-template-columns: 1fr; gap: 13px; margin-bottom: 18px; }
        @media (min-width: 640px) { .ad-rev-grid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1000px) { .ad-rev-grid { grid-template-columns: repeat(4, 1fr); } }
        .ad-rev {
          background: linear-gradient(145deg, rgba(20,8,45,0.92), rgba(15,5,30,0.92));
          border: 1px solid rgba(124,58,237,0.22); border-radius: 16px; padding: 18px;
        }
        .ad-rev-hl { border-width: 1.5px; }
        .ad-rev-title { font-size: 12px; font-weight: 800; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        .ad-rev-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; }
        .ad-rev-row span { color: #8b7bb8; font-size: 12px; }
        .ad-rev-row b { color: white; font-size: 13.5px; font-weight: 800; }
        .ad-rev-row:first-of-type b { font-size: 17px; }

        /* Table */
        .ad-table { display: flex; flex-direction: column; gap: 2px; overflow-x: auto; }
        .ad-th, .ad-tr {
          display: grid; grid-template-columns: 34px 1.7fr 0.7fr 0.7fr 1fr 1fr;
          gap: 10px; align-items: center; padding: 11px 12px; min-width: 620px;
        }
        .ad-th { background: rgba(124,58,237,0.15); border-radius: 10px; margin-bottom: 4px; }
        .ad-th span { color: #a78bfa; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; }
        .ad-tr { background: rgba(20,8,45,0.5); border-radius: 10px; }
        .ad-tr span { color: #c4b5fd; font-size: 12.5px; }
        .ad-td-name { color: white !important; font-weight: 700; }
        .ad-rank {
          width: 22px; height: 22px; border-radius: 7px; display: flex; align-items: center; justify-content: center;
          background: rgba(124,58,237,0.2); font-size: 11px !important; font-weight: 800;
        }
        .ad-rank-top { background: #FF8C00; color: white !important; }
        .ad-th-users, .ad-tr-users { grid-template-columns: 1.6fr 0.7fr 1fr 1fr 1.3fr; min-width: 580px; }

        .ad-pill { font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 999px; display: inline-block; }
        .ad-pill-purple { background: rgba(124,58,237,0.22); color: #d8b4fe; }
        .ad-pill-blue { background: rgba(59,130,246,0.18); color: #93c5fd; }
        .ad-pill-green { background: rgba(34,197,94,0.18); color: #6ee7b7; }
        .ad-pill-orange { background: rgba(255,140,0,0.2); color: #fdba74; }
        .ad-pill-amber { background: rgba(251,191,36,0.15); color: #fbbf24; }

        /* Moderation */
        .ad-mod-card {
          background: rgba(10,0,20,0.5); border: 1px solid rgba(251,191,36,0.25);
          border-radius: 14px; padding: 15px; margin-bottom: 11px;
        }
        .ad-mod-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
        .ad-mod-name { color: white; font-weight: 800; font-size: 14.5px; }
        .ad-mod-date { color: #6d28d9; font-size: 11px; margin-top: 2px; }
        .ad-mod-bio { color: #a78bfa; font-size: 12.5px; margin: 0 0 10px; line-height: 1.5; }
        .ad-mod-subjects { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 11px; }
        .ad-mod-links { display: flex; gap: 14px; margin-bottom: 13px; flex-wrap: wrap; }
        .ad-mod-links a {
          display: flex; align-items: center; gap: 5px;
          color: #a78bfa; font-size: 12px; text-decoration: underline; font-weight: 600;
        }
        .ad-mod-links a:hover { color: #FF8C00; }
        .ad-mod-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .ad-sub-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; margin-bottom: 13px; }
        @media (min-width: 560px) { .ad-sub-grid { grid-template-columns: repeat(4, 1fr); } }
        .ad-sub-grid div { display: flex; flex-direction: column; gap: 2px; }
        .ad-sub-grid span { color: #6d28d9; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.4px; }
        .ad-sub-grid b { color: white; font-size: 13px; }

        .ad-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          font-size: 12.5px; font-weight: 700; padding: 9px 16px;
          border-radius: 10px; cursor: pointer; border: none; transition: all 0.2s ease;
        }
        .ad-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ad-btn-green { background: #16a34a; color: white; }
        .ad-btn-orange { background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white; }
        .ad-btn-red { background: #dc2626; color: white; }
        .ad-btn-red-out { background: transparent; color: #f87171; border: 1px solid rgba(239,68,68,0.4); }
        .ad-btn-ghost { background: transparent; color: #a78bfa; border: 1px solid rgba(124,58,237,0.3); }

        .ad-reject-box { margin-top: 11px; padding-top: 11px; border-top: 1px solid rgba(124,58,237,0.15); }
        .ad-input {
          width: 100%; background: rgba(26,10,60,0.7); border: 1px solid rgba(124,58,237,0.3);
          border-radius: 10px; padding: 10px 12px; font-size: 13px; color: white;
          outline: none; font-family: inherit; box-sizing: border-box;
        }
      `}</style>
    </div>
  );
}

function KPI({ icon, color, value, label, sub }: any) {
  return (
    <div className="ad-kpi">
      <div className="ad-kpi-top">
        <div className="ad-kpi-icon" style={{ background: `${color}22`, color }}>{icon}</div>
        <div style={{ minWidth: 0 }}>
          <div className="ad-kpi-val">{value}</div>
          <div className="ad-kpi-lbl">{label}</div>
        </div>
      </div>
      {sub && <div className="ad-kpi-sub">{sub}</div>}
    </div>
  );
}

function Mini({ icon, value, label, color }: any) {
  return (
    <div className="ad-mini">
      <div className="ad-mini-icon" style={{ color }}>{icon}</div>
      <div className="ad-mini-val">{value}</div>
      <div className="ad-mini-lbl">{label}</div>
    </div>
  );
}

function RevCard({ title, color, rows, highlight }: any) {
  return (
    <div className={`ad-rev ${highlight ? 'ad-rev-hl' : ''}`} style={highlight ? { borderColor: `${color}66` } : {}}>
      <div className="ad-rev-title" style={{ color }}>{title}</div>
      {rows.map(([label, val]: [string, string], i: number) => (
        <div key={i} className="ad-rev-row">
          <span>{label}</span>
          <b style={i === 0 ? { color } : {}}>{val}</b>
        </div>
      ))}
    </div>
  );
}
