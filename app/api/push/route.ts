import { NextRequest, NextResponse } from "next/server";
import { SignJWT, importPKCS8 } from "jose";
import { verifyIdToken, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Envoi de notifications push.
 *
 * ═══════════════════════════════════════════════════════════
 * ⚠️ Pourquoi un jeton signé à la main plutôt que firebase-admin.
 *
 * `firebase-admin/messaging` déclenche ERR_REQUIRE_ESM sur Node 24,
 * qui est la version de Vercel. Le même problème que vous aviez déjà
 * rencontré avec `firebase-admin/auth`, et qui vous avait fait passer
 * à `jose`.
 *
 * On reprend donc la même approche : un jeton OAuth signé avec la clé
 * du compte de service, puis un appel direct à l'API FCM HTTP v1.
 * Aucune dépendance supplémentaire.
 * ═══════════════════════════════════════════════════════════
 *
 * Variables Vercel requises :
 *   FIREBASE_CLIENT_EMAIL   — depuis la clé du compte de service
 *   FIREBASE_PRIVATE_KEY    — idem, retours à la ligne échappés en \n
 *   FIREBASE_PROJECT_ID     — ostadi-72df9
 */

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

/** Jeton d'accès Google, valable une heure */
async function getAccessToken(): Promise<string | null> {
  const email = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!email || !rawKey) return null;

  // Vercel stocke les retours à la ligne échappés
  const pem = rawKey.replace(/\\n/g, "\n");

  try {
    const key = await importPKCS8(pem, "RS256");
    const now = Math.floor(Date.now() / 1000);

    const assertion = await new SignJWT({ scope: FCM_SCOPE })
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

    const data = await res.json();
    return data.access_token || null;
  } catch (err) {
    console.error("Signature du jeton échouée :", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const uid = await verifyIdToken(req.headers.get("authorization"));
    if (!uid) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.userId || !body?.title) {
      return NextResponse.json({ error: "invalid-payload" }, { status: 400 });
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const accessToken = await getAccessToken();

    // Service non configuré : on répond proprement. Une push absente
    // ne doit jamais bloquer l'action qui l'a déclenchée.
    if (!accessToken || !projectId) {
      return NextResponse.json({ skipped: true, reason: "not-configured" });
    }

    const db = adminDb();

    /* ── Limite de débit ──
       Sans elle, quelqu'un pourrait utiliser cette route pour
       harceler un utilisateur de notifications. */
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const recent = await db
      .collection("pushLog")
      .where("senderId", "==", uid)
      .where("sentAt", ">", hourAgo)
      .get();

    if (recent.size >= 60) {
      return NextResponse.json({ error: "rate-limited" }, { status: 429 });
    }

    /* ── Jetons du destinataire ── */
    const tokensSnap = await db
      .collection("pushTokens")
      .where("userId", "==", body.userId)
      .get();

    if (tokensSnap.empty) {
      return NextResponse.json({ sent: 0, reason: "no-device" });
    }

    const tokens: string[] = tokensSnap.docs
      .map(d => d.data().token)
      .filter(Boolean);

    /* ── Envoi ── */
    let sent = 0;
    const stale: string[] = [];

    // L'API HTTP v1 n'envoie qu'à un appareil à la fois
    await Promise.all(
      tokens.map(async token => {
        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: {
                token,
                notification: {
                  title: body.title,
                  body: body.body || "",
                },
                data: {
                  link: body.link || "/",
                  tag: body.tag || "ostadi",
                },
                webpush: {
                  fcmOptions: { link: body.link || "/" },
                  notification: {
                    icon: "/icon-192.png",
                    badge: "/icon-192.png",
                  },
                },
                android: { priority: "high" },
              },
            }),
          }
        );

        if (res.ok) {
          sent++;
          return;
        }

        // Un jeton devient invalide quand l'utilisateur désinstalle
        // l'application ou révoque l'autorisation. On le retire plutôt
        // que de réessayer indéfiniment.
        const detail = await res.text();
        if (res.status === 404 || detail.includes("UNREGISTERED")) {
          stale.push(token);
        } else {
          console.warn("Envoi FCM échoué :", detail.slice(0, 200));
        }
      })
    );

    if (stale.length > 0) {
      const batch = db.batch();
      stale.forEach(t => batch.delete(db.collection("pushTokens").doc(t)));
      await batch.commit();
    }

    await db.collection("pushLog").add({
      senderId: uid,
      targetId: body.userId,
      title: body.title,
      sentAt: new Date().toISOString(),
    });

    return NextResponse.json({ sent, removed: stale.length });
  } catch (err) {
    console.error("Route push :", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
