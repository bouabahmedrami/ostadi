import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { verifyIdToken, adminDb } from "@/lib/firebase-admin";

/**
 * ⚠️ Ces deux lignes sont indispensables.
 *
 * runtime = "nodejs" : firebase-admin ne fonctionne pas sur l'Edge Runtime,
 * qui est le défaut sur Vercel pour certaines routes. Il lui faut Node.
 *
 * dynamic = "force-dynamic" : empêche Next.js de tenter une mise en cache
 * statique — chaque demande de jeton doit être évaluée à l'exécution.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Génère un jeton LiveKit — accès strictement contrôlé.
 *
 * Vérifications successives :
 *  1. L'utilisateur est authentifié (jeton Firebase valide)
 *  2. Le cours existe
 *  3. L'utilisateur en est le professeur OU y est inscrit
 */
export async function POST(req: NextRequest) {
  try {
    /* ── 1. Authentification ───────────────────────────── */
    const uid = await verifyIdToken(req.headers.get("authorization"));
    if (!uid) {
      return NextResponse.json(
        { error: "unauthenticated", message: "Connexion requise." },
        { status: 401 }
      );
    }

    /* ── 2. Paramètres ─────────────────────────────────── */
    const body = await req.json().catch(() => null);
    const classeId: string | undefined = body?.classeId;

    if (!classeId) {
      return NextResponse.json(
        { error: "missing-classe-id", message: "Identifiant du cours manquant." },
        { status: 400 }
      );
    }

    /* ── 3. Configuration LiveKit ──────────────────────── */
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      console.error("LiveKit mal configuré — variables d'environnement manquantes");
      return NextResponse.json(
        { error: "server-misconfigured", message: "Service vidéo indisponible." },
        { status: 500 }
      );
    }

    const db = adminDb();

    /* ── 4. Le cours existe-t-il ? ─────────────────────── */
    const classeSnap = await db.collection("classes").doc(classeId).get();
    if (!classeSnap.exists) {
      return NextResponse.json(
        { error: "classe-not-found", message: "Ce cours n'existe pas." },
        { status: 404 }
      );
    }
    const classe = classeSnap.data()!;

    /* ── 5. L'utilisateur a-t-il le droit d'entrer ? ───── */
    const isTeacher = classe.teacherId === uid;
    let isEnrolled = false;

    if (!isTeacher) {
      const enrollSnap = await db
        .collection("enrollments")
        .where("classeId", "==", classeId)
        .where("studentId", "==", uid)
        .limit(1)
        .get();
      isEnrolled = !enrollSnap.empty;
    }

    if (!isTeacher && !isEnrolled) {
      return NextResponse.json(
        {
          error: "not-enrolled",
          message: "Vous n'êtes pas inscrit à ce cours. Envoyez une demande au professeur.",
        },
        { status: 403 }
      );
    }

    /* ── 6. Nom affiché — lu en base, pas envoyé par le client ── */
    const userSnap = await db.collection("users").doc(uid).get();
    const displayName = userSnap.exists
      ? (userSnap.data()?.displayName || "Utilisateur")
      : "Utilisateur";

    /* ── 7. Génération du jeton ────────────────────────── */
    const roomName = classe.jitsiRoom || `ostadi-${classeId}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: uid,
      name: displayName,
      ttl: "3h",
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isTeacher,
      roomCreate: isTeacher,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      url: wsUrl,
      room: roomName,
      identity: uid,
      name: displayName,
      isTeacher,
    });
  } catch (err: any) {
    console.error("Erreur génération jeton LiveKit :", err);
    return NextResponse.json(
      {
        error: "internal",
        message: "Erreur serveur. Réessayez.",
        // Détail visible uniquement hors production
        detail: process.env.NODE_ENV !== "production" ? String(err?.message) : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: "method-not-allowed",
      message: "Utilisez POST avec un jeton d'authentification.",
    },
    { status: 405 }
  );
}
