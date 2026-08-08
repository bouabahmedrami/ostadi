import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { verifyIdToken, adminDb } from "@/lib/firebase-admin";
import { getCourseAccess } from "@/lib/course-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Génère un jeton LiveKit — accès strictement contrôlé.
 *
 * Vérifications successives :
 *  1. L'utilisateur est authentifié
 *  2. Le cours existe
 *  3. La salle est ouverte (fenêtre horaire)   ← NOUVEAU
 *  4. L'utilisateur est le professeur OU inscrit
 *
 * La vérification 3 est indispensable ici et pas seulement dans
 * l'interface : sans elle, n'importe qui possédant le lien pouvait
 * rejoindre la salle d'un cours terminé des semaines plus tôt.
 * Masquer le bouton côté client ne bloque rien — la requête reste
 * forgeable depuis la console du navigateur.
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
      console.error("LiveKit mal configuré — variables manquantes");
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

    /* ── 5. La salle est-elle ouverte ? ────────────────── */
    const access = getCourseAccess({
      dateTime: classe.dateTime,
      durationMinutes: classe.durationMinutes,
      status: classe.status,
      sessions: classe.sessions,
    });

    if (!access.open) {
      return NextResponse.json(
        {
          error: access.reason === "ended" ? "course-ended" : "course-not-started",
          message:
            access.reason === "ended"
              ? "Ce cours est terminé. La salle n'est plus accessible."
              : "La salle ouvre 15 minutes avant le début de la séance.",
          nextSession: access.nextSession,
        },
        { status: 403 }
      );
    }

    /* ── 6. L'utilisateur a-t-il le droit d'entrer ? ───── */
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
          message: "Vous n'êtes pas inscrit à ce cours.",
        },
        { status: 403 }
      );
    }

    /* ── 7. Nom affiché — lu en base ───────────────────── */
    const userSnap = await db.collection("users").doc(uid).get();
    const displayName = userSnap.exists
      ? (userSnap.data()?.displayName || "Utilisateur")
      : "Utilisateur";

    /* ── 8. Génération du jeton ────────────────────────── */
    const roomName = classe.jitsiRoom || `ostadi-${classeId}`;

    /**
     * Le jeton expire avec la séance, pas 3 heures après.
     * Un jeton récupéré en début de séance ne doit pas permettre
     * de revenir dans la salle le lendemain.
     */
    const closesAtMs = access.closesAt
      ? new Date(access.closesAt).getTime()
      : Date.now() + 3 * 3600_000;
    const ttlSeconds = Math.max(
      600, // 10 min minimum
      Math.floor((closesAtMs - Date.now()) / 1000)
    );

    const at = new AccessToken(apiKey, apiSecret, {
      identity: uid,
      name: displayName,
      ttl: ttlSeconds,
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
      closesAt: access.closesAt,
      sessionNumber: access.sessionNumber,
      totalSessions: access.totalSessions,
    });
  } catch (err: any) {
    console.error("Erreur génération jeton LiveKit :", err);
    return NextResponse.json(
      { error: "internal", message: "Erreur serveur. Réessayez." },
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
