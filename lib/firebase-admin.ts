import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Firebase Admin — serveur uniquement.
 * Ne jamais importer ce fichier depuis un composant client.
 */

let cachedApp: App | null = null;

/**
 * Normalise la clé privée.
 *
 * Selon l'endroit où elle est stockée, le format diffère :
 *  • .env.local        → "-----BEGIN...\nMIIE...\n-----END-----\n"  (\n littéraux)
 *  • Vercel            → peut conserver les \n OU les convertir en vrais sauts de ligne
 *  • Copier-coller     → guillemets parfois inclus par erreur
 *
 * Cette fonction gère les trois cas.
 */
function normalizePrivateKey(raw?: string): string | null {
  if (!raw) return null;

  let key = raw.trim();

  // Retire les guillemets si quelqu'un les a inclus dans la valeur
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  // Convertit les \n littéraux en vrais sauts de ligne
  key = key.replace(/\\n/g, "\n");

  // Vérification de forme — attrape les clés tronquées au copier-coller
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

  // Diagnostic précis : indique laquelle manque
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

export function adminAuth() {
  return getAuth(getAdminApp());
}

export function adminDb() {
  return getFirestore(getAdminApp());
}

/**
 * Vérifie le jeton Firebase envoyé par le client.
 * Retourne l'UID si valide, null sinon.
 */
export async function verifyIdToken(authHeader?: string | null): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return decoded.uid;
  } catch (err) {
    console.error("Vérification du jeton échouée :", err);
    return null;
  }
}

/**
 * Diagnostic — à appeler depuis une route de test.
 * Ne révèle aucune valeur secrète, seulement l'état de la configuration.
 */
export function diagnoseConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  const key = normalizePrivateKey(rawKey);

  return {
    projectId: projectId ? `✓ ${projectId}` : "✗ absent",
    clientEmail: clientEmail
      ? `✓ ${clientEmail.slice(0, 12)}…@…`
      : "✗ absent",
    privateKey: !rawKey
      ? "✗ absente"
      : !key
        ? "✗ format invalide (BEGIN/END manquant)"
        : `✓ valide (${key.split("\n").length} lignes)`,
    hasLiteralNewlines: rawKey ? rawKey.includes("\\n") : false,
    hasRealNewlines: rawKey ? rawKey.includes("\n") : false,
  };
}
