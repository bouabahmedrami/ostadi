"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import {
  getReferralStats, getLoyaltyProgress, getUserCoupons,
  REFERRALS_FOR_REWARD, REFERRAL_COUPON_AMOUNT, COURSES_FOR_FREE,
} from "@/lib/firestore";
import { useToast } from "@/components/Toast";
import { haptic } from "@/lib/haptics";
import { Reveal, Sequence } from "@/components/Motion";
import { PageLoader } from "@/components/Skeletons";
import { ChalkCircle } from "@/components/Chalk";
import {
  Gift, Copy, Check, Users, Share2, MessageCircle,
  ArrowLeft, Ticket, GraduationCap, Clock, Sparkles, Lock,
} from "lucide-react";
import Link from "next/link";

/**
 * Récompenses — parrainage et fidélité.
 *
 * ⚠️ Réservée aux élèves.
 *
 * Un professeur qui parraine des élèves toucherait un bon utilisable
 * sur des cours — les siens compris. Il pourrait s'auto-financer en
 * inscrivant des proches, ce qui n'a aucun sens économique et fausse
 * les compteurs de la plateforme.
 */
export default function RecompensesPage() {
  const { user, profile, loading } = useAuth();
  const { isRTL } = useLang();
  const router = useRouter();
  const toast = useToast();

  const [ref, setRef] = useState<any>(null);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  useEffect(() => {
    if (user && profile?.role === "student") load();
    else if (profile) setLoadingData(false);
  }, [user, profile]);

  async function load() {
    setLoadingData(true);
    try {
      const [r, l, c] = await Promise.all([
        getReferralStats(user!.uid),
        getLoyaltyProgress(user!.uid),
        getUserCoupons(user!.uid),
      ]);
      setRef(r); setLoyalty(l); setCoupons(c);
    } catch (err) {
      console.error("Chargement des récompenses échoué :", err);
    } finally {
      setLoadingData(false);
    }
  }

  const DA = isRTL ? "دج" : "DA";
  const shareUrl = typeof window !== "undefined" && ref
    ? `${window.location.origin}/auth?ref=${ref.code}`
    : "";

  const shareText = isRTL
    ? `🎓 سجّل في أستاذي بكودي ${ref?.code} — منصة دروس الدعم في الجزائر.\n\n${shareUrl}`
    : `🎓 Inscris-toi sur Ostadi avec mon code ${ref?.code} — cours de soutien en ligne en Algérie.\n\n${shareUrl}`;

  function copyCode() {
    navigator.clipboard.writeText(ref.code);
    haptic("success");
    setCopied(true);
    toast.success(isRTL ? "تم نسخ الكود" : "Code copié");
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    haptic("tap");
    if (navigator.share) {
      try {
        await navigator.share({ title: "Ostadi", text: shareText, url: shareUrl });
        return;
      } catch { /* annulé */ }
    }
    navigator.clipboard.writeText(shareText);
    toast.success(isRTL ? "تم النسخ" : "Message copié");
  }

  if (loading || loadingData) {
    return <PageLoader label={isRTL ? "جارٍ التحميل..." : "Chargement..."} />;
  }

  /* ═══ RÉSERVÉ AUX ÉLÈVES ═══ */
  if (profile?.role !== "student") {
    return (
      <div style={{ minHeight: "100vh", padding: "30px 16px" }} dir={isRTL ? "rtl" : "ltr"}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <Link href="/" style={back}>
            <ArrowLeft size={15} className="os-flip" />
            {isRTL ? "رجوع" : "Retour"}
          </Link>

          <div className="os-glass-2" style={{ padding: "42px 26px", textAlign: "center" }}>
            <span style={{
              width: 62, height: 62, borderRadius: 20, margin: "0 auto 18px",
              background: "rgba(124,58,237,0.12)", color: "#7c3aed",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Lock size={26} />
            </span>
            <h1 style={{ color: "white", fontWeight: 800, fontSize: 19, margin: "0 0 10px" }}>
              {isRTL ? "مخصّص للطلاب" : "Réservé aux élèves"}
            </h1>
            <p className="os-muted" style={{ fontSize: 13.5, lineHeight: 1.7, maxWidth: 400, margin: "0 auto" }}>
              {isRTL
                ? "برنامج المكافآت موجّه للطلاب. بصفتك أستاذاً، تجد إيراداتك ومتابعيك في لوحة التحكم."
                : "Le programme de récompenses s'adresse aux élèves. En tant que professeur, vos revenus et vos abonnés sont dans votre tableau de bord."}
            </p>
            <Link href="/dashboard" className="os-btn-chalk" style={{
              display: "inline-flex", marginTop: 22, padding: "12px 24px",
              fontSize: 14, textDecoration: "none",
            }}>
              {isRTL ? "لوحة التحكم" : "Mon tableau de bord"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!ref || !loyalty) return null;

  const usable = coupons.filter(c => !c.used && c.expiresAt > new Date().toISOString());

  return (
    <div style={{ minHeight: "100vh" }} dir={isRTL ? "rtl" : "ltr"}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "26px 16px 60px" }}>

        <Link href="/" style={back}>
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
              <Gift size={28} />
            </span>
            <h1 className="os-display os-h2" style={{ margin: "0 0 8px" }}>
              {isRTL ? "مكافآتي" : "Mes récompenses"}
            </h1>
            <p className="os-muted" style={{ fontSize: 14, margin: 0, lineHeight: 1.65 }}>
              {isRTL
                ? "ادعُ أصدقاءك وتابع دروسك — كلاهما يمنحك مكافآت."
                : "Parrainez vos amis et suivez vos cours — les deux vous rapportent."}
            </p>
          </div>
        </Sequence>

        {/* ═══ BONS DISPONIBLES ═══ */}
        {usable.length > 0 && (
          <Reveal>
            <div className="os-glass-2" style={{
              padding: 18, marginBottom: 20,
              borderColor: "rgba(34,197,94,0.3)",
            }}>
              <h2 style={sectionTitle}>
                <Ticket size={16} style={{ color: "#22C55E" }} />
                {isRTL ? "قسائم متاحة" : "Bons disponibles"}
                <span style={{
                  background: "rgba(34,197,94,0.18)", color: "#4ade80",
                  fontSize: 11, fontWeight: 800, padding: "2px 9px", borderRadius: 999,
                }}>{usable.length}</span>
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {usable.map(c => (
                  <div key={c.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "rgba(34,197,94,0.07)",
                    border: "1px dashed rgba(34,197,94,0.34)",
                    borderRadius: 13, padding: "13px 14px",
                  }}>
                    <span style={{
                      width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                      background: "rgba(34,197,94,0.15)", color: "#4ade80",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {c.freeCourse ? <GraduationCap size={19} /> : <Ticket size={19} />}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#4ade80", fontWeight: 800, fontSize: 15 }}>
                        {c.freeCourse
                          ? (isRTL ? "درس مجاني" : "Cours offert")
                          : `${c.amount.toLocaleString("fr-DZ")} ${DA}`}
                      </div>
                      <div style={{ color: "#8b7bb8", fontSize: 11.5, marginTop: 2, lineHeight: 1.5 }}>
                        {isRTL ? c.labelAr : c.label}
                      </div>
                    </div>

                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      color: "#6d28d9", fontSize: 10.5, flexShrink: 0,
                    }}>
                      <Clock size={10} />
                      {new Date(c.expiresAt).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
                        day: "2-digit", month: "short",
                      })}
                    </span>
                  </div>
                ))}
              </div>

              <p style={{ color: "#4c1d95", fontSize: 10.5, margin: "12px 0 0", lineHeight: 1.6 }}>
                {isRTL
                  ? "اذكر القسيمة للأستاذ عند التسجيل في درس."
                  : "Mentionnez votre bon au professeur au moment de vous inscrire à un cours."}
              </p>
            </div>
          </Reveal>
        )}

        {/* ═══ PARRAINAGE ═══ */}
        <Reveal>
          <div className="os-glass-2" style={{ padding: 20, marginBottom: 20 }}>
            <h2 style={sectionTitle}>
              <Users size={16} style={{ color: "#FF8C00" }} />
              {isRTL ? "دعوة الأصدقاء" : "Parrainage"}
            </h2>

            <p className="os-muted" style={{ fontSize: 13, margin: "-8px 0 18px", lineHeight: 1.7 }}>
              {isRTL
                ? `ادعُ ${REFERRALS_FOR_REWARD} أصدقاء، وعندما يتابع كلّ واحد منهم درسه الأول، تحصل على قسيمة ${REFERRAL_COUPON_AMOUNT} دج.`
                : `Invitez ${REFERRALS_FOR_REWARD} amis. Quand chacun aura suivi son premier cours, vous recevez un bon de ${REFERRAL_COUPON_AMOUNT} DA.`}
            </p>

            {/* Code */}
            <div style={{
              background: "linear-gradient(140deg, rgba(255,140,0,0.1), rgba(124,58,237,0.08))",
              border: "2px dashed rgba(255,140,0,0.4)",
              borderRadius: 18, padding: "22px 18px",
              textAlign: "center", marginBottom: 18,
            }}>
              <p style={{
                color: "#a78bfa", fontSize: 11, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 10px",
              }}>
                {isRTL ? "كودك" : "Votre code"}
              </p>
              <div style={{
                color: "#FF8C00", fontWeight: 900, fontSize: 36,
                letterSpacing: "6px", marginBottom: 16, fontFamily: "monospace",
              }}>
                {ref.code}
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={copyCode} className="os-btn-ghost" style={btnSm}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? (isRTL ? "تم" : "Copié") : (isRTL ? "نسخ" : "Copier")}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ ...btnSm, background: "rgba(34,197,94,0.14)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)", textDecoration: "none" }}
                >
                  <MessageCircle size={14} /> WhatsApp
                </a>
                <button onClick={share} className="os-btn-chalk" style={btnSm}>
                  <Share2 size={14} /> {isRTL ? "مشاركة" : "Partager"}
                </button>
              </div>
            </div>

            {/* Progression */}
            <Progress
              current={ref.towardNext}
              total={REFERRALS_FOR_REWARD}
              label={isRTL
                ? `${ref.towardNext} من ${REFERRALS_FOR_REWARD} أصدقاء`
                : `${ref.towardNext} sur ${REFERRALS_FOR_REWARD} amis`}
              hint={isRTL
                ? `باقي ${REFERRALS_FOR_REWARD - ref.towardNext} للحصول على ${REFERRAL_COUPON_AMOUNT} دج`
                : `Encore ${REFERRALS_FOR_REWARD - ref.towardNext} pour ${REFERRAL_COUPON_AMOUNT} DA`}
              color="#FF8C00"
            />

            {ref.invited > 0 && (
              <div style={{
                display: "flex", gap: 16, marginTop: 16, paddingTop: 14,
                borderTop: "1px solid rgba(124,58,237,0.14)", flexWrap: "wrap",
              }}>
                <Stat value={ref.invited} label={isRTL ? "مدعوّ" : "invités"} />
                <Stat value={ref.completed} label={isRTL ? "نشط" : "actifs"} color="#4ade80" />
                <Stat value={ref.couponsEarned} label={isRTL ? "قسيمة" : "bons gagnés"} color="#FF8C00" />
              </div>
            )}
          </div>
        </Reveal>

        {/* ═══ FIDÉLITÉ ═══ */}
        <Reveal>
          <div className="os-glass-2" style={{ padding: 20 }}>
            <h2 style={sectionTitle}>
              <GraduationCap size={16} style={{ color: "#FF8C00" }} />
              {isRTL ? "الوفاء" : "Fidélité"}
            </h2>

            <p className="os-muted" style={{ fontSize: 13, margin: "-8px 0 18px", lineHeight: 1.7 }}>
              {isRTL ? (
                <>تابع <ChalkCircle color="#FF8C00">{COURSES_FOR_FREE}</ChalkCircle> دروس، واحصل على درس من اختيارك مجاناً.</>
              ) : (
                <>Suivez <ChalkCircle color="#FF8C00">{COURSES_FOR_FREE}</ChalkCircle> cours, et le suivant est offert — celui de votre choix.</>
              )}
            </p>

            <Progress
              current={loyalty.toward}
              total={COURSES_FOR_FREE}
              label={isRTL
                ? `${loyalty.toward} من ${COURSES_FOR_FREE} دروس`
                : `${loyalty.toward} sur ${COURSES_FOR_FREE} cours`}
              hint={isRTL
                ? `باقي ${COURSES_FOR_FREE - loyalty.toward} لدرس مجاني`
                : `Encore ${COURSES_FOR_FREE - loyalty.toward} pour un cours offert`}
              color="#22C55E"
            />

            {loyalty.completed > 0 && (
              <div style={{
                display: "flex", gap: 16, marginTop: 16, paddingTop: 14,
                borderTop: "1px solid rgba(124,58,237,0.14)", flexWrap: "wrap",
              }}>
                <Stat value={loyalty.completed} label={isRTL ? "درس متابَع" : "cours suivis"} />
                <Stat value={loyalty.freeEarned} label={isRTL ? "درس مكتسب" : "offerts gagnés"} color="#4ade80" />
              </div>
            )}

            <p style={{ color: "#4c1d95", fontSize: 10.5, margin: "16px 0 0", lineHeight: 1.6 }}>
              {isRTL
                ? "يُحتسب الدرس عند حضورك الفعلي للقاعة، وليس بمجرّد التسجيل."
                : "Un cours compte quand vous avez réellement assisté à la séance, pas à l'inscription."}
            </p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}

