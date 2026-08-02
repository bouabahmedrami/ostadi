"use client";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";

/**
 * ⚠️ COMPOSANT TEMPORAIRE DE DIAGNOSTIC
 *
 * Affiche l'état réel de l'authentification directement à l'écran,
 * sans passer par la console. Fonctionne sur téléphone.
 *
 * 👉 SUPPRIME-LE une fois le problème résolu.
 */
export default function AuthDebug() {
  const auth = useAuth() as any;
  const [open, setOpen] = useState(false);

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
        {open ? "✕ Fermer" : "🔍 Debug Auth"}
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
            label="uid === admin"
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
          <Row label="emailVerified" value={String(auth?.emailVerified)} />

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
                ? "→ Connecté mais profil non chargé (règles Firestore ?)"
                : !isAdmin
                  ? "→ Connecté avec un autre compte"
                  : "→ Tout est correct, le lien Admin doit apparaître"}
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
      <span style={{ color: "#6d28d9", minWidth: 84 }}>{label}</span>
      <span style={{ color: color || "#C4B5FD" }}>{value}</span>
    </div>
  );
}
