"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang-context";
import {
  getAllReports, updateReportStatus, suspendAccount, unsuspendAccount,
  Report, ReportCategory, ReportStatus, URGENT_CATEGORIES,
} from "@/lib/firestore";
import {
  Flag, ShieldAlert, AlertTriangle, UserX, Wallet, BookX, HelpCircle,
  Check, X, Eye, Loader2, Ban, MessageSquare, ExternalLink,
} from "lucide-react";
import Link from "next/link";

const CAT_META: Record<ReportCategory, { icon: React.ReactNode; fr: string; ar: string; color: string }> = {
  safety: { icon: <ShieldAlert size={14} />, fr: "Sécurité mineur", ar: "سلامة قاصر", color: "#EF4444" },
  inappropriate: { icon: <AlertTriangle size={14} />, fr: "Comportement", ar: "سلوك", color: "#F97316" },
  fake: { icon: <UserX size={14} />, fr: "Faux profil", ar: "ملف مزيف", color: "#FBBF24" },
  payment: { icon: <Wallet size={14} />, fr: "Paiement", ar: "دفع", color: "#3B82F6" },
  quality: { icon: <BookX size={14} />, fr: "Qualité", ar: "جودة", color: "#a78bfa" },
  other: { icon: <HelpCircle size={14} />, fr: "Autre", ar: "أخرى", color: "#8b7bb8" },
};

const STATUS_META: Record<ReportStatus, { fr: string; ar: string; color: string; bg: string }> = {
  open: { fr: "Ouvert", ar: "مفتوح", color: "#f87171", bg: "rgba(239,68,68,0.14)" },
  reviewing: { fr: "En cours", ar: "قيد المراجعة", color: "#fbbf24", bg: "rgba(251,191,36,0.14)" },
  resolved: { fr: "Résolu", ar: "تمت المعالجة", color: "#4ade80", bg: "rgba(34,197,94,0.14)" },
  dismissed: { fr: "Classé", ar: "مغلق", color: "#8b7bb8", bg: "rgba(124,58,237,0.1)" },
};

/**
 * Traitement des signalements.
 *
 * Les cas de sécurité remontent automatiquement en tête, quelle que
 * soit leur date. Sur une plateforme où des adultes échangent avec
 * des mineurs, un signalement de ce type ne doit jamais se perdre
 * dans une liste chronologique.
 */