/* ═══════════ Sous-composants ═══════════ */

function Progress({ current, total, label, hint, color }: any) {
  const pct = Math.min((current / total) * 100, 100);

  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "baseline", marginBottom: 8, gap: 12, flexWrap: "wrap",
      }}>
        <span style={{ color: "white", fontSize: 13.5, fontWeight: 700 }}>{label}</span>
        <span style={{ color: "#8b7bb8", fontSize: 11.5 }}>{hint}</span>
      </div>

      {/* Segments plutôt qu'une barre continue : on compte des
          personnes ou des cours, pas un pourcentage. Chaque case
          remplie est une étape franchie. */}
      <div style={{ display: "flex", gap: 5 }}>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            style={{
              flex: 1, height: 8, borderRadius: 999,
              background: i < current ? color : "rgba(124,58,237,0.16)",
              transition: `background 320ms ease ${i * 45}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Stat({ value, label, color }: any) {
  return (
    <span style={{ display: "flex", flexDirection: "column" }}>
      <b style={{ color: color || "white", fontSize: 17, fontWeight: 800 }}>{value}</b>
      <span style={{ color: "#8b7bb8", fontSize: 10.5 }}>{label}</span>
    </span>
  );
}

const back: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7,
  color: "#a78bfa", textDecoration: "none", fontSize: 13,
  fontWeight: 600, marginBottom: 22,
};

const sectionTitle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 9,
  color: "white", fontWeight: 750, fontSize: 15, margin: "0 0 14px",
};

const btnSm: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6,
  fontSize: 12.5, fontWeight: 700, padding: "9px 16px",
  borderRadius: 11, cursor: "pointer", fontFamily: "inherit",
};
