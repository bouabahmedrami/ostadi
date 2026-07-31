import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { LangProvider } from "@/lib/lang-context";
import { BandwidthProvider } from "@/lib/hooks/useBandwidth";
import Navbar from "@/components/Navbar";
import HtmlLangSync from "@/components/HtmlLangSync";

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
        <LangProvider>
          <HtmlLangSync />
          <BandwidthProvider>
            <AuthProvider>
              <Navbar />
              <main className="ostadi-main">{children}</main>
            </AuthProvider>
          </BandwidthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
