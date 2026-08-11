"use client";
import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import { getTeacherBilan } from "@/lib/firestore";
import { downloadCSV, printPDF } from "@/lib/export-utils";
import { Download, FileText, Loader2, AlertCircle } from "lucide-react";

type Period = "month" | "year" | "all";

/**
 * Téléchargement du bilan par le professeur.
 *
 * Le professeur est indépendant : il doit pouvoir justifier ses revenus
 * auprès de l'administration fiscale. Un bilan clair, avec le détail des
 * inscriptions et la commission déduite, lui évite de tout reconstituer
 * à la main.
 */
export default function BilanDownload({
  teacherId,
  teacherName,
}: {
  teacherId: string;
  teacherName: string;
}) {
  const { isRTL } = useLang();
  const [period, setPeriod] = useState<Period>("month");
  const [busy, setBusy] = useState<"csv" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const DA = isRTL ? "دج" : "DA";
  const fmt = (n: number) => (n || 0).toLocaleString("fr-DZ");

  const periodLabel = (p: Period) =>
    p === "month"
      ? (isRTL ? "هذا الشهر" : "Ce mois")
      : p === "year"
        ? (isRTL ? "هذه السنة" : "Cette année")
        : (isRTL ? "منذ البداية" : "Depuis le début");

  async function handleExport(format: "csv" | "pdf") {
    setBusy(format);
    setError(null);
    try {
      const b = await getTeacherBilan(teacherId, period);

      if (b.lines.length === 0) {
        setError(
          isRTL
            ? "لا توجد بيانات لهذه الفترة."
            : "Aucune donnée pour cette période."
        );
        return;
      }

      if (format === "csv") {
        downloadCSV(
          `bilan-${periodLabel(period).replace(/\s+/g, "-")}`,
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
          title: isRTL ? `بياني المالي — ${periodLabel(period)}` : `Mon bilan — ${periodLabel(period)}`,
          subtitle: teacherName,
          isRTL,
          footer: isRTL
            ? "أستاذي — وثيقة صادرة تلقائياً، للاستعمال الشخصي والإداري"
            : "Ostadi — Document généré automatiquement, à usage personnel et administratif",
          sections: [
            {
              title: isRTL ? "الملخص" : "Synthèse",
              pairs: [
                [isRTL ? "عدد الدروس" : "Cours créés", `${b.classesCount}`],
                [isRTL ? "عدد الطلاب" : "Élèves inscrits", `${b.studentsCount}`],
                [isRTL ? "التسجيلات" : "Inscriptions", `${b.lines.length}`],
                [isRTL ? "الحضور المؤكد" : "Présences confirmées", `${b.attendedCount}`],
                [isRTL ? "رقم الأعمال" : "Chiffre d'affaires", `${fmt(b.grossRevenue)} ${DA}`],
                [isRTL ? "عمولة أستاذي (10٪)" : "Commission Ostadi (10%)", `− ${fmt(b.commission)} ${DA}`],
                [isRTL ? "صافي أرباحك" : "Votre revenu net", `${fmt(b.netRevenue)} ${DA}`],
                [isRTL ? "العمولة المسددة" : "Commission réglée", `${fmt(b.paid)} ${DA}`],
              ],
            },
            {
              title: isRTL ? "تفاصيل التسجيلات" : "Détail des inscriptions",
              headers: isRTL
                ? ["التاريخ", "الدرس", "المادة", "الطالب", "السعر"]
                : ["Date", "Cours", "Matière", "Élève", "Prix"],
              rows: b.lines.map(l => [
                new Date(l.date).toLocaleDateString("fr-DZ"),
                l.classeTitle,
                l.subject,
                l.studentName,
                `${fmt(l.price)} ${DA}`,
              ]),
            },
            b.payments.length > 0
              ? {
                  title: isRTL ? "المدفوعات لأستاذي" : "Règlements versés à Ostadi",
                  headers: isRTL ? ["التاريخ", "المبلغ", "الطريقة"] : ["Date", "Montant", "Méthode"],
                  rows: b.payments.map((p: any) => [
                    new Date(p.paidAt).toLocaleDateString("fr-DZ"),
                    `${fmt(p.amount)} ${DA}`,
                    (p.method || "—").toUpperCase(),
                  ]),
                }
              : {
                  text: isRTL
                    ? "لم تُسجَّل أي مدفوعات لهذه الفترة."
                    : "Aucun règlement enregistré sur cette période.",
                },
          ],
        });
      }
    } catch (err: any) {
      console.error("Export du bilan échoué :", err);
      setError(isRTL ? "فشل التصدير. حاول مرة أخرى." : "Échec de l'export. Réessayez.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{
      background: "linear-gradient(145deg, rgba(20,8,45,0.9), rgba(15,5,30,0.9))",
      border: "1px solid rgba(124,58,237,0.2)",
      borderRadius: 16, padding: 18,
    }}>
      <h3 style={{
        display: "flex", alignItems: "center", gap: 9,
        color: "white", fontWeight: 750, fontSize: 14.5, margin: "0 0 4px",
      }}>
        <FileText size={16} style={{ color: "#FF8C00" }} />
        {isRTL ? "تحميل بياني" : "Télécharger mon bilan"}
      </h3>
      <p style={{ color: "#6d28d9", fontSize: 11.5, margin: "0 0 14px", lineHeight: 1.5 }}>
        {isRTL
          ? "وثيقة مفصّلة بأرباحك وطلابك — مفيدة لملفاتك الإدارية."
          : "Document détaillé de vos revenus et inscriptions — utile pour vos démarches administratives."}
      </p>

      {/* Période */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {(["month", "year", "all"] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{
              flex: 1, minWidth: 90,
              background: period === p ? "#FF8C00" : "rgba(124,58,237,0.08)",
              border: `1px solid ${period === p ? "#FF8C00" : "rgba(124,58,237,0.2)"}`,
              color: period === p ? "white" : "#a78bfa",
              fontSize: 12, fontWeight: 700, padding: "9px 12px",
              borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
            }}>
            {periodLabel(p)}
          </button>
        ))}
      </div>

      {/* Erreur */}
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.28)",
          borderRadius: 10, padding: "10px 12px", marginBottom: 12,
        }}>
          <AlertCircle size={14} style={{ color: "#f87171", flexShrink: 0 }} />
          <span style={{ color: "#fca5a5", fontSize: 12 }}>{error}</span>
        </div>
      )}

      {/* Boutons */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => handleExport("pdf")} disabled={busy !== null}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            background: "linear-gradient(135deg, #FF8C00, #FF6B00)", color: "white",
            fontWeight: 700, padding: "11px", borderRadius: 11,
            border: "none", cursor: busy ? "not-allowed" : "pointer",
            fontSize: 13, fontFamily: "inherit", opacity: busy ? 0.6 : 1,
          }}>
          {busy === "pdf"
            ? <Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} />
            : <FileText size={15} />}
          PDF
        </button>

        <button onClick={() => handleExport("csv")} disabled={busy !== null}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            background: "rgba(34,197,94,0.13)", color: "#4ade80",
            border: "1px solid rgba(34,197,94,0.28)",
            fontWeight: 700, padding: "11px", borderRadius: 11,
            cursor: busy ? "not-allowed" : "pointer",
            fontSize: 13, fontFamily: "inherit", opacity: busy ? 0.6 : 1,
          }}>
          {busy === "csv"
            ? <Loader2 size={15} style={{ animation: "spin 0.8s linear infinite" }} />
            : <Download size={15} />}
          Excel / CSV
        </button>
      </div>

      <p style={{ color: "#4c1d95", fontSize: 10.5, margin: "10px 0 0", textAlign: "center" }}>
        {isRTL
          ? "لحفظ PDF : اختر «حفظ بصيغة PDF» في نافذة الطباعة."
          : "Pour le PDF : choisissez « Enregistrer au format PDF » dans la fenêtre d'impression."}
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
