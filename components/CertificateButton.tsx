"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang-context";
import { trSubject } from "@/lib/i18n/translate";
import { getCertifiableClasses, getCertificateData } from "@/lib/firestore";
import { useToast } from "./Toast";
import { haptic } from "@/lib/haptics";
import { Award, Download, Loader2, X, Printer } from "lucide-react";

/**
 * Attestation de suivi.
 *
 * ═══════════════════════════════════════════════════════════
 * ⚠️ Troisième tentative sur l'impression, et voici pourquoi.
 *
 * 1. `window.open()` — bloqué par Chrome Android : le navigateur
 *    n'autorise l'ouverture d'une fenêtre que dans la continuité
 *    immédiate d'un geste, or l'appel arrive après un `await`.
 *
 * 2. Un iframe caché — l'appel `iframe.contentWindow.print()` ne
 *    déclenche rien sur Chrome Android. Le navigateur n'expose la
 *    boîte d'impression que pour le document principal.
 *
 * 3. La méthode retenue : l'attestation est rendue dans la page
 *    elle-même, et une feuille de style `@media print` masque tout
 *    le reste. `window.print()` sur le document principal fonctionne
 *    partout — c'est le seul appel dont on soit certain.
 * ═══════════════════════════════════════════════════════════
 */
export default function CertificateButton({ studentId }: { studentId: string }) {
  const { isRTL } = useLang();
  const toast = useToast();

  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);

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

  async function open(classeId: string) {
    setBusy(classeId);
    haptic("tap");
    try {
      const d = await getCertificateData(classeId, studentId);
      if (!d) {
        toast.error(isRTL ? "تعذّر إنشاء الشهادة" : "Impossible de générer l'attestation");
        return;
      }
      setPreview(d);
    } catch (err) {
      console.error("Génération échouée :", err);
      toast.error(isRTL ? "فشل الإنشاء" : "Échec de la génération");
    } finally {
      setBusy(null);
    }
  }

  function print() {
    haptic("success");
    // Court délai : laisse le navigateur peindre l'attestation avant
    // d'ouvrir la boîte d'impression, sinon elle capture un écran vide
    setTimeout(() => window.print(), 120);
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 24 }}>
        <Loader2 size={20} style={{ color: "#FF8C00", animation: "cbspin 0.8s linear infinite" }} />
        <style>{`@keyframes cbspin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (classes.length === 0) return null;

  return (
    <>
      <div className="cb-card os-glass-2" style={{ padding: 18 }}>
        <h3 style={{
          display: "flex", alignItems: "center", gap: 9,
          color: "white", fontWeight: 750, fontSize: 14.5, margin: "0 0 4px",
        }}>
          <Award size={16} style={{ color: "#FF8C00" }} />
          {isRTL ? "شهادات المتابعة" : "Attestations de suivi"}
        </h3>
        <p style={{ color: "#6d28d9", fontSize: 11.5, margin: "0 0 15px", lineHeight: 1.6 }}>
          {isRTL
            ? "وثيقة تُثبت متابعتك للدرس — مفيدة لملفّك المدرسي."
            : "Un document attestant de votre suivi — utile pour votre dossier scolaire."}
        </p>

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
                }}>{c.title}</div>
                <div style={{ color: "#6d28d9", fontSize: 10.5, marginTop: 2 }}>
                  {trSubject(c.subject, isRTL)} · {c.teacherName}
                </div>
              </div>

              <button
                onClick={() => open(c.classeId)}
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
                  ? <Loader2 size={13} style={{ animation: "cbspin 0.8s linear infinite" }} />
                  : <Download size={13} />}
                {isRTL ? "عرض" : "Obtenir"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ APERÇU ET IMPRESSION ═══ */}
      {preview && (
        <div className="cb-overlay">
          {/* Barre d'action — masquée à l'impression */}
          <div className="cb-bar">
            <button onClick={() => setPreview(null)} className="cb-close">
              <X size={17} />
              {isRTL ? "إغلاق" : "Fermer"}
            </button>
            <button onClick={print} className="os-btn-chalk cb-print">
              <Printer size={16} />
              {isRTL ? "طباعة / حفظ PDF" : "Imprimer / Enregistrer en PDF"}
            </button>
          </div>

          <div className="cb-scroll">
            <Certificate d={preview} isRTL={isRTL} />
          </div>

          <p className="cb-hint">
            {isRTL
              ? "في نافذة الطباعة، اختر « حفظ بصيغة PDF »."
              : "Dans la fenêtre d'impression, choisissez « Enregistrer au format PDF »."}
          </p>
        </div>
      )}

      <style jsx global>{`
        .cb-overlay {
          position: fixed;
          inset: 0;
          z-index: 600;
          background: rgba(6, 2, 14, 0.94);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .cb-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(20, 8, 43, 0.9);
          border-bottom: 1px solid rgba(168, 85, 247, 0.2);
          flex-shrink: 0;
        }
        .cb-close {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: rgba(124, 58, 237, 0.16);
          border: 1px solid rgba(124, 58, 237, 0.28);
          color: #c4b5fd;
          font-size: 13px;
          font-weight: 650;
          padding: 10px 16px;
          border-radius: 11px;
          cursor: pointer;
          font-family: inherit;
        }
        .cb-print {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 20px;
          font-size: 13.5px;
        }
        .cb-scroll {
          flex: 1;
          overflow: auto;
          padding: 18px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          -webkit-overflow-scrolling: touch;
        }
        .cb-hint {
          flex-shrink: 0;
          margin: 0;
          padding: 11px 16px calc(11px + env(safe-area-inset-bottom, 0px));
          text-align: center;
          color: #8b7bb8;
          font-size: 11.5px;
          background: rgba(20, 8, 43, 0.9);
          border-top: 1px solid rgba(168, 85, 247, 0.14);
        }

        /* ═══════════════════════════════════════════════════
           IMPRESSION

           Tout est masqué sauf l'attestation. C'est la seule
           méthode qui fonctionne sur Chrome Android : imprimer
           le document principal, pas une fenêtre ni un iframe.
           ═══════════════════════════════════════════════════ */
        @media print {
          body > *:not(.cb-overlay) { display: none !important; }
          .cb-overlay {
            position: static !important;
            background: #fff !important;
            overflow: visible !important;
            display: block !important;
          }
          .cb-bar, .cb-hint { display: none !important; }
          .cb-scroll {
            overflow: visible !important;
            padding: 0 !important;
            display: block !important;
          }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      <style>{`@keyframes cbspin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}


/* ═══════════════════════════════════════════════════════════
   Le document
   ═══════════════════════════════════════════════════════════ */

function Certificate({ d, isRTL }: { d: any; isRTL: boolean }) {
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

  const t = isRTL
    ? {
        title: "شهادة متابعة", certifies: "تشهد منصة أستاذي أنّ",
        followed: "قد تابع الدرس التالي", subject: "المادة", level: "المستوى",
        teacher: "الأستاذ", period: "من", to: "إلى", sessions: "الحصص",
        attendance: "نسبة الحضور", appraisal: "التقدير", wilaya: "الولاية",
        issued: "حُرّرت في", ref: "المرجع",
        footer: "وثيقة صادرة تلقائياً عن منصة أستاذي — للاستعمال الشخصي والمدرسي",
        verified: "موثّق",
      }
    : {
        title: "Attestation de suivi", certifies: "La plateforme Ostadi atteste que",
        followed: "a suivi le cours suivant", subject: "Matière", level: "Niveau",
        teacher: "Professeur", period: "Du", to: "au", sessions: "Séances",
        attendance: "Assiduité", appraisal: "Appréciation", wilaya: "Wilaya",
        issued: "Fait le", ref: "Référence",
        footer: "Document généré automatiquement par Ostadi — à usage personnel et scolaire",
        verified: "VÉRIFIÉ",
      };

  const appraisal = d.progressLevel
    ? (isRTL ? LEVELS[d.progressLevel]?.ar : LEVELS[d.progressLevel]?.fr)
    : null;

  return (
    <div className="ct-sheet" dir={isRTL ? "rtl" : "ltr"}>
      <div className="ct-inner">
        <header className="ct-head">
          <div className="ct-brand">
            Ostadi <span>أستاذي</span>
          </div>
          <div className="ct-tag">
            {isRTL ? "منصة الدروس عبر الإنترنت — الجزائر" : "Cours de soutien en ligne — Algérie"}
          </div>
          <div className="ct-rule" />
          <h1 className="ct-title">{t.title}</h1>
        </header>

        <p className="ct-intro">{t.certifies}</p>
        <div className="ct-name">{d.studentName}</div>
        <p className="ct-followed">{t.followed}</p>
        <div className="ct-course">« {d.classeTitle} »</div>

        <div className="ct-grid">
          <Field k={t.subject} v={d.subject} />
          <Field k={t.level} v={d.level} />
          <Field k={t.teacher} v={d.teacherName} />
          <Field k={t.wilaya} v={d.wilaya} />
          <Field k={t.period} v={fmt(d.startDate)} />
          <Field k={t.to} v={fmt(d.endDate)} />
          <Field k={t.sessions} v={`${d.sessionsAttended} / ${d.sessionsTotal}`} />
          {appraisal && <Field k={t.appraisal} v={appraisal} />}
        </div>

        <div className="ct-rate">
          <span className="ct-rate-label">{t.attendance}</span>
          <span className="ct-rate-value">{d.attendanceRate}%</span>
        </div>

        <footer className="ct-foot">
          <div>
            <div>{t.issued} {today}</div>
            <div className="ct-ref">{t.ref} : {d.certificateId}</div>
            <div className="ct-note">{t.footer}</div>
          </div>
          <div className="ct-stamp">
            <span>OSTADI</span>
            <span className="ct-stamp-big">✓</span>
            <span>{t.verified}</span>
          </div>
        </footer>
      </div>

      <style jsx>{`
        .ct-sheet {
          width: 210mm;
          min-height: 297mm;
          background: #fff;
          color: #1a1a1a;
          padding: 22mm 20mm;
          position: relative;
          font-family: ${isRTL
            ? "'Noto Sans Arabic', system-ui, sans-serif"
            : "'Inter', system-ui, sans-serif"};
          /* Sur mobile, la feuille A4 dépasse : on la réduit à l'écran,
             mais l'impression reprend la taille réelle */
          transform-origin: top center;
        }
        .ct-sheet::before {
          content: "";
          position: absolute;
          inset: 10mm;
          border: 2px solid #7C3AED;
          border-radius: 4mm;
        }
        .ct-sheet::after {
          content: "";
          position: absolute;
          inset: 12mm;
          border: 1px solid #FF8C00;
          border-radius: 3mm;
        }
        .ct-inner {
          position: relative;
          z-index: 2;
          min-height: 253mm;
          display: flex;
          flex-direction: column;
        }

        .ct-head { text-align: center; margin-bottom: 14mm; }
        .ct-brand {
          font-size: 26px;
          font-weight: 900;
          color: #7C3AED;
          letter-spacing: -0.5px;
        }
        .ct-brand span { color: #FF8C00; }
        .ct-tag {
          font-size: 10px;
          color: #888;
          margin-top: 3px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .ct-rule {
          width: 40mm;
          height: 3px;
          background: linear-gradient(90deg, #FF8C00, #7C3AED);
          margin: 8mm auto;
          border-radius: 2px;
        }
        .ct-title {
          font-size: 22px;
          font-weight: 800;
          color: #111;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin: 0;
        }

        .ct-intro {
          text-align: center;
          font-size: 12px;
          color: #555;
          margin: 0 0 4mm;
        }
        .ct-name {
          text-align: center;
          font-size: 30px;
          font-weight: 900;
          color: #7C3AED;
          padding: 5mm 0;
          margin-bottom: 4mm;
          border-top: 1px dashed #ddd;
          border-bottom: 1px dashed #ddd;
        }
        .ct-followed {
          text-align: center;
          font-size: 12px;
          color: #555;
          margin: 0 0 3mm;
        }
        .ct-course {
          text-align: center;
          font-size: 17px;
          font-weight: 700;
          color: #111;
          margin-bottom: 10mm;
        }

        .ct-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4mm 8mm;
          margin-bottom: 10mm;
        }

        .ct-rate {
          background: #f7f4fe;
          border-inline-start: 4px solid #FF8C00;
          border-radius: 2mm;
          padding: 5mm 6mm;
          margin-bottom: 10mm;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ct-rate-label {
          font-size: 11px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .ct-rate-value {
          font-size: 20px;
          font-weight: 900;
          color: #7C3AED;
        }

        .ct-foot {
          margin-top: auto;
          padding-top: 8mm;
          border-top: 1px solid #e8e8e8;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          font-size: 10px;
          color: #888;
        }
        .ct-ref {
          font-family: monospace;
          font-size: 9px;
          color: #aaa;
          margin-top: 1mm;
        }
        .ct-note {
          margin-top: 3mm;
          max-width: 110mm;
          line-height: 1.5;
        }
        .ct-stamp {
          width: 26mm;
          height: 26mm;
          border-radius: 50%;
          border: 2px solid #FF8C00;
          color: #FF8C00;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          font-weight: 800;
          text-align: center;
          line-height: 1.3;
          transform: rotate(-8deg);
          opacity: 0.85;
          flex-shrink: 0;
        }
        .ct-stamp-big { font-size: 15px; }

        /* Aperçu sur petit écran — la feuille A4 ne rentre pas */
        @media screen and (max-width: 820px) {
          .ct-sheet { transform: scale(0.44); margin-bottom: -160mm; }
        }
        @media screen and (max-width: 420px) {
          .ct-sheet { transform: scale(0.36); margin-bottom: -190mm; }
        }

        @media print {
          .ct-sheet {
            transform: none !important;
            margin: 0 !important;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return (
    <div className="ct-field">
      <span className="ct-k">{k}</span>
      <span className="ct-v">{v}</span>
      <style jsx>{`
        .ct-field {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          border-bottom: 1px dotted #ddd;
          padding: 2.5mm 0;
          font-size: 12px;
        }
        .ct-k { color: #777; }
        .ct-v { font-weight: 700; color: #111; }
      `}</style>
    </div>
  );
}
