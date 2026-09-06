"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang-context";
import {
  getTeacherBilan, PLATFORM_COMMISSION_RATE, SUBSCRIBER_COMMISSION_RATE,
} from "@/lib/firestore";
import { Crown, TrendingDown, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

/** Prix mensuel de l'abonnement, en dinars */
const SUBSCRIPTION_PRICE = 2000;

/**
 * Économie réalisée grâce à l'abonnement.
 *
 * ═══════════════════════════════════════════════════════════
 * C'est le seul argument de renouvellement qui tienne.
 *
 * Un badge se démode, une mise en avant ne se mesure pas. Un
 * professeur qui voit « vous avez économisé 2 400 DA ce mois-ci
 * pour un abonnement à 2 000 » n'a pas besoin qu'on le convainque.
 *
 * Et pour celui qui n'est pas encore abonné, le même calcul montre
 * ce qu'il perd — sans promesse, juste ses propres chiffres.
 * ═══════════════════════════════════════════════════════════
 */
export default function CommissionSavings({
  teacherId,
  isSubscriber,
}: {
  teacherId: string;
  isSubscriber: boolean;
}) {
  const { isRTL } = useLang();
  const [revenue, setRevenue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [teacherId]);

  async function load() {
    setLoading(true);
    try {
      const b = await getTeacherBilan(teacherId, "month");
      setRevenue(b.grossRevenue);
    } catch (err) {
      console.warn("Calcul de l'économie indisponible :", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 22 }}>
        <Loader2 size={18} style={{ color: "#FF8C00", animation: "csspin 0.8s linear infinite" }} />
        <style>{`@keyframes csspin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (revenue === null) return null;

  const DA = isRTL ? "دج" : "DA";
  const fmt = (n: number) => Math.round(n).toLocaleString("fr-DZ");

  const fullCommission = revenue * PLATFORM_COMMISSION_RATE;
  const reducedCommission = revenue * SUBSCRIBER_COMMISSION_RATE;
  const saved = fullCommission - reducedCommission;

  /** Chiffre d'affaires à partir duquel l'abonnement se rembourse */
  const breakEven = SUBSCRIPTION_PRICE / (PLATFORM_COMMISSION_RATE - SUBSCRIBER_COMMISSION_RATE);
  const netGain = saved - SUBSCRIPTION_PRICE;

  /* ═══ ABONNÉ ═══ */
  if (isSubscriber) {
    const profitable = netGain > 0;

    return (
      <div className="os-glass-2" style={{
        padding: 18,
        borderColor: profitable ? "rgba(34,197,94,0.3)" : "rgba(124,58,237,0.2)",
      }}>
        <h3 style={{
          display: "flex", alignItems: "center", gap: 9,
          color: "white", fontWeight: 750, fontSize: 14.5, margin: "0 0 14px",
        }}>
          <Crown size={16} style={{ color: "#FF8C00" }} />
          {isRTL ? "اشتراكك المميز" : "Votre abonnement Premium"}
        </h3>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 11, marginBottom: 14,
        }}>
          <Box
            value={`5%`}
            label={isRTL ? "عمولتك" : "votre commission"}
            color="#4ade80"
            strike="10%"
          />
          <Box
            value={`${fmt(saved)} ${DA}`}
            label={isRTL ? "وفّرت هذا الشهر" : "économisés ce mois"}
            color="#22C55E"
          />
        </div>

        <div style={{
          background: profitable ? "rgba(34,197,94,0.08)" : "rgba(124,58,237,0.07)",
          border: `1px solid ${profitable ? "rgba(34,197,94,0.24)" : "rgba(124,58,237,0.18)"}`,
          borderRadius: 12, padding: "12px 14px",
        }}>
          <p style={{
            color: profitable ? "#6ee7b7" : "#c4b5fd",
            fontSize: 12.5, margin: 0, lineHeight: 1.7,
          }}>
            {profitable ? (
              isRTL
                ? `اشتراكك يكلّف ${fmt(SUBSCRIPTION_PRICE)} دج ووفّر لك ${fmt(saved)} دج. ربحك الصافي هذا الشهر : ${fmt(netGain)} دج.`
                : `Votre abonnement coûte ${fmt(SUBSCRIPTION_PRICE)} DA et vous en a fait économiser ${fmt(saved)}. Gain net ce mois-ci : ${fmt(netGain)} DA.`
            ) : (
              isRTL
                ? `ابتداءً من ${fmt(breakEven)} دج من رقم الأعمال الشهري، يصبح اشتراكك مجانياً. أنت الآن عند ${fmt(revenue)} دج.`
                : `À partir de ${fmt(breakEven)} DA de chiffre d'affaires mensuel, votre abonnement ne vous coûte plus rien. Vous êtes à ${fmt(revenue)} DA.`
            )}
          </p>
        </div>
      </div>
    );
  }

  /* ═══ NON ABONNÉ ═══ */
  // Aucune activité : proposer un calcul sur zéro serait absurde
  if (revenue < 5000) return null;

  return (
    <div className="os-glass-2" style={{
      padding: 18, borderColor: "rgba(255,140,0,0.26)",
    }}>
      <h3 style={{
        display: "flex", alignItems: "center", gap: 9,
        color: "white", fontWeight: 750, fontSize: 14.5, margin: "0 0 6px",
      }}>
        <TrendingDown size={16} style={{ color: "#FF8C00" }} />
        {isRTL ? "يمكنك دفع عمولة أقل" : "Vous pourriez payer moins de commission"}
      </h3>

      <p style={{ color: "#8b7bb8", fontSize: 12.5, margin: "0 0 14px", lineHeight: 1.7 }}>
        {isRTL
          ? `برقم أعمالك الحالي (${fmt(revenue)} دج هذا الشهر)، تدفع ${fmt(fullCommission)} دج عمولة. بالاشتراك، كنت ستدفع ${fmt(reducedCommission)} دج فقط.`
          : `Avec votre chiffre d'affaires actuel (${fmt(revenue)} DA ce mois), vous payez ${fmt(fullCommission)} DA de commission. Avec l'abonnement, vous n'en paieriez que ${fmt(reducedCommission)}.`}
      </p>

      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        background: netGain > 0 ? "rgba(34,197,94,0.08)" : "rgba(124,58,237,0.07)",
        border: `1px solid ${netGain > 0 ? "rgba(34,197,94,0.24)" : "rgba(124,58,237,0.18)"}`,
        borderRadius: 12, padding: "12px 14px", marginBottom: 14,
      }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{netGain > 0 ? "📈" : "📊"}</span>
        <p style={{
          color: netGain > 0 ? "#6ee7b7" : "#c4b5fd",
          fontSize: 12.5, margin: 0, lineHeight: 1.65,
        }}>
          {netGain > 0
            ? (isRTL
                ? `الاشتراك يكلّف ${fmt(SUBSCRIPTION_PRICE)} دج — كنت ستربح ${fmt(netGain)} دج صافية هذا الشهر.`
                : `L'abonnement coûte ${fmt(SUBSCRIPTION_PRICE)} DA — vous auriez gagné ${fmt(netGain)} DA nets ce mois-ci.`)
            : (isRTL
                ? `يصبح الاشتراك مربحاً ابتداءً من ${fmt(breakEven)} دج شهرياً. باقٍ لك ${fmt(breakEven - revenue)} دج.`
                : `L'abonnement devient rentable à partir de ${fmt(breakEven)} DA par mois. Il vous manque ${fmt(breakEven - revenue)} DA.`)}
        </p>
      </div>

      <Link href="/abonnement" className="os-btn-chalk" style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "12px", fontSize: 13.5, textDecoration: "none",
      }}>
        <Crown size={15} />
        {isRTL ? "اعرف المزيد" : "En savoir plus"}
        <ArrowRight size={14} className="os-flip" />
      </Link>
    </div>
  );
}

function Box({ value, label, color, strike }: any) {
  return (
    <div className="os-glass" style={{ padding: "12px 13px", textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 7 }}>
        {strike && (
          <span style={{
            color: "#6d28d9", fontSize: 13, fontWeight: 600,
            textDecoration: "line-through",
          }}>{strike}</span>
        )}
        <span style={{ color, fontWeight: 800, fontSize: 18 }}>{value}</span>
      </div>
      <div style={{ color: "#8b7bb8", fontSize: 10.5, marginTop: 3 }}>{label}</div>
    </div>
  );
}
