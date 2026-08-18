"use client";
import { useEffect, useRef, useState, ReactNode } from "react";

/* ═══════════════════════════════════════════════════════════
   LE TRAIT DE CRAIE
   ═══════════════════════════════════════════════════════════

   Une signature visuelle qui n'appartient qu'à Ostadi.

   Le glassmorphism est partout. Les dégradés violets sont partout.
   Ce qui distingue une interface, c'est un geste qu'on ne voit
   nulle part ailleurs — et qui vient du sujet lui-même.

   Ici : le trait que l'enseignant tire sous un mot au tableau.
   Il ne s'affiche pas, il se dessine. Le tracé est volontairement
   irrégulier — une ligne parfaitement droite serait une bordure
   CSS, pas un geste humain.

   Trois usages :
     • souligner un mot dans un titre
     • confirmer une action réussie
     • marquer une case cochée
   ═══════════════════════════════════════════════════════════ */


/**
 * Souligne son contenu d'un trait de craie, tracé à l'apparition.
 *
 * Le trait passe sous le texte et déborde légèrement de chaque
 * côté, comme une main qui ne s'arrête pas exactement à la lettre.
 */
export function ChalkUnderline({
  children,
  color = "#FF8C00",
  delay = 220,
  thickness = 3,
}: {
  children: ReactNode;
  color?: string;
  /** Retard avant le tracé, en millisecondes */
  delay?: number;
  thickness?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [draw, setDraw] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDraw(true);
      return;
    }

    const obs = new IntersectionObserver(
      e => {
        if (e[0].isIntersecting) {
          setTimeout(() => setDraw(true), delay);
          obs.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <span ref={ref} className="ck-wrap">
      {children}
      <svg
        className="ck-svg"
        viewBox="0 0 200 12"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Le tracé n'est pas droit : trois points de contrôle qui
            montent et descendent d'un pixel. C'est ce qui fait la
            différence entre un trait tracé et une bordure. */}
        <path
          d="M 2 7 C 34 4, 62 9, 96 6 S 158 8, 198 5"
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          className={draw ? "ck-draw" : ""}
        />
      </svg>

      <style jsx>{`
        .ck-wrap {
          position: relative;
          display: inline-block;
          white-space: nowrap;
        }
        .ck-svg {
          position: absolute;
          inset-inline-start: -4%;
          bottom: -0.18em;
          width: 108%;
          height: 0.34em;
          overflow: visible;
          pointer-events: none;
        }
        .ck-svg path {
          stroke-dasharray: 260;
          stroke-dashoffset: 260;
          opacity: 0.9;
        }
        .ck-svg path.ck-draw {
          animation: ckDraw 620ms cubic-bezier(0.35, 0.9, 0.4, 1) forwards;
        }
        @keyframes ckDraw {
          to { stroke-dashoffset: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ck-svg path { stroke-dashoffset: 0; }
          .ck-svg path.ck-draw { animation: none; }
        }
      `}</style>
    </span>
  );
}


/**
 * Coche de craie — confirmation d'une action.
 *
 * Se trace en deux segments, comme une vraie coche : le petit
 * jambage descend, la grande branche remonte. Un SVG figé
 * apparaîtrait d'un bloc ; ici on voit la main passer.
 */
export function ChalkCheck({
  size = 44,
  color = "#22C55E",
  onDone,
}: {
  size?: number;
  color?: string;
  onDone?: () => void;
}) {
  const [draw, setDraw] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDraw(true), 60);
    const d = onDone ? setTimeout(onDone, 900) : undefined;
    return () => { clearTimeout(t); if (d) clearTimeout(d); };
  }, [onDone]);

  return (
    <span className="ckc" style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        {/* Cercle légèrement ouvert : un trait de craie ne boucle
            jamais parfaitement */}
        <path
          d="M 24 3 A 21 21 0 1 1 23 3"
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.34"
          className={`ckc-ring ${draw ? "ckc-on" : ""}`}
        />
        <path
          d="M 14 24.5 L 21 32 L 34.5 17"
          fill="none"
          stroke={color}
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`ckc-tick ${draw ? "ckc-on" : ""}`}
        />
      </svg>

      <style jsx>{`
        .ckc { display: inline-flex; }
        .ckc-ring {
          stroke-dasharray: 132;
          stroke-dashoffset: 132;
        }
        .ckc-ring.ckc-on {
          animation: ckcRing 520ms cubic-bezier(0.3, 0.9, 0.4, 1) forwards;
        }
        .ckc-tick {
          stroke-dasharray: 34;
          stroke-dashoffset: 34;
        }
        .ckc-tick.ckc-on {
          animation: ckcTick 380ms cubic-bezier(0.35, 0.95, 0.45, 1) 260ms forwards;
        }
        @keyframes ckcRing { to { stroke-dashoffset: 0; } }
        @keyframes ckcTick { to { stroke-dashoffset: 0; } }

        @media (prefers-reduced-motion: reduce) {
          .ckc-ring, .ckc-tick { stroke-dashoffset: 0; animation: none; }
        }
      `}</style>
    </span>
  );
}


/**
 * Encadre son contenu d'un trait de craie.
 *
 * Pour mettre en avant un chiffre ou un mot dans une phrase —
 * comme on entoure une réponse au tableau. Le rectangle est
 * volontairement de travers.
 */
export function ChalkCircle({
  children,
  color = "#FF8C00",
  delay = 300,
}: {
  children: ReactNode;
  color?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [draw, setDraw] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDraw(true);
      return;
    }

    const obs = new IntersectionObserver(
      e => {
        if (e[0].isIntersecting) {
          setTimeout(() => setDraw(true), delay);
          obs.disconnect();
        }
      },
      { threshold: 0.55 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <span ref={ref} className="ckr">
      {children}
      <svg
        viewBox="0 0 120 46"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* L'ellipse ne se referme pas exactement : le trait repasse
            un peu au-delà de son point de départ, comme une main */}
        <path
          d="M 60 4 C 96 4, 116 13, 116 23 C 116 34, 94 42, 58 42 C 22 42, 4 33, 4 23 C 4 13, 24 5, 62 4.5"
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          className={draw ? "ckr-draw" : ""}
        />
      </svg>

      <style jsx>{`
        .ckr {
          position: relative;
          display: inline-block;
          padding: 0.12em 0.42em;
        }
        .ckr svg {
          position: absolute;
          inset: -0.16em -0.1em;
          width: calc(100% + 0.2em);
          height: calc(100% + 0.32em);
          overflow: visible;
          pointer-events: none;
        }
        .ckr svg path {
          stroke-dasharray: 330;
          stroke-dashoffset: 330;
          opacity: 0.82;
        }
        .ckr svg path.ckr-draw {
          animation: ckrDraw 780ms cubic-bezier(0.35, 0.85, 0.4, 1) forwards;
        }
        @keyframes ckrDraw { to { stroke-dashoffset: 0; } }

        @media (prefers-reduced-motion: reduce) {
          .ckr svg path { stroke-dashoffset: 0; animation: none; }
        }
      `}</style>
    </span>
  );
}
