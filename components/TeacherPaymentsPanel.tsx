"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang-context";
import { trWilaya } from "@/lib/i18n/translate";
import {
  getTeachersCommissionStatus, recordCommissionPayment,
  getTeacherBilan, TeacherCommission,
  OVERDUE_DAYS, WARNING_DAYS,
} from "@/lib/firestore";
import { downloadCSV, printPDF } from "@/lib/export-utils";
import {
  Wallet, AlertTriangle, Check, X, Download, FileText,
  Phone, Search, Loader2, TrendingUp, Clock,
} from "lucide-react";

const C = {
  card: "linear-gradient(145deg, rgba(20,8,45,0.92), rgba(15,5,30,0.92))",
  border: "rgba(124,58,237,0.22)",
  orange: "#FF8C00",
  soft: "#c4b5fd",
  muted: "#8b7bb8",
  dim: "#6d28d9",
  green: "#22C55E",
  amber: "#FBBF24",
  red: "#EF4444",
};

const STATUS = {
  overdue: { color: C.red, bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)" },
  warning: { color: C.amber, bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.3)" },
  ok: { color: C.green, bg: "rgba(34,197,94,0.09)", border: "rgba(34,197,94,0.25)" },
  none: { color: C.muted, bg: "rgba(124,58,237,0.06)", border: "rgba(124,58,237,0.18)" },
};

