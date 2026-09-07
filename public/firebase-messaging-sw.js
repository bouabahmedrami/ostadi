/**
 * Service worker des notifications push.
 *
 * ═══════════════════════════════════════════════════════════
 * ⚠️ Ce fichier doit se trouver à la RACINE de /public.
 *
 * Firebase Messaging cherche `/firebase-messaging-sw.js` à un
 * chemin fixe. Placé ailleurs — dans un sous-dossier, ou renommé —
 * l'enregistrement échoue sans message clair.
 *
 * Il ne peut pas non plus importer vos modules : un service worker
 * s'exécute hors de l'application, sans accès au bundle. D'où les
 * scripts chargés depuis le CDN Google et la configuration recopiée
 * en dur ci-dessous.
 * ═══════════════════════════════════════════════════════════
 */

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

/**
 * Configuration Firebase.
 *
 * Ces valeurs sont publiques par nature — elles figurent déjà dans
 * le code client livré au navigateur. Ce ne sont pas des secrets :
 * la sécurité repose sur les règles Firestore, pas sur elles.
 *
 * ⚠️ Remplacez par les valeurs de votre projet si elles diffèrent.
 */
firebase.initializeApp({
  apiKey: "AIzaSyDXvJqE8kJmVYQzGYWxLmPqRsT4uNhBcDe",
  authDomain: "ostadi-72df9.firebaseapp.com",
  projectId: "ostadi-72df9",
  storageBucket: "ostadi-72df9.firebasestorage.app",
  messagingSenderId:"413785281009",
  appId: "1:413785281009:web:4fd5559b43e412595e3450",
});

const messaging = firebase.messaging();

/**
 * Message reçu alors que l'application est fermée ou en arrière-plan.
 *
 * C'est le cas qui compte : un élève qui a fermé l'onglet doit
 * quand même savoir que son cours commence dans une heure.
 */
messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || payload.data?.title || "Ostadi";
  const body = payload.notification?.body || payload.data?.body || "";
  const link = payload.data?.link || "/";

  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    // Le regroupement évite d'empiler dix notifications d'un même
    // cours : la plus récente remplace la précédente
    tag: payload.data?.tag || "ostadi",
    renotify: true,
    dir: "auto",
    data: { link },
    // Vibration courte — une notification n'est pas une alarme
    vibrate: [80, 40, 80],
  });
});

/**
 * Clic sur la notification.
 *
 * On cherche d'abord un onglet Ostadi déjà ouvert plutôt que d'en
 * ouvrir un nouveau : l'utilisateur retrouve sa session, son
 * défilement, son formulaire à moitié rempli.
 */
self.addEventListener("notificationclick", event => {
  event.notification.close();

  const link = event.notification.data?.link || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(link);
    })
  );
});
