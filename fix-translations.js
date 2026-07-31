/**
 * ═══════════════════════════════════════════════════════════
 * OSTADI — Correctif post-traduction
 * ═══════════════════════════════════════════════════════════
 *
 * Répare 2 problèmes causés par apply-translations.js :
 *
 *  1. value={trSubject(...)} sur les <select>
 *     → casse les formulaires (la valeur ne correspond plus
 *       aux <option value="...">)
 *
 *  2. isRTL utilisé sans être déclaré
 *     → erreur de compilation
 *
 * UTILISATION :  node fix-translations.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DIRS = ["app", "components"];
const EXT = [".tsx", ".ts"];

let stats = { valueFixed: 0, isRTLAdded: 0, files: [] };

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      walk(full, out);
    } else if (EXT.includes(path.extname(e.name))) out.push(full);
  }
  return out;
}

function fixFile(file) {
  let src = fs.readFileSync(file, "utf8");
  const original = src;
  const rel = path.relative(ROOT, file);
  const notes = [];

  /* ── PROBLÈME 1 : value={trXxx(...)} ─────────────────── */
  const valueRe = /value=\{tr(?:Subject|Level|Wilaya)\(([^,]+),\s*isRTL\)\}/g;
  const valueMatches = src.match(valueRe);
  if (valueMatches) {
    src = src.replace(valueRe, "value={$1}");
    stats.valueFixed += valueMatches.length;
    notes.push(`${valueMatches.length} value= restaurée(s)`);
  }

  /* ── PROBLÈME 2 : isRTL utilisé mais non déclaré ─────── */
  const usesIsRTL = /\bisRTL\b/.test(src);
  const declaresIsRTL = /const\s*\{[^}]*\bisRTL\b[^}]*\}\s*=\s*useLang\(\)/.test(src);

  if (usesIsRTL && !declaresIsRTL) {
    // a) Ajoute l'import useLang si absent
    if (!/import\s*\{[^}]*useLang[^}]*\}\s*from\s*["']@\/lib\/lang-context["']/.test(src)) {
      const imports = [...src.matchAll(/^import .+;$/gm)];
      if (imports.length) {
        const last = imports[imports.length - 1];
        const pos = last.index + last[0].length;
        src = src.slice(0, pos)
            + '\nimport { useLang } from "@/lib/lang-context";'
            + src.slice(pos);
        notes.push("import useLang ajouté");
      }
    }

    // b) Insère le hook au début du composant
    // Cherche : export default function XxxPage() { OU export default function Xxx({...}: Props) {
    const compRe = /(export default function \w+\s*\([^)]*\)\s*\{\s*\n)/;
    const m = src.match(compRe);
    if (m) {
      const insertAt = m.index + m[0].length;
      src = src.slice(0, insertAt)
          + "  const { isRTL } = useLang();\n"
          + src.slice(insertAt);
      stats.isRTLAdded++;
      notes.push("hook isRTL ajouté");
    } else {
      notes.push("⚠️ composant non détecté — à faire à la main");
    }
  }

  if (src !== original) {
    fs.writeFileSync(file, src, "utf8");
    stats.files.push({ file: rel, notes });
  }
}

/* ── Exécution ─────────────────────────────────────────── */
console.log("\n🔧 OSTADI — Correctif post-traduction\n");
console.log("─".repeat(58));

const files = DIRS.flatMap(d => walk(path.join(ROOT, d)));
files.forEach(fixFile);

console.log(`\n📁 Fichiers analysés        : ${files.length}`);
console.log(`🔄 value= restaurées        : ${stats.valueFixed}`);
console.log(`➕ hooks isRTL ajoutés      : ${stats.isRTLAdded}`);
console.log(`✏️  Fichiers corrigés        : ${stats.files.length}\n`);

if (stats.files.length) {
  console.log("─".repeat(58));
  console.log("\nDétail :\n");
  stats.files.forEach(f => {
    console.log(`  ✓ ${f.file}`);
    f.notes.forEach(n => console.log(`      → ${n}`));
  });
  console.log("");
}

const manual = stats.files.filter(f => f.notes.some(n => n.includes("⚠️")));
if (manual.length) {
  console.log("─".repeat(58));
  console.log("\n⚠️  À corriger MANUELLEMENT :\n");
  manual.forEach(f => console.log(`  • ${f.file}`));
  console.log("\n  Ajoute au début du composant :");
  console.log("    const { isRTL } = useLang();\n");
}

console.log("─".repeat(58));
console.log("\n✅ Terminé.\n");
console.log("   Lance maintenant :  npm run dev");
console.log("   Si erreur de compilation, envoie-moi le message.\n");
