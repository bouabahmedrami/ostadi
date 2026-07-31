import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Firebase Admin — serveur uniquement.
 *
 * ⚠️ On n'importe volontairement PAS `firebase-admin/auth`.
 *
 * Ce module charge `jwks-rsa`, qui charge `jose` en ESM pur.
 * Sur Node 20+ dans l'environnement Vercel, cela échoue avec :
 *   ERR_REQUIRE_ESM: require() of ES Module jose ... not supported
 *
 * La vérification du jeton est donc faite directement avec `jose`,
 * qui est nativement ESM et fonctionne sans conflit. C'est aussi
 * plus léger : on ne charge pas tout le SDK d'authentification pour
 * une simple validation de signature.
 *
 * `firebase-admin/firestore` ne dépend pas de jwks-rsa — il reste utilisable.
 */

let cachedApp: App | null = null;

/** Normalise la clé privée selon la source (.env local, Vercel, copier-coller) */
function normalizePrivateKey(raw?: string): string | null {
  if (!raw) return null;
  let key = raw.trim();

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  key = key.replace(/\\n/g, "\n");

  if (!key.includes("-----BEGIN PRIVATE KEY-----")) {
    console.error("FIREBASE_PRIVATE_KEY : en-tête BEGIN manquant");
    return null;
  }
  if (!key.includes("-----END PRIVATE KEY-----")) {
    console.error("FIREBASE_PRIVATE_KEY : en-tête END manquant — clé tronquée ?");
    return null;
  }
  return key;
}

function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  if (getApps().length > 0) {
    cachedApp = getApps()[0];
    return cachedApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  const missing: string[] = [];
  if (!projectId) missing.push("FIREBASE_PROJECT_ID");
  if (!clientEmail) missing.push("FIREBASE_CLIENT_EMAIL");
  if (!privateKey) missing.push("FIREBASE_PRIVATE_KEY");

  if (missing.length > 0) {
    throw new Error(
      `Firebase Admin non configuré. Variables manquantes ou invalides : ${missing.join(", ")}`
    );
  }

  cachedApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey: privateKey! }),
  });

  return cachedApp;
}

export function adminDb() {
  return getFirestore(getAdminApp());
}

/* ═══════════════════════════════════════════════════════════
   Vérification du jeton Firebase — sans firebase-admin/auth
   ═══════════════════════════════════════════════════════════ */

/**
 * Clés publiques de Google pour les jetons Firebase.
 * `createRemoteJWKSet` gère la mise en cache et la rotation automatiquement.
 */
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

/**
 * Vérifie un jeton d'identité Firebase et retourne l'UID.
 *
 * Contrôles effectués :
 *  • signature RS256 valide, émise par Google
 *  • émetteur (iss) correspondant au projet
 *  • audience (aud) correspondant au projet
 *  • jeton non expiré
 *  • sujet (sub) présent — c'est l'UID
 */
export async function verifyIdToken(authHeader?: string | null): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    console.error("FIREBASE_PROJECT_ID manquant — vérification impossible");
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
    });

    const uid = typeof payload.sub === "string" ? payload.sub : null;
    if (!uid) {
      console.error("Jeton valide mais sans sujet (sub)");
      return null;
    }

    return uid;
  } catch (err: any) {
    // Cas courants : jeton expiré, signature invalide, mauvais projet
    console.error("Vérification du jeton échouée :", err?.code || err?.message || err);
    return null;
  }
}

/**
 * Diagnostic — ne révèle aucune valeur secrète.
 */
export function diagnoseConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  const key = normalizePrivateKey(rawKey);

  return {
    projectId: projectId ? `✓ ${projectId}` : "✗ absent",
    clientEmail: clientEmail ? `✓ ${clientEmail.slice(0, 12)}…` : "✗ absent",
    privateKey: !rawKey
      ? "✗ absente"
      : !key
        ? "✗ format invalide"
        : `✓ valide (${key.split("\n").length} lignes)`,
  };
}
