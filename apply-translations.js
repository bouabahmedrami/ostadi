/**
 * ═══════════════════════════════════════════════════════════
 * OSTADI — Script de traduction automatique
 * ═══════════════════════════════════════════════════════════
 *
 * Applique trSubject / trLevel / trWilaya dans TOUS les fichiers
 * du projet, quelle que soit la variable (classe.subject, c.subject...)
 *
 * UTILISATION :
 *   1. Place ce fichier à la racine du projet (à côté de package.json)
 *   2. Dans le terminal :  node apply-translations.js
 *   3. Vérifie les changements, puis relance npm run dev
 *
 * SÉCURITÉ : crée une sauvegarde .backup de chaque fichier modifié
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const TARGET_DIRS = ["app", "components"];
const EXTENSIONS = [".tsx", ".ts"];

// Fichiers à ignorer
const SKIP_FILES = [
  "translate.ts",
  "types.ts",
  "firestore.ts",
  "firebase.ts",
  "lang-context.tsx",
  "auth-context.tsx",
];

let stats = { filesScanned: 0, filesModified: 0, replacements: 0 };
const modifiedFiles = [];

/* ── Trouve tous les fichiers cibles ──────────────────── */
function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, files);
    } else if (EXTENSIONS.includes(path.extname(entry.name))) {
      if (!SKIP_FILES.includes(entry.name)) files.push(full);
    }
  }
  return files;
}

