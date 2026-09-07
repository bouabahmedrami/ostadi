"use client";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { doc, setDoc, deleteDoc, getDocs, collection, query, where } from "firebase/firestore";
import { getApp, getApps } from "firebase/app";
import { db } from "./firebase";

/**
 * Instance Firebase.
 *
 * ⚠️ `lib/firebase.ts` n'exporte pas l'objet `app` lui-même, seulement
 * `auth`, `db` et `storage`. Plutôt que de modifier ce fichier — et de
 * risquer de casser les vingt modules qui en dépendent — on récupère
 * l'instance déjà initialisée via `getApp()`.
 *
 * L'import de `./firebase` juste au-dessus garantit que
 * `initializeApp` a bien été exécuté avant cet appel.
 */
function firebaseApp() {
  return getApps().length > 0 ? getApp() : null;
}

/**
 * Notifications push.
 *
 * ═══════════════════════════════════════════════════════════
 * Les notifications de la cloche ne servent que si l'application est
 * ouverte. Un professeur qui ne l'ouvre pas de la journée ne sait
 * jamais qu'un élève attend — et l'élève va voir ailleurs.
 *
 * Les push traversent : elles apparaissent sur l'écran verrouillé,
 * même application fermée.
 *
 * ⚠️ Deux limites à connaître avant de compter dessus :
 *
 * • iOS n'accepte les push web que si l'application a été ajoutée à
 *   l'écran d'accueil. Dans Safari classique, rien n'arrive.
 *   Votre `InstallPrompt` prend ici tout son sens.
 *
 * • Le navigateur doit demander l'autorisation, et l'utilisateur
 *   peut refuser. Un refus est définitif jusqu'à ce qu'il le change
 *   lui-même dans les réglages — d'où l'importance de ne demander
 *   qu'au bon moment.
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Clé VAPID publique.
 *
 * À récupérer dans la console Firebase :
 * Paramètres du projet → Cloud Messaging → Certificats push web
 * → « Générer une paire de clés ».
 */
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";

/** Le navigateur peut-il recevoir des push ? */
export async function pushSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  if (!("serviceWorker" in navigator)) return false;

  try {
    return await isSupported();
  } catch {
    return false;
  }
}

/** État actuel de l'autorisation */
export function pushPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Demande l'autorisation et enregistre l'appareil.
 *
 * ⚠️ À n'appeler qu'après une action volontaire de l'utilisateur.
 * Une demande d'autorisation au chargement de la page se fait
 * refuser dans la majorité des cas — et le refus est définitif.
 */
export async function enablePush(userId: string): Promise<boolean> {
  if (!(await pushSupported())) return false;
  if (!VAPID_KEY) {
    console.warn("Clé VAPID absente — les push sont désactivées.");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    const application = firebaseApp();
    if (!application) return false;

    const messaging = getMessaging(application);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) return false;

    /**
     * Le jeton sert d'identifiant de document.
     *
     * Une personne peut avoir plusieurs appareils — téléphone,
     * ordinateur, tablette — et chacun a son propre jeton. Les
     * indexer par jeton évite les doublons quand elle réactive les
     * notifications sur un appareil déjà enregistré.
     */
    await setDoc(doc(db, "pushTokens", token), {
      userId,
      token,
      platform: navigator.userAgent.slice(0, 180),
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    });

    try {
      localStorage.setItem("ostadi-push-token", token);
    } catch { /* navigation privée */ }

    return true;
  } catch (err) {
    console.warn("Activation des push échouée :", err);
    return false;
  }
}

/** Retire l'appareil courant */
export async function disablePush(): Promise<void> {
  try {
    const token = localStorage.getItem("ostadi-push-token");
    if (token) {
      await deleteDoc(doc(db, "pushTokens", token));
      localStorage.removeItem("ostadi-push-token");
    }
  } catch (err) {
    console.warn("Désactivation des push échouée :", err);
  }
}

/**
 * Messages reçus pendant que l'application est ouverte.
 *
 * Le service worker ne s'en charge pas dans ce cas — le navigateur
 * considère que l'utilisateur voit déjà l'application. On affiche
 * donc un message éphémère plutôt qu'une notification système, qui
 * ferait doublon avec ce qu'il a sous les yeux.
 */
export function onForegroundPush(
  callback: (payload: { title: string; body: string; link?: string }) => void
): () => void {
  let unsub = () => {};

  (async () => {
    if (!(await pushSupported())) return;
    try {
      const application = firebaseApp();
      if (!application) return;

      const messaging = getMessaging(application);
      unsub = onMessage(messaging, payload => {
        callback({
          title: payload.notification?.title || payload.data?.title || "Ostadi",
          body: payload.notification?.body || payload.data?.body || "",
          link: payload.data?.link,
        });
      });
    } catch (err) {
      console.warn("Écoute des push échouée :", err);
    }
  })();

  return () => unsub();
}

/** Jetons d'un utilisateur — utilisé côté serveur pour l'envoi */
export async function getUserPushTokens(userId: string): Promise<string[]> {
  const snap = await getDocs(
    query(collection(db, "pushTokens"), where("userId", "==", userId))
  );
  return snap.docs.map(d => (d.data() as any).token).filter(Boolean);
}
