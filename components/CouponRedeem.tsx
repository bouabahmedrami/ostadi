"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang-context";
import { checkCoupon, redeemCoupon, getClasseEnrollmentsWithPayment } from "@/lib/firestore";
import { useToast } from "./Toast";
import { haptic } from "@/lib/haptics";
import { ChalkCheck } from "./Chalk";
import {
  Ticket, Check, Loader2, AlertCircle, GraduationCap, User,
} from "lucide-react";

/**
 * Vérification d'un bon, côté professeur.
 *
 * ═══════════════════════════════════════════════════════════
 * ⚠️ La réduction est portée par la plateforme, pas par vous.
 *
 * C'est ce qui rend le système acceptable. Un professeur qui perdrait
 * 1 000 DA sur une opération de parrainage qu'il n'a pas décidée
 * refuserait les bons — et il aurait raison.
 *
 * Il encaisse donc son prix plein auprès de l'élève, et la réduction
 * est déduite de la commission qu'il doit à Ostadi. Le message
 * ci-dessous le dit explicitement : sans cette précision, un
 * professeur croirait qu'on lui demande de faire un cadeau.
 * ═══════════════════════════════════════════════════════════
 */
export default function CouponRedeem({
  classeId,
  classeTitle,
  classePrice,
  teacherId,
  onRedeemed,
}: {
  classeId: string;
  classeTitle: string;
  classePrice: number;
  teacherId: string;
  onRedeemed?: (discount: number) => void;
}) {
  const { isRTL } = useLang();
  const toast = useToast();

  /**
   * ⚠️ Le bon est cherché parmi les bons de l'élève sélectionné.
   *
   * On pourrait chercher par code seul, mais il faudrait alors
   * autoriser tout professeur à lire tous les bons de la plateforme.
   * Passer par l'élève garde la vérification stricte : un code deviné
   * ne donne accès à rien.
   */
  const [students, setStudents] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { loadStudents(); }, [classeId]);

  async function loadStudents() {
    setLoadingStudents(true);
    try {
      const list = await getClasseEnrollmentsWithPayment(classeId);
      setStudents(list);
      if (list.length === 1) setSelected(list[0]);
    } catch (err) {
      console.warn("Chargement des élèves échoué :", err);
    } finally {
      setLoadingStudents(false);
    }
  }

  const DA = isRTL ? "دج" : "DA";
  const fmt = (n: number) => n.toLocaleString("fr-DZ");

  async function verify() {
    if (!selected) return;
    if (code.replace(/[^A-Za-z0-9]/g, "").length !== 8) return;
    setChecking(true);
    setResult(null);
    haptic("tap");

    try {
      const r = await checkCoupon(code, selected.studentId, classePrice);
      setResult(r);
      haptic(r.valid ? "success" : "warning");
    } catch (err) {
      console.error("Vérification du bon échouée :", err);
      toast.error(isRTL ? "تعذّر التحقّق" : "Vérification impossible");
    } finally {
      setChecking(false);
    }
  }

  async function apply() {
    if (!result?.valid || !result.coupon) return;
    setRedeeming(true);

    try {
      await redeemCoupon({
        couponId: result.coupon.id,
        studentId: selected.studentId,
        classeId,
        classeTitle,
        teacherId,
        classePrice,
        discount: result.discount,
      });

      haptic("success");
      setDone(true);
      onRedeemed?.(result.discount);
    } catch (err) {
      console.error("Application du bon échouée :", err);
      toast.error(isRTL ? "فشل التطبيق" : "Application impossible");
    } finally {
      setRedeeming(false);
    }
  }

  /* ═══ CONFIRMATION ═══ */
  if (done) {
    return (
      <div className="os-glass" style={{
        padding: "24px 20px", borderRadius: 14, textAlign: "center",
        borderColor: "rgba(34,197,94,0.32)",
      }}>
        <div style={{ marginBottom: 12 }}>
          <ChalkCheck size={46} />
        </div>
        <p style={{ color: "#4ade80", fontWeight: 750, fontSize: 14.5, margin: "0 0 6px" }}>
          {isRTL ? "تمّ تطبيق القسيمة" : "Bon appliqué"}
        </p>
        <p style={{ color: "#8b7bb8", fontSize: 12, margin: 0, lineHeight: 1.65 }}>
          {isRTL
            ? `خصم ${fmt(result.discount)} دج · يُخصم من عمولتك، وليس من مدخولك.`
            : `${fmt(result.discount)} DA déduits de votre commission — pas de vos revenus.`}
        </p>
      </div>
    );
  }

  const errorLabels: Record<string, { fr: string; ar: string }> = {
    "not-found": {
      fr: "Ce code ne correspond à aucun bon de cet élève.",
      ar: "هذا الكود لا يطابق أيّ قسيمة لهذا الطالب.",
    },
    "used": {
      fr: "Ce bon a déjà été utilisé.",
      ar: "تمّ استعمال هذه القسيمة من قبل.",
    },
    "expired": {
      fr: "Ce bon a expiré.",
      ar: "انتهت صلاحية هذه القسيمة.",
    },
  };

  return (
    <div className="os-glass" style={{ padding: "15px 16px", borderRadius: 14 }}>
      <p style={{
        display: "flex", alignItems: "center", gap: 8,
        color: "#a78bfa", fontSize: 11, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 10px",
      }}>
        <Ticket size={13} style={{ color: "#FF8C00" }} />
        {isRTL ? "قسيمة الطالب" : "Bon de l'élève"}
      </p>

      {/* Sélection de l'élève — inutile s'il n'y en a qu'un */}
      {students.length > 1 && (
        <div style={{ marginBottom: 11 }}>
          <select
            value={selected?.studentId || ""}
            onChange={e => {
              setSelected(students.find(s => s.studentId === e.target.value) || null);
              setResult(null);
            }}
            className="os-input"
            style={{ fontSize: 13 }}
          >
            <option value="" style={{ background: "#1A0A3C" }}>
              {isRTL ? "اختر الطالب..." : "Choisir l'élève..."}
            </option>
            {students.map(s => (
              <option key={s.studentId} value={s.studentId} style={{ background: "#1A0A3C" }}>
                {s.studentName}
              </option>
            ))}
          </select>
        </div>
      )}

      {loadingStudents ? (
        <div style={{ textAlign: "center", padding: 14 }}>
          <Loader2 size={16} style={{ color: "#FF8C00", animation: "crspin 0.8s linear infinite" }} />
        </div>
      ) : students.length === 0 ? (
        <p style={{ color: "#6d28d9", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
          {isRTL
            ? "لا طلاب مسجّلون في هذا الدرس بعد."
            : "Aucun élève inscrit à ce cours pour l'instant."}
        </p>
      ) : (
      <div style={{ display: "flex", gap: 8, marginBottom: result ? 12 : 0 }}>
        <input
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setResult(null); }}
          onKeyDown={e => e.key === "Enter" && verify()}
          placeholder="ABCD-1234"
          maxLength={9}
          className="os-input"
          style={{
            flex: 1, letterSpacing: "2px",
            fontFamily: "monospace", fontSize: 14,
          }}
        />
        <button
          onClick={verify}
          disabled={checking || !selected || code.replace(/[^A-Za-z0-9]/g, "").length !== 8}
          className="os-btn-ghost"
          style={{
            padding: "0 18px", fontSize: 13, fontWeight: 700,
            display: "flex", alignItems: "center", gap: 6,
            opacity: selected && code.replace(/[^A-Za-z0-9]/g, "").length === 8 ? 1 : 0.45,
          }}
        >
          {checking
            ? <Loader2 size={14} style={{ animation: "crspin 0.8s linear infinite" }} />
            : (isRTL ? "تحقّق" : "Vérifier")}
        </button>
      </div>
      )}

      {/* ═══ BON VALIDE ═══ */}
      {result?.valid && (
        <div style={{
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.28)",
          borderRadius: 12, padding: "13px 14px",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 11, marginBottom: 11,
          }}>
            <span style={{
              width: 36, height: 36, borderRadius: 11, flexShrink: 0,
              background: "rgba(34,197,94,0.15)", color: "#4ade80",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {result.free ? <GraduationCap size={17} /> : <Ticket size={17} />}
            </span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#4ade80", fontWeight: 800, fontSize: 16 }}>
                {result.free
                  ? (isRTL ? "درس مجاني" : "Cours offert")
                  : `− ${fmt(result.discount)} ${DA}`}
              </div>
              <div style={{ color: "#8b7bb8", fontSize: 11, marginTop: 2 }}>
                {selected?.studentName} · {isRTL ? "يدفع" : "paie"} {fmt(Math.max(classePrice - result.discount, 0))} {DA}
              </div>
            </div>
          </div>

          {/* Le point qui décide de l'acceptation du bon */}
          <p style={{
            color: "#93c5fd", fontSize: 11, margin: "0 0 12px",
            lineHeight: 1.65,
            background: "rgba(59,130,246,0.07)",
            border: "1px solid rgba(59,130,246,0.18)",
            borderRadius: 9, padding: "9px 11px",
          }}>
            ℹ️ {isRTL
              ? "تحصّل على سعرك كاملاً. الخصم يُحسم من عمولة أستاذي، وليس من مدخولك."
              : "Vous encaissez votre prix plein. La réduction est déduite de la commission Ostadi, pas de vos revenus."}
          </p>

          <button
            onClick={apply}
            disabled={redeeming}
            className="os-btn-chalk"
            style={{
              width: "100%", padding: 11, fontSize: 13.5,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}
          >
            {redeeming
              ? <><Loader2 size={14} style={{ animation: "crspin 0.8s linear infinite" }} /> {isRTL ? "جارٍ..." : "Application..."}</>
              : <><Check size={15} /> {isRTL ? "تطبيق القسيمة" : "Appliquer le bon"}</>}
          </button>
        </div>
      )}

      {/* ═══ BON REFUSÉ ═══ */}
      {result && !result.valid && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 9,
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.26)",
          borderRadius: 12, padding: "11px 13px",
        }}>
          <AlertCircle size={15} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
          <span style={{ color: "#fca5a5", fontSize: 12, lineHeight: 1.6 }}>
            {isRTL
              ? errorLabels[result.reason]?.ar
              : errorLabels[result.reason]?.fr}
          </span>
        </div>
      )}

      <style>{`@keyframes crspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
