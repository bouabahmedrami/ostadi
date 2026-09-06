"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import {
  createSubscriptionRequest, getMySubscriptionRequests,
} from "@/lib/firestore";
import { useToast } from "@/components/Toast";
import { haptic } from "@/lib/haptics";
import { Reveal, Sequence } from "@/components/Motion";
import { PageLoader } from "@/components/Skeletons";
import {
  Crown, Copy, Check, Phone, MessageCircle, ArrowLeft,
  Clock, CheckCircle2, XCircle, Loader2, Landmark, Sparkles,
} from "lucide-react";
import Link from "next/link";

/**
 * Abonnement Professeur.
 *
 * ⚠️ Le paiement se fait hors plateforme, par virement CCP —
 * comme tout le reste des transactions sur Ostadi. Le professeur
 * transfère, indique sa référence de paiement, et l'admin valide
 * manuellement dans /admin. Aucune carte bancaire n'est demandée
 * ici : rien de sensible ne transite par ce formulaire.
 */

const PRICE = 2000;

/** Coordonnées de paiement — à ajuster si elles changent un jour */
const PAYMENT = {
  rip: "00799999002593548667",
  primaryPhone: "0674202411",   // appel + WhatsApp
  otherPhones: ["0798465842", "0558435083"], // appel uniquement
};

