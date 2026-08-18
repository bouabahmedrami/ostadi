"use client";

/* ═══════════════════════════════════════════════════════════
   ÉCRANS DE CHARGEMENT
   ═══════════════════════════════════════════════════════════

   Un squelette qui reprend la forme du contenu à venir vaut mieux
   qu'un rotateur : l'œil se prépare, et l'attente paraît plus courte
   même à durée égale.

   Chaque squelette ici imite précisément le composant qu'il remplace.
   Un rectangle générique produirait l'effet inverse — un saut visuel
   au moment où le vrai contenu arrive.
   ═══════════════════════════════════════════════════════════ */

/** Carte de cours */
export function ClasseCardSkeleton() {
  return (
    <div className="os-glass-2" style={{ padding: 18, borderRadius: 20 }}>
      {/* Statut + prix */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div className="os-skeleton" style={{ width: 78, height: 22, borderRadius: 999 }} />
        <div className="os-skeleton" style={{ width: 88, height: 24, borderRadius: 6 }} />
      </div>

      {/* Titre */}
      <div className="os-skeleton" style={{ height: 17, width: "82%", marginBottom: 8 }} />
      <div className="os-skeleton" style={{ height: 17, width: "54%", marginBottom: 14 }} />

      {/* Étiquettes */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <div className="os-skeleton" style={{ width: 74, height: 22, borderRadius: 8 }} />
        <div className="os-skeleton" style={{ width: 62, height: 22, borderRadius: 8 }} />
      </div>

      {/* Professeur */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: 11, borderRadius: 13,
        background: "rgba(124,58,237,0.05)", marginBottom: 13,
      }}>
        <div className="os-skeleton os-skeleton-circle" style={{ width: 33, height: 33 }} />
        <div style={{ flex: 1 }}>
          <div className="os-skeleton" style={{ height: 12, width: "58%", marginBottom: 6 }} />
          <div className="os-skeleton" style={{ height: 10, width: "34%" }} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <div className="os-skeleton" style={{ flex: 1, height: 40, borderRadius: 12 }} />
        <div className="os-skeleton" style={{ width: 42, height: 40, borderRadius: 12 }} />
      </div>
    </div>
  );
}

/** Grille de cartes */
export function ClasseGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="os-grid">
      {Array.from({ length: count }).map((_, i) => (
        <ClasseCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Bandeau de statistiques */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
      gap: 13,
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="os-glass" style={{ padding: 18, borderRadius: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div className="os-skeleton" style={{ width: 38, height: 38, borderRadius: 12 }} />
            <div style={{ flex: 1 }}>
              <div className="os-skeleton" style={{ height: 20, width: "62%", marginBottom: 7 }} />
              <div className="os-skeleton" style={{ height: 10, width: "82%" }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** En-tête de profil professeur */
export function ProfileSkeleton() {
  return (
    <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
      <div className="os-skeleton" style={{ width: 90, height: 90, borderRadius: 24, flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 220 }}>
        <div className="os-skeleton" style={{ height: 26, width: "48%", marginBottom: 12 }} />
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div className="os-skeleton" style={{ height: 14, width: 92 }} />
          <div className="os-skeleton" style={{ height: 14, width: 108 }} />
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[86, 72, 94].map((w, i) => (
            <div key={i} className="os-skeleton" style={{ height: 24, width: w, borderRadius: 8 }} />
          ))}
        </div>
        <div className="os-skeleton" style={{ height: 12, width: "88%", marginBottom: 7 }} />
        <div className="os-skeleton" style={{ height: 12, width: "72%" }} />
      </div>

      <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="os-skeleton" style={{ width: 78, height: 72, borderRadius: 13 }} />
        ))}
      </div>
    </div>
  );
}

/** Liste de conversations */
export function MessageListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="os-glass" style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: 14, borderRadius: 14,
        }}>
          <div className="os-skeleton" style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="os-skeleton" style={{ height: 13, width: "44%", marginBottom: 7 }} />
            <div className="os-skeleton" style={{ height: 11, width: "78%" }} />
          </div>
          <div className="os-skeleton" style={{ width: 34, height: 11 }} />
        </div>
      ))}
    </div>
  );
}

/** Bulles de conversation */
export function ChatSkeleton() {
  const widths = [64, 46, 72, 38, 58];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 16 }}>
      {widths.map((w, i) => {
        const own = i % 2 === 1;
        return (
          <div key={i} style={{
            display: "flex",
            justifyContent: own ? "flex-end" : "flex-start",
          }}>
            <div className="os-skeleton" style={{
              width: `${w}%`,
              height: 40 + (i % 3) * 14,
              borderRadius: 17,
              borderStartEndRadius: own ? 5 : 17,
              borderStartStartRadius: own ? 17 : 5,
            }} />
          </div>
        );
      })}
    </div>
  );
}

/** Rotateur centré, plein écran */
export function PageLoader({ label }: { label?: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      minHeight: "60vh", gap: 16,
    }}>
      <div className="os-spinner" />
      {label && (
        <p className="os-muted" style={{ fontSize: 13.5, margin: 0 }}>
          {label}
        </p>
      )}
    </div>
  );
}

/**
 * Barre de progression indéterminée.
 *
 * Pour les actions dont on ne connaît pas la durée — un envoi, une
 * synchronisation. À placer en haut de l'écran concerné, pas au milieu :
 * l'utilisateur doit pouvoir continuer à lire.
 */
export function ProgressBar() {
  return (
    <div style={{
      position: "relative",
      height: 3,
      background: "rgba(124,58,237,0.14)",
      borderRadius: 999,
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute",
        inset: 0,
        width: "38%",
        background: "linear-gradient(90deg, transparent, #FF8C00, transparent)",
        animation: "indet 1.25s ease-in-out infinite",
      }} />
      <style>{`
        @keyframes indet {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(340%); }
        }
      `}</style>
    </div>
  );
}

/**
 * Écran vide.
 *
 * Un écran sans contenu n'est pas un échec, c'est une invitation.
 * Il dit ce qui manque et ce qu'on peut faire — jamais « aucun
 * résultat » tout court.
 */
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="os-glass" style={{
      padding: "48px 26px",
      borderRadius: 20,
      textAlign: "center",
    }}>
      <div style={{
        width: 66, height: 66, borderRadius: 20,
        margin: "0 auto 16px",
        background: "rgba(124,58,237,0.1)",
        border: "1px solid rgba(124,58,237,0.18)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#7c3aed",
      }}>
        {icon}
      </div>
      <p style={{
        color: "#d8b4fe", fontWeight: 700, fontSize: 15.5,
        margin: "0 0 8px",
      }}>
        {title}
      </p>
      {hint && (
        <p className="os-muted" style={{
          fontSize: 13, margin: "0 auto 20px",
          maxWidth: 320, lineHeight: 1.6,
        }}>
          {hint}
        </p>
      )}
      {action}
    </div>
  );
}
