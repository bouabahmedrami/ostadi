"use client";
import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import { trSubject, trLevel } from "@/lib/i18n/translate";
import { duplicateClasse } from "@/lib/firestore";
import SessionsPicker from "./SessionsPicker";
import { Copy, X, Calendar, Check, Loader2, AlertCircle } from "lucide-react";

/**
 * Reconduction d'un cours.
 *
 * Un professeur qui donne le même cours chaque mois ressaisissait tout.
 * Ici, il ne touche qu'aux dates — le reste est repris tel quel.
 */
export default function DuplicateClasseModal({
  classe,
  onClose,
  onDone,
}: {
  classe: any;
  onClose: () => void;
  onDone: () => void;
}) {
  const { isRTL } = useLang();
  const isMonthly = classe.priceType === "monthly";

  const [dateTime, setDateTime] = useState("");
  const [sessions, setSessions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = isMonthly ? sessions.length > 0 : !!dateTime;

  async function handleDuplicate() {
    if (!ready) return;
    setError(null);
    setBusy(true);
    try {
      await duplicateClasse(classe.id, {
        dateTime: isMonthly ? sessions[0] : new Date(dateTime).toISOString(),
        ...(isMonthly ? { sessions } : {}),
      });
      onDone();
      onClose();
    } catch (err: any) {
      console.error("Duplication échouée :", err);
      setError(
        err?.code === "permission-denied"
          ? (isRTL ? "ليست لديك الصلاحية." : "Vous n'avez pas le droit.")
          : (isRTL ? "فشل النسخ. حاول مرة أخرى." : "Échec de la duplication. Réessayez.")
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onClick={() => !busy && onClose()}
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background: "linear-gradient(160deg, #1a0d38, #0d0520)",
        border: "1px solid rgba(124,58,237,0.35)",
        borderRadius: 20, padding: 24,
        width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto",
      }}>

        {/* ═══ EN-TÊTE ═══ */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          gap: 12, marginBottom: 18,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              width: 42, height: 42, borderRadius: 13, flexShrink: 0,
              background: "rgba(255,140,0,0.16)", color: "#FF8C00",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Copy size={19} />
            </span>
            <div>
              <h2 style={{ color: "white", fontWeight: 800, fontSize: 16.5, margin: 0 }}>
                {isRTL ? "إعادة نشر الدرس" : "Reconduire ce cours"}
              </h2>
              <p style={{ color: "#a78bfa", fontSize: 12.5, margin: "3px 0 0" }}>
                {classe.title}
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={busy} style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: "rgba(124,58,237,0.18)", border: "none", color: "#a78bfa",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            <X size={16} />
          </button>
        </div>

        {/* ═══ CE QUI EST REPRIS ═══ */}
        <div style={{
          background: "rgba(10,0,20,0.4)", borderRadius: 13,
          padding: 14, marginBottom: 16,
        }}>
          <p style={{
            color: "#8b7bb8", fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 10px",
          }}>
            {isRTL ? "يُنسخ كما هو" : "Repris à l'identique"}
          </p>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10,
          }}>
            <Item label={isRTL ? "المادة" : "Matière"} value={trSubject(classe.subject, isRTL)} />
            <Item label={isRTL ? "المستوى" : "Niveau"} value={trLevel(classe.level, isRTL)} />
            <Item label={isRTL ? "السعر" : "Prix"} value={`${classe.price} ${isRTL ? "دج" : "DA"}`} color="#FF8C00" />
            <Item label={isRTL ? "المدة" : "Durée"} value={`${classe.durationMinutes} ${isRTL ? "د" : "min"}`} />
          </div>
        </div>

        {/* ═══ CE QUI REPART À ZÉRO ═══ */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 9,
          background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.22)",
          borderRadius: 11, padding: "11px 13px", marginBottom: 16,
        }}>
          <AlertCircle size={14} style={{ color: "#60a5fa", flexShrink: 0, marginTop: 1 }} />
          <p style={{ color: "#93c5fd", fontSize: 11.5, margin: 0, lineHeight: 1.55 }}>
            {isRTL
              ? "الدرس الجديد يبدأ فارغاً : لا تسجيلات، قاعة فيديو جديدة."
              : "Le nouveau cours démarre vierge : aucune inscription, nouvelle salle vidéo."}
          </p>
        </div>

        {/* ═══ NOUVELLES DATES ═══ */}
        <div style={{ marginBottom: 18 }}>
          <label style={{
            display: "flex", alignItems: "center", gap: 7,
            color: "#a78bfa", fontSize: 11.5, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8,
          }}>
            <Calendar size={13} style={{ color: "#FF8C00" }} />
            {isMonthly
              ? (isRTL ? "مواعيد الحصص الجديدة" : "Nouvelles dates des séances")
              : (isRTL ? "التاريخ والوقت الجديد" : "Nouvelle date et heure")}
          </label>

          {isMonthly ? (
            <SessionsPicker value={sessions} onChange={setSessions} />
          ) : (
            <input
              type="datetime-local"
              value={dateTime}
              onChange={e => setDateTime(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(26,10,60,0.7)", border: "1px solid rgba(124,58,237,0.3)",
                borderRadius: 11, padding: "12px 13px", fontSize: 13.5,
                color: "white", outline: "none", fontFamily: "inherit",
              }}
            />
          )}
        </div>

        {/* ═══ ERREUR ═══ */}
        {error && (
          <div style={{
            display: "flex", alignItems: "center", gap: 9,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 11, padding: "11px 13px", marginBottom: 14,
          }}>
            <AlertCircle size={14} style={{ color: "#f87171", flexShrink: 0 }} />
            <span style={{ color: "#fca5a5", fontSize: 12.5 }}>{error}</span>
          </div>
        )}

        {/* ═══ ACTION ═══ */}
        <button
          onClick={handleDuplicate}
          disabled={!ready || busy}
          style={{
            width: "100%", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 9,
            background: "linear-gradient(135deg, #FF8C00, #FF6B00)", color: "white",
            fontWeight: 800, padding: 14, borderRadius: 13,
            border: "none", cursor: ready && !busy ? "pointer" : "not-allowed",
            fontSize: 14.5, fontFamily: "inherit",
            opacity: !ready || busy ? 0.45 : 1,
          }}
        >
          {busy
            ? <><Loader2 size={16} style={{ animation: "sp 0.8s linear infinite" }} /> {isRTL ? "جارٍ..." : "Création..."}</>
            : <><Check size={16} /> {isRTL ? "إنشاء الدرس" : "Créer le cours"}</>}
        </button>

        <style>{`@keyframes sp { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

function Item({ label, value, color }: any) {
  return (
    <div>
      <div style={{ color: "#6d28d9", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.3px" }}>
        {label}
      </div>
      <div style={{ color: color || "white", fontWeight: 700, fontSize: 12.5, marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}