function waLink(phone: string, text: string): string {
  const clean = "213" + phone.replace(/^0/, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

export default function AbonnementPage() {
  const { user, profile, loading } = useAuth();
  const { isRTL } = useLang();
  const router = useRouter();
  const toast = useToast();

  const [history, setHistory] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [copied, setCopied] = useState(false);
  const [method, setMethod] = useState<"baridimob" | "cib" | "cash">("baridimob");
  const [ref, setRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function load() {
    setLoadingData(true);
    try {
      setHistory(await getMySubscriptionRequests(user!.uid));
    } catch (err) {
      console.error("Chargement de l'abonnement échoué :", err);
    } finally {
      setLoadingData(false);
    }
  }

  function copyRip() {
    navigator.clipboard.writeText(PAYMENT.rip);
    haptic("success");
    setCopied(true);
    toast.success(isRTL ? "تم النسخ" : "RIP copié");
    setTimeout(() => setCopied(false), 2000);
  }

  async function submit() {
    if (!user || !profile || ref.trim().length < 3) return;
    setSubmitting(true);
    haptic("tap");
    try {
      const now = new Date();
      const end = new Date(now);
      end.setMonth(end.getMonth() + 1);

      await createSubscriptionRequest({
        teacherId: user.uid,
        teacherName: profile.displayName,
        plan: "monthly",
        amount: PRICE,
        status: "pending",
        startDate: now.toISOString(),
        endDate: end.toISOString(),
        paymentMethod: method,
        paymentRef: ref.trim(),
        createdAt: now.toISOString(),
      });

      haptic("success");
      toast.success(isRTL ? "تم إرسال طلبك" : "Demande envoyée");
      setRef("");
      await load();
    } catch (err) {
      console.error("Envoi de la demande échoué :", err);
      toast.error(isRTL ? "فشل الإرسال" : "Échec de l'envoi");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || loadingData) {
    return <PageLoader label={isRTL ? "جارٍ التحميل..." : "Chargement..."} />;
  }

  const active = history.find(s => s.status === "active" && new Date(s.endDate) > new Date());
  const pending = history.find(s => s.status === "pending");

  const DA = isRTL ? "دج" : "DA";

  return (
    <div style={{ minHeight: "100vh" }} dir={isRTL ? "rtl" : "ltr"}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "26px 16px 60px" }}>

        <Link href="/dashboard" style={back}>
          <ArrowLeft size={15} className="os-flip" />
          {isRTL ? "رجوع" : "Retour"}
        </Link>

        <Sequence>
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <span style={{
              width: 62, height: 62, borderRadius: 20, margin: "0 auto 16px",
              background: "linear-gradient(140deg, rgba(255,140,0,0.24), rgba(124,58,237,0.2))",
              border: "1px solid rgba(255,140,0,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#FF8C00",
            }}>
              <Crown size={28} />
            </span>
            <h1 className="os-display os-h2" style={{ margin: "0 0 8px" }}>
              {isRTL ? "أستاذ مميز" : "Professeur Premium"}
            </h1>
            <p style={{ color: "#FF8C00", fontWeight: 800, fontSize: 22 }}>
              {PRICE.toLocaleString("fr-DZ")} {DA}
              <span style={{ color: "#8b7bb8", fontSize: 13, fontWeight: 500 }}>
                {" "}/{isRTL ? "شهر" : "mois"}
              </span>
            </p>
          </div>
        </Sequence>

        {/* ═══ ÉTAT ACTUEL ═══ */}
        {active && (
          <Reveal>
            <div className="os-glass-2" style={{
              padding: 18, marginBottom: 20,
              borderColor: "rgba(34,197,94,0.32)",
              display: "flex", alignItems: "center", gap: 13,
            }}>
              <span style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: "rgba(34,197,94,0.15)", color: "#4ade80",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <CheckCircle2 size={19} />
              </span>
              <div>
                <div style={{ color: "#4ade80", fontWeight: 750, fontSize: 14 }}>
                  {isRTL ? "اشتراكك نشط" : "Votre abonnement est actif"}
                </div>
                <div style={{ color: "#8b7bb8", fontSize: 12, marginTop: 2 }}>
                  {isRTL ? "ينتهي في " : "Se termine le "}
                  {new Date(active.endDate).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
                    day: "2-digit", month: "long", year: "numeric",
                  })}
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {pending && !active && (
          <Reveal>
            <div className="os-glass-2" style={{
              padding: 18, marginBottom: 20,
              borderColor: "rgba(251,191,36,0.3)",
              display: "flex", alignItems: "center", gap: 13,
            }}>
              <span style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: "rgba(251,191,36,0.14)", color: "#fbbf24",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Clock size={19} />
              </span>
              <div>
                <div style={{ color: "#fbbf24", fontWeight: 750, fontSize: 14 }}>
                  {isRTL ? "طلبك قيد المراجعة" : "Demande en cours de vérification"}
                </div>
                <div style={{ color: "#8b7bb8", fontSize: 12, marginTop: 2 }}>
                  {isRTL
                    ? "سنؤكّد الدفع خلال 24 ساعة."
                    : "Nous confirmons le paiement sous 24 heures."}
                </div>
              </div>
            </div>
          </Reveal>
        )}

        {/* ═══ AVANTAGES ═══ */}
        <Reveal>
          <div className="os-glass-2" style={{ padding: 20, marginBottom: 20 }}>
            <h2 style={sectionTitle}>
              <Sparkles size={16} style={{ color: "#FF8C00" }} />
              {isRTL ? "المزايا" : "Avantages"}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {[
                {
                  fr: "Commission réduite à 5 % au lieu de 10 %",
                  ar: "عمولة مخفّضة إلى 5٪ بدل 10٪",
                  strong: true,
                },
                {
                  fr: "Priorité dans les résultats, à note égale",
                  ar: "أولوية في النتائج، عند تساوي التقييم",
                },
                {
                  fr: "Badge Premium sur votre profil et vos cours",
                  ar: "شارة مميّزة على ملفك ودروسك",
                },
                {
                  fr: "Galerie photo et présentation détaillée",
                  ar: "معرض صور وتقديم مفصّل",
                },
              ].map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <Check size={15} style={{ color: "#4ade80", flexShrink: 0, marginTop: 2 }} />
                  <span style={{
                    color: (b as any).strong ? "#fdba74" : "#c4b5fd",
                    fontSize: 13.5, lineHeight: 1.6,
                    fontWeight: (b as any).strong ? 700 : 400,
                  }}>
                    {isRTL ? b.ar : b.fr}
                  </span>
                </div>
              ))}
            </div>

            {/* Le calcul qui décide — un professeur peut le vérifier
                lui-même, ce qui vaut mieux que n'importe quel argument */}
            <div style={{
              background: "rgba(34,197,94,0.07)",
              border: "1px solid rgba(34,197,94,0.24)",
              borderRadius: 12, padding: "13px 15px", marginTop: 16,
            }}>
              <p style={{ color: "#6ee7b7", fontSize: 12.5, margin: 0, lineHeight: 1.75 }}>
                {isRTL
                  ? "ابتداءً من 40 000 دج من رقم الأعمال الشهري، الفرق في العمولة يغطّي ثمن الاشتراك بالكامل. ما بعد ذلك، الاشتراك يربحك مالاً."
                  : "À partir de 40 000 DA de chiffre d'affaires mensuel, la différence de commission couvre entièrement le prix de l'abonnement. Au-delà, il vous rapporte."}
              </p>
            </div>
          </div>
        </Reveal>

        {/* ═══ PAIEMENT ═══ */}
        {!active && (
          <Reveal>
            <div className="os-glass-2" style={{ padding: 20, marginBottom: 20 }}>
              <h2 style={sectionTitle}>
                <Landmark size={16} style={{ color: "#FF8C00" }} />
                {isRTL ? "الدفع" : "Paiement"}
              </h2>

              <p style={{ color: "#8b7bb8", fontSize: 13, margin: "-6px 0 16px", lineHeight: 1.7 }}>
                {isRTL
                  ? `حوّل ${PRICE} دج إلى الحساب البريدي (CCP) أدناه، ثمّ أدخل رقم العملية في الاستمارة.`
                  : `Effectuez un virement de ${PRICE} DA vers le compte CCP ci-dessous, puis indiquez votre référence de paiement dans le formulaire.`}
              </p>

              {/* RIP */}
              <div style={{
                background: "linear-gradient(140deg, rgba(255,140,0,0.09), rgba(124,58,237,0.07))",
                border: "2px dashed rgba(255,140,0,0.38)",
                borderRadius: 16, padding: "16px 18px", marginBottom: 16,
              }}>
                <p style={{
                  color: "#a78bfa", fontSize: 10.5, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.8px", margin: "0 0 8px",
                }}>
                  {isRTL ? "الحساب البريدي (RIP)" : "Compte CCP (RIP)"}
                </p>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 10, flexWrap: "wrap",
                }}>
                  <span style={{
                    color: "#FF8C00", fontWeight: 800, fontSize: 17,
                    letterSpacing: "1px", fontFamily: "monospace", wordBreak: "break-all",
                  }}>
                    {PAYMENT.rip}
                  </span>
                  <button onClick={copyRip} style={{
                    display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
                    background: copied ? "rgba(34,197,94,0.16)" : "rgba(255,140,0,0.14)",
                    color: copied ? "#4ade80" : "#FF8C00",
                    border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(255,140,0,0.3)"}`,
                    fontSize: 12, fontWeight: 700, padding: "8px 14px",
                    borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                  }}>
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? (isRTL ? "تم" : "Copié") : (isRTL ? "نسخ" : "Copier")}
                  </button>
                </div>
              </div>

              {/* Contact */}
              <p style={{
                color: "#a78bfa", fontSize: 10.5, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.8px", margin: "0 0 10px",
              }}>
                {isRTL ? "للتأكيد أو الاستفسار" : "Pour confirmer ou toute question"}
              </p>

              <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <a href={`tel:${PAYMENT.primaryPhone}`} className="os-btn-ghost" style={contactBtn}>
                  <Phone size={14} /> {PAYMENT.primaryPhone}
                </a>
                <a
                  href={waLink(PAYMENT.primaryPhone, isRTL
                    ? "مرحباً، بخصوص اشتراك أستاذي المميز."
                    : "Bonjour, au sujet de l'abonnement Ostadi Premium.")}
                  target="_blank" rel="noopener noreferrer"
                  style={{ ...contactBtn, background: "rgba(34,197,94,0.14)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)", textDecoration: "none" }}
                >
                  <MessageCircle size={14} /> WhatsApp
                </a>
              </div>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {PAYMENT.otherPhones.map(p => (
                  <a key={p} href={`tel:${p}`} style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    color: "#6d28d9", fontSize: 12, textDecoration: "none",
                  }}>
                    <Phone size={11} /> {p}
                  </a>
                ))}
              </div>
            </div>
          </Reveal>
        )}

        {/* ═══ FORMULAIRE ═══ */}
        {!active && !pending && (
          <Reveal>
            <div className="os-glass-2" style={{ padding: 20 }}>
              <h2 style={sectionTitle}>
                {isRTL ? "تأكيد الدفع" : "Confirmer le paiement"}
              </h2>

              <label style={label}>{isRTL ? "طريقة الدفع" : "Méthode de paiement"}</label>
              <div style={{ display: "flex", gap: 7, marginBottom: 16, flexWrap: "wrap" }}>
                {[
                  { id: "baridimob", fr: "BaridiMob", ar: "بريدي موب" },
                  { id: "cib", fr: "CIB", ar: "CIB" },
                  { id: "cash", fr: "En main", ar: "نقداً" },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => { haptic("select"); setMethod(m.id as any); }}
                    style={{
                      background: method === m.id ? "rgba(255,140,0,0.16)" : "rgba(20,8,45,0.5)",
                      border: `1px solid ${method === m.id ? "rgba(255,140,0,0.4)" : "rgba(124,58,237,0.18)"}`,
                      color: method === m.id ? "#FF8C00" : "#8b7bb8",
                      fontSize: 12.5, fontWeight: 700, padding: "9px 15px",
                      borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    {isRTL ? m.ar : m.fr}
                  </button>
                ))}
              </div>

              <label style={label}>
                {isRTL ? "رقم العملية أو الوصل" : "Référence ou numéro de reçu"}
              </label>
              <input
                value={ref}
                onChange={e => setRef(e.target.value)}
                placeholder={isRTL ? "مثال : رقم العملية من بريدي موب" : "Ex : numéro de transaction BaridiMob"}
                className="os-input"
                style={{ marginBottom: 18 }}
              />

              <button
                onClick={submit}
                disabled={ref.trim().length < 3 || submitting}
                className="os-btn-chalk"
                style={{
                  width: "100%", padding: 14, fontSize: 14.5,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  opacity: ref.trim().length < 3 || submitting ? 0.45 : 1,
                }}
              >
                {submitting
                  ? <><Loader2 size={16} style={{ animation: "abspin 0.8s linear infinite" }} /> {isRTL ? "جارٍ الإرسال..." : "Envoi..."}</>
                  : (isRTL ? "إرسال الطلب" : "Envoyer la demande")}
              </button>

              <p style={{ color: "#4c1d95", fontSize: 10.5, margin: "12px 0 0", textAlign: "center", lineHeight: 1.6 }}>
                {isRTL
                  ? "تحقّق من الدفع يدوياً — يستغرق حتى 24 ساعة."
                  : "Vérification manuelle du paiement — jusqu'à 24 heures."}
              </p>
            </div>
          </Reveal>
        )}
      </div>

      <style>{`@keyframes abspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const back: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7,
  color: "#a78bfa", textDecoration: "none", fontSize: 13,
  fontWeight: 600, marginBottom: 22,
};

const sectionTitle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 9,
  color: "white", fontWeight: 750, fontSize: 15, margin: "0 0 16px",
};

const label: React.CSSProperties = {
  display: "block", color: "#a78bfa", fontSize: 11.5, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8,
};

const contactBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7,
  fontSize: 13, fontWeight: 700, padding: "10px 16px",
  borderRadius: 11, cursor: "pointer", fontFamily: "inherit",
  textDecoration: "none",
};
