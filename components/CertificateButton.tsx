"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang-context";
import { trSubject, trLevel, trWilaya } from "@/lib/i18n/translate";
import { getCertifiableClasses, getCertificateData } from "@/lib/firestore";
import { Award, Download, Loader2, AlertCircle, Check } from "lucide-react";

/**
 * Attestation de fin de cours.
 *
 * Les parents algériens attachent de la valeur à un document écrit —
 * c'est ce qui donne une fin propre à un cours, et une raison d'en
 * reprendre un autre.
 *
 * Le document est produit via l'impression du navigateur plutôt qu'avec
 * une bibliothèque PDF : aucune dépendance, ça marche sur mobile, et
 * l'arabe s'affiche correctement — ce qui n'est pas garanti autrement.
 */
export default function CertificateButton({ studentId }: { studentId: string }) {
  const { isRTL } = useLang();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, [studentId]);

  async function load() {
    setLoading(true);
    try {
      setClasses(await getCertifiableClasses(studentId));
    } catch (err) {
      console.error("Chargement des attestations échoué :", err);
    } finally {
      setLoading(false);
    }
  }

  async function generate(classeId: string) {
    setBusy(classeId);
    setError(null);
    try {
      const d = await getCertificateData(classeId, studentId);
      if (!d) {
        setError(isRTL ? "تعذّر إنشاء الشهادة" : "Impossible de générer l'attestation");
        return;
      }
      printCertificate(d, isRTL);
    } catch (err) {
      console.error("Génération échouée :", err);
      setError(isRTL ? "فشل الإنشاء" : "Échec de la génération");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 24 }}>
        <Loader2 size={20} style={{ color: "#FF8C00", animation: "cspin 0.8s linear infinite" }} />
        <style>{`@keyframes cspin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (classes.length === 0) return null;

  return (
    <div style={{
      background: "linear-gradient(145deg, rgba(20,8,45,0.9), rgba(15,5,30,0.9))",
      border: "1px solid rgba(255,140,0,0.24)",
      borderRadius: 16, padding: 18,
    }}>
      <h3 style={{
        display: "flex", alignItems: "center", gap: 9,
        color: "white", fontWeight: 750, fontSize: 14.5, margin: "0 0 4px",
      }}>
        <Award size={16} style={{ color: "#FF8C00" }} />
        {isRTL ? "شهادات المتابعة" : "Attestations de suivi"}
      </h3>
      <p style={{ color: "#6d28d9", fontSize: 11.5, margin: "0 0 15px", lineHeight: 1.6 }}>
        {isRTL
          ? "وثيقة رسمية تُثبت متابعتك للدرس — مفيدة لملفّك المدرسي."
          : "Un document attestant de votre suivi — utile pour votre dossier scolaire."}
      </p>

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

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {classes.map(c => (
          <div key={c.classeId} style={{
            display: "flex", alignItems: "center", gap: 11,
            background: "rgba(10,0,20,0.4)",
            border: "1px solid rgba(124,58,237,0.14)",
            borderRadius: 12, padding: "11px 13px",
          }}>
            <span style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: "rgba(255,140,0,0.13)", color: "#FF8C00",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Award size={15} />
            </span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                color: "white", fontSize: 13, fontWeight: 650,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {c.title}
              </div>
              <div style={{ color: "#6d28d9", fontSize: 10.5, marginTop: 2 }}>
                {trSubject(c.subject, isRTL)} · {c.teacherName}
              </div>
            </div>

            <button
              onClick={() => generate(c.classeId)}
              disabled={busy === c.classeId}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
                background: "rgba(255,140,0,0.14)", color: "#FF8C00",
                border: "1px solid rgba(255,140,0,0.3)",
                fontSize: 12, fontWeight: 700, padding: "8px 14px",
                borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {busy === c.classeId
                ? <Loader2 size={13} style={{ animation: "cspin 0.8s linear infinite" }} />
                : <Download size={13} />}
              {isRTL ? "تحميل" : "Obtenir"}
            </button>
          </div>
        ))}
      </div>

      <p style={{ color: "#4c1d95", fontSize: 10.5, margin: "13px 0 0", textAlign: "center", lineHeight: 1.55 }}>
        {isRTL
          ? "اختر «حفظ بصيغة PDF» في نافذة الطباعة."
          : "Choisissez « Enregistrer au format PDF » dans la fenêtre d'impression."}
      </p>

      <style>{`@keyframes cspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Génération du document
   ═══════════════════════════════════════════════════════════ */

function printCertificate(d: any, isRTL: boolean) {
  const dir = isRTL ? "rtl" : "ltr";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
      day: "2-digit", month: "long", year: "numeric",
    });

  const today = new Date().toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const LEVELS: Record<string, { fr: string; ar: string }> = {
    struggling: { fr: "En progression", ar: "في تقدّم" },
    progressing: { fr: "Progresse régulièrement", ar: "يتقدّم بانتظام" },
    good: { fr: "Bon niveau", ar: "مستوى جيد" },
    excellent: { fr: "Excellent niveau", ar: "مستوى ممتاز" },
  };

  const esc = (s: string) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const t = isRTL
    ? {
        title: "شهادة متابعة",
        certifies: "تشهد منصة أستاذي أنّ",
        followed: "قد تابع الدرس التالي",
        subject: "المادة", level: "المستوى", teacher: "الأستاذ",
        period: "الفترة", sessions: "الحصص", attendance: "نسبة الحضور",
        appraisal: "التقدير", wilaya: "الولاية",
        issued: "حُرّرت في", ref: "المرجع",
        footer: "وثيقة صادرة تلقائياً عن منصة أستاذي — للاستعمال الشخصي والمدرسي",
        to: "إلى",
      }
    : {
        title: "Attestation de suivi",
        certifies: "La plateforme Ostadi atteste que",
        followed: "a suivi le cours suivant",
        subject: "Matière", level: "Niveau", teacher: "Professeur",
        period: "Période", sessions: "Séances", attendance: "Assiduité",
        appraisal: "Appréciation", wilaya: "Wilaya",
        issued: "Fait le", ref: "Référence",
        footer: "Document généré automatiquement par Ostadi — à usage personnel et scolaire",
        to: "au",
      };

  const appraisal = d.progressLevel
    ? (isRTL ? LEVELS[d.progressLevel]?.ar : LEVELS[d.progressLevel]?.fr)
    : null;

  const html = `<!DOCTYPE html>
<html lang="${isRTL ? "ar" : "fr"}" dir="${dir}">
<head>
<meta charset="utf-8">
<title>${esc(t.title)} — ${esc(d.studentName)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Noto+Sans+Arabic:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: ${isRTL
      ? "'Noto Sans Arabic', 'Segoe UI', sans-serif"
      : "'Inter', 'Segoe UI', sans-serif"};
    color: #1a1a1a;
    background: #fff;
  }
  .sheet {
    width: 210mm; min-height: 297mm;
    padding: 22mm 20mm;
    position: relative;
    display: flex; flex-direction: column;
  }
  /* Cadre décoratif */
  .sheet::before {
    content: ""; position: absolute;
    inset: 10mm;
    border: 2px solid #7C3AED;
    border-radius: 4mm;
    pointer-events: none;
  }
  .sheet::after {
    content: ""; position: absolute;
    inset: 12mm;
    border: 1px solid #FF8C00;
    border-radius: 3mm;
    pointer-events: none;
  }
  .inner { position: relative; z-index: 2; flex: 1; display: flex; flex-direction: column; }

  header { text-align: center; margin-bottom: 14mm; }
  .brand { font-size: 26px; font-weight: 900; color: #7C3AED; letter-spacing: -0.5px; }
  .brand span { color: #FF8C00; }
  .tagline { font-size: 10px; color: #888; margin-top: 3px; letter-spacing: 1px; text-transform: uppercase; }
  .rule { width: 40mm; height: 3px; background: linear-gradient(90deg, #FF8C00, #7C3AED); margin: 8mm auto; border-radius: 2px; }
  h1 { font-size: 22px; font-weight: 800; color: #111; letter-spacing: 1px; text-transform: uppercase; }

  .intro { text-align: center; font-size: 12px; color: #555; margin-bottom: 4mm; }
  .name {
    text-align: center; font-size: 30px; font-weight: 900; color: #7C3AED;
    padding: 5mm 0; margin-bottom: 4mm;
    border-bottom: 1px dashed #ddd; border-top: 1px dashed #ddd;
  }
  .followed { text-align: center; font-size: 12px; color: #555; margin-bottom: 3mm; }
  .course {
    text-align: center; font-size: 17px; font-weight: 700; color: #111;
    margin-bottom: 10mm;
  }

  .grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 4mm 8mm; margin-bottom: 10mm;
  }
  .row {
    display: flex; justify-content: space-between; align-items: baseline;
    border-bottom: 1px dotted #ddd; padding: 2.5mm 0;
    font-size: 12px;
  }
  .row .k { color: #777; }
  .row .v { font-weight: 700; color: #111; }

  .highlight {
    background: #f7f4fe; border-inline-start: 4px solid #FF8C00;
    border-radius: 2mm; padding: 5mm 6mm; margin-bottom: 10mm;
    display: flex; justify-content: space-between; align-items: center;
  }
  .highlight .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
  .highlight .value { font-size: 20px; font-weight: 900; color: #7C3AED; }

  footer {
    margin-top: auto; padding-top: 8mm; border-top: 1px solid #e8e8e8;
    display: flex; justify-content: space-between; align-items: flex-end;
    font-size: 10px; color: #888;
  }
  .ref { font-family: monospace; font-size: 9px; color: #aaa; }
  .stamp {
    width: 26mm; height: 26mm; border-radius: 50%;
    border: 2px solid #FF8C00; color: #FF8C00;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-size: 8px; font-weight: 800; text-align: center; line-height: 1.3;
    transform: rotate(-8deg); opacity: 0.85;
  }
  .stamp .big { font-size: 15px; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="sheet"><div class="inner">
  <header>
    <div class="brand">Ostadi <span>أستاذي</span></div>
    <div class="tagline">${isRTL ? "منصة الدروس عبر الإنترنت — الجزائر" : "Cours de soutien en ligne — Algérie"}</div>
    <div class="rule"></div>
    <h1>${esc(t.title)}</h1>
  </header>

  <p class="intro">${esc(t.certifies)}</p>
  <div class="name">${esc(d.studentName)}</div>
  <p class="followed">${esc(t.followed)}</p>
  <div class="course">« ${esc(d.classeTitle)} »</div>

  <div class="grid">
    <div class="row"><span class="k">${esc(t.subject)}</span><span class="v">${esc(d.subject)}</span></div>
    <div class="row"><span class="k">${esc(t.level)}</span><span class="v">${esc(d.level)}</span></div>
    <div class="row"><span class="k">${esc(t.teacher)}</span><span class="v">${esc(d.teacherName)}</span></div>
    <div class="row"><span class="k">${esc(t.wilaya)}</span><span class="v">${esc(d.wilaya)}</span></div>
    <div class="row"><span class="k">${esc(t.period)}</span><span class="v">${fmt(d.startDate)}</span></div>
    <div class="row"><span class="k">${esc(t.to)}</span><span class="v">${fmt(d.endDate)}</span></div>
    <div class="row"><span class="k">${esc(t.sessions)}</span><span class="v">${d.sessionsAttended} / ${d.sessionsTotal}</span></div>
    ${appraisal ? `<div class="row"><span class="k">${esc(t.appraisal)}</span><span class="v">${esc(appraisal)}</span></div>` : ""}
  </div>

  <div class="highlight">
    <span class="label">${esc(t.attendance)}</span>
    <span class="value">${d.attendanceRate}%</span>
  </div>

  <footer>
    <div>
      <div>${esc(t.issued)} ${today}</div>
      <div class="ref">${esc(t.ref)} : ${esc(d.certificateId)}</div>
      <div style="margin-top:3mm; max-width:110mm; line-height:1.5;">${esc(t.footer)}</div>
    </div>
    <div class="stamp">
      <span>OSTADI</span>
      <span class="big">✓</span>
      <span>${isRTL ? "موثّق" : "VÉRIFIÉ"}</span>
    </div>
  </footer>
</div></div>
</body>
</html>`;

  /**
   * Impression via un cadre invisible, plutôt qu'une fenêtre séparée.
   *
   * ⚠️ Pourquoi ce détour : `window.open` échouait systématiquement sur
   * Chrome Android. Le navigateur n'autorise l'ouverture d'une fenêtre
   * que dans la continuité directe d'un geste utilisateur — or ici,
   * l'appel arrive après un `await` sur les données, ce qui rompt la
   * chaîne. Le bloqueur de pop-ups s'active, sans message d'erreur.
   *
   * Un iframe ajouté au document échappe entièrement à cette règle.
   */
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(frame);

  const doc = frame.contentWindow?.document;
  if (!doc) {
    frame.remove();
    alert(isRTL
      ? "تعذّر إنشاء الوثيقة."
      : "Impossible de générer le document.");
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  // Laisse le temps aux polices de charger — sans ce délai,
  // l'arabe s'imprime dans une police de repli
  setTimeout(() => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch (err) {
      console.error("Impression échouée :", err);
    }
    // On retire le cadre après la boîte d'impression, pas avant :
    // le supprimer trop tôt annule l'impression sur certains mobiles
    setTimeout(() => frame.remove(), 1500);
  }, 900);
}
