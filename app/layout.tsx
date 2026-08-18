import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { LangProvider } from "@/lib/lang-context";
import { BandwidthProvider } from "@/lib/hooks/useBandwidth";
import Navbar from "@/components/Navbar";
import HtmlLangSync from "@/components/HtmlLangSync";
import ReminderChecker from "@/components/ReminderChecker";
import InstallPrompt from "@/components/InstallPrompt";
import { Atmosphere } from "@/components/Motion";
import { ToastProvider } from "@/components/Toast";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ostadi.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Ostadi — أستاذي | Cours de soutien en ligne en Algérie",
    template: "%s | Ostadi",
  },
  description:
    "Trouvez un professeur qualifié pour des cours de soutien en ligne : Bac, BEM, primaire, moyen et secondaire. Professeurs vérifiés dans les 58 wilayas d'Algérie.",
  keywords: [
    "cours de soutien Algérie", "cours particuliers en ligne",
    "professeur Bac", "révision BEM", "دروس الدعم", "أستاذ خصوصي",
    "soutien scolaire Alger", "cours en ligne Algérie", "دروس عبر الإنترنت",
  ],
  authors: [{ name: "Ostadi" }],
  creator: "Ostadi",
  publisher: "Ostadi",

  openGraph: {
    type: "website",
    locale: "fr_DZ",
    alternateLocale: ["ar_DZ"],
    url: SITE_URL,
    siteName: "Ostadi — أستاذي",
    title: "Ostadi — Cours de soutien en ligne en Algérie",
    description:
      "Professeurs vérifiés, cours en direct, paiement local. Bac, BEM et tous les niveaux.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Ostadi — Plateforme de cours de soutien en Algérie",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Ostadi — أستاذي",
    description: "Cours de soutien en ligne avec des professeurs algériens vérifiés.",
    images: ["/og-image.png"],
  },

  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },

  alternates: {
    canonical: SITE_URL,
    languages: {
      "fr-DZ": SITE_URL,
      "ar-DZ": SITE_URL,
    },
  },

  formatDetection: { telephone: false },

  // ── PWA ──
  // Rend le site installable : icône sur l'écran d'accueil,
  // démarrage sans barre d'adresse. Bien plus léger qu'un APK
  // sur un téléphone d'entrée de gamme.
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ostadi",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0014",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+Arabic:wght@400;600;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      {/* suppressHydrationWarning : les extensions de navigateur (mode sombre,
          traducteurs, gestionnaires de mots de passe) ajoutent des attributs
          au <body> après le rendu serveur, ce que React signale sinon */}
      <body suppressHydrationWarning>
        {/* ═══ ATMOSPHÈRE ═══
            Les halos lumineux du fond. Placés AVANT tout le reste,
            en position fixe et z-index 0.

            Sans eux, le verre dépoli ne ressemble à rien : un panneau
            translucide devant du noir uni n'est qu'une boîte grise.
            C'est la lumière derrière qui fait le verre. */}
        <Atmosphere />

        <LangProvider>
          <HtmlLangSync />
          <BandwidthProvider>
            {/* ═══ MESSAGES ÉPHÉMÈRES ═══
                Enveloppe AuthProvider, pas l'inverse : les messages
                doivent survivre à un changement d'utilisateur, et
                useToast doit être accessible partout en dessous.

                Remplace window.alert(), qui sur Android affiche le nom
                du domaine au-dessus du texte — « ostadi-eta.vercel.app
                indique... ». Rien ne rappelle plus brutalement à
                l'utilisateur qu'il est sur un site web. */}
            <ToastProvider>
              <AuthProvider>
              {/* Vérifie les cours à venir et crée les rappels manquants.
                  Ne rend rien à l'écran. Doit rester DANS AuthProvider :
                  il lit l'utilisateur connecté. */}
                <ReminderChecker />
                {/* Invitation à installer — n'apparaît qu'après 45 s de navigation */}
                <InstallPrompt />
                <Navbar />
                <main className="ostadi-main" style={{ position: "relative", zIndex: 1 }}>
                  {children}
                </main>
              </AuthProvider>
            </ToastProvider>
          </BandwidthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
