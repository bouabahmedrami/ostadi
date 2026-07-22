import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { LangProvider } from "@/lib/lang-context";
import { BandwidthProvider } from "@/lib/hooks/useBandwidth";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Ostadi — أستاذي | Cours de soutien en ligne",
  description: "Plateforme algérienne de cours de soutien complémentaires en ligne.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+Arabic:wght@400;600;700;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        <LangProvider>
          <BandwidthProvider>
            <AuthProvider>
              <Navbar />
              <main className="min-h-screen">
                {children}
              </main>
            </AuthProvider>
          </BandwidthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