export default function TeacherPaymentsPanel({ adminUid }: { adminUid: string }) {
  const { isRTL } = useLang();
  const [list, setList] = useState<TeacherCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "overdue" | "unpaid">("all");
  const [error, setError] = useState<string | null>(null);

  // Formulaire de règlement
  const [paying, setPaying] = useState<TeacherCommission | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("baridimob");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setList(await getTeachersCommissionStatus());
    } catch (err: any) {
      console.error("Chargement des commissions échoué :", err);
      setError(isRTL ? "فشل تحميل البيانات" : "Échec du chargement");
    } finally {
      setLoading(false);
    }
  }

  const DA = isRTL ? "دج" : "DA";
  const fmt = (n: number) => (n || 0).toLocaleString("fr-DZ");

  function openPayment(t: TeacherCommission) {
    setPaying(t);
    setAmount(String(Math.max(t.balance, 0)));
    setReference("");
    setMethod("baridimob");
  }

  async function savePayment() {
    if (!paying || Number(amount) <= 0) return;
    setSaving(true);
    try {
      await recordCommissionPayment({
        teacherId: paying.teacherId,
        teacherName: paying.teacherName,
        amount: Number(amount),
        method,
        reference,
        recordedBy: adminUid,
      });
      setPaying(null);
      await load();
    } catch (err: any) {
      console.error("Enregistrement du règlement échoué :", err);
      setError(isRTL ? "فشل تسجيل الدفع" : "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  /* ── Export global ── */
  function exportAllCSV() {
    downloadCSV(
      "commissions-professeurs",
      isRTL
        ? ["الأستاذ", "الهاتف", "الولاية", "رقم الأعمال", "العمولة المستحقة", "المدفوع", "الرصيد", "آخر دفع", "الأيام", "الحالة"]
        : ["Professeur", "Téléphone", "Wilaya", "CA généré", "Commission due", "Payé", "Solde", "Dernier paiement", "Jours", "Statut"],
      filtered.map(t => [
        t.teacherName,
        t.phone,
        trWilaya(t.wilaya, isRTL),
        t.totalRevenue,
        t.totalCommission,
        t.totalPaid,
        t.balance,
        t.lastPaymentAt
          ? new Date(t.lastPaymentAt).toLocaleDateString("fr-DZ")
          : (isRTL ? "لم يدفع أبداً" : "Jamais"),
        t.daysSincePayment ?? "—",
        statusLabel(t.status),
      ])
    );
  }

  function exportAllPDF() {
    printPDF({
      title: isRTL ? "حالة عمولات الأساتذة" : "Situation des commissions professeurs",
      subtitle: isRTL ? `${filtered.length} أستاذ` : `${filtered.length} professeurs`,
      isRTL,
      sections: [
        {
          title: isRTL ? "ملخص" : "Synthèse",
          pairs: [
            [isRTL ? "إجمالي رقم الأعمال" : "CA total généré", `${fmt(totals.revenue)} ${DA}`],
            [isRTL ? "العمولات المستحقة" : "Commissions dues", `${fmt(totals.commission)} ${DA}`],
            [isRTL ? "المحصّل" : "Encaissé", `${fmt(totals.paid)} ${DA}`],
            [isRTL ? "الرصيد المتبقي" : "Reste à encaisser", `${fmt(totals.balance)} ${DA}`],
            [isRTL ? "متأخرون" : "En retard", `${counts.overdue}`],
            [isRTL ? "قريبون من الاستحقاق" : "Bientôt dus", `${counts.warning}`],
          ],
        },
        {
          title: isRTL ? "التفاصيل" : "Détail par professeur",
          headers: isRTL
            ? ["الأستاذ", "الولاية", "العمولة", "المدفوع", "الرصيد", "الأيام", "الحالة"]
            : ["Professeur", "Wilaya", "Commission", "Payé", "Solde", "Jours", "Statut"],
          rows: filtered.map(t => [
            t.teacherName,
            trWilaya(t.wilaya, isRTL),
            `${fmt(t.totalCommission)} ${DA}`,
            `${fmt(t.totalPaid)} ${DA}`,
            `${fmt(t.balance)} ${DA}`,
            t.daysSincePayment ?? "—",
            statusLabel(t.status),
          ]),
        },
      ],
    });
  }

  /* ── Export individuel ── */
  async function exportTeacher(t: TeacherCommission, format: "csv" | "pdf") {
    setExporting(t.teacherId);
    try {
      const b = await getTeacherBilan(t.teacherId, "all");

      if (format === "csv") {
        downloadCSV(
          `bilan-${t.teacherName.replace(/\s+/g, "-")}`,
          isRTL
            ? ["التاريخ", "الدرس", "المادة", "المستوى", "الطالب", "الهاتف", "السعر", "الحضور"]
            : ["Date", "Cours", "Matière", "Niveau", "Élève", "Téléphone", "Prix", "Présence"],
          b.lines.map(l => [
            new Date(l.date).toLocaleDateString("fr-DZ"),
            l.classeTitle,
            l.subject,
            l.level,
            l.studentName,
            l.studentPhone,
            l.price,
            l.attended ? (isRTL ? "نعم" : "Oui") : (isRTL ? "لا" : "Non"),
          ])
        );
      } else {
        printPDF({
          title: isRTL ? `بيان ${t.teacherName}` : `Bilan — ${t.teacherName}`,
          subtitle: `${trWilaya(t.wilaya, isRTL)} · ${t.phone}`,
          isRTL,
          sections: [
            {
              title: isRTL ? "الملخص المالي" : "Synthèse financière",
              pairs: [
                [isRTL ? "رقم الأعمال" : "CA généré", `${fmt(b.grossRevenue)} ${DA}`],
                [isRTL ? "عمولة أستاذي (10٪)" : "Commission Ostadi (10%)", `${fmt(b.commission)} ${DA}`],
                [isRTL ? "صافي الأستاذ" : "Net professeur", `${fmt(b.netRevenue)} ${DA}`],
                [isRTL ? "المدفوع" : "Déjà réglé", `${fmt(b.paid)} ${DA}`],
                [isRTL ? "الرصيد" : "Solde", `${fmt(b.balance)} ${DA}`],
                [isRTL ? "عدد الطلاب" : "Élèves", `${b.studentsCount}`],
              ],
            },
            {
              title: isRTL ? "التسجيلات" : "Inscriptions",
              headers: isRTL
                ? ["التاريخ", "الدرس", "الطالب", "السعر"]
                : ["Date", "Cours", "Élève", "Prix"],
              rows: b.lines.map(l => [
                new Date(l.date).toLocaleDateString("fr-DZ"),
                l.classeTitle,
                l.studentName,
                `${fmt(l.price)} ${DA}`,
              ]),
            },
            b.payments.length > 0
              ? {
                  title: isRTL ? "سجل المدفوعات" : "Historique des règlements",
                  headers: isRTL ? ["التاريخ", "المبلغ", "الطريقة"] : ["Date", "Montant", "Méthode"],
                  rows: b.payments.map((p: any) => [
                    new Date(p.paidAt).toLocaleDateString("fr-DZ"),
                    `${fmt(p.amount)} ${DA}`,
                    (p.method || "—").toUpperCase(),
                  ]),
                }
              : { text: isRTL ? "لا توجد مدفوعات مسجّلة." : "Aucun règlement enregistré." },
          ],
        });
      }
    } catch (err) {
      console.error("Export échoué :", err);
      setError(isRTL ? "فشل التصدير" : "Échec de l'export");
    } finally {
      setExporting(null);
    }
  }

  function statusLabel(s: string) {
    if (isRTL) {
      return s === "overdue" ? "متأخر" : s === "warning" ? "قريب" : s === "ok" ? "منتظم" : "لا شيء";
    }
    return s === "overdue" ? "En retard" : s === "warning" ? "Bientôt dû" : s === "ok" ? "À jour" : "—";
  }

  /* ── Filtrage ── */
  const filtered = list.filter(t => {
    if (filter === "overdue" && t.status !== "overdue") return false;
    if (filter === "unpaid" && t.balance <= 0) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        t.teacherName.toLowerCase().includes(q) ||
        t.phone.includes(q) ||
        t.wilaya.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totals = list.reduce(
    (acc, t) => ({
      revenue: acc.revenue + t.totalRevenue,
      commission: acc.commission + t.totalCommission,
      paid: acc.paid + t.totalPaid,
      balance: acc.balance + Math.max(t.balance, 0),
    }),
    { revenue: 0, commission: 0, paid: 0, balance: 0 }
  );

  const counts = {
    overdue: list.filter(t => t.status === "overdue").length,
    warning: list.filter(t => t.status === "warning").length,
  };

  if (loading) {
    return (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 40, textAlign: "center" }}>
        <Loader2 size={26} style={{ color: C.orange, animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* ═══ SYNTHÈSE ═══ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 12, marginBottom: 18,
      }}>
        <Stat label={isRTL ? "العمولات المستحقة" : "Commissions dues"}
          value={`${fmt(totals.commission)} ${DA}`} color={C.orange} icon={<Wallet size={17} />} />
        <Stat label={isRTL ? "المحصّل" : "Encaissé"}
          value={`${fmt(totals.paid)} ${DA}`} color={C.green} icon={<Check size={17} />} />
        <Stat label={isRTL ? "الرصيد المتبقي" : "Reste à encaisser"}
          value={`${fmt(totals.balance)} ${DA}`} color="#3B82F6" icon={<TrendingUp size={17} />} />
        <Stat label={isRTL ? "متأخرون" : "En retard"}
          value={`${counts.overdue}`} color={C.red} icon={<AlertTriangle size={17} />} />
      </div>

      {/* ═══ ERREUR ═══ */}
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: 12, padding: "11px 14px", marginBottom: 14,
        }}>
          <AlertTriangle size={15} style={{ color: "#f87171", flexShrink: 0 }} />
          <span style={{ color: "#fca5a5", fontSize: 12.5, flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ═══ BARRE D'OUTILS ═══ */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 180,
          background: "rgba(26,10,60,0.6)", border: "1px solid rgba(124,58,237,0.22)",
          borderRadius: 11, padding: "0 12px",
        }}>
          <Search size={14} style={{ color: C.dim, flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isRTL ? "ابحث عن أستاذ..." : "Rechercher un professeur..."}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "white", fontSize: 13, fontFamily: "inherit", padding: "10px 0",
            }}
          />
        </div>

        {[
          { id: "all", label: isRTL ? "الكل" : "Tous" },
          { id: "unpaid", label: isRTL ? "غير مسدّد" : "Impayés" },
          { id: "overdue", label: isRTL ? "متأخرون" : "En retard" },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id as any)}
            style={{
              background: filter === f.id ? C.orange : "rgba(124,58,237,0.08)",
              border: `1px solid ${filter === f.id ? C.orange : "rgba(124,58,237,0.2)"}`,
              color: filter === f.id ? "white" : "#a78bfa",
              fontSize: 12, fontWeight: 700, padding: "9px 14px",
              borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
            }}>
            {f.label}
          </button>
        ))}

        <button onClick={exportAllCSV} style={btnStyle("rgba(34,197,94,0.14)", "#4ade80", "rgba(34,197,94,0.3)")}>
          <Download size={13} /> CSV
        </button>
        <button onClick={exportAllPDF} style={btnStyle("rgba(239,68,68,0.12)", "#fca5a5", "rgba(239,68,68,0.28)")}>
          <FileText size={13} /> PDF
        </button>
      </div>

      {/* ═══ LISTE ═══ */}
      {filtered.length === 0 ? (
        <p style={{ color: C.dim, fontSize: 13, textAlign: "center", padding: "30px 0" }}>
          {isRTL ? "لا توجد نتائج" : "Aucun résultat"}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(t => {
            const st = STATUS[t.status];
            return (
              <div key={t.teacherId} style={{
                background: st.bg,
                border: `1px solid ${st.border}`,
                borderRadius: 14, padding: 14,
              }}>
                {/* Ligne 1 : identité + statut */}
                <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap", marginBottom: 11 }}>
                  <span style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: `${st.color}22`, color: st.color,
                    fontWeight: 800, fontSize: 14,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {t.teacherName.charAt(0).toUpperCase()}
                  </span>

                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>{t.teacherName}</div>
                    <div style={{ color: C.muted, fontSize: 11.5, display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                      <a href={`tel:${t.phone}`} style={{ color: C.muted, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Phone size={10} /> {t.phone}
                      </a>
                      · {trWilaya(t.wilaya, isRTL)}
                    </div>
                  </div>

                  <span style={{
                    background: `${st.color}22`, color: st.color,
                    fontSize: 11, fontWeight: 700, padding: "5px 11px", borderRadius: 999,
                    display: "inline-flex", alignItems: "center", gap: 5,
                  }}>
                    {t.status === "overdue" && <AlertTriangle size={11} />}
                    {t.status === "warning" && <Clock size={11} />}
                    {statusLabel(t.status)}
                    {t.daysSincePayment !== null && ` · ${t.daysSincePayment}${isRTL ? "ي" : "j"}`}
                  </span>
                </div>

                {/* Ligne 2 : chiffres */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
                  gap: 10, marginBottom: 11,
                  paddingTop: 11, borderTop: "1px solid rgba(124,58,237,0.14)",
                }}>
                  <Cell label={isRTL ? "رقم الأعمال" : "CA généré"} value={`${fmt(t.totalRevenue)}`} />
                  <Cell label={isRTL ? "العمولة" : "Commission"} value={`${fmt(t.totalCommission)}`} color={C.orange} />
                  <Cell label={isRTL ? "المدفوع" : "Payé"} value={`${fmt(t.totalPaid)}`} color={C.green} />
                  <Cell label={isRTL ? "الرصيد" : "Solde"} value={`${fmt(t.balance)}`} color={t.balance > 0 ? C.red : C.green} />
                  <Cell
                    label={isRTL ? "آخر دفع" : "Dernier paiement"}
                    value={t.lastPaymentAt
                      ? new Date(t.lastPaymentAt).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", { day: "2-digit", month: "short" })
                      : (isRTL ? "أبداً" : "Jamais")}
                  />
                </div>

                {/* Ligne 3 : actions */}
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                  <button onClick={() => openPayment(t)}
                    style={btnStyle("linear-gradient(135deg, #FF8C00, #FF6B00)", "white", "transparent")}>
                    <Wallet size={13} /> {isRTL ? "تسجيل دفع" : "Enregistrer un paiement"}
                  </button>
                  <button onClick={() => exportTeacher(t, "csv")} disabled={exporting === t.teacherId}
                    style={btnStyle("rgba(34,197,94,0.12)", "#4ade80", "rgba(34,197,94,0.28)")}>
                    {exporting === t.teacherId
                      ? <Loader2 size={13} style={{ animation: "spin 0.8s linear infinite" }} />
                      : <Download size={13} />} CSV
                  </button>
                  <button onClick={() => exportTeacher(t, "pdf")} disabled={exporting === t.teacherId}
                    style={btnStyle("rgba(124,58,237,0.14)", "#c4b5fd", "rgba(124,58,237,0.3)")}>
                    <FileText size={13} /> PDF
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ MODAL RÈGLEMENT ═══ */}
      {paying && (
        <div
          onClick={() => !saving && setPaying(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: "linear-gradient(160deg, #1a0d38, #0d0520)",
            border: "1px solid rgba(124,58,237,0.35)",
            borderRadius: 20, padding: 24, width: "100%", maxWidth: 420,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <h3 style={{ color: "white", fontWeight: 800, fontSize: 16, margin: 0 }}>
                  {isRTL ? "تسجيل دفع" : "Enregistrer un paiement"}
                </h3>
                <p style={{ color: "#a78bfa", fontSize: 12.5, margin: "3px 0 0" }}>{paying.teacherName}</p>
              </div>
              <button onClick={() => setPaying(null)} disabled={saving}
                style={{ background: "rgba(124,58,237,0.18)", border: "none", color: "#a78bfa", width: 32, height: 32, borderRadius: 10, cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{
              background: "rgba(10,0,20,0.4)", borderRadius: 12, padding: 13, marginBottom: 16,
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
            }}>
              <Cell label={isRTL ? "العمولة المستحقة" : "Commission due"} value={`${fmt(paying.totalCommission)} ${DA}`} />
              <Cell label={isRTL ? "الرصيد" : "Solde restant"} value={`${fmt(paying.balance)} ${DA}`} color={C.red} />
            </div>

            <Field label={isRTL ? "المبلغ المستلم" : "Montant reçu"}>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} />
            </Field>

            <Field label={isRTL ? "طريقة الدفع" : "Méthode"}>
              <select value={method} onChange={e => setMethod(e.target.value)} style={inputStyle}>
                <option value="baridimob" style={{ background: "#1A0A3C" }}>BaridiMob</option>
                <option value="cib" style={{ background: "#1A0A3C" }}>CIB</option>
                <option value="cash" style={{ background: "#1A0A3C" }}>{isRTL ? "نقداً" : "Espèces"}</option>
                <option value="other" style={{ background: "#1A0A3C" }}>{isRTL ? "أخرى" : "Autre"}</option>
              </select>
            </Field>

            <Field label={isRTL ? "المرجع (اختياري)" : "Référence (optionnel)"}>
              <input value={reference} onChange={e => setReference(e.target.value)}
                placeholder={isRTL ? "رقم التحويل..." : "N° de virement..."} style={inputStyle} />
            </Field>

            <button onClick={savePayment} disabled={saving || Number(amount) <= 0}
              style={{
                width: "100%", marginTop: 8,
                background: "linear-gradient(135deg, #FF8C00, #FF6B00)",
                color: "white", fontWeight: 800, padding: 14, borderRadius: 13,
                border: "none", cursor: "pointer", fontSize: 14.5, fontFamily: "inherit",
                opacity: saving || Number(amount) <= 0 ? 0.5 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
              {saving
                ? <><Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} /> {isRTL ? "جارٍ..." : "Enregistrement..."}</>
                : <><Check size={16} /> {isRTL ? "تأكيد الدفع" : "Confirmer le paiement"}</>}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Sous-composants ── */

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(26,10,60,0.7)", border: "1px solid rgba(124,58,237,0.3)",
  borderRadius: 11, padding: "11px 13px", fontSize: 13.5,
  color: "white", outline: "none", fontFamily: "inherit",
};

function btnStyle(bg: string, color: string, border: string): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: bg, color, border: `1px solid ${border}`,
    fontSize: 12, fontWeight: 700, padding: "9px 14px",
    borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
  };
}

function Stat({ label, value, color, icon }: any) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: 15,
      display: "flex", alignItems: "center", gap: 11,
    }}>
      <span style={{
        width: 36, height: 36, borderRadius: 11, flexShrink: 0,
        background: `${color}1F`, color,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "white", fontWeight: 900, fontSize: 16, lineHeight: 1.2 }}>{value}</div>
        <div style={{ color: C.muted, fontSize: 11 }}>{label}</div>
      </div>
    </div>
  );
}

function Cell({ label, value, color }: any) {
  return (
    <div>
      <div style={{ color: C.dim, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.3px" }}>{label}</div>
      <div style={{ color: color || "white", fontWeight: 700, fontSize: 13, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: "block", color: "#a78bfa", fontSize: 11.5, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 6,
      }}>{label}</label>
      {children}
    </div>
  );
}
