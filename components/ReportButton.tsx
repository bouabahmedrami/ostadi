"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { createReport, hasReported, ReportCategory } from "@/lib/firestore";
import {
  Flag, X, AlertTriangle, ShieldAlert, UserX, Wallet,
  BookX, HelpCircle, Check, Loader2,
} from "lucide-react";

/**
 * Signalement d'un professeur, d'un cours ou d'une conversation.
 *
 * Volontairement discret — un bouton texte, pas une alarme rouge.
 * Un élève qui hésite ne signalera pas si le geste semble grave ou
 * accusateur. Le formulaire tient en deux champs : catégorie et
 * description. L'administrateur creusera ensuite.
 */
export default function ReportButton({
  targetType,
  targetId,
  targetName,
  compact = false,
}: {
  targetType: "teacher" | "classe" | "message";
  targetId: string;
  targetName: string;
  /** Version icône seule, pour les barres d'actions denses */
  compact?: boolean;
}) {
  const { user, profile } = useAuth();
  const { isRTL } = useLang();

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [already, setAlready] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      hasReported(user.uid, targetId).then(setAlready).catch(() => {});
    }
  }, [open, user, targetId]);

  const CATEGORIES: {
    id: ReportCategory;
    icon: React.ReactNode;
    fr: string;
    ar: string;
    hint?: { fr: string; ar: string };
  }[] = [
    {
      id: "safety",
      icon: <ShieldAlert size={16} />,
      fr: "Sécurité d'un mineur",
      ar: "سلامة قاصر",
      hint: {
        fr: "Propos déplacés, demande de contact privé, tentative d'isolement",
        ar: "كلام غير لائق، طلب تواصل خاص، محاولة عزل",
      },
    },
    {
      id: "inappropriate",
      icon: <AlertTriangle size={16} />,
      fr: "Comportement inapproprié",
      ar: "سلوك غير لائق",
    },
    {
      id: "fake",
      icon: <UserX size={16} />,
      fr: "Faux profil ou diplôme",
      ar: "ملف أو شهادة مزيفة",
    },
    {
      id: "payment",
      icon: <Wallet size={16} />,
      fr: "Litige de paiement",
      ar: "نزاع حول الدفع",
    },
    {
      id: "quality",
      icon: <BookX size={16} />,
      fr: "Cours non conforme",
      ar: "الدرس لا يطابق الوصف",
    },
    {
      id: "other",
      icon: <HelpCircle size={16} />,
      fr: "Autre",
      ar: "أخرى",
    },
  ];

  async function submit() {
    if (!user || !profile || !category || description.trim().length < 10) return;
    setSending(true);
    setError(null);
    try {
      await createReport({
        category,
        targetType,
        targetId,
        targetName,
        reporterId: user.uid,
        reporterName: profile.displayName,
        reporterRole: profile.role,
        description,
      });
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
        setCategory(null);
        setDescription("");
      }, 2400);
    } catch (err) {
      console.error("Signalement échoué :", err);
      setError(isRTL ? "فشل الإرسال. حاول مرة أخرى." : "Échec de l'envoi. Réessayez.");
    } finally {
      setSending(false);
    }
  }

  // Un utilisateur non connecté ne peut pas signaler :
  // sans identité, impossible de traiter ni de recouper
  if (!user) return null;

  const isUrgent = category === "safety" || category === "inappropriate";
  const canSubmit = category && description.trim().length >= 10 && !sending;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={isRTL ? "إبلاغ" : "Signaler"}
        style={compact ? {
          width: 32, height: 32, borderRadius: 9,
          background: "transparent", border: "1px solid rgba(124,58,237,0.2)",
          color: "#6d28d9", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        } : {
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "none", border: "none", color: "#6d28d9",
          fontSize: 11.5, cursor: "pointer", padding: "6px 4px",
          fontFamily: "inherit",
        }}
      >
        <Flag size={compact ? 14 : 12} />
        {!compact && (isRTL ? "إبلاغ" : "Signaler")}
      </button>

      {open && (
        <div
          onClick={() => !sending && !done && setOpen(false)}
          dir={isRTL ? "rtl" : "ltr"}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(0,0,0,0.78)", backdropFilter: "blur(5px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "linear-gradient(160deg, #1a0d38, #0d0520)",
              border: "1px solid rgba(124,58,237,0.35)",
              borderRadius: 20, padding: 24,
              width: "100%", maxWidth: 460, maxHeight: "92vh", overflowY: "auto",
            }}
          >
            {done ? (
              /* ═══ CONFIRMATION ═══ */
              <div style={{ textAlign: "center", padding: "22px 0" }}>
                <div style={{
                  width: 66, height: 66, borderRadius: 22, margin: "0 auto 16px",
                  background: "rgba(34,197,94,0.14)", color: "#4ade80",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Check size={30} />
                </div>
                <h3 style={{ color: "white", fontWeight: 800, fontSize: 17, margin: "0 0 10px" }}>
                  {isRTL ? "تم استلام إبلاغك" : "Signalement reçu"}
                </h3>
                <p style={{ color: "#a78bfa", fontSize: 13, margin: 0, lineHeight: 1.65 }}>
                  {isUrgent
                    ? (isRTL
                        ? "سنراجعه في أقرب وقت. شكراً لمساعدتك في حماية الطلاب."
                        : "Nous l'examinerons rapidement. Merci d'aider à protéger les élèves.")
                    : (isRTL
                        ? "سنراجعه قريباً. شكراً لمساهمتك."
                        : "Nous l'examinerons prochainement. Merci de votre contribution.")}
                </p>
              </div>
            ) : (
              <>
                {/* ═══ EN-TÊTE ═══ */}
                <div style={{
                  display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                  gap: 12, marginBottom: 18,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      background: "rgba(239,68,68,0.12)", color: "#f87171",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Flag size={18} />
                    </span>
                    <div>
                      <h3 style={{ color: "white", fontWeight: 800, fontSize: 16, margin: 0 }}>
                        {isRTL ? "إبلاغ" : "Signaler"}
                      </h3>
                      <p style={{ color: "#a78bfa", fontSize: 12.5, margin: "2px 0 0" }}>
                        {targetName}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setOpen(false)} disabled={sending} style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: "rgba(124,58,237,0.18)", border: "none", color: "#a78bfa",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}>
                    <X size={16} />
                  </button>
                </div>

                {already && (
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 9,
                    background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)",
                    borderRadius: 11, padding: "11px 13px", marginBottom: 16,
                  }}>
                    <AlertTriangle size={14} style={{ color: "#fbbf24", flexShrink: 0, marginTop: 1 }} />
                    <p style={{ color: "#fde68a", fontSize: 12, margin: 0, lineHeight: 1.55 }}>
                      {isRTL
                        ? "سبق أن أبلغت عن هذا. يمكنك إرسال إبلاغ آخر إذا كان هناك جديد."
                        : "Vous avez déjà signalé cet élément. Vous pouvez en envoyer un autre s'il y a du nouveau."}
                    </p>
                  </div>
                )}

                {/* ═══ CATÉGORIE ═══ */}
                <label style={{
                  display: "block", color: "#a78bfa", fontSize: 11.5, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 9,
                }}>
                  {isRTL ? "سبب الإبلاغ" : "Motif du signalement"}
                </label>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
                  {CATEGORIES.map(c => {
                    const on = category === c.id;
                    const urgent = c.id === "safety";
                    return (
                      <button
                        key={c.id}
                        onClick={() => setCategory(c.id)}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: 11,
                          textAlign: "start", width: "100%",
                          background: on
                            ? (urgent ? "rgba(239,68,68,0.1)" : "rgba(255,140,0,0.1)")
                            : "rgba(20,8,45,0.5)",
                          border: `1px solid ${on
                            ? (urgent ? "rgba(239,68,68,0.4)" : "rgba(255,140,0,0.4)")
                            : "rgba(124,58,237,0.16)"}`,
                          borderRadius: 11, padding: "11px 13px",
                          cursor: "pointer", fontFamily: "inherit",
                          transition: "all 0.18s ease",
                        }}
                      >
                        <span style={{
                          color: on ? (urgent ? "#f87171" : "#FF8C00") : "#8b7bb8",
                          flexShrink: 0, marginTop: 1,
                        }}>{c.icon}</span>
                        <span style={{ flex: 1 }}>
                          <span style={{
                            display: "block",
                            color: on ? "white" : "#c4b5fd",
                            fontSize: 13, fontWeight: on ? 700 : 600,
                          }}>
                            {isRTL ? c.ar : c.fr}
                          </span>
                          {c.hint && (
                            <span style={{
                              display: "block", color: "#6d28d9",
                              fontSize: 10.5, marginTop: 3, lineHeight: 1.5,
                            }}>
                              {isRTL ? c.hint.ar : c.hint.fr}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* ═══ DESCRIPTION ═══ */}
                <label style={{
                  display: "block", color: "#a78bfa", fontSize: 11.5, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 7,
                }}>
                  {isRTL ? "ماذا حدث؟" : "Que s'est-il passé ?"}
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  disabled={sending}
                  placeholder={isRTL
                    ? "اشرح بإيجاز ما حدث. كلما كان وصفك دقيقاً، كان تدخّلنا أسرع."
                    : "Décrivez brièvement les faits. Plus c'est précis, plus vite nous pourrons agir."}
                  style={{
                    width: "100%", boxSizing: "border-box", resize: "none",
                    background: "rgba(26,10,60,0.65)", border: "1px solid rgba(124,58,237,0.25)",
                    borderRadius: 12, padding: "12px 14px", fontSize: 13,
                    color: "white", outline: "none", fontFamily: "inherit", lineHeight: 1.6,
                  }}
                />
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  marginTop: 6, marginBottom: 16,
                }}>
                  <span style={{
                    color: description.trim().length < 10 ? "#fbbf24" : "#4ade80",
                    fontSize: 10.5,
                  }}>
                    {description.trim().length < 10
                      ? (isRTL
                          ? `${10 - description.trim().length} حرف على الأقل`
                          : `Encore ${10 - description.trim().length} caractères`)
                      : "✓"}
                  </span>
                  <span style={{ color: "#5b21b6", fontSize: 10.5 }}>
                    {description.length}/1000
                  </span>
                </div>

                {/* ═══ ERREUR ═══ */}
                {error && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 9,
                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 11, padding: "11px 13px", marginBottom: 14,
                  }}>
                    <AlertTriangle size={14} style={{ color: "#f87171", flexShrink: 0 }} />
                    <span style={{ color: "#fca5a5", fontSize: 12.5 }}>{error}</span>
                  </div>
                )}

                {/* ═══ ENVOI ═══ */}
                <button
                  onClick={submit}
                  disabled={!canSubmit}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    justifyContent: "center", gap: 8,
                    background: isUrgent
                      ? "linear-gradient(135deg, #dc2626, #b91c1c)"
                      : "linear-gradient(135deg, #FF8C00, #FF6B00)",
                    color: "white", fontWeight: 800, padding: 14,
                    borderRadius: 13, border: "none",
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    fontSize: 14, fontFamily: "inherit",
                    opacity: canSubmit ? 1 : 0.45,
                  }}
                >
                  {sending
                    ? <><Loader2 size={15} style={{ animation: "sp 0.8s linear infinite" }} /> {isRTL ? "جارٍ الإرسال..." : "Envoi..."}</>
                    : <><Flag size={15} /> {isRTL ? "إرسال الإبلاغ" : "Envoyer le signalement"}</>}
                </button>

                <p style={{
                  color: "#4c1d95", fontSize: 10.5, textAlign: "center",
                  margin: "12px 0 0", lineHeight: 1.55,
                }}>
                  {isRTL
                    ? "إبلاغك سري ولن يُطلع عليه الطرف المعني."
                    : "Votre signalement est confidentiel. La personne concernée n'en est pas informée."}
                </p>
              </>
            )}

            <style>{`@keyframes sp { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      )}
    </>
  );
}