/* ── Transforme un fichier ─────────────────────────────── */
function processFile(filePath) {
  let src = fs.readFileSync(filePath, "utf8");
  const original = src;
  let count = 0;

  // Ne touche pas aux fichiers qui n'affichent rien de traduisible
  if (!/\.(subject|level|wilaya)\b/.test(src)) return;

  /* --- 1. Remplacements JSX : {xxx.subject} --- */
  // Capture n'importe quelle variable : classe.subject, c.subject, data.subject, r.subject...
  const jsxPatterns = [
    { re: /\{([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)\.subject\}/g, fn: "trSubject" },
    { re: /\{([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)\.level\}/g, fn: "trLevel" },
    { re: /\{([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)\.wilaya\}/g, fn: "trWilaya" },
  ];

  for (const { re, fn } of jsxPatterns) {
    src = src.replace(re, (match, varName) => {
      // Évite de re-transformer si déjà fait
      if (match.includes("tr")) return match;
      count++;
      return `{${fn}(${varName}.${fn === "trSubject" ? "subject" : fn === "trLevel" ? "level" : "wilaya"}, isRTL)}`;
    });
  }

  /* --- 2. Remplacements avec fallback : {xxx.subject || ''} --- */
  const fallbackPatterns = [
    { re: /\{([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)\.subject\s*\|\|\s*['"]{2}\}/g, fn: "trSubject", field: "subject" },
    { re: /\{([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)\.level\s*\|\|\s*['"]{2}\}/g, fn: "trLevel", field: "level" },
    { re: /\{([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)\.wilaya\s*\|\|\s*['"]{2}\}/g, fn: "trWilaya", field: "wilaya" },
  ];

  for (const { re, fn, field } of fallbackPatterns) {
    src = src.replace(re, (match, varName) => {
      if (match.includes("tr")) return match;
      count++;
      return `{${fn}(${varName}.${field} || '', isRTL)}`;
    });
  }

  /* --- 3. Options de <select> : {trSubject(s, isRTL)} --- */
  src = src.replace(
    /<option key=\{s\} value=\{s\}>\{s\}<\/option>/g,
    () => { count++; return `<option key={s} value={s}>{trSubject(s, isRTL)}</option>`; }
  );
  src = src.replace(
    /<option key=\{l\} value=\{l\}>\{l\}<\/option>/g,
    () => { count++; return `<option key={l} value={l}>{trLevel(l, isRTL)}</option>`; }
  );
  src = src.replace(
    /<option key=\{w\} value=\{w\}>\{w\}<\/option>/g,
    () => { count++; return `<option key={w} value={w}>{trWilaya(w, isRTL)}</option>`; }
  );

  if (count === 0) return;

  /* --- 4. Ajoute l'import si absent --- */
  if (!src.includes('from "@/lib/i18n/translate"')) {
    const usedFns = [];
    if (src.includes("trSubject(")) usedFns.push("trSubject");
    if (src.includes("trLevel(")) usedFns.push("trLevel");
    if (src.includes("trWilaya(")) usedFns.push("trWilaya");

    const importLine = `import { ${usedFns.join(", ")} } from "@/lib/i18n/translate";\n`;

    // Insère après le dernier import existant
    const importMatches = [...src.matchAll(/^import .+;$/gm)];
    if (importMatches.length > 0) {
      const last = importMatches[importMatches.length - 1];
      const insertPos = last.index + last[0].length + 1;
      src = src.slice(0, insertPos) + importLine + src.slice(insertPos);
    } else {
      src = importLine + src;
    }
  }

  /* --- 5. Vérifie que isRTL est disponible --- */
  const hasIsRTL = /\bisRTL\b/.test(original) || /useLang\(\)/.test(src);
  let warning = "";
  if (!hasIsRTL) {
    warning = " ⚠️ isRTL manquant — ajoute: const { isRTL } = useLang();";
  }

  /* --- 6. Sauvegarde + écriture --- */
  fs.writeFileSync(filePath + ".backup", original, "utf8");
  fs.writeFileSync(filePath, src, "utf8");

  stats.filesModified++;
  stats.replacements += count;
  modifiedFiles.push({
    file: path.relative(ROOT, filePath),
    count,
    warning,
  });
}

/* ── Exécution ─────────────────────────────────────────── */
console.log("\n🌍 OSTADI — Traduction automatique\n");
console.log("─".repeat(58));

// Vérifie que translate.ts existe
const translatePath = path.join(ROOT, "lib", "i18n", "translate.ts");
if (!fs.existsSync(translatePath)) {
  console.error("\n❌ ERREUR : lib/i18n/translate.ts introuvable.");
  console.error("   Crée d'abord ce fichier avant de lancer le script.\n");
  process.exit(1);
}

const allFiles = TARGET_DIRS.flatMap(d => walk(path.join(ROOT, d)));
stats.filesScanned = allFiles.length;

allFiles.forEach(processFile);

console.log(`\n📁 Fichiers scannés     : ${stats.filesScanned}`);
console.log(`✏️  Fichiers modifiés    : ${stats.filesModified}`);
console.log(`🔄 Remplacements        : ${stats.replacements}\n`);

if (modifiedFiles.length > 0) {
  console.log("─".repeat(58));
  console.log("\nDétail des modifications :\n");
  modifiedFiles.forEach(m => {
    console.log(`  ✓ ${m.file}  (${m.count})${m.warning}`);
  });
  console.log("");
}

const warnings = modifiedFiles.filter(m => m.warning);
if (warnings.length > 0) {
  console.log("─".repeat(58));
  console.log("\n⚠️  ACTION REQUISE dans ces fichiers :\n");
  warnings.forEach(m => console.log(`  • ${m.file}`));
  console.log("\n  Ajoute cette ligne dans le composant :");
  console.log("    const { isRTL } = useLang();\n");
  console.log("  Et l'import si absent :");
  console.log('    import { useLang } from "@/lib/lang-context";\n');
}

console.log("─".repeat(58));
console.log("\n✅ Terminé. Sauvegardes créées en .backup\n");
console.log("   Pour annuler tout :");
console.log("   Get-ChildItem -Recurse -Filter *.backup | ForEach-Object { Move-Item $_.FullName ($_.FullName -replace '.backup$','') -Force }\n");
console.log("   Pour supprimer les sauvegardes une fois validé :");
console.log("   Get-ChildItem -Recurse -Filter *.backup | Remove-Item\n");
