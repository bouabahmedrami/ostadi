"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { getReferralStats, REFERRAL_BONUS } from "@/lib/firestore";
import {
  Gift, Copy, Check, Users, Wallet, Share2, MessageCircle,
  Loader2, ArrowLeft, Clock, Sparkles,
} from "lucide-react";
import Link from "next/link";

/**
 * Page de parrainage.
 *
 * En Algérie, le bouche-à-oreille est le canal principal. Un élève
 * satisfait qui parle de la plateforme à trois camarades vaut plus
 * que n'importe quelle campagne publicitaire.
 *
 * Le bonus n'est versé qu'après la PREMIÈRE INSCRIPTION du filleul,
 * pas à la création du compte — sinon il suffirait de créer dix
 * comptes fictifs.
 */
export default function ParrainagePage() {
  const { user, profile, loading } = useAuth();
  const { isRTL } = useLang();
  const router = useRouter();

  const [stats, setStats] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function load() {
    setLoadingData(true);
    try {
      setStats(await getReferralStats(user!.uid));
    } catch (err) {
      console.error("Chargement du parrainage échoué :", err);
    } finally {
      setLoadingData(false);
    }
  }

  const DA = isRTL ? "دج" : "DA";
  const shareUrl = typeof window !== "undefined" && stats
    ? `${window.location.origin}/auth?ref=${stats.code}`
    : "";

  const shareText = isRTL
    ? `🎓 سجّل في أستاذي بكودي ${stats?.code} واحصل على ${REFERRAL_BONUS} دج على درسك الأول!\n\n${shareUrl}`
    : `🎓 Inscris-toi sur Ostadi avec mon code ${stats?.code} et reçois ${REFERRAL_BONUS} DA sur ton premier cours !\n\n${shareUrl}`;

  function copyCode() {
    navigator.clipboard.writeText(stats.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Ostadi", text: shareText, url: shareUrl });
        return;
      } catch { /* annulé */ }
    }
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading || loadingData) {
    return (
      <div style={{ ...page, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={28} style={{ color: "#FF8C00", animation: "pspin 0.8s linear infinite" }} />
        <style>{`@keyframes pspin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div style={page} dir={isRTL ? "rtl" : "ltr"}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "26px 16px 60px" }}>

        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          color: "#a78bfa", textDecoration: "none", fontSize: 13,
          fontWeight: 600, marginBottom: 22,
        }}>
          <ArrowLeft size={15} style={{ transform: isRTL ? "rotate(180deg)" : "none" }} />
          {isRTL ? "رجوع" : "Retour"}
        </Link>

        {/* ═══ EN-TÊTE ═══ */}
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{
            width: 62, height: 62, borderRadius: 20, margin: "0 auto 16px",
            background: "linear-gradient(140deg, rgba(255,140,0,0.24), rgba(124,58,237,0.2))",
            border: "1px solid rgba(255,140,0,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#FF8C00",
          }}>
            <Gift size={28} />
          </div>
          <h1 style={{
            color: "white", fontWeight: 900, fontSize: 24,
            margin: "0 0 8px", letterSpacing: "-0.4px",
          }}>
            {isRTL ? "ادعُ أصدقاءك" : "Parrainez vos amis"}
          </h1>
          <p style={{
            color: "#a78bfa", fontSize: 14, margin: 0,
            lineHeight: 1.65, maxWidth: 420, marginInline: "auto",
          }}>
            {isRTL
              ? `كل صديق يسجّل بكودك ويلتحق بدرس، تربحان معاً ${REFERRAL_BONUS} دج.`
              : `Chaque ami qui s'inscrit avec votre code et rejoint un cours vous rapporte ${REFERRAL_BONUS} DA — à tous les deux.`}
          </p>
        </div>

        {/* ═══ CODE ═══ */}
        <div style={{
          background: "linear-gradient(140deg, rgba(255,140,0,0.1), rgba(124,58,237,0.08))",
          border: "2px dashed rgba(255,140,0,0.4)",
          borderRadius: 20, padding: "26px 22px",
          textAlign: "center", marginBottom: 18,
        }}>
          <p style={{
            color: "#a78bfa", fontSize: 11.5, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 12px",
          }}>
            {isRTL ? "كودك" : "Votre code"}
          </p>

          <div style={{
            color: "#FF8C00", fontWeight: 900, fontSize: 40,
            letterSpacing: "7px", marginBottom: 18,
            fontFamily: "monospace",
          }}>
            {stats.code}
          </div>

          <div style={{ display: "flex", gap: 9, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={copyCode} style={btn(
              copied ? "rgba(34,197,94,0.15)" : "rgba(124,58,237,0.15)",
              copied ? "#4ade80" : "#c4b5fd",
              copied ? "rgba(34,197,94,0.3)" : "rgba(124,58,237,0.3)"
            )}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied
                ? (isRTL ? "تم النسخ" : "Copié")
                : (isRTL ? "نسخ الكود" : "Copier")}
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...btn("rgba(34,197,94,0.14)", "#4ade80", "rgba(34,197,94,0.3)"), textDecoration: "none" }}
            >
              <MessageCircle size={14} /> WhatsApp
            </a>

            <button onClick={share} style={btn(
              "linear-gradient(135deg, #FF8C00, #FF6B00)", "white", "transparent"
            )}>
              <Share2 size={14} /> {isRTL ? "مشاركة" : "Partager"}
            </button>
          </div>
        </div>

        {/* ═══ CHIFFRES ═══ */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 11, marginBottom: 22,
        }}>
          <Box icon={<Users size={16} />} value={stats.invited}
            label={isRTL ? "مدعوّون" : "invités"} color="#a78bfa" />
          <Box icon={<Check size={16} />} value={stats.completed}
            label={isRTL ? "مؤكّدون" : "confirmés"} color="#22C55E" />
          <Box icon={<Clock size={16} />} value={stats.pending}
            label={isRTL ? "في الانتظار" : "en attente"} color="#FBBF24" />
          <Box icon={<Wallet size={16} />} value={`${stats.credit} ${DA}`}
            label={isRTL ? "رصيدك" : "votre crédit"} color="#FF8C00" />
        </div>

        {/* ═══ COMMENT ÇA MARCHE ═══ */}
        <div style={{
          background: "rgba(20,8,45,0.55)",
          border: "1px solid rgba(124,58,237,0.18)",
          borderRadius: 18, padding: 20, marginBottom: 22,
        }}>
          <h2 style={{
            display: "flex", alignItems: "center", gap: 9,
            color: "white", fontWeight: 750, fontSize: 15, margin: "0 0 16px",
          }}>
            <Sparkles size={16} style={{ color: "#FF8C00" }} />
            {isRTL ? "كيف يعمل" : "Comment ça marche"}
          </h2>

          {[
            {
              fr: "Partagez votre code avec un ami",
              ar: "شارك كودك مع صديق",
            },
            {
              fr: "Il crée son compte en le saisissant",
              ar: "ينشئ حسابه ويُدخل الكود",
            },
            {
              fr: "Il s'inscrit à son premier cours",
              ar: "يلتحق بدرسه الأول",
            },
            {
              fr: `Vous recevez chacun ${REFERRAL_BONUS} DA de crédit`,
              ar: `تحصلان معاً على ${REFERRAL_BONUS} دج رصيداً`,
            },
          ].map((s, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              marginBottom: i < 3 ? 14 : 0,
            }}>
              <span style={{
                width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                background: i === 3 ? "#FF8C00" : "rgba(124,58,237,0.22)",
                color: i === 3 ? "white" : "#c4b5fd",
                fontSize: 11.5, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{i + 1}</span>
              <span style={{
                color: i === 3 ? "#fdba74" : "#c4b5fd",
                fontSize: 13, lineHeight: 1.5,
                fontWeight: i === 3 ? 650 : 400,
              }}>
                {isRTL ? s.ar : s.fr}
              </span>
            </div>
          ))}

          <p style={{
            color: "#5b21b6", fontSize: 11, margin: "16px 0 0",
            paddingTop: 14, borderTop: "1px solid rgba(124,58,237,0.14)",
            lineHeight: 1.6,
          }}>
            {isRTL
              ? "يُصرف الرصيد عند الالتحاق بدرس فعلي، وليس عند إنشاء الحساب — لتفادي الحسابات الوهمية."
              : "Le crédit est versé lors d'une inscription réelle à un cours, pas à la création du compte — pour éviter les comptes fictifs."}
          </p>
        </div>

        {/* ═══ LISTE ═══ */}
        {stats.list.length > 0 && (
          <div style={{
            background: "rgba(20,8,45,0.55)",
            border: "1px solid rgba(124,58,237,0.18)",
            borderRadius: 18, padding: 20,
          }}>
            <h2 style={{
              color: "white", fontWeight: 750, fontSize: 15, margin: "0 0 14px",
            }}>
              {isRTL ? "من دعوت" : "Vos filleuls"}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stats.list.map((r: any) => (
                <div key={r.id} style={{
                  display: "flex", alignItems: "center", gap: 11,
                  background: "rgba(10,0,20,0.4)",
                  borderRadius: 11, padding: "11px 13px",
                }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                    background: r.completed
                      ? "rgba(34,197,94,0.16)"
                      : "rgba(124,58,237,0.18)",
                    color: r.completed ? "#4ade80" : "#c4b5fd",
                    fontWeight: 800, fontSize: 12,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {(r.refereeName || "?").charAt(0).toUpperCase()}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "white", fontSize: 13, fontWeight: 600 }}>
                      {r.refereeName}
                    </div>
                    <div style={{ color: "#6d28d9", fontSize: 10.5, marginTop: 1 }}>
                      {new Date(r.createdAt).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </div>
                  </div>

                  <span style={{
                    background: r.completed ? "rgba(34,197,94,0.15)" : "rgba(251,191,36,0.13)",
                    color: r.completed ? "#4ade80" : "#fbbf24",
                    fontSize: 11, fontWeight: 700,
                    padding: "4px 11px", borderRadius: 999, flexShrink: 0,
                  }}>
                    {r.completed
                      ? `+${REFERRAL_BONUS} ${DA}`
                      : (isRTL ? "في الانتظار" : "en attente")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const page: React.CSSProperties = {
  background: "#0A0014",
  minHeight: "100vh",
  backgroundImage:
    "radial-gradient(circle at 20% 10%, rgba(124,58,237,0.1) 0%, transparent 50%)",
};

function btn(bg: string, color: string, border: string): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 7,
    background: bg, color, border: `1px solid ${border}`,
    fontSize: 12.5, fontWeight: 700,
    padding: "10px 18px", borderRadius: 11,
    cursor: "pointer", fontFamily: "inherit",
  };
}

function Box({ icon, value, label, color }: any) {
  return (
    <div style={{
      background: "rgba(20,8,45,0.6)",
      border: "1px solid rgba(124,58,237,0.16)",
      borderRadius: 13, padding: "13px 12px", textAlign: "center",
    }}>
      <div style={{ color, display: "flex", justifyContent: "center", marginBottom: 5 }}>{icon}</div>
      <div style={{ color: "white", fontWeight: 800, fontSize: 16 }}>{value}</div>
      <div style={{ color: "#8b7bb8", fontSize: 10.5, marginTop: 2 }}>{label}</div>
    </div>
  );
}
