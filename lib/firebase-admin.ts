import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Firebase Admin — utilisé UNIQUEMENT côté serveur (routes API).
 * Ne jamais importer ce fichier dans un composant client.
 */

let app: App;

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // La clé privée contient des \n littéraux dans les variables d'env
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin non configuré. Variables requises : " +
      "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export function adminAuth() {
  app = app || getAdminApp();
  return getAuth(app);
}

export function adminDb() {
  app = app || getAdminApp();
  return getFirestore(app);
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
  } catch {
    return null;
  }
}
