import { NextResponse } from "next/server";
import { diagnoseConfig } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ⚠️ ROUTE TEMPORAIRE DE DIAGNOSTIC
 *
 * Vérifie que les variables Firebase Admin sont bien lues sur Vercel.
 * Ne révèle aucune valeur secrète — seulement l'état de la configuration.
 *
 * 👉 SUPPRIME CE FICHIER une fois le problème résolu.
 */
export async function GET() {
  try {
    const config = diagnoseConfig();

    // Test réel : tente d'initialiser Firebase Admin
    let adminStatus = "non testé";
    try {
      const { adminDb } = await import("@/lib/firebase-admin");
      const db = adminDb();
      await db.collection("users").limit(1).get();
      adminStatus = "✓ connexion Firestore réussie";
    } catch (err: any) {
      adminStatus = `✗ ${err?.message || "échec"}`;
    }

    return NextResponse.json({
      environment: process.env.VERCEL ? "Vercel" : "local",
      config,
      adminStatus,
      livekit: {
        url: process.env.LIVEKIT_URL ? "✓ défini" : "✗ absent",
        apiKey: process.env.LIVEKIT_API_KEY ? "✓ défini" : "✗ absent",
        apiSecret: process.env.LIVEKIT_API_SECRET ? "✓ défini" : "✗ absent",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "erreur inconnue" },
      { status: 500 }
    );
  }
}
