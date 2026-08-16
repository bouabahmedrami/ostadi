"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getClasseById, getEnrollmentsByStudent, markAttendance,
  getRatingByStudentAndClasse, updateClasse, createNotification,
  getEnrollmentsByClasse, createEnrollmentRequest, getMyRequestForClasse,
  trackClasseView,
} from "@/lib/firestore";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { Classe, Enrollment, EnrollmentRequest } from "@/lib/types";
import { Video, Users, Clock, ArrowLeft, MessageCircle, CheckCircle, Star, MapPin, Calendar, Sparkles, Send, Hourglass, XCircle, Lock, Eye } from "lucide-react";
import { StarDisplay } from "@/components/StarRating";
import LiveKitVideoRoom from "@/components/LiveKitVideoRoom";
import RatingModal from "@/components/RatingModal";
import CourseMaterials from "@/components/CourseMaterials";
import ReportButton from "@/components/ReportButton";
import ShareCourse from "@/components/ShareCourse";
import { trSubject, trLevel, trWilaya, trPriceType } from "@/lib/i18n/translate";
import Link from "next/link";
import { getCourseAccess, timeUntil } from "@/lib/course-access";

export default function ClassePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { isRTL } = useLang();
  const [classe, setClasse] = useState<Classe | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [myRequest, setMyRequest] = useState<EnrollmentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [attended, setAttended] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => { setMounted(true); }, []);

  // Rafraîchit l'état d'ouverture : la salle s'ouvre et se ferme
  // pendant que l'utilisateur regarde la page
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (id) loadClasse(); }, [id, user]);

  /**
   * Comptage de la vue.
   *
   * La fonction ignore le professeur consultant son propre cours et
   * ne compte un visiteur connecté qu'une fois par jour — sinon un
   * élève qui recharge la page ferait croire au professeur que son
   * annonce intéresse, et fausserait sa décision de la reconduire.
   */
  useEffect(() => {
    if (!classe) return;
    trackClasseView(classe.id, user?.uid || null, classe.teacherId);
  }, [classe?.id, user?.uid]);

  async function loadClasse() {
    setLoading(true);
    try {
      const c = await getClasseById(id as string);
      setClasse(c);
      if (user && c) {
        const enrollments = await getEnrollmentsByStudent(user.uid);
        const enr = enrollments.find(e => e.classeId === c.id);
        if (enr) {
          setEnrollment(enr);
          setAttended(enr.attended);
          const existing = await getRatingByStudentAndClasse(user.uid, c.id);
          setAlreadyRated(!!existing);
        } else {
          // Pas inscrit → vérifier s'il y a une demande en cours
          const req = await getMyRequestForClasse(user.uid, c.id);
          setMyRequest(req);
        }
      }
    } finally { setLoading(false); }
  }

  const isEnrolled = !!enrollment;
  const isTeacher = user?.uid === classe?.teacherId;
  const canAccessRoom = isEnrolled || isTeacher;

  // Cours mensuel : plusieurs séances programmées
  const sessions = (classe as any)?.sessions as string[] | undefined;
  const isMultiSession = Array.isArray(sessions) && sessions.length > 1;

  // Fenêtre d'accès à la salle — recalculée à chaque tick
  const access = classe
    ? getCourseAccess(
        {
          dateTime: classe.dateTime,
          durationMinutes: classe.durationMinutes,
          status: classe.status,
          sessions,
        },
        now
      )
    : null;

  async function handleSendRequest() {
    if (!user || !profile || !classe) {
      router.push("/auth");
      return;
    }
    setSendingRequest(true);
    try {
      await createEnrollmentRequest({
        classeId: classe.id,
        classeTitle: classe.title,
        teacherId: classe.teacherId,
        studentId: user.uid,
        studentName: profile.displayName,
        studentPhone: profile.phone,
        message: requestMessage.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      await loadClasse();
    } finally {
      setSendingRequest(false);
    }
  }

  async function startLive() {
    if (!classe) return;
    await updateClasse(classe.id, { status: "live" });
    setClasse(prev => prev ? { ...prev, status: "live" } : null);
    const enrollments = await getEnrollmentsByClasse(classe.id);
    for (const enr of enrollments) {
      await createNotification({
        userId: enr.studentId,
        type: "course_live",
        title: "🔴 Cours en direct !",
        body: `${classe.title} a commencé`,
        link: `/classe/${classe.id}`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  async function stopLive() {
    if (!classe) return;
    await updateClasse(classe.id, { status: "ended" });
    setClasse(prev => prev ? { ...prev, status: "ended" } : null);
  }

  async function handleAttendance() {
    if (!enrollment || !classe) return;
    await markAttendance(enrollment.id, classe.id);
    setAttended(true);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0A0014' }}>
      <div style={{ position: 'relative', width: '56px', height: '56px' }}>
        <div style={{ position: 'absolute', inset: 0, border: '3px solid rgba(124,58,237,0.15)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 0, border: '3px solid transparent', borderTopColor: '#FF8C00', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!classe) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#a78bfa', background: '#0A0014' }}>
      {isRTL ? "الدرس غير موجود." : "Cours introuvable."}
    </div>
  );

  return (
    <div style={{
      backgroundColor: '#0A0014', minHeight: '100vh',
      backgroundImage: `radial-gradient(circle at 20% 10%, rgba(124,58,237,0.12) 0%, transparent 50%),
        radial-gradient(circle at 80% 60%, rgba(255,140,0,0.06) 0%, transparent 50%),
        linear-gradient(rgba(168,85,247,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(168,85,247,0.03) 1px, transparent 1px)`,
      backgroundSize: 'auto, auto, 44px 44px, 44px 44px',
    }} dir={isRTL ? "rtl" : "ltr"}>

      <div style={{
        maxWidth: '920px', margin: '0 auto', padding: '28px 16px 60px',
        opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>

        <Link href="/" className="ostadi-back-link" style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#a78bfa',
          textDecoration: 'none', fontSize: '13.5px', fontWeight: 600, marginBottom: '22px',
          padding: '8px 14px', borderRadius: '10px', transition: 'all 0.2s ease',
        }}>
          <ArrowLeft style={{ width: '15px', height: '15px', transform: isRTL ? 'rotate(180deg)' : 'none' }} />
          {isRTL ? "رجوع" : "Retour"}
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* ═══ HERO HEADER ═══ */}
          <div className="ostadi-card ostadi-card-glow" style={{ padding: '26px', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: '-60px', right: isRTL ? 'auto' : '-60px', left: isRTL ? '-60px' : 'auto',
              width: '180px', height: '180px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,140,0,0.15) 0%, transparent 70%)', pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px', position: 'relative' }}>
              <span className="ostadi-badge ostadi-badge-purple">{trSubject(classe.subject, isRTL)}</span>
              <span className="ostadi-badge ostadi-badge-blue">{trLevel(classe.level, isRTL)}</span>
              {classe.status === "live" && (
                <span className="ostadi-badge ostadi-badge-live"><span className="ostadi-live-dot" /> {isRTL ? "مباشر" : "En direct"}</span>
              )}
              {isMultiSession && (
                <span className="ostadi-badge" style={{
                  background: 'rgba(255,140,0,0.15)',
                  color: '#fdba74',
                  border: '1px solid rgba(255,140,0,0.3)',
                }}>
                  📅 {sessions!.length} {isRTL ? "حصص" : "séances"}
                </span>
              )}
            </div>
            <h1 style={{ color: 'white', fontWeight: 800, fontSize: '24px', margin: '0 0 14px', letterSpacing: '-0.3px', lineHeight: 1.3 }}>
              {classe.title}
            </h1>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {[
                { icon: <Clock style={{ width: '15px', height: '15px' }} />, label: `${classe.durationMinutes} ${isRTL ? 'د' : 'min'}` },
                { icon: <Users style={{ width: '15px', height: '15px' }} />, label: `${classe.enrolledCount} ${isRTL ? 'مسجّل' : 'inscrits'}` },
                { icon: <MapPin style={{ width: '15px', height: '15px' }} />, label: trWilaya(classe.wilaya, isRTL) },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#a78bfa', fontSize: '13.5px', fontWeight: 500 }}>
                  <span style={{ color: '#FF8C00' }}>{item.icon}</span>
                  {item.label}
                </div>
              ))}
              {/* Compteur de vues — visible par le professeur uniquement */}
              {isTeacher && ((classe as any).viewCount ?? 0) > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#60a5fa', fontSize: '13.5px', fontWeight: 500 }}>
                  <Eye style={{ width: '15px', height: '15px' }} />
                  {(classe as any).viewCount} {isRTL ? 'مشاهدة' : 'vues'}
                </div>
              )}
            </div>
            {classe.description && (
              <p style={{ color: 'rgba(196,181,253,0.65)', fontSize: '14px', marginTop: '16px', lineHeight: '1.7', paddingTop: '16px', borderTop: '1px solid rgba(124,58,237,0.15)' }}>
                {classe.description}
              </p>
            )}

            {/* ═══ PARTAGE ═══
                Un professeur qui promeut son cours n'avait qu'un lien nu.
                Une image se partage bien mieux sur Facebook et WhatsApp. */}
            <div style={{
              marginTop: '18px', paddingTop: '16px',
              borderTop: '1px solid rgba(124,58,237,0.15)',
            }}>
              <ShareCourse classe={classe} teacherName={classe.teacherName} />
            </div>
          </div>

          {/* ═══ VIDEO ROOM (inscrits + prof) ═══ */}
          {canAccessRoom && access?.open ? (
            <div className="ostadi-card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ color: 'white', fontWeight: 700, fontSize: '15.5px', margin: 0, display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '9px', background: 'linear-gradient(135deg, rgba(255,140,0,0.25), rgba(255,140,0,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Video style={{ width: '15px', height: '15px', color: '#FF8C00' }} />
                  </div>
                  {isRTL ? "قاعة الدرس المباشر" : "Salle de cours en direct"}
                </h2>
                {isTeacher && (
                  <button
                    onClick={classe.status !== 'live' ? startLive : stopLive}
                    className={classe.status !== 'live' ? 'ostadi-btn-orange' : 'ostadi-btn-red'}
                    style={{ fontSize: '13px', padding: '9px 18px' }}
                  >
                    {classe.status !== 'live' ? <><span className="ostadi-live-dot-sm" /> {isRTL ? "بدء البث" : "Marquer Live"}</> : <>⏹ Terminer</>}
                  </button>
                )}
              </div>
              <div className="ostadi-video-frame">
                <LiveKitVideoRoom
                  classeId={classe.id}
                  isTeacher={isTeacher}
                />
              </div>
              {isEnrolled && !attended && (
                <button onClick={handleAttendance} className="ostadi-btn-outline" style={{ marginTop: '16px', width: '100%', padding: '13px' }}>
                  <CheckCircle style={{ width: '17px', height: '17px' }} />
                  {isRTL ? "حضرت هذا الدرس" : "J'ai assisté à ce cours"}
                </button>
              )}
              {attended && (
                <div style={{
                  marginTop: '16px', textAlign: 'center', color: '#34d399', fontWeight: 600, fontSize: '13.5px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  padding: '12px', background: 'rgba(6,78,59,0.15)', borderRadius: '12px', border: '1px solid rgba(52,211,153,0.2)',
                }}>
                  <CheckCircle style={{ width: '16px', height: '16px' }} /> {isRTL ? "تم تأكيد الحضور — شكراً!" : "Présence confirmée — Merci !"}
                </div>
              )}
            </div>
          ) : canAccessRoom && access && !access.open ? (
            /* ═══ INSCRIT MAIS SALLE FERMÉE ═══ */
            <div className="ostadi-card" style={{
              padding: '34px 24px', textAlign: 'center',
              background: access.reason === "ended"
                ? 'rgba(124,58,237,0.04)'
                : 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(124,58,237,0.04))',
              border: access.reason === "ended"
                ? '1px solid rgba(124,58,237,0.2)'
                : '1px solid rgba(59,130,246,0.25)',
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 16px',
                background: access.reason === "ended"
                  ? 'rgba(124,58,237,0.12)'
                  : 'rgba(59,130,246,0.14)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {access.reason === "ended"
                  ? <Lock style={{ width: '26px', height: '26px', color: '#8b7bb8' }} />
                  : <Clock style={{ width: '26px', height: '26px', color: '#60a5fa' }} />}
              </div>

              <p style={{
                color: access.reason === "ended" ? '#a78bfa' : '#93c5fd',
                fontWeight: 700, fontSize: '16px', marginBottom: '8px',
              }}>
                {access.reason === "ended"
                  ? (isRTL ? "انتهى هذا الدرس" : "Ce cours est terminé")
                  : (isRTL ? "القاعة لم تفتح بعد" : "La salle n'est pas encore ouverte")}
              </p>

              <p style={{
                color: '#8b7bb8', fontSize: '13.5px', maxWidth: '400px',
                margin: '0 auto', lineHeight: 1.6,
              }}>
                {access.reason === "ended"
                  ? (isRTL
                      ? "لم تعد قاعة الفيديو متاحة. يمكنك مراجعة الوثائق أدناه."
                      : "La salle vidéo n'est plus accessible. Consultez les supports ci-dessous.")
                  : access.nextSession
                    ? (isRTL
                        ? `تفتح القاعة قبل 15 دقيقة من البداية — خلال ${timeUntil(access.nextSession, isRTL, now)}.`
                        : `Elle ouvre 15 minutes avant le début — dans ${timeUntil(access.nextSession, isRTL, now)}.`)
                    : (isRTL ? "لا توجد حصة قادمة." : "Aucune séance à venir.")}
              </p>

              {access.reason === "too-early" && access.nextSession && (
                <p style={{ color: '#60a5fa', fontSize: '12.5px', marginTop: '14px', fontWeight: 600 }}>
                  {isMultiSession && access.sessionNumber
                    ? `${isRTL ? "الحصة" : "Séance"} ${access.sessionNumber}/${access.totalSessions} — `
                    : ""}
                  {formatDate(access.nextSession)}
                </p>
              )}
            </div>
          ) : (
            /* ═══ PAS INSCRIT — 3 ÉTATS POSSIBLES ═══ */
            <>
              {/* ÉTAT 1 : Demande en attente */}
              {myRequest?.status === "pending" && (
                <div className="ostadi-card" style={{
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.06), rgba(124,58,237,0.04))',
                  border: '1px solid rgba(251,191,36,0.3)', textAlign: 'center', padding: '40px 24px',
                }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 16px',
                    background: 'rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Hourglass style={{ width: '26px', height: '26px', color: '#fbbf24' }} />
                  </div>
                  <p style={{ color: '#fbbf24', fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>
                    {isRTL ? "تم إرسال الطلب — في الانتظار" : "Demande envoyée — en attente"}
                  </p>
                  <p style={{ color: '#a78bfa', fontSize: '13.5px', marginBottom: '20px', maxWidth: '380px', margin: '0 auto 20px', lineHeight: 1.6 }}>
                    {isRTL ? "سيراجع الأستاذ طلبك. تواصل معه عبر واتساب لإتمام الدفع وتسريع الموافقة." : "Le professeur va examiner votre demande. Contactez-le sur WhatsApp pour finaliser le paiement et accélérer la validation."}
                  </p>
                  {classe.whatsapp && (
                    <a
                      href={`https://wa.me/${classe.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(isRTL ? `مرحباً، أرسلت طلباً لـ: ${classe.title}` : `Bonjour, j'ai envoyé une demande pour: ${classe.title}`)}`}
                      target="_blank" rel="noopener noreferrer" className="ostadi-btn-whatsapp"
                    >
                      <MessageCircle style={{ width: '17px', height: '17px' }} />
                      {isRTL ? "تواصل مع الأستاذ" : "Contacter le professeur"}
                    </a>
                  )}
                </div>
              )}

              {/* ÉTAT 2 : Demande refusée */}
              {myRequest?.status === "rejected" && (
                <div className="ostadi-card" style={{
                  background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.3)',
                  textAlign: 'center', padding: '40px 24px',
                }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 16px',
                    background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <XCircle style={{ width: '26px', height: '26px', color: '#f87171' }} />
                  </div>
                  <p style={{ color: '#f87171', fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>
                    {isRTL ? "لم يتم قبول الطلب" : "Demande non acceptée"}
                  </p>
                  <p style={{ color: '#a78bfa', fontSize: '13.5px', marginBottom: '20px', maxWidth: '380px', margin: '0 auto 20px', lineHeight: 1.6 }}>
                    {isRTL ? "تواصل مع الأستاذ عبر واتساب لمعرفة السبب وإمكانية إعادة الطلب." : "Contactez le professeur sur WhatsApp pour comprendre pourquoi et éventuellement refaire une demande."}
                  </p>
                  {classe.whatsapp && (
                    <a
                      href={`https://wa.me/${classe.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(isRTL ? `مرحباً، بخصوص طلبي لـ: ${classe.title}` : `Bonjour, concernant ma demande pour: ${classe.title}`)}`}
                      target="_blank" rel="noopener noreferrer" className="ostadi-btn-whatsapp"
                    >
                      <MessageCircle style={{ width: '17px', height: '17px' }} />
                      {isRTL ? "تواصل مع الأستاذ" : "Contacter le professeur"}
                    </a>
                  )}
                </div>
              )}

              {/* ÉTAT 3 : Aucune demande → formulaire */}
              {!myRequest && (
                <div className="ostadi-card" style={{
                  background: 'linear-gradient(135deg, rgba(255,140,0,0.06), rgba(124,58,237,0.04))',
                  border: '1px solid rgba(255,140,0,0.25)', padding: '32px 24px',
                }}>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <div style={{
                      width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 16px',
                      background: 'linear-gradient(135deg, rgba(255,140,0,0.2), rgba(255,140,0,0.05))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Sparkles style={{ width: '26px', height: '26px', color: '#FF8C00' }} />
                    </div>
                    <p style={{ color: '#FF8C00', fontWeight: 700, fontSize: '16px', marginBottom: '8px' }}>
                      {isRTL ? "انضم إلى هذا الدرس" : "Rejoindre ce cours"}
                    </p>
                    <p style={{ color: '#a78bfa', fontSize: '13.5px', maxWidth: '420px', margin: '0 auto', lineHeight: 1.6 }}>
                      {isRTL ? "أرسل طلباً للأستاذ. سيتواصل معك للدفع، ثم يوافق على وصولك." : "Envoyez une demande au professeur. Il vous contactera pour le paiement, puis validera votre accès."}
                    </p>
                  </div>

                  {user ? (
                    <>
                      <textarea
                        value={requestMessage}
                        onChange={e => setRequestMessage(e.target.value)}
                        placeholder={isRTL ? "رسالة للأستاذ (اختياري) — مثال: المستوى، الأوقات المتاحة..." : "Message pour le professeur (optionnel) — ex: niveau, disponibilités..."}
                        rows={2}
                        style={{
                          width: '100%', background: 'rgba(26,10,60,0.6)', border: '1px solid rgba(124,58,237,0.25)',
                          borderRadius: '12px', padding: '11px 13px', fontSize: '13px', color: 'white',
                          outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                          marginBottom: '12px',
                        }}
                      />
                      <button
                        onClick={handleSendRequest}
                        disabled={sendingRequest}
                        className="ostadi-btn-orange"
                        style={{ width: '100%', padding: '14px', justifyContent: 'center', fontSize: '14.5px', opacity: sendingRequest ? 0.6 : 1 }}
                      >
                        <Send style={{ width: '16px', height: '16px' }} />
                        {sendingRequest ? (isRTL ? "جارٍ الإرسال..." : "Envoi en cours...") : (isRTL ? "طلب الوصول إلى الدرس" : "Demander l'accès au cours")}
                      </button>
                    </>
                  ) : (
                    <Link href="/auth" className="ostadi-btn-orange" style={{ width: '100%', padding: '14px', justifyContent: 'center', fontSize: '14.5px', textDecoration: 'none' }}>
                      {isRTL ? "سجّل الدخول لطلب الوصول" : "Connectez-vous pour demander l'accès"}
                    </Link>
                  )}
                </div>
              )}
            </>
          )}

          {/* ═══ SUPPORTS DE COURS ═══
              Ce qui reste du cours une fois la visio terminée.
              Les non-inscrits voient les titres mais pas les liens. */}
          {classe && (
            <CourseMaterials
              classeId={classe.id}
              teacherId={classe.teacherId}
              isTeacher={isTeacher}
              canAccess={isEnrolled || isTeacher}
            />
          )}

          {/* ═══ RATING ═══ */}
          {isEnrolled && attended && (
            <div className="ostadi-card" style={{ padding: '20px' }}>
              <h2 style={{ color: 'white', fontWeight: 700, fontSize: '15px', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star style={{ width: '17px', height: '17px', color: '#FF8C00' }} />
                {isRTL ? "تقييم الأستاذ" : "Évaluer le professeur"}
              </h2>
              {alreadyRated ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontSize: '13.5px' }}>
                  <CheckCircle style={{ width: '15px', height: '15px' }} /> {isRTL ? "لقد قيّمت هذا الدرس بالفعل" : "Vous avez déjà évalué ce cours"}
                </div>
              ) : (
                <button onClick={() => setShowRating(true)} className="ostadi-btn-orange" style={{ fontSize: '13px', padding: '9px 18px' }}>
                  <Star style={{ width: '14px', height: '14px' }} /> {isRTL ? "قيّم الآن" : "Évaluer maintenant"}
                </button>
              )}
            </div>
          )}

          {/* ═══ CALENDRIER DES SÉANCES ═══ */}
          {isMultiSession && (
            <div className="ostadi-card" style={{ padding: '20px' }}>
              <h2 style={{
                color: 'white', fontWeight: 700, fontSize: '15px', margin: '0 0 4px',
                display: 'flex', alignItems: 'center', gap: '9px',
              }}>
                <Calendar style={{ width: '16px', height: '16px', color: '#FF8C00' }} />
                {isRTL ? "برنامج الحصص" : "Calendrier des séances"}
              </h2>
              <p style={{ color: '#6d28d9', fontSize: '11.5px', margin: '0 0 16px' }}>
                {isRTL
                  ? "تسجيل واحد يمنحك الوصول إلى كل الحصص."
                  : "Une seule inscription donne accès à toutes les séances."}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {sessions!.map((s, i) => {
                  const past = new Date(s).getTime() < Date.now();
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '11px',
                      padding: '9px 10px', borderRadius: '10px',
                      background: past ? 'transparent' : 'rgba(124,58,237,0.06)',
                      opacity: past ? 0.45 : 1,
                    }}>
                      <span style={{
                        width: '22px', height: '22px', borderRadius: '7px', flexShrink: 0,
                        background: past ? 'rgba(124,58,237,0.15)' : 'rgba(255,140,0,0.18)',
                        color: past ? '#8b7bb8' : '#FF8C00',
                        fontSize: '10.5px', fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {i + 1}
                      </span>
                      <span style={{
                        flex: 1, color: past ? '#8b7bb8' : '#c4b5fd', fontSize: '12.5px',
                      }}>
                        {formatDate(s)}
                      </span>
                      {past && (
                        <span style={{ color: '#6d28d9', fontSize: '10.5px', flexShrink: 0 }}>
                          {isRTL ? "منتهية" : "passée"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ INFO ROW ═══ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="ostadi-card ostadi-card-hover" style={{ padding: '18px' }}>
              <h3 style={{ color: '#8b7bb8', fontSize: '11.5px', fontWeight: 700, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{isRTL ? "الأستاذ" : "Professeur"}</h3>
              <Link href={`/professeur/${classe.teacherId}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(124,58,237,0.15))',
                  border: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#e9d5ff', fontWeight: 800, fontSize: '18px', flexShrink: 0,
                }}>
                  {classe.teacherName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: '14.5px' }}>{classe.teacherName}</div>
                  <StarDisplay rating={classe.teacherRating} size="sm" />
                </div>
              </Link>
            </div>

            <div className="ostadi-card ostadi-card-hover" style={{ padding: '18px' }}>
              <h3 style={{ color: '#8b7bb8', fontSize: '11.5px', fontWeight: 700, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{isRTL ? "التفاصيل" : "Détails"}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar style={{ width: '13px', height: '13px', color: '#FF8C00', flexShrink: 0 }} />
                  <span style={{ color: 'white', fontSize: '12.5px' }}>
                    {isMultiSession
                      ? `${sessions!.length} ${isRTL ? "حصص" : "séances"}`
                      : formatDate(classe.dateTime)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#FF8C00', fontWeight: 800, fontSize: '17px' }}>{classe.price.toLocaleString()}</span>
                  <span style={{ color: '#a78bfa', fontSize: '12.5px' }}>{isRTL ? "دج" : "DA"} / {trPriceType(classe.priceType, isRTL)}</span>
                </div>
              </div>
            </div>
          </div>
          {/* ═══ SIGNALEMENT ═══ */}
          <div style={{
            textAlign: 'center', marginTop: '10px', paddingTop: '18px',
            borderTop: '1px solid rgba(124,58,237,0.12)',
          }}>
            <ReportButton
              targetType="classe"
              targetId={classe.id}
              targetName={classe.title}
            />
          </div>
        </div>
      </div>

      {showRating && classe && user && (
        <RatingModal
          classeId={classe.id}
          teacherId={classe.teacherId}
          teacherName={classe.teacherName}
          studentId={user.uid}
          onClose={() => setShowRating(false)}
          onDone={() => { setAlreadyRated(true); setShowRating(false); }}
        />
      )}

      <style jsx global>{`
        .ostadi-card {
          background: linear-gradient(145deg, rgba(20,8,45,0.9), rgba(15,5,30,0.9));
          border: 1px solid rgba(124,58,237,0.18); border-radius: 18px;
          backdrop-filter: blur(20px);
          transition: border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
        }
        .ostadi-card-glow { box-shadow: 0 8px 32px rgba(124,58,237,0.08), inset 0 1px 0 rgba(255,255,255,0.03); }
        .ostadi-card-hover:hover { border-color: rgba(168,85,247,0.35); transform: translateY(-2px); box-shadow: 0 12px 24px rgba(124,58,237,0.12); }
        .ostadi-back-link:hover { background: rgba(124,58,237,0.12); color: white; gap: 10px; }
        .ostadi-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700; padding: 5px 13px; border-radius: 999px; letter-spacing: 0.2px; }
        .ostadi-badge-purple { background: rgba(124,58,237,0.18); color: #d8b4fe; border: 1px solid rgba(168,85,247,0.25); }
        .ostadi-badge-blue { background: rgba(59,130,246,0.15); color: #93c5fd; border: 1px solid rgba(59,130,246,0.2); }
        .ostadi-badge-live { background: rgba(239,68,68,0.15); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); }
        .ostadi-live-dot { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; animation: livePulse 1.4s ease-in-out infinite; }
        .ostadi-live-dot-sm { width: 6px; height: 6px; border-radius: 50%; background: white; animation: livePulse 1.4s ease-in-out infinite; display: inline-block; }
        @keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        .ostadi-btn-orange {
          display: inline-flex; align-items: center; gap: 7px;
          background: linear-gradient(135deg, #FF8C00, #FF6B00);
          color: white; font-weight: 700; border: none; cursor: pointer;
          border-radius: 12px; transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
          box-shadow: 0 4px 16px rgba(255,140,0,0.3);
        }
        .ostadi-btn-orange:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 8px 24px rgba(255,140,0,0.45); }
        .ostadi-btn-red {
          display: inline-flex; align-items: center; gap: 7px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white; font-weight: 700; border: none; cursor: pointer;
          border-radius: 12px; transition: all 0.25s ease;
        }
        .ostadi-btn-outline {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          border: 1.5px solid rgba(255,140,0,0.4); color: #FF8C00; font-weight: 700;
          border-radius: 14px; background: rgba(255,140,0,0.04); cursor: pointer;
          transition: all 0.25s ease; font-size: 13.5px;
        }
        .ostadi-btn-outline:hover { background: rgba(255,140,0,0.12); border-color: rgba(255,140,0,0.6); }
        .ostadi-btn-whatsapp {
          display: inline-flex; align-items: center; gap: 9px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white; font-weight: 700; padding: 13px 26px; border-radius: 14px;
          text-decoration: none; font-size: 14px; box-shadow: 0 4px 20px rgba(34,197,94,0.3);
          transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .ostadi-btn-whatsapp:hover { transform: translateY(-2px) scale(1.03); }
        .ostadi-video-frame { border-radius: 14px; overflow: hidden; border: 1px solid rgba(124,58,237,0.25); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
      `}</style>
    </div>
  );
}
