"use client";
import { useContext, useState } from "react";
import { useAuth } from "@/lib/auth-context";

/**
 * ⚠️ COMPOSANT TEMPORAIRE DE DIAGNOSTIC
 *
 * Affiche l'état de l'authentification directement à l'écran.
 * Fonctionne sur téléphone, sans console.
 *
 * ⚠️ La page 404 de Next.js est pré-générée EN DEHORS du AuthProvider.
 * Un appel direct à useAuth() y lève « must be used within AuthProvider »
 * et fait échouer le build entier. On l'entoure donc d'un try/catch.
 *
 * 👉 SUPPRIME CE FICHIER une fois le problème résolu.
 */
export default function AuthDebug() {
  const [open, setOpen] = useState(false);

  // useAuth peut échouer hors du Provider — on ne laisse pas ça casser le build
  let auth: any = null;
  let contextError: string | null = null;
  try {
    auth = useAuth();
  } catch (e: any) {
    contextError = e?.message || "contexte indisponible";
  }

  // Rien à afficher si on est hors du Provider (page 404, etc.)
  if (contextError) return null;

  const ADMIN_UID = "4bnssIV8FlS80SzaX6ylwc9Fbg92";
  const uid = auth?.user?.uid;
  const isAdmin = uid === ADMIN_UID;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 12,
        insetInlineStart: 12,
        zIndex: 9999,
        fontFamily: "monospace",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: isAdmin ? "#22C55E" : "#EF4444",
          color: "white",
          border: "none",
          borderRadius: 8,
          padding: "6px 12px",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        }}
      >
        {open ? "✕ Fermer" : "🔍 Debug"}
      </button>

      {open && (
        <div
          style={{
            marginTop: 8,
            background: "#0A0014",
            border: "1px solid #7C3AED",
            borderRadius: 10,
            padding: 12,
            fontSize: 10.5,
            lineHeight: 1.7,
            color: "#C4B5FD",
            maxWidth: 300,
            wordBreak: "break-all",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <Row label="loading" value={String(auth?.loading)} />
          <Row label="user" value={auth?.user ? "✓ présent" : "✗ null"} />
          <Row label="uid" value={uid || "—"} />
          <Row
            label="uid = admin"
            value={isAdmin ? "✓ OUI" : "✗ NON"}
            color={isAdmin ? "#4ade80" : "#f87171"}
          />
          <Row label="email" value={auth?.user?.email || "—"} />
          <Row
            label="profile"
            value={auth?.profile ? "✓ chargé" : "✗ NULL"}
            color={auth?.profile ? "#4ade80" : "#f87171"}
          />
          <Row label="displayName" value={auth?.profile?.displayName || "—"} />
          <Row label="role" value={auth?.profile?.role || "—"} />

          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: "1px solid rgba(124,58,237,0.3)",
              color: "#8b7bb8",
              fontSize: 10,
            }}
          >
            {!auth?.user
              ? "→ Pas connecté"
              : !auth?.profile
                ? "→ Connecté mais profil non chargé"
                : !isAdmin
                  ? "→ Autre compte que l'admin"
                  : "→ Tout est correct"}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <span style={{ color: "#6d28d9", minWidth: 80 }}>{label}</span>
      <span style={{ color: color || "#C4B5FD" }}>{value}</span>
    </div>
  );
}