export default function ReportsPanel() {
  const { isRTL } = useLang();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "urgent">("open");
  const [busy, setBusy] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      setReports(await getAllReports());
    } catch (err) {
      console.error("Chargement des signalements échoué :", err);
      setError(isRTL ? "فشل التحميل" : "Échec du chargement");
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(r: Report, status: ReportStatus) {
    setBusy(r.id);
    setError(null);
    try {
      await updateReportStatus(r.id, status, noteFor === r.id ? note : undefined);
      setNoteFor(null);
      setNote("");
      await load();
    } catch (err) {
      console.error("Mise à jour échouée :", err);
      setError(isRTL ? "فشلت العملية" : "Échec de la mise à jour");
    } finally {
      setBusy(null);
    }
  }

  async function handleSuspend(r: Report) {
    const ok = window.confirm(
      isRTL
        ? `تعليق حساب ${r.targetName} ؟\n\nستُغلق كل دروسه ولن يظهر في المنصة.\nيمكن التراجع لاحقاً.`
        : `Suspendre le compte de ${r.targetName} ?\n\nTous ses cours seront fermés et il disparaîtra de la plateforme.\nAction réversible.`
    );
    if (!ok) return;

    setBusy(r.id);
    try {
      await suspendAccount(r.targetId, `Signalement : ${CAT_META[r.category].fr}`);
      await updateReportStatus(r.id, "resolved", "Compte suspendu");
      await load();
    } catch (err) {
      console.error("Suspension échouée :", err);
      setError(isRTL ? "فشل التعليق" : "Échec de la suspension");
    } finally {
      setBusy(null);
    }
  }

  const filtered = reports.filter(r => {
    if (filter === "open") return r.status === "open" || r.status === "reviewing";
    if (filter === "urgent") return URGENT_CATEGORIES.includes(r.category) && r.status !== "resolved" && r.status !== "dismissed";
    return true;
  });

  const counts = {
    open: reports.filter(r => r.status === "open").length,
    urgent: reports.filter(r => URGENT_CATEGORIES.includes(r.category) && r.status === "open").length,
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <Loader2 size={24} style={{ color: "#FF8C00", animation: "sp 0.8s linear infinite" }} />
        <style>{`@keyframes sp { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* ═══ ALERTE URGENCE ═══ */}
      {counts.urgent > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 11,
          background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)",
          borderRadius: 13, padding: "13px 15px", marginBottom: 16,
        }}>
          <ShieldAlert size={18} style={{ color: "#f87171", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ color: "#f87171", fontWeight: 750, fontSize: 13.5 }}>
              {counts.urgent} {isRTL
                ? "إبلاغ يتطلّب تدخّلاً فورياً"
                : `signalement${counts.urgent > 1 ? "s" : ""} à traiter en priorité`}
            </div>
            <div style={{ color: "#fca5a5", fontSize: 11.5, marginTop: 2 }}>
              {isRTL
                ? "سلامة أو سلوك — تعامل معها قبل أي شيء آخر."
                : "Sécurité ou comportement — à examiner avant tout le reste."}
            </div>
          </div>
        </div>
      )}

      {/* ═══ FILTRES ═══ */}
      <div style={{ display: "flex", gap: 7, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { id: "open", label: isRTL ? "قيد المعالجة" : "À traiter", n: counts.open },
          { id: "urgent", label: isRTL ? "عاجل" : "Urgents", n: counts.urgent },
          { id: "all", label: isRTL ? "الكل" : "Tous", n: reports.length },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id as any)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: filter === f.id ? "#FF8C00" : "rgba(124,58,237,0.08)",
              border: `1px solid ${filter === f.id ? "#FF8C00" : "rgba(124,58,237,0.2)"}`,
              color: filter === f.id ? "white" : "#a78bfa",
              fontSize: 12.5, fontWeight: 700, padding: "9px 15px",
              borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
            }}>
            {f.label}
            {f.n > 0 && (
              <span style={{
                background: filter === f.id ? "rgba(0,0,0,0.2)" : "rgba(124,58,237,0.25)",
                fontSize: 11, padding: "1px 7px", borderRadius: 999,
              }}>{f.n}</span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 9,
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 11, padding: "11px 13px", marginBottom: 14,
        }}>
          <AlertTriangle size={14} style={{ color: "#f87171", flexShrink: 0 }} />
          <span style={{ color: "#fca5a5", fontSize: 12.5, flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ═══ LISTE ═══ */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "34px 0" }}>
          <Check size={28} style={{ color: "#4ade80", marginBottom: 10 }} />
          <p style={{ color: "#6d28d9", fontSize: 13, margin: 0 }}>
            {filter === "all"
              ? (isRTL ? "لا توجد إبلاغات." : "Aucun signalement.")
              : (isRTL ? "لا شيء قيد المعالجة ✓" : "Rien à traiter ✓")}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(r => {
            const cat = CAT_META[r.category];
            const st = STATUS_META[r.status];
            const urgent = URGENT_CATEGORIES.includes(r.category);
            const isOpen = r.status === "open" || r.status === "reviewing";

            return (
              <div key={r.id} style={{
                background: urgent && isOpen ? "rgba(239,68,68,0.06)" : "rgba(20,8,45,0.55)",
                border: `1px solid ${urgent && isOpen ? "rgba(239,68,68,0.3)" : "rgba(124,58,237,0.16)"}`,
                borderRadius: 14, padding: 15,
              }}>
                {/* En-tête */}
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 11,
                  flexWrap: "wrap", marginBottom: 11,
                }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    background: `${cat.color}1F`, color: cat.color,
                    fontSize: 11, fontWeight: 700, padding: "5px 11px", borderRadius: 999,
                    flexShrink: 0,
                  }}>
                    {cat.icon} {isRTL ? cat.ar : cat.fr}
                  </span>

                  <span style={{
                    background: st.bg, color: st.color,
                    fontSize: 11, fontWeight: 700, padding: "5px 11px", borderRadius: 999,
                  }}>
                    {isRTL ? st.ar : st.fr}
                  </span>

                  <span style={{ flex: 1 }} />

                  <span style={{ color: "#6d28d9", fontSize: 11, flexShrink: 0 }}>
                    {new Date(r.createdAt).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Qui / quoi */}
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 11, marginBottom: 12,
                  paddingBottom: 12, borderBottom: "1px solid rgba(124,58,237,0.14)",
                }}>
                  <div>
                    <div style={{ color: "#6d28d9", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                      {isRTL ? "المُبلَّغ عنه" : "Signalé"}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <span style={{ color: "white", fontWeight: 700, fontSize: 13 }}>{r.targetName}</span>
                      {r.targetType === "teacher" && (
                        <Link href={`/professeur/${r.targetId}`} target="_blank"
                          style={{ color: "#a78bfa", display: "flex" }}>
                          <ExternalLink size={11} />
                        </Link>
                      )}
                      {r.targetType === "classe" && (
                        <Link href={`/classe/${r.targetId}`} target="_blank"
                          style={{ color: "#a78bfa", display: "flex" }}>
                          <ExternalLink size={11} />
                        </Link>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: "#6d28d9", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                      {isRTL ? "المُبلِّغ" : "Auteur"}
                    </div>
                    <div style={{ color: "#c4b5fd", fontSize: 13, marginTop: 3 }}>
                      {r.reporterName}
                      <span style={{ color: "#6d28d9", fontSize: 11 }}>
                        {" · "}{r.reporterRole === "teacher" ? (isRTL ? "أستاذ" : "prof") : (isRTL ? "طالب" : "élève")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div style={{
                  background: "rgba(10,0,20,0.4)", borderRadius: 11,
                  padding: "11px 13px", marginBottom: 12,
                }}>
                  <p style={{ color: "#c4b5fd", fontSize: 12.5, margin: 0, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                    {r.description}
                  </p>
                </div>

                {/* Note admin existante */}
                {r.adminNote && (
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    background: "rgba(124,58,237,0.08)", borderRadius: 10,
                    padding: "9px 12px", marginBottom: 12,
                  }}>
                    <MessageSquare size={12} style={{ color: "#a78bfa", flexShrink: 0, marginTop: 2 }} />
                    <span style={{ color: "#a78bfa", fontSize: 11.5, lineHeight: 1.55 }}>
                      {r.adminNote}
                    </span>
                  </div>
                )}

                {/* Champ de note */}
                {noteFor === r.id && (
                  <input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder={isRTL ? "ملاحظة داخلية (اختياري)" : "Note interne (optionnel)"}
                    style={{
                      width: "100%", boxSizing: "border-box", marginBottom: 10,
                      background: "rgba(26,10,60,0.7)", border: "1px solid rgba(124,58,237,0.28)",
                      borderRadius: 10, padding: "9px 12px", fontSize: 12.5,
                      color: "white", outline: "none", fontFamily: "inherit",
                    }}
                  />
                )}

                {/* Actions */}
                {isOpen && (
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    {r.status === "open" && (
                      <button onClick={() => setStatus(r, "reviewing")} disabled={busy === r.id}
                        style={btn("rgba(251,191,36,0.14)", "#fbbf24", "rgba(251,191,36,0.3)")}>
                        <Eye size={13} /> {isRTL ? "قيد المراجعة" : "Prendre en charge"}
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (noteFor === r.id) setStatus(r, "resolved");
                        else { setNoteFor(r.id); setNote(""); }
                      }}
                      disabled={busy === r.id}
                      style={btn("rgba(34,197,94,0.14)", "#4ade80", "rgba(34,197,94,0.3)")}
                    >
                      {busy === r.id
                        ? <Loader2 size={13} style={{ animation: "sp 0.8s linear infinite" }} />
                        : <Check size={13} />}
                      {noteFor === r.id
                        ? (isRTL ? "تأكيد الحل" : "Confirmer résolu")
                        : (isRTL ? "معالج" : "Résolu")}
                    </button>

                    <button onClick={() => setStatus(r, "dismissed")} disabled={busy === r.id}
                      style={btn("transparent", "#8b7bb8", "rgba(124,58,237,0.28)")}>
                      <X size={13} /> {isRTL ? "بدون متابعة" : "Sans suite"}
                    </button>

                    {r.targetType === "teacher" && (
                      <button onClick={() => handleSuspend(r)} disabled={busy === r.id}
                        style={btn("rgba(239,68,68,0.12)", "#f87171", "rgba(239,68,68,0.35)")}>
                        <Ban size={13} /> {isRTL ? "تعليق الحساب" : "Suspendre le compte"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes sp { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function btn(bg: string, color: string, border: string): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: bg, color, border: `1px solid ${border}`,
    fontSize: 12, fontWeight: 700, padding: "8px 13px",
    borderRadius: 9, cursor: "pointer", fontFamily: "inherit",
  };
}
