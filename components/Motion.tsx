"use client";
import {
  useEffect, useRef, useState, ReactNode, Children, isValidElement, cloneElement,
} from "react";

/* ═══════════════════════════════════════════════════════════
   APPARITION AU DÉFILEMENT
   ═══════════════════════════════════════════════════════════ */

type Direction = "up" | "left" | "right" | "scale";

/**
 * Révèle son contenu quand il entre dans le champ de vision.
 *
 * IntersectionObserver plutôt qu'un écouteur de défilement : le
 * navigateur fait le calcul hors du fil principal, donc aucun impact
 * sur la fluidité — ce qui compte sur un téléphone modeste.
 *
 * L'observation s'arrête après le premier passage. Un élément qui
 * réapparaît en remontant ne se rejoue pas : l'effet perdrait son
 * sens et deviendrait fatigant.
 */
export function Reveal({
  children,
  direction = "up",
  delay = 0,
  threshold = 0.12,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  direction?: Direction;
  /** Retard en millisecondes */
  delay?: number;
  /** Part de l'élément visible avant déclenchement */
  threshold?: number;
  className?: string;
  as?: any;
}) {
  const ref = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Sans IntersectionObserver, on affiche directement
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }

    const obs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setSeen(true);
          obs.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  const cls = {
    up: "os-reveal",
    left: "os-reveal-left",
    right: "os-reveal-right",
    scale: "os-reveal-scale",
  }[direction];

  return (
    <Tag
      ref={ref}
      className={`${cls} ${seen ? "os-seen" : ""} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

/**
 * Révèle une liste en cascade.
 *
 * Le décalage est plafonné : au-delà de huit éléments, l'utilisateur
 * attend que l'animation finisse au lieu de lire. On garde le même
 * retard pour tout ce qui suit.
 */
export function RevealGroup({
  children,
  step = 65,
  max = 8,
  direction = "up",
  className = "",
}: {
  children: ReactNode;
  /** Décalage entre deux éléments, en millisecondes */
  step?: number;
  /** Nombre d'éléments avant plafonnement */
  max?: number;
  direction?: Direction;
  className?: string;
}) {
  return (
    <div className={className}>
      {Children.map(children, (child, i) => {
        if (!isValidElement(child)) return child;
        return (
          <Reveal direction={direction} delay={Math.min(i, max) * step}>
            {child}
          </Reveal>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ATMOSPHÈRE
   ═══════════════════════════════════════════════════════════ */

/**
 * Halos lumineux du fond.
 *
 * À placer une seule fois, dans le layout. Le verre n'a de sens que
 * posé devant une source lumineuse — sans ces halos, les panneaux
 * translucides ne ressemblent qu'à des boîtes grises.
 */
export function Atmosphere({ weave = true }: { weave?: boolean }) {
  return (
    <div className="os-atmosphere" aria-hidden="true">
      <span className="os-halo os-halo-a" />
      <span className="os-halo os-halo-b" />
      <span className="os-halo os-halo-c" />
      {weave && <span className="os-weave" />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TRANSITION DE PAGE
   ═══════════════════════════════════════════════════════════ */

/**
 * Fondu à l'arrivée sur une page.
 *
 * Volontairement discret — 460 ms, un léger déplacement vertical.
 * Une transition trop marquée donne l'impression que le site est
 * lent, alors qu'elle ne fait que masquer le chargement.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return <div className="os-page-enter">{children}</div>;
}

/**
 * Séquence d'ouverture — chaque enfant direct apparaît l'un après
 * l'autre. Réservé aux en-têtes de page, pas aux listes longues.
 */
export function Sequence({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`os-seq ${className}`.trim()}>{children}</div>;
}

/* ═══════════════════════════════════════════════════════════
   COMPTEUR ANIMÉ
   ═══════════════════════════════════════════════════════════ */

/**
 * Fait défiler un nombre jusqu'à sa valeur, au moment où il devient
 * visible. Utile sur les statistiques — un chiffre qui monte attire
 * l'œil là où un chiffre posé ne dit rien.
 *
 * Ne s'anime qu'une fois, et respecte le réglage de mouvement réduit.
 */
export function CountUp({
  to,
  duration = 1100,
  suffix = "",
  decimals = 0,
}: {
  to: number;
  duration?: number;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || done.current) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setValue(to); done.current = true; return; }

    const obs = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting || done.current) return;
      done.current = true;
      obs.disconnect();

      const start = performance.now();
      function tick(now: number) {
        const p = Math.min((now - start) / duration, 1);
        // Décélération — rapide au début, doux à l'arrivée
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(to * eased);
        if (p < 1) requestAnimationFrame(tick);
        else setValue(to);
      }
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });

    obs.observe(el);
    return () => obs.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref}>
      {decimals > 0
        ? value.toFixed(decimals)
        : Math.round(value).toLocaleString("fr-DZ")}
      {suffix}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   RELIEF AU POINTEUR
   ═══════════════════════════════════════════════════════════ */

/**
 * Léger basculement de la carte selon la position du curseur.
 *
 * Désactivé au toucher : sans pointeur, l'effet ne se déclenche
 * jamais et le calcul serait inutile.
 */
export function Tilt({
  children,
  strength = 6,
  className = "",
}: {
  children: ReactNode;
  /** Amplitude en degrés */
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(window.matchMedia?.("(hover: hover) and (pointer: fine)").matches ?? false);
  }, []);

  function move(e: React.MouseEvent) {
    if (!enabled || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform =
      `perspective(900px) rotateX(${-y * strength}deg) rotateY(${x * strength}deg) translateZ(0)`;
  }

  function leave() {
    if (ref.current) ref.current.style.transform = "";
  }

  return (
    <div
      ref={ref}
      onMouseMove={move}
      onMouseLeave={leave}
      className={className}
      style={{ transition: "transform 380ms cubic-bezier(0.22,1,0.36,1)" }}
    >
      {children}
    </div>
  );
}
