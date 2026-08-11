"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang-context";
import { getTeacherBilan, OVERDUE_DAYS, WARNING_DAYS } from "@/lib/firestore";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AlertTriangle, Wallet, Clock, X, Check } from "lucide-react";

/**
 * Bandeau de solde de commission — côté professeur.
 *
 * Une notification dans la cloche se perd facilement. Un bandeau
 * permanent en haut du dashboard, coloré selon l'ancienneté de la
 * dette, se voit à chaque connexion.
 *
 * Le professeur sait ce qu'il doit sans avoir à te le demander,
 * et toi tu relances moins.
 */
export default function CommissionAlert({ teacherId }: { teacherId: string }) {
  const { isRTL } = useLang();
  const [balance, setBalance] = useState(0);
  const [daysSince, setDaysSince] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => { load(); }, [teacherId]);

  async function load() {
    try {
      const b = await getTeacherBilan(teacherId, "all");
      setBalance(b.balance);

      // Ancienneté du dernier règlement
      const snap = await getDocs(
        query(
          collection(db, "commissionPayments"),
          where("teacherId", "==", teacherId),
          orderBy("paidAt", "desc"),
          limit(1)
        )
      );

      if (!snap.empty) {
        const last = (snap.docs[0].data() as any).paidAt;
        setDaysSince(Math.floor((Date.now() - new Date(last).getTime()) / 86_400_000));
      } else if (b.balance > 0) {
        setDaysSince(null); // jamais payé
      }
    } catch (err) {
      console.error("Chargement du solde échoué :", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading || dismissed) return null;

  const DA = isRTL ? "دج" : "DA";
  const fmt = (n: number) => n.toLocaleString("fr-DZ");

  /* ── Rien à devoir : on félicite discrètement ── */
  if (balance <= 0) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "rgba(34,197,94,0.08)",
        border: "1px solid rgba(34,197,94,0.24)",
        borderRadius: 13, padding: "11px 14px", marginBottom: 16,
      }}>
        <Check size={16} style={{ color: "#4ade80", flexShrink: 0 }} />
        <span style={{ color: "#6ee7b7", fontSize: 12.5, flex: 1 }}>
          {isRTL
            ? "حسابك مع أستاذي مسدّد بالكامل. شكراً!"
            : "Votre compte est à jour. Merci !"}
        </span>
      </div>
    );
  }

  const overdue = daysSince !== null && daysSince >= OVERDUE_DAYS;
  const warning = daysSince !== null && daysSince >= WARNING_DAYS && !overdue;

  const style = overdue
    ? { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.35)", color: "#f87171", text: "#fca5a5" }
    : warning
      ? { bg: "rgba(251,191,36,0.09)", border: "rgba(251,191,36,0.3)", color: "#fbbf24", text: "#fde68a" }
      : { bg: "rgba(255,140,0,0.08)", border: "rgba(255,140,0,0.26)", color: "#FF8C00", text: "#fdba74" };

  return (
    <div style={{
      background: style.bg,
      border: `1px solid ${style.border}`,
      borderRadius: 14,
      padding: 15,
      marginBottom: 18,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{
          width: 36, height: 36, borderRadius: 11, flexShrink: 0,
          background: `${style.color}1F`, color: style.color,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {overdue ? <AlertTriangle size={17} /> : warning ? <Clock size={17} /> : <Wallet size={17} />}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: style.color, fontWeight: 750, fontSize: 14, marginBottom: 4 }}>
            {overdue
              ? (isRTL ? "عمولة متأخرة" : "Commission en retard")
              : warning
                ? (isRTL ? "عمولة مستحقة قريباً" : "Commission bientôt due")
                : (isRTL ? "عمولة مستحقة" : "Commission à régler")}
          </div>

          <p style={{ color: style.text, fontSize: 12.5, margin: 0, lineHeight: 1.6 }}>
            {isRTL ? "المبلغ المستحق : " : "Montant dû : "}
            <b style={{ fontSize: 14 }}>{fmt(balance)} {DA}</b>
            {daysSince !== null && (
              <>
                {" · "}
                {isRTL
                  ? `آخر دفع منذ ${daysSince} يوم`
                  : `dernier règlement il y a ${daysSince} jours`}
              </>
            )}
            {daysSince === null && (
              <>
                {" · "}
                {isRTL ? "لم تسدّد أي مبلغ بعد" : "aucun règlement enregistré"}
              </>
            )}
          </p>

          {overdue && (
            <p style={{ color: style.text, fontSize: 11.5, margin: "8px 0 0", lineHeight: 1.5, opacity: 0.85 }}>
              {isRTL
                ? "يرجى التواصل مع إدارة أستاذي لتسوية وضعيتك."
                : "Merci de contacter l'équipe Ostadi pour régulariser votre situation."}
            </p>
          )}
        </div>

        <button
          onClick={() => setDismissed(true)}
          aria-label={isRTL ? "إغلاق" : "Fermer"}
          style={{
            background: "none", border: "none", color: style.color,
            cursor: "pointer", padding: 0, flexShrink: 0, opacity: 0.6,
          }}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
