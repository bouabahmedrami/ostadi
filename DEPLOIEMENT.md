# 🚀 Guide de Déploiement — Ostadi

## Étape 1 — Firebase Setup

### 1.1 Créer le projet Firebase
1. Va sur https://console.firebase.google.com
2. Crée un projet → Nom: `ostadi-dz`
3. Désactive Google Analytics

### 1.2 Activer Authentication
- Menu → Authentication → Get started
- Email/Password → Enable

### 1.3 Activer Firestore
- Menu → Firestore Database → Create database
- Mode: **Start in test mode**
- Région: `europe-west3` (Frankfurt)

### 1.4 Activer Storage
- Menu → Storage → Get started
- Région: `europe-west3`

### 1.5 App Web
- Clique `</>` sur la page d'accueil
- Nom: `ostadi-web`
- Copie les clés dans `.env.local`

### 1.6 Déployer les règles Firestore
```bash
npm install -g firebase-tools
firebase login
firebase init firestore
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## Étape 2 — Variables d'environnement

Crée `.env.local` à la racine :
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ostadi-dz.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ostadi-dz
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ostadi-dz.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
```

---

## Étape 3 — Tester en local

```bash
npm install
npm run dev
# Ouvre http://localhost:3000
```

---

## Étape 4 — Déploiement Vercel

### 4.1 Installer Vercel CLI
```bash
npm install -g vercel
```

### 4.2 Déployer
```bash
vercel login
vercel --prod
```

### 4.3 Ajouter les variables d'environnement sur Vercel
- Va sur https://vercel.com/dashboard
- Ton projet → Settings → Environment Variables
- Ajoute toutes les variables de `.env.local`

### 4.4 Domaine personnalisé (optionnel)
- Settings → Domains → Add `ostadi.dz` ou `ostadi.app`

---

## Étape 5 — Créer le compte Admin

Dans Firestore, crée manuellement un document dans `users` :
```json
{
  "uid": "UID_DE_TON_COMPTE",
  "role": "admin",
  "displayName": "Admin Ostadi",
  "email": "admin@ostadi.dz",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

---

## Étape 6 — Flutter Mobile

### 6.1 Prérequis
```bash
flutter doctor
```

### 6.2 Créer le projet Flutter
```bash
flutter create ostadi_mobile
cd ostadi_mobile
```

### 6.3 Ajouter dépendances (pubspec.yaml)
```yaml
dependencies:
  flutter:
    sdk: flutter
  firebase_core: ^3.0.0
  firebase_auth: ^5.0.0
  cloud_firestore: ^5.0.0
  firebase_storage: ^12.0.0
  webview_flutter: ^4.0.0
  jitsi_meet_flutter_sdk: ^0.4.0
  provider: ^6.0.0
  go_router: ^13.0.0
  cached_network_image: ^3.0.0
  flutter_localizations:
    sdk: flutter
  intl: ^0.19.0
```

### 6.4 Configurer Firebase pour Flutter
```bash
dart pub global activate flutterfire_cli
flutterfire configure
```

### 6.5 Build APK
```bash
flutter build apk --release
# APK dans: build/app/outputs/flutter-apk/app-release.apk
```

### 6.6 Build iOS
```bash
flutter build ios --release
```

---

## Structure des URLs Ostadi

| Page | URL |
|------|-----|
| Accueil | `/` |
| Connexion | `/auth` |
| Dashboard Professeur | `/dashboard` |
| Mes Cours (Élève) | `/mes-cours` |
| Détail cours | `/classe/[id]` |
| Chat | `/chat` |
| Chat cours | `/chat/[classeId]` |
| Profil Professeur | `/professeur/[uid]` |
| Vérification | `/verification` |
| Abonnement | `/abonnement` |
| Enregistrements | `/enregistrements` |
| Admin | `/admin` |

---

## Checklist avant lancement

- [ ] Firebase configuré et règles déployées
- [ ] Variables d'environnement sur Vercel
- [ ] Compte admin créé dans Firestore
- [ ] Test inscription professeur + élève
- [ ] Test création cours + inscription élève
- [ ] Test chat temps réel
- [ ] Test Jitsi (cours en direct)
- [ ] Test notation
- [ ] Test upload vérification
- [ ] Test abonnement
- [ ] Domaine configuré (ostadi.dz)
