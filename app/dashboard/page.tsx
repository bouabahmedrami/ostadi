"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getClasses, createClasse, getEnrollmentsByClasse, enrollStudent, getTeacherStats, generateJitsiRoom } from "@/lib/firestore";
import { Classe, Enrollment, SUBJECTS, LEVELS, WILAYAS } from "@/lib/types";
import { Plus, Users, BarChart2, Copy, CheckCircle, X, BookOpen, ShieldCheck, MessageCircle, Star, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";
import TeacherRevenue from "@/components/TeacherRevenue";
import TeacherProfileForm from "@/components/TeacherProfileForm";

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div style={{ background: '#110225', border: '1px solid rgba(88,28,135,0.4)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '28px', fontWeight: 900, color: 'white', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '13px', color: '#a78bfa', marginTop: '4px' }}>{label}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<Classe[]>([]);
  const [stats, setStats] = useState({ totalClasses: 0, totalStudents: 0, totalAttendance: 0, attendanceRate: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClasse, setSelectedClasse] = useState<Classe | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"cours" | "revenus" | "profil">("cours");

  const [form, setForm] = useState({
    title: "", subject: SUBJECTS[0], level: LEVELS[0], dateTime: "",
    durationMinutes: 60, price: 500, priceType: "session" as "session" | "monthly",
    description: "", whatsapp: "", wilaya: "Alger",
  });
  const [creating, setCreating] = useState(false);
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
    if (!form.title || !form.dateTime) return;
    setCreating(true);
    try {
      const jitsiRoom = generateJitsiRoom(profile!.displayName, form.title);
      await createClasse({
        ...form,
        teacherId: user!.uid,
        teacherName: profile!.displayName,
        teacherRating: profile?.rating,
        jitsiRoom,
        enrolledCount: 0,
        attendanceCount: 0,
        status: "scheduled",
        createdAt: new Date().toISOString(),
      });
      setShowCreateModal(false);
      setForm({ title: "", subject: SUBJECTS[0], level: LEVELS[0], dateTime: "", durationMinutes: 60, price: 500, priceType: "session", description: "", whatsapp: "", wilaya: "Alger" });
      await loadData();
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
    if (!addPhone || !addName || !selectedClasse) { setAddError("Nom et téléphone requis."); return; }
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
      await loadData();
    } catch { setAddError("Erreur lors de l'ajout."); }
    finally { setAddingStudent(false); }
  }

  function copyLink(jitsiRoom: string, id: string) {
    navigator.clipboard.writeText(`https://meet.jit.si/${jitsiRoom}`);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-DZ", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  if (loading || loadingData) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#a78bfa', background: '#0D0118' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #FF8C00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p>Chargement...</p>
      </div>
    </div>
  );

  const inputStyle = { width: '100%', background: '#1A0A3C', border: '1px solid rgba(88,28,135,0.5)', borderRadius: '12px', padding: '12px', fontSize: '14px', color: 'white', outline: 'none', boxSizing: 'border-box' as const };
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(196,181,253,0.8)', marginBottom: '6px' };

  return (
    <div style={{ background: '#0D0118', minHeight: '100vh', backgroundImage: 'linear-gradient(rgba(168,85,247,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF8C00', boxShadow: '0 0 10px #FF8C00' }} />
              <span style={{ color: '#a78bfa', fontSize: '13px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>Dashboard Professeur</span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'white', margin: 0 }}>
              Bonjour, <span style={{ color: '#FF8C00' }}>{profile?.displayName}</span> 👋
            </h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FF8C00', color: 'white', fontWeight: 700, padding: '12px 20px', borderRadius: '14px', border: 'none', cursor: 'pointer', fontSize: '14px', boxShadow: '0 0 20px rgba(255,140,0,0.3)' }}
          >
            <Plus style={{ width: '18px', height: '18px' }} />
            Nouveau cours
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <StatCard label="Cours créés" value={stats.totalClasses} icon={<BookOpen style={{ width: '22px', height: '22px', color: '#a78bfa' }} />} color="rgba(88,28,135,0.5)" />
          <StatCard label="Élèves inscrits" value={stats.totalStudents} icon={<Users style={{ width: '22px', height: '22px', color: '#60a5fa' }} />} color="rgba(29,78,216,0.3)" />
          <StatCard label="Présences" value={stats.totalAttendance} icon={<CheckCircle style={{ width: '22px', height: '22px', color: '#34d399' }} />} color="rgba(6,78,59,0.4)" />
          <StatCard label="Taux présence" value={`${stats.attendanceRate}%`} icon={<TrendingUp style={{ width: '22px', height: '22px', color: '#FF8C00' }} />} color="rgba(194,65,12,0.3)" />
        </div>

        {/* Banners */}
        {!profile?.subscriptionActive && (
          <div style={{ background: 'linear-gradient(135deg, rgba(255,140,0,0.15), rgba(88,28,135,0.2))', border: '1px solid rgba(255,140,0,0.3)', borderRadius: '16px', padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Star style={{ width: '24px', height: '24px', color: '#FF8C00', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: 'white', fontSize: '15px' }}>Passez en Abonnement Professeur ⭐</div>
                <div style={{ fontSize: '13px', color: '#a78bfa', marginTop: '2px' }}>Apparaissez en tête de liste et créez des cours illimités — 2 000 DA/mois</div>
              </div>
            </div>
            <Link href="/abonnement" style={{ background: '#FF8C00', color: 'white', fontWeight: 700, padding: '10px 18px', borderRadius: '12px', textDecoration: 'none', fontSize: '14px', flexShrink: 0 }}>
              S'abonner →
            </Link>
          </div>
        )}

        {profile?.verificationStatus !== "approved" && !profile?.diplomaVerified && (
          <div style={{ background: 'rgba(88,28,135,0.2)', border: '1px solid rgba(88,28,135,0.4)', borderRadius: '16px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShieldCheck style={{ width: '24px', height: '24px', color: '#a78bfa', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: 'white', fontSize: '15px' }}>
                  {profile?.verificationStatus === "pending" ? "Vérification en cours ⏳" : "Faites vérifier votre profil"}
                </div>
                <div style={{ fontSize: '13px', color: '#a78bfa', marginTop: '2px' }}>
                  {profile?.verificationStatus === "pending" ? "Votre dossier est en cours d'examen." : "Badge vérifié + priorité dans les résultats"}
                </div>
              </div>
            </div>
            {profile?.verificationStatus !== "pending" && (
              <Link href="/verification" style={{ border: '1px solid rgba(168,85,247,0.5)', color: '#c4b5fd', fontWeight: 700, padding: '10px 18px', borderRadius: '12px', textDecoration: 'none', fontSize: '14px', flexShrink: 0 }}>
                Vérifier →
              </Link>
            )}
          </div>
        )}

        {/* ═══ TABS ═══ */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', borderBottom: '1px solid rgba(88,28,135,0.3)', paddingBottom: '2px' }}>
          {[
            { id: "cours", label: "📚 Mes cours", count: classes.length },
            { id: "revenus", label: "💰 Revenus", count: null },
            { id: "profil", label: "👤 Mon profil", count: null },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 16px', fontSize: '13.5px', fontWeight: 700,
                color: activeTab === tab.id ? '#FF8C00' : '#a78bfa',
                borderBottom: activeTab === tab.id ? '2px solid #FF8C00' : '2px solid transparent',
                marginBottom: '-2px', transition: 'all 0.2s ease',
              }}
            >
              {tab.label} {tab.count !== null && <span style={{ opacity: 0.7 }}>({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* ═══ TAB: COURS ═══ */}
        {activeTab === "cours" && (
          <>
            {classes.length === 0 ? (
              <div style={{ background: '#110225', border: '1px solid rgba(88,28,135,0.4)', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
                <BookOpen style={{ width: '40px', height: '40px', color: '#4c1d95', margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ color: '#a78bfa', margin: '0 0 16px' }}>Aucun cours encore.</p>
                <button onClick={() => setShowCreateModal(true)} style={{ background: '#FF8C00', color: 'white', fontWeight: 700, padding: '10px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer' }}>
                  Créer mon premier cours
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {classes.map((c) => (
                  <div key={c.id} style={{ background: '#110225', border: '1px solid rgba(88,28,135,0.4)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ width: '4px', height: '60px', borderRadius: '4px', background: c.status === 'live' ? '#ef4444' : '#FF8C00', flexShrink: 0 }} />

                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span style={{ background: 'rgba(88,28,135,0.5)', color: '#c4b5fd', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px', border: '1px solid rgba(126,34,206,0.4)' }}>{c.subject}</span>
                        <span style={{ background: 'rgba(29,78,216,0.2)', color: '#93c5fd', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '999px' }}>{c.level}</span>
                        {c.status === 'live' && <span style={{ background: 'rgba(127,29,29,0.4)', color: '#fca5a5', fontSize: '11px', padding: '3px 10px', borderRadius: '999px', animation: 'pulse 2s infinite' }}>🔴 Live</span>}
                      </div>
                      <div style={{ fontWeight: 700, color: 'white', fontSize: '15px', marginBottom: '4px' }}>{c.title}</div>
                      <div style={{ fontSize: '12px', color: '#a78bfa' }}>
                        {formatDate(c.dateTime)} · {c.durationMinutes} min · <span style={{ color: '#FF8C00', fontWeight: 700 }}>{c.price.toLocaleString()} DA</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6d28d9', marginTop: '4px', display: 'flex', gap: '12px' }}>
                        <span>👥 {c.enrolledCount} inscrits</span>
                        <span>✅ {c.attendanceCount} présents</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Link
                        href={`/classe/${c.id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: c.status === 'live' ? '#ef4444' : '#FF8C00', color: 'white', padding: '8px 16px', borderRadius: '10px', textDecoration: 'none', fontSize: '13px', fontWeight: 700, boxShadow: c.status === 'live' ? '0 0 15px rgba(239,68,68,0.4)' : '0 0 15px rgba(255,140,0,0.3)' }}
                      >
                        {c.status === 'live' ? '🔴 En direct' : '▶ Démarrer'}
                      </Link>
                      <button onClick={() => openStudents(c)} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(168,85,247,0.4)', color: '#c4b5fd', background: 'transparent', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                        <Users style={{ width: '14px', height: '14px' }} /> Élèves
                      </button>
                      <Link href={`/chat/${c.id}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(168,85,247,0.4)', color: '#c4b5fd', background: 'transparent', padding: '8px 14px', borderRadius: '10px', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
                        <MessageCircle style={{ width: '14px', height: '14px' }} /> Chat
                      </Link>
                      <button
                        onClick={() => copyLink(c.jitsiRoom, c.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(168,85,247,0.4)', color: copied === c.id ? '#34d399' : '#c4b5fd', background: copied === c.id ? 'rgba(6,78,59,0.3)' : 'transparent', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: '0.2s' }}
                      >
                        {copied === c.id ? <CheckCircle style={{ width: '14px', height: '14px' }} /> : <Copy style={{ width: '14px', height: '14px' }} />}
                        {copied === c.id ? 'Copié !' : 'Lien'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ═══ TAB: REVENUS ═══ */}
        {activeTab === "revenus" && user && (
          <TeacherRevenue teacherId={user.uid} />
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

      {/* Create modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#110225', border: '1px solid rgba(88,28,135,0.5)', borderRadius: '20px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ color: 'white', fontWeight: 800, fontSize: '18px', margin: 0 }}>Créer un cours</h2>
                <p style={{ color: '#a78bfa', fontSize: '13px', margin: '4px 0 0' }}>Remplissez les informations du cours</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'rgba(88,28,135,0.3)', border: 'none', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#a78bfa' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Titre du cours *</label>
                <input style={inputStyle} placeholder="Ex: Révision Bac Maths série S" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Matière</label>
                  <select style={inputStyle} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                    {SUBJECTS.map(s => <option key={s} style={{ background: '#1A0A3C' }}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Niveau</label>
                  <select style={inputStyle} value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
                    {LEVELS.map(l => <option key={l} style={{ background: '#1A0A3C' }}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Date et heure *</label>
                <input style={inputStyle} type="datetime-local" value={form.dateTime} onChange={e => setForm(f => ({ ...f, dateTime: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Durée (min)</label>
                  <input style={inputStyle} type="number" value={form.durationMinutes} onChange={e => setForm(f => ({ ...f, durationMinutes: +e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Prix (DA)</label>
                  <input style={inputStyle} type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Type de prix</label>
                  <select style={inputStyle} value={form.priceType} onChange={e => setForm(f => ({ ...f, priceType: e.target.value as "session" | "monthly" }))}>
                    <option value="session" style={{ background: '#1A0A3C' }}>Par séance</option>
                    <option value="monthly" style={{ background: '#1A0A3C' }}>Par mois</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Wilaya</label>
                  <select style={inputStyle} value={form.wilaya} onChange={e => setForm(f => ({ ...f, wilaya: e.target.value }))}>
                    {WILAYAS.map(w => <option key={w} style={{ background: '#1A0A3C' }}>{w}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>WhatsApp</label>
                <input style={inputStyle} placeholder="213XXXXXXXXX" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <textarea style={{ ...inputStyle, resize: 'none' }} rows={3} placeholder="Décrivez votre cours..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <button
                onClick={handleCreate}
                disabled={creating || !form.title || !form.dateTime}
                style={{ width: '100%', background: creating || !form.title || !form.dateTime ? 'rgba(255,140,0,0.4)' : '#FF8C00', color: 'white', fontWeight: 800, padding: '14px', borderRadius: '14px', border: 'none', cursor: creating ? 'not-allowed' : 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {creating ? (
                  <><div style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Création...</>
                ) : (
                  <><Zap style={{ width: '16px', height: '16px' }} /> Créer le cours</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Students modal */}
      {selectedClasse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#110225', border: '1px solid rgba(88,28,135,0.5)', borderRadius: '20px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ color: 'white', fontWeight: 800, fontSize: '18px', margin: 0 }}>Élèves</h2>
                <p style={{ color: '#a78bfa', fontSize: '13px', margin: '4px 0 0' }}>{selectedClasse.title}</p>
              </div>
              <button onClick={() => setSelectedClasse(null)} style={{ background: 'rgba(88,28,135,0.3)', border: 'none', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#a78bfa' }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <div style={{ background: 'rgba(255,140,0,0.1)', border: '1px solid rgba(255,140,0,0.3)', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: '#fdba74', marginBottom: '12px', fontWeight: 600 }}>
                ⚠️ En ajoutant un élève, vous confirmez avoir reçu son paiement.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input style={inputStyle} placeholder="Nom de l'élève" value={addName} onChange={e => setAddName(e.target.value)} />
                <input style={inputStyle} placeholder="Numéro de téléphone" value={addPhone} onChange={e => setAddPhone(e.target.value)} />
                {addError && <p style={{ color: '#f87171', fontSize: '12px', margin: 0 }}>{addError}</p>}
                <button
                  onClick={handleAddStudent}
                  disabled={addingStudent}
                  style={{ background: '#FF8C00', color: 'white', fontWeight: 700, padding: '10px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                >
                  {addingStudent ? "Ajout..." : "+ Ajouter l'élève"}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {enrollments.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#a78bfa', fontSize: '14px', padding: '20px 0' }}>Aucun élève inscrit</p>
              ) : enrollments.map((e) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'rgba(88,28,135,0.15)', borderRadius: '12px' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'white', fontSize: '14px' }}>{e.studentName}</div>
                    <div style={{ fontSize: '12px', color: '#a78bfa' }}>{e.studentPhone}</div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px', background: e.attended ? 'rgba(6,78,59,0.4)' : 'rgba(88,28,135,0.3)', color: e.attended ? '#34d399' : '#a78bfa' }}>
                    {e.attended ? "✅ Présent" : "En attente"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
