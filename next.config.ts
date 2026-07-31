import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * firebase-admin doit rester en dehors du bundle serveur.
   *
   * Il dépend de `jwks-rsa`, qui charge `jose` — un module ESM pur.
   * Quand Turbopack tente de les regrouper, Node.js échoue avec :
   *   ERR_REQUIRE_ESM: require() of ES Module ... not supported
   *
   * En le déclarant externe, Node le charge lui-même au moment de
   * l'exécution, avec son propre système de résolution de modules.
   */
  serverExternalPackages: ["firebase-admin"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "*.firebasestorage.app",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
