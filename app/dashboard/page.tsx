"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { getClasses, createClasse, getEnrollmentsByClasse, enrollStudent, getTeacherStats, generateJitsiRoom, autoArchiveFinishedClasses } from "@/lib/firestore";
import { Classe, Enrollment, SUBJECTS, LEVELS, WILAYAS } from "@/lib/types";
import { Plus, Users, Copy, CheckCircle, X, BookOpen, ShieldCheck, MessageCircle, Star, TrendingUp, Zap, Pencil, CopyPlus, BarChart3 } from "lucide-react";
import Link from "next/link";
import { trSubject, trLevel, trWilaya, formatDateLocal } from "@/lib/i18n/translate";
import TeacherRevenue from "@/components/TeacherRevenue";
import BilanDownload from "@/components/BilanDownload";
import CommissionAlert from "@/components/CommissionAlert";
import TeacherProfileForm from "@/components/TeacherProfileForm";
import EnrollmentRequestsPanel from "@/components/EnrollmentRequestsPanel";
import EditClasseModal from "@/components/EditClasseModal";
import SessionsPicker from "@/components/SessionsPicker";
import DuplicateClasseModal from "@/components/DuplicateClasseModal";
import ClasseStats from "@/components/ClasseStats";
import StudentPayments from "@/components/StudentPayments";
import { Reveal, RevealGroup, Sequence, CountUp } from "@/components/Motion";
import { StatsSkeleton, PageLoader, EmptyState } from "@/components/Skeletons";
import Sheet from "@/components/Sheet";
import { useToast } from "@/components/Toast";
import { haptic } from "@/lib/haptics";
import { toAbsoluteISO } from "@/lib/course-access";
import ResponseBadge from "@/components/ResponseBadge";
import ProgressTracker from "@/components/ProgressTracker";
import AttendanceReport from "@/components/AttendanceReport";

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  // Un chiffre qui monte attire l'œil là où un chiffre posé ne dit
  // rien. On n'anime que les valeurs numériques pures — « 87 % »
  // resterait figé sinon.
  const numeric = typeof value === "number";

  return (
    <div className="os-glass-2 os-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '28px', fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-0.6px' }}>
          {numeric ? <CountUp to={value as number} /> : value}
        </div>
        <div style={{ fontSize: '13px', color: '#a78bfa', marginTop: '4px' }}>{label}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { isRTL } = useLang();
  const router = useRouter();
  const toast = useToast();
  const [classes, setClasses] = useState<Classe[]>([]);
  const [stats, setStats] = useState({ totalClasses: 0, totalStudents: 0, totalAttendance: 0, attendanceRate: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClasse, setSelectedClasse] = useState<Classe | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"cours" | "stats" | "revenus" | "profil">("cours");
  const [editingClasse, setEditingClasse] = useState<Classe | null>(null);
  const [duplicating, setDuplicating] = useState<Classe | null>(null);

  const [form, setForm] = useState({
    title: "", subject: SUBJECTS[0], level: LEVELS[0], dateTime: "",
    durationMinutes: 60, price: 500, priceType: "session" as "session" | "monthly",
    description: "", whatsapp: "", wilaya: "Alger",
    maxStudents: undefined as number | undefined,
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<string[]>([]);
  const [addPhone, setAddPhone] = useState("");
  const [addName, setAddName] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "teacher")) router.push("/auth");
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (user && profile?.role === "teacher") loadData();
  }, [user, profile]);

  async function loadData() {
    setLoadingData(true);
    try {
      await autoArchiveFinishedClasses();
      const [cls, st] = await Promise.all([
        getClasses({ teacherId: user!.uid }),
        getTeacherStats(user!.uid),
      ]);
      setClasses(cls);
      setStats(st);
    } finally {
      setLoadingData(false);
    }
  }

  async function handleCreate() {
    setCreateError(null);
    const isMonthly = form.priceType === "monthly";

    if (!form.title) return;

    // Un cours mensuel se définit par ses séances, pas par une date unique
    if (isMonthly) {
      if (sessions.length === 0) {
        setCreateError(
          isRTL
            ? "حدّد موعد حصة واحدة على الأقل."
            : "Définissez au moins une séance."
        );
        return;
      }
    } else if (!form.dateTime) {
      return;
    }

    setCreating(true);
    try {
      const jitsiRoom = generateJitsiRoom(profile!.displayName, form.title);
      await createClasse({
        ...form,
        /**
         * ⚠️ Normalisation obligatoire.
         *
         * Un <input type="datetime-local"> renvoie « 2026-08-18T17:00 »,
         * sans fuseau. Stockée telle quelle, cette chaîne était lue
         * comme heure locale par le navigateur du prof (Algérie) mais
         * comme UTC par le serveur Vercel — une heure d'écart, et la
         * salle qui refusait d'ouvrir à l'heure dite.
         *
         * On convertit en instant absolu avant d'écrire. Plus aucune
         * ambiguïté possible, où que le code s'exécute.
         */
        dateTime: isMonthly ? sessions[0] : toAbsoluteISO(form.dateTime),
        // Firestore rejette `undefined` : on omet le champ au lieu
        // de l'envoyer vide pour les cours à la séance
        ...(isMonthly ? { sessions } : {}),
        // Firestore rejette undefined — on omet le champ s'il est vide
        ...(form.maxStudents ? { maxStudents: form.maxStudents } : {}),
        teacherId: user!.uid,
        teacherName: profile!.displayName,
        // Photo dupliquée ici pour éviter une lecture Firestore
        // supplémentaire à chaque affichage de carte de cours
        teacherPhoto: (profile as any)?.photoURL || "",
        // Un prof jamais noté a rating undefined — Firestore le refuse
        teacherRating: profile?.rating ?? 0,
        jitsiRoom,
        enrolledCount: 0,
        attendanceCount: 0,
        viewCount: 0,
        status: "scheduled",
        createdAt: new Date().toISOString(),
      });
      setShowCreateModal(false);
      toast.success(isRTL ? "تم إنشاء الدرس" : "Cours créé");
      setForm({ title: "", subject: SUBJECTS[0], level: LEVELS[0], dateTime: "", durationMinutes: 60, price: 500, priceType: "session", description: "", whatsapp: "", wilaya: "Alger", maxStudents: undefined });
      setSessions([]);
      await loadData();
    } catch (err: any) {
      // Sans catch, un échec fermait le modal comme si tout allait bien
      console.error("Création du cours échouée :", err);
      const msg = err?.code === "permission-denied"
        ? (isRTL ? "ليست لديك صلاحية إنشاء درس." : "Vous n'avez pas le droit de créer un cours.")
        : (isRTL ? "فشل إنشاء الدرس. حاول مرة أخرى." : "Échec de la création. Réessayez.");
      setCreateError(msg);
      toast.error(msg);
      return;
    } finally {
      setCreating(false);
    }
  }

  async function openStudents(classe: Classe) {
    setSelectedClasse(classe);
    const enr = await getEnrollmentsByClasse(classe.id);
    setEnrollments(enr);
    setAddError(""); setAddPhone(""); setAddName("");
  }

  async function handleAddStudent() {
    if (!addPhone || !addName || !selectedClasse) { setAddError(isRTL ? "الاسم والهاتف مطلوبان." : "Nom et téléphone requis."); return; }
    setAddingStudent(true);
    setAddError("");
    try {
      await enrollStudent({
        classeId: selectedClasse.id,
        studentId: addPhone,
        studentName: addName,
        studentPhone: addPhone,
        addedByTeacher: true,
        attended: false,
        enrolledAt: new Date().toISOString(),
      });
      const enr = await getEnrollmentsByClasse(selectedClasse.id);
      setEnrollments(enr);
      setAddPhone(""); setAddName("");
      toast.success(isRTL ? "تمت إضافة الطالب" : "Élève ajouté");
      await loadData();
    } catch { setAddError(isRTL ? "خطأ أثناء الإضافة." : "Erreur lors de l'ajout."); }
    finally { setAddingStudent(false); }
  }

  function copyLink(id: string) {
    navigator.clipboard.writeText(`${window.location.origin}/classe/${id}`);
    haptic("success");
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function formatDate(iso: string) {
    return formatDateLocal(iso, isRTL);
  }

  if (loading || loadingData) return (
    <div style={{ minHeight: '100vh', padding: '32px 16px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div className="os-skeleton" style={{ height: 30, width: 240, marginBottom: 28 }} />
        <StatsSkeleton count={4} />
      </div>
    </div>
  );

  const inputStyle = { width: '100%', background: '#1A0A3C', border: '1px solid rgba(88,28,135,0.5)', borderRadius: '12px', padding: '12px', fontSize: '14px', color: 'white', outline: 'none', boxSizing: 'border-box' as const };
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(196,181,253,0.8)', marginBottom: '6px' };
  const smallBtn = { display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(168,85,247,0.4)', color: '#c4b5fd', background: 'transparent', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit' };

  return (
    // Sans `dir`, la mise en page reste en sens français même quand
    // l'interface passe en arabe : les marges, les alignements et les
    // icônes directionnelles pointent du mauvais côté.
    <div style={{ minHeight: '100vh' }} dir={isRTL ? 'rtl' : 'ltr'}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px' }}>

        {/* Header */}
        <Sequence>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF8C00', boxShadow: '0 0 10px #FF8C00' }} />
              <span style={{ color: '#a78bfa', fontSize: '13px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
                {isRTL ? "لوحة الأستاذ" : "Dashboard Professeur"}
              </span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'white', margin: 0, letterSpacing: '-0.6px' }}>
              {isRTL ? "مرحباً، " : "Bonjour, "}
              <span style={{ color: '#FF8C00' }}>{profile?.displayName}</span> 👋
            </h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="os-btn-chalk"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', fontSize: '14px' }}
          >
            <Plus style={{ width: '18px', height: '18px' }} />
            {isRTL ? "درس جديد" : "Nouveau cours"}
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <StatCard label={isRTL ? "دروس منشأة" : "Cours créés"} value={stats.totalClasses} icon={<BookOpen style={{ width: '22px', height: '22px', color: '#a78bfa' }} />} color="rgba(88,28,135,0.5)" />
          <StatCard label={isRTL ? "طلاب مسجّلون" : "Élèves inscrits"} value={stats.totalStudents} icon={<Users style={{ width: '22px', height: '22px', color: '#60a5fa' }} />} color="rgba(29,78,216,0.3)" />
          <StatCard label={isRTL ? "الحضور" : "Présences"} value={stats.totalAttendance} icon={<CheckCircle style={{ width: '22px', height: '22px', color: '#34d399' }} />} color="rgba(6,78,59,0.4)" />
          <StatCard label={isRTL ? "نسبة الحضور" : "Taux présence"} value={`${stats.attendanceRate}%`} icon={<TrendingUp style={{ width: '22px', height: '22px', color: '#FF8C00' }} />} color="rgba(194,65,12,0.3)" />
        </div>
        </Sequence>

        {/* Banners */}
        {!profile?.subscriptionActive && (
          <div style={{ background: 'linear-gradient(135deg, rgba(255,140,0,0.15), rgba(88,28,135,0.2))', border: '1px solid rgba(255,140,0,0.3)', borderRadius: '16px', padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Star style={{ width: '24px', height: '24px', color: '#FF8C00', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: 'white', fontSize: '15px' }}>
                  {isRTL ? "اشترك كأستاذ مميز ⭐" : "Passez en Abonnement Professeur ⭐"}
                </div>
                <div style={{ fontSize: '13px', color: '#a78bfa', marginTop: '2px' }}>
                  {isRTL
                    ? "تظهر في مقدّمة القائمة وتنشئ دروساً غير محدودة — 2000 دج/شهر"
                    : "Apparaissez en tête de liste et créez des cours illimités — 2 000 DA/mois"}
                </div>
              </div>
            </div>
            <Link href="/abonnement" style={{ background: '#FF8C00', color: 'white', fontWeight: 700, padding: '10px 18px', borderRadius: '12px', textDecoration: 'none', fontSize: '14px', flexShrink: 0 }}>
              {isRTL ? "← اشترك" : "S'abonner →"}
            </Link>
          </div>
        )}

        {profile?.verificationStatus !== "approved" && !profile?.diplomaVerified && (
          <div style={{ background: 'rgba(88,28,135,0.2)', border: '1px solid rgba(88,28,135,0.4)', borderRadius: '16px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShieldCheck style={{ width: '24px', height: '24px', color: '#a78bfa', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: 'white', fontSize: '15px' }}>
                  {profile?.verificationStatus === "pending"
                    ? (isRTL ? "التوثيق جارٍ ⏳" : "Vérification en cours ⏳")
                    : (isRTL ? "وثّق ملفك" : "Faites vérifier votre profil")}
                </div>
                <div style={{ fontSize: '13px', color: '#a78bfa', marginTop: '2px' }}>
                  {profile?.verificationStatus === "pending"
                    ? (isRTL ? "ملفك قيد المراجعة." : "Votre dossier est en cours d'examen.")
                    : (isRTL ? "شارة التوثيق + أولوية في النتائج" : "Badge vérifié + priorité dans les résultats")}
                </div>
              </div>
            </div>
            {profile?.verificationStatus !== "pending" && (
              <Link href="/verification" style={{ border: '1px solid rgba(168,85,247,0.5)', color: '#c4b5fd', fontWeight: 700, padding: '10px 18px', borderRadius: '12px', textDecoration: 'none', fontSize: '14px', flexShrink: 0 }}>
                {isRTL ? "← وثّق" : "Vérifier →"}
              </Link>
            )}
          </div>
        )}

        {/* ═══ SOLDE DE COMMISSION ═══
            Placé avant les onglets : le professeur le voit à chaque
            connexion, sans avoir à chercher dans l'onglet Revenus. */}
        {user && <CommissionAlert teacherId={user.uid} />}

        {/* ═══ TABS ═══ */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', borderBottom: '1px solid rgba(88,28,135,0.3)', paddingBottom: '2px', flexWrap: 'wrap' }}>
          {[
            { id: "cours", label: isRTL ? "📚 دروسي" : "📚 Mes cours", count: classes.length },
            { id: "stats", label: isRTL ? "📊 الأداء" : "📊 Performance", count: null },
            { id: "revenus", label: isRTL ? "💰 الإيرادات" : "💰 Revenus", count: null },
            { id: "profil", label: isRTL ? "👤 ملفي" : "👤 Mon profil", count: null },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { haptic("select"); setActiveTab(tab.id as any); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 16px', fontSize: '13.5px', fontWeight: 700,
                color: activeTab === tab.id ? '#FF8C00' : '#a78bfa',
                borderBottom: activeTab === tab.id ? '2px solid #FF8C00' : '2px solid transparent',
                marginBottom: '-2px', transition: 'all 0.2s ease', fontFamily: 'inherit',
              }}
            >
              {tab.label} {tab.count !== null && <span style={{ opacity: 0.7 }}>({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* ═══ TAB: COURS ═══ */}
        {activeTab === "cours" && (
          <>
            {/* Réactivité — le professeur voit son propre score.
                C'est ce qui change le comportement, pas le chiffre. */}
            {user && (
              <div style={{ marginBottom: '16px' }}>
                <ResponseBadge teacherId={user.uid} variant="self" />
              </div>
            )}
            {user && <EnrollmentRequestsPanel teacherId={user.uid} />}
            {classes.length === 0 ? (
              <EmptyState
                icon={<BookOpen size={28} />}
                title={isRTL ? "لم تنشئ أي درس بعد" : "Vous n'avez pas encore créé de cours"}
                hint={isRTL
                  ? "أول درس يستغرق دقيقتين. الطلاب لن يجدوك قبل ذلك."
                  : "Le premier prend deux minutes. Les élèves ne peuvent pas vous trouver avant."}
                action={
                  <button onClick={() => setShowCreateModal(true)} className="os-btn-chalk" style={{ padding: '11px 22px', fontSize: '13.5px' }}>
                    Créer mon premier cours
                  </button>
                }
              />
            ) : (
              <RevealGroup className="os-stack">
                {classes.map((c) => (
                  <div key={c.id} className="os-glass-2 os-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ width: '4px', height: '60px', borderRadius: '4px', background: c.status === 'live' ? '#ef4444' : '#FF8C00', flexShrink: 0 }} />

                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span style={{ background: 'rgba(88,28,135,0.5)', color: '#c4b5fd', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px', border: '1px solid rgba(126,34,206,0.4)' }}>{trSubject(c.subject, isRTL)}</span>
                        <span style={{ background: 'rgba(29,78,216,0.2)', color: '#93c5fd', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px' }}>{trLevel(c.level, isRTL)}</span>
                        {(c as any).sessions?.length > 1 && (
                          <span style={{ background: 'rgba(255,140,0,0.15)', color: '#fdba74', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px' }}>
                            📅 {(c as any).sessions.length} {isRTL ? "حصص" : "séances"}
                          </span>
                        )}
                        {c.status === 'live' && <span style={{ background: 'rgba(127,29,29,0.4)', color: '#fca5a5', fontSize: '11px', padding: '3px 10px', borderRadius: '999px', animation: 'pulse 2s infinite' }}>🔴 Live</span>}
                      </div>
                      <div style={{ fontWeight: 700, color: 'white', fontSize: '15px', marginBottom: '4px' }}>{c.title}</div>
                      <div style={{ fontSize: '12px', color: '#a78bfa' }}>
                        {formatDate(c.dateTime)} · {c.durationMinutes} min · <span style={{ color: '#FF8C00', fontWeight: 700 }}>{c.price.toLocaleString()} DA</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6d28d9', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span>👥 {c.enrolledCount} {isRTL ? "مسجّل" : "inscrits"}</span>
                        <span>✅ {c.attendanceCount} {isRTL ? "حاضر" : "présents"}</span>
                        {((c as any).viewCount ?? 0) > 0 && <span>👁 {(c as any).viewCount} {isRTL ? "مشاهدة" : "vues"}</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Link
                        href={`/classe/${c.id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: c.status === 'live' ? '#ef4444' : '#FF8C00', color: 'white', padding: '8px 16px', borderRadius: '10px', textDecoration: 'none', fontSize: '13px', fontWeight: 700, boxShadow: c.status === 'live' ? '0 0 15px rgba(239,68,68,0.4)' : '0 0 15px rgba(255,140,0,0.3)' }}
                      >
                        {c.status === 'live'
                          ? (isRTL ? '🔴 مباشر' : '🔴 En direct')
                          : (isRTL ? '▶ ابدأ' : '▶ Démarrer')}
                      </Link>
                      <button onClick={() => setEditingClasse(c)} style={smallBtn}>
                        <Pencil style={{ width: '14px', height: '14px' }} /> {isRTL ? "تعديل" : "Modifier"}
                      </button>
                      {/* Reconduction — reprend tout sauf les dates */}
                      <button onClick={() => setDuplicating(c)} style={smallBtn} title={isRTL ? "إعادة نشر" : "Reconduire"}>
                        <CopyPlus style={{ width: '14px', height: '14px' }} /> {isRTL ? "إعادة نشر" : "Reconduire"}
                      </button>
                      <button onClick={() => openStudents(c)} style={smallBtn}>
                        <Users style={{ width: '14px', height: '14px' }} /> {isRTL ? "الطلاب" : "Élèves"}
                      </button>
                      <Link href={`/chat/${c.id}`} style={{ ...smallBtn, textDecoration: 'none' }}>
                        <MessageCircle style={{ width: '14px', height: '14px' }} /> {isRTL ? "محادثة" : "Chat"}
                      </Link>
                      <button
                        onClick={() => copyLink(c.id)}
                        style={{ ...smallBtn, color: copied === c.id ? '#34d399' : '#c4b5fd', background: copied === c.id ? 'rgba(6,78,59,0.3)' : 'transparent', transition: '0.2s' }}
                      >
                        {copied === c.id ? <CheckCircle style={{ width: '14px', height: '14px' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
                        {copied === c.id
                          ? (isRTL ? 'تم النسخ!' : 'Copié !')
                          : (isRTL ? 'رابط' : 'Lien')}
                      </button>
                    </div>
                  </div>
                ))}
              </RevealGroup>
            )}
          </>
        )}

        {/* ═══ TAB: PERFORMANCE ═══ */}
        {activeTab === "stats" && user && (
          <div style={{ background: '#110225', border: '1px solid rgba(88,28,135,0.4)', borderRadius: '16px', padding: '20px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '9px', color: 'white', fontWeight: 800, fontSize: '15px', margin: '0 0 4px' }}>
              <BarChart3 style={{ width: '17px', height: '17px', color: '#FF8C00' }} />
              {isRTL ? "أداء إعلاناتك" : "Performance de vos annonces"}
            </h2>
            <p style={{ color: '#6d28d9', fontSize: '11.5px', margin: '0 0 16px' }}>
              {isRTL
                ? "من المشاهدة إلى التسجيل — اعرف أين تفقد الطلاب."
                : "De la vue à l'inscription — voyez où vous perdez des élèves."}
            </p>
            <ClasseStats teacherId={user.uid} />
          </div>
        )}

        {/* ═══ TAB: REVENUS ═══ */}
        {activeTab === "revenus" && user && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <TeacherRevenue teacherId={user.uid} />
            {profile && (
              <BilanDownload
                teacherId={user.uid}
                teacherName={profile.displayName}
              />
            )}
          </div>
        )}

        {/* ═══ TAB: PROFIL ═══ */}
        {activeTab === "profil" && user && profile && (
          <TeacherProfileForm
            uid={user.uid}
            currentData={{
              photoURL: (profile as any).photoURL,
              wilaya: profile.wilaya,
              diploma: (profile as any).diploma,
              university: (profile as any).university,
              yearsExperience: (profile as any).yearsExperience,
              bio: (profile as any).bio,
            }}
            onSaved={refreshProfile}
          />
        )}
      </div>

      {/* ═══ CRÉATION — feuille glissante ═══
          Sur mobile, elle se saisit par le haut et suit le doigt.
          Un formulaire long dans un modal centré oblige à viser une
          petite croix ; ici, un geste vers le bas suffit. */}
      <Sheet
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={isRTL ? "إنشاء درس" : "Créer un cours"}
        subtitle={isRTL ? "املأ معلومات الدرس" : "Remplissez les informations du cours"}
      >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>{isRTL ? "عنوان الدرس *" : "Titre du cours *"}</label>
                <input style={inputStyle} placeholder={isRTL ? "مثال: مراجعة بكالوريا رياضيات" : "Ex: Révision Bac Maths série S"} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>{isRTL ? "المادة" : "Matière"}</label>
                  <select style={inputStyle} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                    {SUBJECTS.map(s => <option key={s} value={s} style={{ background: '#1A0A3C' }}>{trSubject(s, isRTL)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{isRTL ? "المستوى" : "Niveau"}</label>
                  <select style={inputStyle} value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
                    {LEVELS.map(l => <option key={l} value={l} style={{ background: '#1A0A3C' }}>{trLevel(l, isRTL)}</option>)}
                  </select>
                </div>
              </div>
              {form.priceType !== "monthly" && (
                <div>
                  <label style={labelStyle}>{isRTL ? "التاريخ والوقت *" : "Date et heure *"}</label>
                  <input style={inputStyle} type="datetime-local" value={form.dateTime} onChange={e => setForm(f => ({ ...f, dateTime: e.target.value }))} />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>{isRTL ? "المدة (د)" : "Durée (min)"}</label>
                  <input style={inputStyle} type="number" value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: +e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>{isRTL ? "السعر (دج)" : "Prix (DA)"}</label>
                  <input style={inputStyle} type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>{isRTL ? "نوع السعر" : "Type de prix"}</label>
                  <select style={inputStyle} value={form.priceType} onChange={e => setForm(f => ({ ...f, priceType: e.target.value as "session" | "monthly" }))}>
                    <option value="session" style={{ background: '#1A0A3C' }}>{isRTL ? "بالحصة" : "Par séance"}</option>
                    <option value="monthly" style={{ background: '#1A0A3C' }}>{isRTL ? "بالشهر" : "Par mois"}</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{isRTL ? "الولاية" : "Wilaya"}</label>
                  <select style={inputStyle} value={form.wilaya} onChange={e => setForm(f => ({ ...f, wilaya: e.target.value }))}>
                    {WILAYAS.map(w => <option key={w} value={w} style={{ background: '#1A0A3C' }}>{trWilaya(w, isRTL)}</option>)}
                  </select>
                </div>
              </div>
              {form.priceType === "monthly" && (
                <div>
                  <label style={labelStyle}>
                    {isRTL ? "مواعيد الحصص *" : "Dates des séances *"}
                  </label>
                  <p style={{ color: '#6d28d9', fontSize: '11px', margin: '0 0 8px', lineHeight: 1.5 }}>
                    {isRTL
                      ? "يسجّل الطالب مرة واحدة ويحضر كل الحصص."
                      : "L'élève s'inscrit une seule fois et accède à toutes les séances."}
                  </p>
                  <SessionsPicker value={sessions} onChange={setSessions} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>WhatsApp</label>
                  <input style={inputStyle} placeholder="213XXXXXXXXX" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>
                    {isRTL ? "عدد المقاعد" : "Places disponibles"}
                  </label>
                  <input
                    style={inputStyle}
                    type="number"
                    min={1}
                    placeholder={isRTL ? "بدون حد" : "Sans limite"}
                    value={form.maxStudents ?? ""}
                    onChange={e => setForm(f => ({
                      ...f,
                      maxStudents: e.target.value ? Number(e.target.value) : undefined,
                    }))}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>{isRTL ? "الوصف" : "Description"}</label>
                <textarea style={{ ...inputStyle, resize: 'none' }} rows={3} placeholder={isRTL ? "صف درسك..." : "Décrivez votre cours..."} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              {createError && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '9px',
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '12px', padding: '11px 13px',
                }}>
                  <span style={{ color: '#f87171', flexShrink: 0, fontSize: '14px', lineHeight: 1.2 }}>⚠</span>
                  <span style={{ color: '#fca5a5', fontSize: '12.5px', flex: 1, lineHeight: 1.5 }}>
                    {createError}
                  </span>
                  <button
                    onClick={() => setCreateError(null)}
                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, fontSize: '13px' }}
                  >✕</button>
                </div>
              )}
              <button
                onClick={handleCreate}
                disabled={creating || !form.title || (form.priceType === "monthly" ? sessions.length === 0 : !form.dateTime)}
                style={{ width: '100%', background: creating || !form.title || (form.priceType === "monthly" ? sessions.length === 0 : !form.dateTime) ? 'rgba(255,140,0,0.4)' : '#FF8C00', color: 'white', fontWeight: 800, padding: '14px', borderRadius: '14px', border: 'none', cursor: creating ? 'not-allowed' : 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {creating ? (
                  <><div style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> {isRTL ? "جارٍ الإنشاء..." : "Création..."}</>
                ) : (
                  <><Zap style={{ width: '16px', height: '16px' }} /> {isRTL ? "إنشاء الدرس" : "Créer le cours"}</>
                )}
              </button>
            </div>
      </Sheet>

      {/* ═══ ÉLÈVES ET PAIEMENTS ═══ */}
      <Sheet
        open={!!selectedClasse}
        onClose={() => setSelectedClasse(null)}
        title={isRTL ? "الطلاب والمدفوعات" : "Élèves & paiements"}
        subtitle={selectedClasse?.title}
      >
        {selectedClasse && (
          <>

            {/* ═══ SUIVI DES ENCAISSEMENTS ═══ */}
            <div style={{ marginBottom: '16px' }}>
              <StudentPayments
                classeId={selectedClasse.id}
                classePrice={selectedClasse.price}
                classeTitle={selectedClasse.title}
              />
            </div>

            {/* ═══ PRÉSENCE RÉELLE ═══
                Qui est venu, combien de temps. Ce que « présent »
                ne disait pas. */}
            <div style={{ marginBottom: '16px' }}>
              <AttendanceReport
                classeId={selectedClasse.id}
                classeDuration={selectedClasse.durationMinutes}
                isTeacher={true}
              />
            </div>

            {/* ═══ SUIVI DE PROGRESSION ═══
                Ce qui donne au parent une raison concrète de renouveler. */}
            {user && (
              <div style={{ marginBottom: '20px' }}>
                <ProgressTracker
                  classeId={selectedClasse.id}
                  teacherId={user.uid}
                  isTeacher={true}
                />
              </div>
            )}

            {/* ═══ AJOUT MANUEL ═══ */}
            <div style={{ background: 'rgba(255,140,0,0.1)', border: '1px solid rgba(255,140,0,0.3)', borderRadius: '14px', padding: '16px' }}>
              <p style={{ fontSize: '12px', color: '#fdba74', marginBottom: '12px', fontWeight: 600 }}>
                {isRTL
                  ? "⚠️ بإضافة طالب، تؤكّد أنك استلمت دفعته."
                  : "⚠️ En ajoutant un élève, vous confirmez avoir reçu son paiement."}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input style={inputStyle} placeholder={isRTL ? "اسم الطالب" : "Nom de l'élève"} value={addName} onChange={e => setAddName(e.target.value)} />
                <input style={inputStyle} placeholder={isRTL ? "رقم الهاتف" : "Numéro de téléphone"} value={addPhone} onChange={e => setAddPhone(e.target.value)} />
                {addError && <p style={{ color: '#f87171', fontSize: '12px', margin: 0 }}>{addError}</p>}
                <button
                  onClick={handleAddStudent}
                  disabled={addingStudent}
                  style={{ background: '#FF8C00', color: 'white', fontWeight: 700, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                >
                  {addingStudent
                    ? (isRTL ? "جارٍ الإضافة..." : "Ajout...")
                    : (isRTL ? "+ إضافة الطالب" : "+ Ajouter l'élève")}
                </button>
              </div>
            </div>
          </>
        )}
      </Sheet>

      {/* Edit / Delete modal */}
      {editingClasse && (
        <EditClasseModal
          classe={editingClasse}
          onClose={() => setEditingClasse(null)}
          onSaved={loadData}
          onDeleted={loadData}
        />
      )}

      {/* Reconduction */}
      {duplicating && (
        <DuplicateClasseModal
          classe={duplicating}
          onClose={() => setDuplicating(null)}
          onDone={loadData}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
