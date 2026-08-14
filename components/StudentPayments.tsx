"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang-context";
import {
  getClasseEnrollmentsWithPayment,
  setEnrollmentPaid,
} from "@/lib/firestore";
import {
  Wallet, Check, X, Phone, MessageCircle, Loader2,
  AlertCircle, Users, TrendingUp,
} from "lucide-react";

/**
 * Suivi des encaissements élève par élève.
 *
 * Le professeur encaisse directement, hors plateforme. Sans cet écran
 * il tient son tableau sur papier — et la commission se calcule sur des
 * inscriptions parfois jamais réglées, ce qu'il finit par contester.
 */
export default function StudentPayments({
  classeId,
  classePrice,
  classeTitle,
}: {
  classeId: string;
  classePrice: number;
  classeTitle: string;
}) {
  const { isRTL } = useLang();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, [classeId]);

  async function load() {
    setLoading(true);
    try {
      setList(await getClasseEnrollmentsWithPayment(classeId));
    } catch (err) {
      console.error("Chargement des inscriptions échoué :", err);
      setError(isRTL ? "فشل التحميل" : "Échec du chargement");
    } finally {
      setLoading(false);
    }
  }

  async function toggle(e: any) {
    setBusy(e.id);
    setError(null);
    try {
      await setEnrollmentPaid(e.id, !e.paid, classePrice);
      setList(prev =>
        prev.map(x =>
          x.id === e.id
            ? { ...x, paid: !x.paid, paidAt: !x.paid ? new Date().toISOString() : null }
            : x
        )
      );
    } catch (err) {
      console.error("Mise à jour échouée :", err);
      setError(isRTL ? "فشلت العملية" : "Échec de la mise à jour");
    } finally {
      setBusy(null);
    }
  }

  const DA = isRTL ? "دج" : "DA";
  const fmt = (n: number) => (n || 0).toLocaleString("fr-DZ");

  const paidCount = list.filter(e => e.paid).length;
  const collected = paidCount * classePrice;
  const pending = (list.length - paidCount) * classePrice;

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 30 }}>
        <Loader2 size={22} style={{ color: "#FF8C00", animation: "sp 0.8s linear infinite" }} />
        <style>{`@keyframes sp { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <p style={{ color: "#6d28d9", fontSize: 12.5, textAlign: "center", padding: "20px 0" }}>
        {isRTL ? "لا يوجد طلاب مسجّلون بعد." : "Aucun élève inscrit pour l'instant."}
      </p>
    );
  }

  return (
    <div>
      {/* ═══ RÉSUMÉ ═══ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
        gap: 9, marginBottom: 14,
      }}>
        <Box icon={<Users size={14} />} label={isRTL ? "مسجّلون" : "Inscrits"}
          value={`${list.length}`} color="#a78bfa" />
        <Box icon={<Check size={14} />} label={isRTL ? "دفعوا" : "Ont payé"}
          value={`${paidCount}`} color="#22C55E" />
        <Box icon={<Wallet size={14} />} label={isRTL ? "المحصّل" : "Encaissé"}
          value={`${fmt(collected)}`} color="#22C55E" />
        <Box icon={<TrendingUp size={14} />} label={isRTL ? "في الانتظار" : "En attente"}
          value={`${fmt(pending)}`} color={pending > 0 ? "#FBBF24" : "#6d28d9"} />
      </div>

      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.28)",
          borderRadius: 10, padding: "9px 12px", marginBottom: 12,
        }}>
          <AlertCircle size={14} style={{ color: "#f87171", flexShrink: 0 }} />
          <span style={{ color: "#fca5a5", fontSize: 12 }}>{error}</span>
        </div>
      )}

      {/* ═══ LISTE ═══ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {list.map(e => (
          <div key={e.id} style={{
            display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap",
            background: e.paid ? "rgba(34,197,94,0.07)" : "rgba(20,8,45,0.55)",
            border: `1px solid ${e.paid ? "rgba(34,197,94,0.24)" : "rgba(124,58,237,0.16)"}`,
            borderRadius: 12, padding: "11px 13px",
          }}>
            <span style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: e.paid ? "rgba(34,197,94,0.16)" : "rgba(124,58,237,0.18)",
              color: e.paid ? "#4ade80" : "#c4b5fd",
              fontWeight: 800, fontSize: 13,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {(e.studentName || "?").charAt(0).toUpperCase()}
            </span>

            <div style={{ flex: 1, minWidth: 110 }}>
              <div style={{ color: "white", fontWeight: 650, fontSize: 13 }}>
                {e.studentName || "—"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <a href={`tel:${e.studentPhone}`} style={{
                  color: "#8b7bb8", fontSize: 11, textDecoration: "none",
                  display: "inline-flex", alignItems: "center", gap: 4,
                }}>
                  <Phone size={10} /> {e.studentPhone || "—"}
                </a>
                {e.paid && e.paidAt && (
                  <span style={{ color: "#4ade80", fontSize: 10.5 }}>
                    ✓ {new Date(e.paidAt).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", { day: "2-digit", month: "short" })}
                  </span>
                )}
              </div>
            </div>

            {/* Relance WhatsApp si impayé */}
            {!e.paid && e.studentPhone && (
              <a
                href={`https://wa.me/${String(e.studentPhone).replace(/\D/g, "")}?text=${encodeURIComponent(
                  isRTL
                    ? `مرحباً ${e.studentName}، بخصوص دفع درس « ${classeTitle} »...`
                    : `Bonjour ${e.studentName}, concernant le règlement du cours « ${classeTitle} »...`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp"
                style={{
                  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                  background: "rgba(34,197,94,0.13)", color: "#4ade80",
                  border: "1px solid rgba(34,197,94,0.26)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <MessageCircle size={14} />
              </a>
            )}

            {/* Bascule payé */}
            <button
              onClick={() => toggle(e)}
              disabled={busy === e.id}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
                background: e.paid ? "rgba(34,197,94,0.16)" : "linear-gradient(135deg, #FF8C00, #FF6B00)",
                color: e.paid ? "#4ade80" : "white",
                border: e.paid ? "1px solid rgba(34,197,94,0.3)" : "none",
                fontSize: 12, fontWeight: 700, padding: "8px 14px",
                borderRadius: 9, cursor: "pointer", fontFamily: "inherit",
                opacity: busy === e.id ? 0.6 : 1,
              }}
            >
              {busy === e.id
                ? <Loader2 size={13} style={{ animation: "sp 0.8s linear infinite" }} />
                : e.paid ? <Check size={13} /> : <Wallet size={13} />}
              {e.paid
                ? (isRTL ? "دفع" : "Payé")
                : (isRTL ? "تسجيل الدفع" : "Marquer payé")}
            </button>
          </div>
        ))}
      </div>

      <p style={{ color: "#4c1d95", fontSize: 10.5, margin: "12px 0 0", lineHeight: 1.5 }}>
        {isRTL
          ? "💡 عمولة أستاذي تُحتسب على المبالغ المحصّلة فعلياً."
          : "💡 La commission Ostadi porte sur les sommes réellement encaissées."}
      </p>

      <style>{`@keyframes sp { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Box({ icon, label, value, color }: any) {
  return (
    <div style={{
      background: "rgba(20,8,45,0.6)",
      border: "1px solid rgba(124,58,237,0.16)",
      borderRadius: 11, padding: "10px 12px", textAlign: "center",
    }}>
      <div style={{ color, display: "flex", justifyContent: "center", marginBottom: 4 }}>{icon}</div>
      <div style={{ color: "white", fontWeight: 800, fontSize: 15 }}>{value}</div>
      <div style={{ color: "#8b7bb8", fontSize: 10 }}>{label}</div>
    </div>
  );
}
