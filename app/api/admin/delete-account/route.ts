import { NextRequest, NextResponse } from "next/server";
import { SignJWT, importPKCS8 } from "jose";
import { verifyIdToken, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Suppression d'un compte.
 *
 * ═══════════════════════════════════════════════════════════
 * ⚠️ Action irréversible, réservée à l'administrateur.
 *
 * Dans la plupart des cas, la SUSPENSION est le bon outil : elle
 * bloque l'accès sans détruire l'historique, et se défait si la
 * personne conteste. La suppression ne se justifie que sur demande
 * explicite de l'intéressé, ou pour un compte manifestement
 * frauduleux.
 *
 * ⚠️ Pourquoi l'API REST plutôt que firebase-admin/auth :
 * ce module déclenche ERR_REQUIRE_ESM sur Node 24, la version de
 * Vercel — le même problème qui vous avait fait passer à `jose`.
 * On reprend l'approche du push : jeton OAuth signé, puis appel
 * direct à l'API Identity Toolkit.
 * ═══════════════════════════════════════════════════════════
 */

const ADMIN_UID = "4bnssIV8FlS80SzaX6ylwc9Fbg92";

const SCOPES = [
  "https://www.googleapis.com/auth/identitytoolkit",
  "https://www.googleapis.com/auth/cloud-platform",
].join(" ");

async function getAccessToken(): Promise<string | null> {
  const email = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!email || !rawKey) return null;

  try {
    const key = await importPKCS8(rawKey.replace(/\\n/g, "\n"), "RS256");
    const now = Math.floor(Date.now() / 1000);

    const assertion = await new SignJWT({ scope: SCOPES })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(email)
      .setAudience("https://oauth2.googleapis.com/token")
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(key);

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });

    if (!res.ok) {
      console.error("Jeton OAuth refusé :", await res.text());
      return null;
    }
    return (await res.json()).access_token || null;
  } catch (err) {
    console.error("Signature du jeton échouée :", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    /* ── Authentification stricte ── */
    const uid = await verifyIdToken(req.headers.get("authorization"));
    if (!uid) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    if (uid !== ADMIN_UID) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const targetId: string | undefined = body?.userId;

    if (!targetId) {
      return NextResponse.json({ error: "invalid-payload" }, { status: 400 });
    }

    // Un administrateur qui se supprime lui-même perdrait l'accès
    // au panneau, sans moyen de revenir en arrière
    if (targetId === ADMIN_UID) {
      return NextResponse.json({ error: "cannot-delete-admin" }, { status: 400 });
    }

    const db = adminDb();
    const projectId = process.env.FIREBASE_PROJECT_ID;

    /* ── Inventaire avant suppression ──
       On veut savoir ce qu'on détruit, et le renvoyer à l'admin */
    const [userSnap, classesSnap, enrollSnap] = await Promise.all([
      db.collection("users").doc(targetId).get(),
      db.collection("classes").where("teacherId", "==", targetId).get(),
      db.collection("enrollments").where("studentId", "==", targetId).get(),
    ]);

    if (!userSnap.exists) {
      return NextResponse.json({ error: "user-not-found" }, { status: 404 });
    }

    const profile = userSnap.data() as any;

    /**
     * ⚠️ Refus si le professeur a des cours à venir avec des inscrits.
     *
     * Supprimer laisserait des élèves ayant payé devant une salle qui
     * n'existe plus, sans recours ni interlocuteur. Il faut d'abord
     * annuler les cours — ce qui déclenche les notifications aux
     * élèves — puis supprimer.
     */
    const now = new Date().toISOString();
    const activeClasses = classesSnap.docs.filter(d => {
      const c = d.data();
      const enrolled = c.enrolledCount || 0;
      const notEnded = c.status !== "ended" && (c.dateTime || "") > now;
      return enrolled > 0 && notEnded;
    });

    if (activeClasses.length > 0 && !body?.force) {
      return NextResponse.json({
        error: "has-active-classes",
        count: activeClasses.length,
        titles: activeClasses.slice(0, 5).map(d => d.data().title),
      }, { status: 409 });
    }

    /* ── Nettoyage Firestore ── */
    const deleted: Record<string, number> = {};

    /** Supprime par lots de 400 — la limite Firestore est à 500 */
    async function purge(collectionName: string, field: string) {
      const snap = await db.collection(collectionName).where(field, "==", targetId).get();
      if (snap.empty) { deleted[collectionName] = 0; return; }

      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = db.batch();
        docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      deleted[collectionName] = docs.length;
    }

    await purge("classes", "teacherId");
    await purge("enrollments", "studentId");
    await purge("enrollmentRequests", "studentId");
    await purge("notifications", "userId");
    await purge("follows", "studentId");
    await purge("follows", "teacherId");
    await purge("pushTokens", "userId");
    await purge("attendance", "studentId");
    await purge("coupons", "userId");
    await purge("waitlist", "studentId");

    /**
     * ⚠️ Ce qu'on NE supprime PAS, volontairement :
     *
     * • `subscriptions` et `couponRedemptions` — pièces comptables.
     *   Un abonnement encaissé reste une recette, même si le compte
     *   disparaît. Les effacer fausserait vos bilans.
     *
     * • `reports` — un signalement doit survivre à la suppression du
     *   compte visé, sinon quelqu'un pourrait effacer les preuves en
     *   demandant la suppression de son propre compte.
     *
     * • `ratings` données par d'autres — elles appartiennent à leurs
     *   auteurs et concernent des cours qui ont eu lieu.
     */

    // Le profil en dernier : s'il échoue, on saura que le reste est parti
    await db.collection("users").doc(targetId).delete();
    deleted.users = 1;

    /* ── Suppression du compte d'authentification ── */
    let authDeleted = false;
    const accessToken = await getAccessToken();

    if (accessToken && projectId) {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ localId: targetId }),
        }
      );
      authDeleted = res.ok;
      if (!res.ok) {
        console.warn("Suppression Auth échouée :", (await res.text()).slice(0, 200));
      }
    }

    /* ── Journal ──
       Une suppression doit laisser une trace : qui, quand, quoi. */
    await db.collection("adminLog").add({
      action: "delete-account",
      adminId: uid,
      targetId,
      targetName: profile.displayName || "—",
      targetRole: profile.role || "—",
      deleted,
      authDeleted,
      at: now,
    });

    return NextResponse.json({ ok: true, deleted, authDeleted });
  } catch (err) {
    console.error("Route de suppression :", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
