/**
 * Outils d'export — CSV et PDF.
 *
 * Le PDF est généré via l'impression du navigateur plutôt qu'avec une
 * bibliothèque : pas de dépendance supplémentaire, fonctionne sur mobile,
 * et l'utilisateur choisit « Enregistrer au format PDF » dans le dialogue.
 */

/* ═══════════════════════════════════════════════════════════
   CSV
   ═══════════════════════════════════════════════════════════ */

/**
 * Échappe une valeur pour le format CSV.
 * Sans ça, un nom contenant une virgule ou un guillemet décale
 * toutes les colonnes du fichier.
 */
function esc(v: any): string {
  const s = String(v ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
) {
  if (rows.length === 0) return;

  // Point-virgule : séparateur attendu par Excel en configuration FR/AR
  const csv = [headers, ...rows]
    .map(r => r.map(esc).join(";"))
    .join("\r\n");

  // BOM UTF-8 : sans lui, Excel affiche « Ã© » au lieu de « é »
  // et rend l'arabe illisible
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════════
   PDF (via impression navigateur)
   ═══════════════════════════════════════════════════════════ */

export interface PdfSection {
  title?: string;
  /** Paires libellé / valeur, pour les résumés */
  pairs?: [string, string][];
  /** Tableau : en-têtes + lignes */
  headers?: string[];
  rows?: (string | number)[][];
  /** Texte libre */
  text?: string;
}

export interface PdfDocument {
  title: string;
  subtitle?: string;
  /** Mention en pied de page */
  footer?: string;
  isRTL?: boolean;
  sections: PdfSection[];
}

export function printPDF(doc: PdfDocument) {
  const dir = doc.isRTL ? "rtl" : "ltr";
  const lang = doc.isRTL ? "ar" : "fr";
  const date = new Date().toLocaleDateString(doc.isRTL ? "ar-DZ" : "fr-DZ", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const sectionsHtml = doc.sections.map(s => {
    let inner = "";

    if (s.title) inner += `<h2>${escapeHtml(s.title)}</h2>`;
    if (s.text) inner += `<p class="txt">${escapeHtml(s.text)}</p>`;

    if (s.pairs?.length) {
      inner += `<div class="pairs">` + s.pairs.map(([k, v]) =>
        `<div class="pair"><span>${escapeHtml(k)}</span><b>${escapeHtml(v)}</b></div>`
      ).join("") + `</div>`;
    }

    if (s.headers?.length && s.rows?.length) {
      inner += `<table>
        <thead><tr>${s.headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
        <tbody>${s.rows.map(r =>
          `<tr>${r.map(cell => `<td>${escapeHtml(String(cell))}</td>`).join("")}</tr>`
        ).join("")}</tbody>
      </table>`;
    }

    return `<section>${inner}</section>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(doc.title)}</title>
<style>
  @page { margin: 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: ${doc.isRTL
      ? "'Noto Sans Arabic', 'Segoe UI', sans-serif"
      : "'Segoe UI', Arial, sans-serif"};
    color: #1a1a1a;
    margin: 0;
    padding: 0;
    line-height: 1.5;
  }
  header {
    border-bottom: 3px solid #FF8C00;
    padding-bottom: 14px;
    margin-bottom: 22px;
  }
  .brand {
    font-size: 22px;
    font-weight: 800;
    color: #7C3AED;
    margin: 0;
  }
  .brand span { color: #FF8C00; }
  h1 { font-size: 17px; margin: 10px 0 4px; color: #111; }
  .sub { font-size: 12px; color: #666; margin: 0; }
  section { margin-bottom: 24px; page-break-inside: avoid; }
  h2 {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #7C3AED;
    border-bottom: 1px solid #e5e5e5;
    padding-bottom: 6px;
    margin: 0 0 12px;
  }
  .txt { font-size: 12px; color: #444; margin: 0 0 10px; }
  .pairs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .pair {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px dotted #ddd;
    padding: 5px 0;
    font-size: 12.5px;
  }
  .pair span { color: #666; }
  .pair b { color: #111; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th {
    background: #f4f1fb;
    color: #4C1D95;
    text-align: ${doc.isRTL ? "right" : "left"};
    padding: 8px 10px;
    font-weight: 700;
    border-bottom: 2px solid #ddd;
  }
  td {
    padding: 7px 10px;
    border-bottom: 1px solid #eee;
  }
  tbody tr:nth-child(even) { background: #fafafa; }
  footer {
    margin-top: 30px;
    padding-top: 12px;
    border-top: 1px solid #e5e5e5;
    font-size: 10.5px;
    color: #888;
    text-align: center;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <header>
    <p class="brand">Ostadi <span>أستاذي</span></p>
    <h1>${escapeHtml(doc.title)}</h1>
    ${doc.subtitle ? `<p class="sub">${escapeHtml(doc.subtitle)}</p>` : ""}
    <p class="sub">${doc.isRTL ? "تاريخ الإصدار" : "Édité le"} ${date}</p>
  </header>
  ${sectionsHtml}
  <footer>${escapeHtml(doc.footer || "Ostadi — Plateforme de cours de soutien en Algérie")}</footer>
  <script>
    window.onload = () => { window.print(); };
  </script>
</body>
</html>`;

  /**
   * Impression via un cadre invisible plutôt qu'une fenêtre séparée.
   *
   * ⚠️ `window.open` échouait sur Chrome Android : le navigateur
   * n'autorise l'ouverture d'une fenêtre que dans la continuité
   * immédiate d'un geste utilisateur. Ici l'appel arrive après la
   * récupération des données, donc après un `await` — la chaîne est
   * rompue et le bloqueur s'active silencieusement.
   *
   * Un iframe ajouté au document n'est pas soumis à cette règle.
   */
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(frame);

  const win = frame.contentWindow;
  if (!win) {
    frame.remove();
    alert(
      doc.isRTL
        ? "تعذّر إنشاء الملف."
        : "Impossible de générer le document."
    );
    return;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();

  // Délai pour le chargement des polices : sans lui, l'arabe
  // s'imprime dans une police de repli
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch (err) {
      console.error("Impression échouée :", err);
    }
    // Retrait après la boîte d'impression — la supprimer trop tôt
    // annule l'opération sur certains mobiles
    setTimeout(() => frame.remove(), 1500);
  }, 800);
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
