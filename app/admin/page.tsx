"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { trWilaya } from "@/lib/i18n/translate";
import {
  getFullPlatformStats, getAllUsersForAdmin, isAdminUser,
  getAllVerifications, getAllPendingSubscriptions,
  approveVerification, rejectVerification,
  activateSubscription, rejectSubscription,
} from "@/lib/firestore";
import TeacherPaymentsPanel from "@/components/TeacherPaymentsPanel";
import ReportsPanel from "@/components/ReportsPanel";
import {
  Users, BookOpen, Banknote, TrendingUp, ShieldCheck, Crown, Star,
  AlertTriangle, Eye, Check, X, MapPin, BarChart3, Wallet, UserCheck,
  Video, Lock, Activity, Flag, Database, Loader2,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   Styles inline uniquement.

   Le panneau utilisait <style jsx global> pour ~80 classes CSS.
   En production, ces règles ne s'appliquaient pas de façon fiable :
   les éléments étaient bien présents dans le DOM mais rendus sans
   mise en forme — invisibles à l'écran. Les styles inline sont
   portés par l'attribut style, ils ne dépendent d'aucune compilation.
   ═══════════════════════════════════════════════════════════ */

const C = {
  bg: "#0A0014",
  card: "linear-gradient(145deg, rgba(20,8,45,0.92), rgba(15,5,30,0.92))",
  border: "rgba(124,58,237,0.22)",
  orange: "#FF8C00",
  purple: "#7C3AED",
  soft: "#c4b5fd",
  muted: "#8b7bb8",
  dim: "#6d28d9",
  green: "#22C55E",
  red: "#EF4444",
};

const S = {
  page: {
    background: C.bg,
    minHeight: "100vh",
    backgroundImage:
      "radial-gradient(circle at 20% 10%, rgba(124,58,237,0.1) 0%, transparent 50%)",
    padding: "26px 16px 60px",
  } as const,
  container: { maxWidth: "1180px", margin: "0 auto" } as const,
  card: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "16px",
  } as const,
  cardTitle: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    color: "white",
    fontWeight: 800,
    fontSize: "15px",
    margin: "0 0 18px",
  } as const,
  emptyTxt: {
    color: C.dim,
    fontSize: "13px",
    textAlign: "center" as const,
    padding: "22px 0",
    margin: 0,
  } as const,
  pill: (bg: string, col: string) => ({
    fontSize: "10.5px",
    fontWeight: 700,
    padding: "3px 9px",
    borderRadius: "999px",
    display: "inline-block",
    background: bg,
    color: col,
  }),
  btn: (bg: string, col: string, border = "none") => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontSize: "12.5px",
    fontWeight: 700,
    padding: "9px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    background: bg,
    color: col,
    border,
    fontFamily: "inherit",
  }),
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const { isRTL } = useLang();
  const router = useRouter();

  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [tab, setTab] = useState<"overview" | "revenue" | "payments" | "users" | "moderation" | "reports">("overview");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);

  const isAdmin = isAdminUser(user?.uid);

  useEffect(() => {
    if (!loading && !isAdmin) router.push("/");
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin]);

  async function loadAll() {
    setLoadingData(true);
    setError(null);
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
      setError(
        err?.code === "permission-denied"
          ? (isRTL ? "الوصول مرفوض — تحقق من قواعد Firestore." : "Accès refusé — vérifiez les règles Firestore.")
          : (isRTL ? "فشل تحميل البيانات" : "Échec du chargement")
      );
    } finally {
      setLoadingData(false);
    }
  }

  async function handleApprove(id: string, teacherId: string, name: string) {
    if (!window.confirm(
      isRTL ? `تأكيد توثيق ${name}؟` : `Approuver la vérification de ${name} ?`
    )) return;
    setActionLoading(id);
    try { await approveVerification(id, teacherId); await loadAll(); }
    catch { setError(isRTL ? "فشل التوثيق" : "Échec de l'approbation"); }
    finally { setActionLoading(null); }
  }

  async function handleReject(id: string, teacherId: string) {
    if (rejectReason.trim().length < 5) return;
    setActionLoading(id);
    try {
      await rejectVerification(id, teacherId, rejectReason);
      setRejectingId(null); setRejectReason("");
      await loadAll();
    } catch { setError(isRTL ? "فشل الرفض" : "Échec du refus"); }
    finally { setActionLoading(null); }
  }

  async function handleActivateSub(sub: any) {
    if (!window.confirm(
      isRTL
        ? `تفعيل اشتراك ${sub.teacherName}؟\nالمبلغ: ${sub.amount} دج\nتأكد من استلام الدفع.`
        : `Activer l'abonnement de ${sub.teacherName} ?\nMontant : ${sub.amount} DA\nVérifiez que le paiement a été reçu.`
    )) return;
    setActionLoading(sub.id);
    try { await activateSubscription(sub.id, sub.teacherId, sub.endDate); await loadAll(); }
    catch { setError(isRTL ? "فشل التفعيل" : "Échec de l'activation"); }
    finally { setActionLoading(null); }
  }

  async function handleRejectSub(id: string) {
    setActionLoading(id);
    try { await rejectSubscription(id); await loadAll(); }
    catch { setError(isRTL ? "فشل الرفض" : "Échec du rejet"); }
    finally { setActionLoading(null); }
  }

  /**
   * Migration des messages — à lancer UNE FOIS avant de déployer
   * la nouvelle règle Firestore sur la collection `messages`.
   *
   * Sans elle, les messages antérieurs deviennent illisibles pour
   * leurs propres auteurs : la règle exige un champ `participants`
   * que les anciens documents n'ont pas.
   */
  async function runMigration() {
    if (!window.confirm(
      isRTL
        ? "تشغيل ترحيل الرسائل؟\n\nيضيف حقل المشاركين إلى الرسائل القديمة.\nآمن ويمكن تكراره."
        : "Lancer la migration des messages ?\n\nAjoute le champ participants aux anciens messages.\nSans risque, peut être relancé."
    )) return;

    setMigrating(true);
    setMigrationResult(null);
    try {
      const { migrateMessagesParticipants } = await import("@/lib/firestore");
      const r = await migrateMessagesParticipants();
      setMigrationResult(
        isRTL
          ? `✓ ${r.migrated} رسالة تم ترحيلها · ${r.skipped} متجاوَزة · ${r.total} الإجمالي`
          : `✓ ${r.migrated} migrés · ${r.skipped} déjà à jour · ${r.total} au total`
      );
    } catch (err: any) {
      console.error("Migration échouée :", err);
      setMigrationResult(
        isRTL ? "✗ فشل الترحيل — راجع الطرفية" : "✗ Échec — voir la console"
      );
    } finally {
      setMigrating(false);
    }
  }

  const fmt = (n: number) => (n || 0).toLocaleString("fr-DZ");
  const DA = isRTL ? "دج" : "DA";

  /* ── Chargement ── */
  if (loading || loadingData) {
    return (
      <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: 48, height: 48 }}>
          <div style={{ position: "absolute", inset: 0, border: "3px solid rgba(124,58,237,0.15)", borderRadius: "50%" }} />
          <div style={{
            position: "absolute", inset: 0, border: "3px solid transparent",
            borderTopColor: C.orange, borderRadius: "50%",
            animation: "adspin 0.8s linear infinite",
          }} />
        </div>
        <style>{`@keyframes adspin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Accès refusé ── */
  if (!isAdmin) {
    return (
      <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14 }}>
        <Lock size={38} style={{ color: "#f87171" }} />
        <p style={{ color: "#f87171", fontWeight: 700 }}>
          {isRTL ? "وصول محصور بالمدير" : "Accès réservé à l'administrateur"}
        </p>
      </div>
    );
  }

  const pendingVerifs = verifications.filter(v => v.status === "pending");
  const alertCount = pendingVerifs.length + subscriptions.length;
  const growth = stats?.monthlyGrowth || [];
  const maxUsers = Math.max(...growth.map((m: any) => m.teachers + m.students), 1);
  const maxRevenue = Math.max(...growth.map((m: any) => m.revenue), 1);

  const TABS = [
    { id: "overview", label: isRTL ? "نظرة عامة" : "Vue d'ensemble", icon: <Activity size={14} /> },
    { id: "revenue", label: isRTL ? "الإيرادات" : "Revenus", icon: <Banknote size={14} /> },
    { id: "payments", label: isRTL ? "المدفوعات" : "Paiements", icon: <Wallet size={14} /> },
    { id: "users", label: `${isRTL ? "المستخدمون" : "Utilisateurs"} (${users.length})`, icon: <Users size={14} /> },
    { id: "moderation", label: `${isRTL ? "الإشراف" : "Modération"}${alertCount > 0 ? ` (${alertCount})` : ""}`, icon: <ShieldCheck size={14} /> },
    { id: "reports", label: isRTL ? "الإبلاغات" : "Signalements", icon: <Flag size={14} /> },
  ];

  return (
    <div style={S.page} dir={isRTL ? "rtl" : "ltr"}>
      <div style={S.container}>

        {/* ═══ EN-TÊTE ═══ */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14, flexShrink: 0,
              background: "linear-gradient(135deg, rgba(255,140,0,0.2), rgba(124,58,237,0.18))",
              border: "1px solid rgba(255,140,0,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", color: C.orange,
            }}>
              <BarChart3 size={20} />
            </div>
            <div>
              <h1 style={{ color: "white", fontWeight: 900, fontSize: 21, margin: 0, letterSpacing: "-0.3px" }}>
                {isRTL ? "لوحة الإدارة" : "Panneau Administrateur"}
              </h1>
              <p style={{ color: C.muted, fontSize: 12, margin: "2px 0 0" }}>
                <Lock size={11} style={{ display: "inline", verticalAlign: "-1px" }} />{" "}
                {isRTL ? "وصول آمن · أستاذي" : "Accès sécurisé · Ostadi"}
              </p>
            </div>
          </div>

          {alertCount > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
              color: "#f87171", fontSize: 12.5, fontWeight: 700,
              padding: "9px 15px", borderRadius: 11,
            }}>
              <AlertTriangle size={14} />
              {alertCount} {isRTL ? "إجراء معلق" : `action${alertCount > 1 ? "s" : ""} en attente`}
            </div>
          )}
        </div>

        {/* ═══ ERREUR ═══ */}
        {error && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 11,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.32)",
            borderRadius: 13, padding: "13px 15px", marginBottom: 18,
          }}>
            <AlertTriangle size={16} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: "#fca5a5", fontSize: 13, margin: 0, flex: 1, lineHeight: 1.5 }}>{error}</p>
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: 0 }}>
              <X size={15} />
            </button>
          </div>
        )}

        {/* ═══ KPI ═══ */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 13, marginBottom: 22,
        }}>
          <KPI icon={<Wallet size={19} />} color={C.green}
            value={`${fmt(stats?.revenueTotal)} ${DA}`}
            label={isRTL ? "إجمالي إيرادات أستاذي" : "Revenu total Ostadi"}
            sub={`+${fmt(stats?.revenueMonth)} ${DA} ${isRTL ? "هذا الشهر" : "ce mois"}`} />
          <KPI icon={<TrendingUp size={19} />} color={C.orange}
            value={`${fmt(stats?.gmvTotal)} ${DA}`}
            label={isRTL ? "حجم الأعمال" : "Volume d'affaires"}
            sub={`${fmt(stats?.totalEnrollments)} ${isRTL ? "تسجيل" : "inscriptions"}`} />
          <KPI icon={<UserCheck size={19} />} color={C.purple}
            value={fmt(stats?.totalTeachers)}
            label={isRTL ? "أساتذة" : "Professeurs"}
            sub={`${stats?.verifiedTeachers || 0} ${isRTL ? "موثق" : "vérifiés"} · ${stats?.subscribedTeachers || 0} ${isRTL ? "مشترك" : "abonnés"}`} />
          <KPI icon={<Users size={19} />} color="#3B82F6"
            value={fmt(stats?.totalStudents)}
            label={isRTL ? "طلاب" : "Élèves"}
            sub={`${fmt(stats?.totalUsers)} ${isRTL ? "مستخدم" : "utilisateurs"}`} />
        </div>

        {/* ═══ ONGLETS ═══ */}
        <div style={{ display: "flex", gap: 7, marginBottom: 20, flexWrap: "wrap" }}>
          {TABS.map(t => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  background: on ? C.orange : "rgba(124,58,237,0.08)",
                  border: `1px solid ${on ? C.orange : "rgba(124,58,237,0.2)"}`,
                  color: on ? "white" : "#a78bfa",
                  fontSize: 12.5, fontWeight: 700,
                  padding: "10px 16px", borderRadius: 11,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {t.icon} {t.label}
              </button>
            );
          })}
        </div>

        {/* ═══════════ VUE D'ENSEMBLE ═══════════ */}
        {tab === "overview" && (
          <>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 11, marginBottom: 18,
            }}>
              <Mini icon={<BookOpen size={15} />} value={fmt(stats?.totalClasses)} label={isRTL ? "دروس" : "Cours créés"} color="#a78bfa" />
              <Mini icon={<Video size={15} />} value={fmt(stats?.liveClasses)} label={isRTL ? "مباشر" : "En direct"} color={C.red} />
              <Mini icon={<UserCheck size={15} />} value={`${stats?.attendanceRate || 0}%`} label={isRTL ? "نسبة الحضور" : "Taux présence"} color={C.green} />
              <Mini icon={<Star size={15} />} value={stats?.avgRating || "—"} label={isRTL ? "متوسط التقييم" : "Note moyenne"} color={C.orange} />
              <Mini icon={<ShieldCheck size={15} />} value={fmt(stats?.verifiedTeachers)} label={isRTL ? "موثقون" : "Profs vérifiés"} color="#3B82F6" />
              <Mini icon={<Crown size={15} />} value={fmt(stats?.activeSubscriptions)} label={isRTL ? "مشتركون" : "Abonnés actifs"} color={C.orange} />
            </div>

            {/* Croissance */}
            <div style={S.card}>
              <h3 style={S.cardTitle}>
                <TrendingUp size={16} style={{ color: C.orange }} />
                {isRTL ? "النمو — آخر 6 أشهر" : "Croissance — 6 derniers mois"}
              </h3>

              {growth.length === 0 ? (
                <p style={S.emptyTxt}>{isRTL ? "لا توجد بيانات" : "Aucune donnée"}</p>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 190, padding: "0 4px" }}>
                    {growth.map((m: any, i: number) => {
                      const total = m.teachers + m.students;
                      const h = Math.max((total / maxUsers) * 100, 3);
                      const tPct = total ? (m.teachers / total) * 100 : 0;
                      return (
                        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                          <div style={{ color: C.soft, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>{total}</div>
                          <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                            <div style={{
                              width: "100%", height: `${h}%`, position: "relative", overflow: "hidden",
                              background: "linear-gradient(180deg, #3B82F6, #2563EB)",
                              borderRadius: "7px 7px 0 0",
                            }}>
                              <div style={{
                                position: "absolute", bottom: 0, left: 0, right: 0,
                                height: `${tPct}%`,
                                background: "linear-gradient(180deg, #7C3AED, #6D28D9)",
                              }} />
                            </div>
                          </div>
                          <div style={{ color: C.muted, fontSize: 11, marginTop: 8, textTransform: "capitalize" }}>{m.month}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 18, justifyContent: "center", marginTop: 14 }}>
                    <Legend color={C.purple} label={isRTL ? "أساتذة" : "Professeurs"} />
                    <Legend color="#3B82F6" label={isRTL ? "طلاب" : "Élèves"} />
                  </div>
                </>
              )}
            </div>

            {/* Wilayas + matières */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
              <div style={S.card}>
                <h3 style={S.cardTitle}>
                  <MapPin size={16} style={{ color: C.orange }} />
                  {isRTL ? "أهم الولايات" : "Top wilayas"}
                </h3>
                {(stats?.byWilaya || []).length === 0
                  ? <p style={S.emptyTxt}>{isRTL ? "لا توجد بيانات" : "Aucune donnée"}</p>
                  : stats.byWilaya.map((w: any, i: number) => (
                      <Bar key={i} label={trWilaya(w.wilaya, isRTL)} value={w.count}
                        max={stats.byWilaya[0].count} color={C.purple} />
                    ))}
              </div>

              <div style={S.card}>
                <h3 style={S.cardTitle}>
                  <BookOpen size={16} style={{ color: C.orange }} />
                  {isRTL ? "المواد الأكثر طلباً" : "Matières populaires"}
                </h3>
                {(stats?.bySubject || []).length === 0
                  ? <p style={S.emptyTxt}>{isRTL ? "لا توجد بيانات" : "Aucune donnée"}</p>
                  : stats.bySubject.slice(0, 8).map((s: any, i: number) => (
                      <Bar key={i} label={s.subject} value={s.count}
                        max={stats.bySubject[0].count} color={C.orange} />
                    ))}
              </div>
            </div>
          </>
        )}

        {/* ═══════════ REVENUS ═══════════ */}
        {tab === "revenue" && (
          <>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 13, marginBottom: 18,
            }}>
              <RevCard title={isRTL ? "إيراد أستاذي" : "Revenu Ostadi"} color={C.green} rows={[
                [isRTL ? "هذا الشهر" : "Ce mois", `${fmt(stats?.revenueMonth)} ${DA}`],
                [isRTL ? "الإجمالي" : "Total", `${fmt(stats?.revenueTotal)} ${DA}`],
              ]} />
              <RevCard title={isRTL ? "العمولات (10٪)" : "Commissions (10%)"} color={C.orange} rows={[
                [isRTL ? "هذا الشهر" : "Ce mois", `${fmt(stats?.commissionMonth)} ${DA}`],
                [isRTL ? "هذه السنة" : "Cette année", `${fmt(stats?.commissionYear)} ${DA}`],
                [isRTL ? "الإجمالي" : "Total", `${fmt(stats?.commissionTotal)} ${DA}`],
              ]} />
              <RevCard title={isRTL ? "الاشتراكات" : "Abonnements"} color={C.purple} rows={[
                [isRTL ? "هذا الشهر" : "Ce mois", `${fmt(stats?.subRevenueMonth)} ${DA}`],
                [isRTL ? "الإجمالي" : "Total", `${fmt(stats?.subRevenueTotal)} ${DA}`],
                [isRTL ? "مشتركون نشطون" : "Abonnés actifs", fmt(stats?.activeSubscriptions)],
              ]} />
              <RevCard title={isRTL ? "حجم الأعمال" : "Volume d'affaires"} color="#3B82F6" rows={[
                [isRTL ? "هذا الشهر" : "Ce mois", `${fmt(stats?.gmvMonth)} ${DA}`],
                [isRTL ? "هذه السنة" : "Cette année", `${fmt(stats?.gmvYear)} ${DA}`],
                [isRTL ? "الإجمالي" : "Total", `${fmt(stats?.gmvTotal)} ${DA}`],
              ]} />
            </div>

            <div style={S.card}>
              <h3 style={S.cardTitle}>
                <Banknote size={16} style={{ color: C.orange }} />
                {isRTL ? "العمولات الشهرية" : "Commissions mensuelles"}
              </h3>
              {growth.length === 0 ? (
                <p style={S.emptyTxt}>{isRTL ? "لا توجد بيانات" : "Aucune donnée"}</p>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 190, padding: "0 4px" }}>
                  {growth.map((m: any, i: number) => (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                      <div style={{ color: C.orange, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>{fmt(m.revenue)}</div>
                      <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                        <div style={{
                          width: "100%",
                          height: `${Math.max((m.revenue / maxRevenue) * 100, 3)}%`,
                          background: "linear-gradient(180deg, #FF8C00, #FF6B00)",
                          borderRadius: "7px 7px 0 0",
                        }} />
                      </div>
                      <div style={{ color: C.muted, fontSize: 11, marginTop: 8, textTransform: "capitalize" }}>{m.month}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={S.card}>
              <h3 style={S.cardTitle}>
                <Crown size={16} style={{ color: C.orange }} />
                {isRTL ? "الأساتذة الأكثر ربحية" : "Professeurs les plus rentables"}
              </h3>
              {(stats?.topTeachers || []).length === 0 ? (
                <p style={S.emptyTxt}>{isRTL ? "لا توجد بيانات" : "Aucune donnée"}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {stats.topTeachers.map((t: any, i: number) => (
                    <div key={t.uid} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      background: "rgba(20,8,45,0.5)", borderRadius: 10, padding: "11px 13px",
                      flexWrap: "wrap",
                    }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                        background: i < 3 ? C.orange : "rgba(124,58,237,0.2)",
                        color: i < 3 ? "white" : C.soft,
                        fontSize: 11, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{i + 1}</span>
                      <span style={{ color: "white", fontWeight: 700, fontSize: 13, flex: 1, minWidth: 120 }}>{t.name}</span>
                      <span style={{ color: C.muted, fontSize: 12 }}>{t.students} {isRTL ? "طالب" : "élèves"}</span>
                      <span style={{ color: "#3B82F6", fontWeight: 700, fontSize: 12.5 }}>{fmt(t.revenue)} {DA}</span>
                      <span style={{ color: C.green, fontWeight: 700, fontSize: 12.5 }}>
                        +{fmt(Math.round(t.revenue * 0.1))} {DA}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══════════ PAIEMENTS ═══════════ */}
        {tab === "payments" && user && (
          <TeacherPaymentsPanel adminUid={user.uid} />
        )}

        {/* ═══════════ UTILISATEURS ═══════════ */}
        {tab === "users" && (
          <div style={S.card}>
            <h3 style={S.cardTitle}>
              <Users size={16} style={{ color: C.orange }} />
              {isRTL ? "كل المستخدمين" : "Tous les utilisateurs"} ({users.length})
            </h3>

            {users.length === 0 ? (
              <p style={S.emptyTxt}>{isRTL ? "لا يوجد مستخدمون" : "Aucun utilisateur"}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {users.map(u => (
                  <div key={u.uid} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "rgba(20,8,45,0.5)", borderRadius: 10, padding: "11px 13px",
                    flexWrap: "wrap",
                  }}>
                    <span style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      background: "linear-gradient(140deg, rgba(124,58,237,0.4), rgba(124,58,237,0.15))",
                      color: "#e9d5ff", fontWeight: 800, fontSize: 13,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {(u.displayName || "?").charAt(0).toUpperCase()}
                    </span>

                    <span style={{ color: "white", fontWeight: 700, fontSize: 13, flex: 1, minWidth: 110 }}>
                      {u.displayName || "—"}
                    </span>

                    <span style={S.pill(
                      u.role === "teacher" ? "rgba(124,58,237,0.22)" : "rgba(59,130,246,0.18)",
                      u.role === "teacher" ? "#d8b4fe" : "#93c5fd"
                    )}>
                      {u.role === "teacher" ? (isRTL ? "أستاذ" : "Prof") : (isRTL ? "طالب" : "Élève")}
                    </span>

                    <span style={{ color: C.soft, fontSize: 12 }}>
                      {u.wilaya ? trWilaya(u.wilaya, isRTL) : "—"}
                    </span>

                    <span style={{ color: C.muted, fontSize: 11.5 }}>{u.phone || "—"}</span>

                    <span style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {u.diplomaVerified && (
                        <span style={S.pill("rgba(34,197,94,0.18)", "#6ee7b7")}>
                          ✓ {isRTL ? "موثق" : "Vérifié"}
                        </span>
                      )}
                      {u.subscriptionActive && (
                        <span style={S.pill("rgba(255,140,0,0.2)", "#fdba74")}>
                          👑 {isRTL ? "مميز" : "Premium"}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ SIGNALEMENTS ═══════════ */}
        {tab === "reports" && (
          <>
            <div style={S.card}>
              <h3 style={S.cardTitle}>
                <Flag size={16} style={{ color: C.orange }} />
                {isRTL ? "الإبلاغات" : "Signalements"}
              </h3>
              <ReportsPanel />
            </div>

            {/* ═══ OUTILS DE MAINTENANCE ═══ */}
            <div style={{ ...S.card, borderColor: "rgba(59,130,246,0.28)" }}>
              <h3 style={S.cardTitle}>
                <Database size={16} style={{ color: "#60a5fa" }} />
                {isRTL ? "أدوات الصيانة" : "Maintenance"}
              </h3>

              <div style={{
                background: "rgba(59,130,246,0.06)",
                border: "1px solid rgba(59,130,246,0.22)",
                borderRadius: 12, padding: 14,
              }}>
                <p style={{ color: "#93c5fd", fontSize: 13, fontWeight: 700, margin: "0 0 6px" }}>
                  {isRTL ? "ترحيل الرسائل" : "Migration des messages"}
                </p>
                <p style={{ color: "#8b7bb8", fontSize: 11.5, margin: "0 0 12px", lineHeight: 1.6 }}>
                  {isRTL
                    ? "أضف حقل المشاركين إلى الرسائل القديمة. شغّله مرة واحدة قبل نشر القاعدة الجديدة — وإلا لن يستطيع أحد قراءة رسائله السابقة."
                    : "Ajoute le champ participants aux anciens messages. À lancer UNE FOIS avant de déployer la nouvelle règle Firestore — sinon plus personne ne pourra lire ses propres messages."}
                </p>

                <button
                  onClick={runMigration}
                  disabled={migrating}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    background: "linear-gradient(135deg, #3B82F6, #2563EB)",
                    color: "white", fontWeight: 700, padding: "11px 20px",
                    borderRadius: 11, border: "none",
                    cursor: migrating ? "not-allowed" : "pointer",
                    fontSize: 13, fontFamily: "inherit",
                    opacity: migrating ? 0.6 : 1,
                  }}
                >
                  {migrating
                    ? <><Loader2 size={15} style={{ animation: "adspin 0.8s linear infinite" }} /> {isRTL ? "جارٍ..." : "Migration..."}</>
                    : <><Database size={15} /> {isRTL ? "تشغيل الترحيل" : "Lancer la migration"}</>}
                </button>

                {migrationResult && (
                  <p style={{
                    color: migrationResult.startsWith("✓") ? "#4ade80" : "#f87171",
                    fontSize: 12.5, margin: "12px 0 0", fontWeight: 600,
                  }}>
                    {migrationResult}
                  </p>
                )}
              </div>
            </div>

            <style>{`@keyframes adspin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}

        {/* ═══════════ MODÉRATION ═══════════ */}
        {tab === "moderation" && (
          <>
            <div style={S.card}>
              <h3 style={S.cardTitle}>
                <ShieldCheck size={16} style={{ color: C.orange }} />
                {isRTL ? "طلبات التوثيق" : "Vérifications en attente"} ({pendingVerifs.length})
              </h3>

              {pendingVerifs.length === 0 ? (
                <p style={S.emptyTxt}>{isRTL ? "لا توجد طلبات ✓" : "Aucune vérification en attente ✓"}</p>
              ) : pendingVerifs.map((v: any) => (
                <div key={v.id} style={{
                  background: "rgba(10,0,20,0.5)", border: "1px solid rgba(251,191,36,0.25)",
                  borderRadius: 14, padding: 15, marginBottom: 11,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                    <div>
                      <div style={{ color: "white", fontWeight: 800, fontSize: 14.5 }}>{v.teacherName}</div>
                      <div style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>
                        {new Date(v.submittedAt).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <span style={S.pill("rgba(251,191,36,0.15)", "#fbbf24")}>
                      ⏳ {isRTL ? "معلق" : "En attente"}
                    </span>
                  </div>

                  {v.bio && <p style={{ color: "#a78bfa", fontSize: 12.5, margin: "0 0 10px", lineHeight: 1.5 }}>{v.bio}</p>}

                  {v.subjects && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 11 }}>
                      {v.subjects.map((s: string) => (
                        <span key={s} style={S.pill("rgba(124,58,237,0.22)", "#d8b4fe")}>{s}</span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 14, marginBottom: 13, flexWrap: "wrap" }}>
                    {v.diplomaURL && <DocLink url={v.diplomaURL} label={isRTL ? "الشهادة" : "Diplôme"} />}
                    {v.cinURL && <DocLink url={v.cinURL} label={isRTL ? "بطاقة الهوية" : "CIN"} />}
                    {v.demoVideoURL && <DocLink url={v.demoVideoURL} label={isRTL ? "فيديو" : "Vidéo"} />}
                  </div>

                  {rejectingId !== v.id ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button onClick={() => handleApprove(v.id, v.teacherId, v.teacherName)}
                        disabled={actionLoading === v.id}
                        style={S.btn("#16a34a", "white")}>
                        <Check size={13} /> {isRTL ? "موافقة" : "Approuver"}
                      </button>
                      <button onClick={() => setRejectingId(v.id)}
                        style={S.btn("transparent", "#f87171", "1px solid rgba(239,68,68,0.4)")}>
                        <X size={13} /> {isRTL ? "رفض" : "Refuser"}
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop: 11, paddingTop: 11, borderTop: "1px solid rgba(124,58,237,0.15)" }}>
                      <input
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder={isRTL ? "سبب الرفض..." : "Raison du refus..."}
                        style={{
                          width: "100%", boxSizing: "border-box",
                          background: "rgba(26,10,60,0.7)", border: "1px solid rgba(124,58,237,0.3)",
                          borderRadius: 10, padding: "10px 12px", fontSize: 13,
                          color: "white", outline: "none", fontFamily: "inherit",
                        }}
                      />
                      <div style={{ display: "flex", gap: 7, marginTop: 8 }}>
                        <button onClick={() => handleReject(v.id, v.teacherId)}
                          disabled={rejectReason.trim().length < 5 || actionLoading === v.id}
                          style={{ ...S.btn("#dc2626", "white"), opacity: rejectReason.trim().length < 5 ? 0.5 : 1 }}>
                          {isRTL ? "تأكيد" : "Confirmer"}
                        </button>
                        <button onClick={() => { setRejectingId(null); setRejectReason(""); }}
                          style={S.btn("transparent", "#a78bfa", "1px solid rgba(124,58,237,0.3)")}>
                          {isRTL ? "إلغاء" : "Annuler"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={S.card}>
              <h3 style={S.cardTitle}>
                <Crown size={16} style={{ color: C.orange }} />
                {isRTL ? "اشتراكات للتفعيل" : "Abonnements à valider"} ({subscriptions.length})
              </h3>

              {subscriptions.length === 0 ? (
                <p style={S.emptyTxt}>{isRTL ? "لا توجد اشتراكات ✓" : "Aucun abonnement en attente ✓"}</p>
              ) : subscriptions.map((s: any) => (
                <div key={s.id} style={{
                  background: "rgba(10,0,20,0.5)", border: "1px solid rgba(251,191,36,0.25)",
                  borderRadius: 14, padding: 15, marginBottom: 11,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ color: "white", fontWeight: 800, fontSize: 14.5 }}>{s.teacherName}</div>
                      <div style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>
                        {new Date(s.createdAt).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <span style={S.pill("rgba(251,191,36,0.15)", "#fbbf24")}>⏳ {isRTL ? "معلق" : "En attente"}</span>
                  </div>

                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                    gap: 11, marginBottom: 13,
                  }}>
                    <Field label={isRTL ? "الخطة" : "Plan"} value={s.plan} />
                    <Field label={isRTL ? "المبلغ" : "Montant"} value={`${fmt(s.amount)} ${DA}`} color={C.orange} />
                    <Field label={isRTL ? "الطريقة" : "Méthode"} value={(s.paymentMethod || "—").toUpperCase()} />
                    <Field label={isRTL ? "المرجع" : "Référence"} value={s.paymentRef || "—"} mono />
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => handleActivateSub(s)} disabled={actionLoading === s.id}
                      style={S.btn("linear-gradient(135deg, #FF8C00, #FF6B00)", "white")}>
                      <Crown size={13} /> {isRTL ? "تفعيل" : "Activer"}
                    </button>
                    <button onClick={() => handleRejectSub(s.id)} disabled={actionLoading === s.id}
                      style={S.btn("transparent", "#f87171", "1px solid rgba(239,68,68,0.4)")}>
                      <X size={13} /> {isRTL ? "رفض" : "Rejeter"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════ Sous-composants ═══════════ */

function KPI({ icon, color, value, label, sub }: any) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: 18,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `${color}22`, color,
        }}>{icon}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "white", fontWeight: 900, fontSize: 21, lineHeight: 1.1, letterSpacing: "-0.5px" }}>{value}</div>
          <div style={{ color: "#a78bfa", fontSize: 12, fontWeight: 600 }}>{label}</div>
        </div>
      </div>
      {sub && (
        <div style={{
          color: C.dim, fontSize: 11, marginTop: 8, paddingTop: 8,
          borderTop: "1px solid rgba(124,58,237,0.15)",
        }}>{sub}</div>
      )}
    </div>
  );
}

function Mini({ icon, value, label, color }: any) {
  return (
    <div style={{
      background: "rgba(20,8,45,0.7)", border: "1px solid rgba(124,58,237,0.18)",
      borderRadius: 13, padding: 13, textAlign: "center",
    }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 7, color }}>{icon}</div>
      <div style={{ color: "white", fontWeight: 900, fontSize: 17 }}>{value}</div>
      <div style={{ color: C.muted, fontSize: 10.5, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Bar({ label, value, max, color }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 11 }}>
      <span style={{
        color: C.soft, fontSize: 12.5, width: 118, flexShrink: 0,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: "rgba(124,58,237,0.12)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(value / max) * 100}%`, background: color, borderRadius: 999 }} />
      </div>
      <span style={{ color: "white", fontSize: 12, fontWeight: 700, width: 32, textAlign: "end", flexShrink: 0 }}>{value}</span>
    </div>
  );
}

function RevCard({ title, color, rows }: any) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${color}44`,
      borderRadius: 16, padding: 18,
    }}>
      <div style={{
        color, fontSize: 12, fontWeight: 800, marginBottom: 14,
        textTransform: "uppercase", letterSpacing: "0.5px",
      }}>{title}</div>
      {rows.map(([label, val]: [string, string], i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
          <span style={{ color: C.muted, fontSize: 12 }}>{label}</span>
          <b style={{ color: i === 0 ? color : "white", fontSize: i === 0 ? 17 : 13.5, fontWeight: 800 }}>{val}</b>
        </div>
      ))}
    </div>
  );
}

function Legend({ color, label }: any) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, color: "#a78bfa", fontSize: 11.5 }}>
      <i style={{ width: 11, height: 11, borderRadius: 3, background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

function DocLink({ url, label }: any) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{
      display: "flex", alignItems: "center", gap: 5,
      color: "#a78bfa", fontSize: 12, textDecoration: "underline", fontWeight: 600,
    }}>
      <Eye size={12} /> {label}
    </a>
  );
}

function Field({ label, value, color, mono }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ color: C.dim, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</span>
      <b style={{
        color: color || "white", fontSize: mono ? 11 : 13,
        fontFamily: mono ? "monospace" : "inherit",
        textTransform: mono ? "none" : "capitalize",
      }}>{value}</b>
    </div>
  );
}
