import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ⚠️ ROUTE TEMPORAIRE DE DIAGNOSTIC
 *
 * Conçue pour ne jamais planter : chaque étape est isolée dans son
 * propre try/catch, et l'erreur est renvoyée en JSON plutôt que de
 * remonter en 500 illisible.
 *
 * 👉 SUPPRIME CE FICHIER une fois le problème résolu.
 */
export async function GET() {
  const report: Record<string, any> = {
    step: "démarrage",
    environment: process.env.VERCEL ? "Vercel" : "local",
    nodeVersion: process.version,
  };

  /* ── 1. Variables brutes (sans révéler les valeurs) ──── */
  try {
    report.step = "lecture des variables";
    const pk = process.env.FIREBASE_PRIVATE_KEY;

    report.variables = {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID
        ? `✓ ${process.env.FIREBASE_PROJECT_ID}`
        : "✗ ABSENTE",
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL
        ? `✓ ${process.env.FIREBASE_CLIENT_EMAIL.slice(0, 20)}…`
        : "✗ ABSENTE",
      FIREBASE_PRIVATE_KEY: pk
        ? `✓ présente (${pk.length} caractères)`
        : "✗ ABSENTE",
      LIVEKIT_URL: process.env.LIVEKIT_URL ? "✓" : "✗ ABSENTE",
      LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY ? "✓" : "✗ ABSENTE",
      LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET ? "✓" : "✗ ABSENTE",
    };

    if (pk) {
      report.privateKeyFormat = {
        commencePar: pk.slice(0, 30).replace(/\n/g, "⏎"),
        finitPar: pk.slice(-30).replace(/\n/g, "⏎"),
        contientBackslashN: pk.includes("\\n"),
        contientVraisSautsLigne: pk.includes("\n"),
        contientGuillemets: pk.startsWith('"') || pk.startsWith("'"),
        aEnteteBEGIN: pk.includes("BEGIN PRIVATE KEY"),
        aEnteteEND: pk.includes("END PRIVATE KEY"),
      };
    }
  } catch (e: any) {
    report.erreurVariables = String(e?.message || e);
  }

  /* ── 2. Import du module firebase-admin ──────────────── */
  try {
    report.step = "import de firebase-admin";
    await import("firebase-admin/app");
    report.importFirebaseAdmin = "✓ module chargé";
  } catch (e: any) {
    report.importFirebaseAdmin = `✗ ${e?.code || ""} ${e?.message || e}`;
    return NextResponse.json(report);
  }

  /* ── 3. Import de notre wrapper ──────────────────────── */
  let adminDb: any;
  try {
    report.step = "import du wrapper lib/firebase-admin";
    const mod = await import("@/lib/firebase-admin");
    adminDb = mod.adminDb;
    report.importWrapper = "✓ chargé";
  } catch (e: any) {
    report.importWrapper = `✗ ${e?.message || e}`;
    return NextResponse.json(report);
  }

  /* ── 4. Initialisation ───────────────────────────────── */
  let db: any;
  try {
    report.step = "initialisation Firebase Admin";
    db = adminDb();
    report.initialisation = "✓ initialisé";
  } catch (e: any) {
    report.initialisation = `✗ ${e?.message || e}`;
    return NextResponse.json(report);
  }

  /* ── 5. Lecture réelle dans Firestore ────────────────── */
  try {
    report.step = "lecture Firestore";
    const snap = await db.collection("users").limit(1).get();
    report.lectureFirestore = `✓ ${snap.size} document(s) lu(s)`;
  } catch (e: any) {
    report.lectureFirestore = `✗ ${e?.code || ""} ${e?.message || e}`;
  }

  report.step = "terminé";
  return NextResponse.json(report, { status: 200 });
}
