"use client";
import {
  useState, useEffect, useRef, useCallback, ReactNode,
} from "react";
import { useLang } from "@/lib/lang-context";
import { haptic } from "@/lib/haptics";
import { X } from "lucide-react";

/**
 * Feuille glissante.
 *
 * ═══════════════════════════════════════════════════════════
 * Ce qui sépare une application web d'une application native
 * tient souvent à ça : le modal suit-il le doigt ?
 *
 * Un modal classique s'ouvre et se ferme par un bouton. Une
 * feuille native se saisit, se déplace avec la main, ralentit
 * quand on résiste, et repart si on la relâche trop tôt. Le
 * geste est continu — l'interface obéit au doigt plutôt que
 * d'attendre un clic.
 * ═══════════════════════════════════════════════════════════
 *
 * Sur écran large, le comportement redevient un modal centré :
 * personne ne fait glisser une fenêtre avec une souris.
 */
export default function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  /** Hauteur maximale, en pourcentage du viewport */
  maxHeight = 92,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  maxHeight?: number;
}) {
  const { isRTL } = useLang();
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [mobile, setMobile] = useState(false);

  const startY = useRef(0);
  const startTime = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const passedThreshold = useRef(false);

  useEffect(() => {
    setMobile(window.matchMedia("(max-width: 640px)").matches);
  }, []);

  /* ── Verrouillage du défilement de fond ──
     Sans ça, la page défile derrière la feuille sur iOS, et on
     perd sa position en fermant. */
  useEffect(() => {
    if (!open) return;
    const y = window.scrollY;
    const body = document.body;
    const prev = body.style.cssText;

    body.style.cssText = `position:fixed;top:${-y}px;left:0;right:0;overflow:hidden;`;

    return () => {
      body.style.cssText = prev;
      window.scrollTo(0, y);
    };
  }, [open]);

  /* ── Fermeture au clavier ── */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { haptic("tap"); onClose(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* ── Réinitialisation à l'ouverture ── */
  useEffect(() => {
    if (open) { setDragY(0); passedThreshold.current = false; }
  }, [open]);

  /* ═══════════════════════════════════════════════════════════
     Le geste
     ═══════════════════════════════════════════════════════════ */

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!mobile) return;

    // Le geste ne démarre que si le contenu est en haut de sa course.
    // Sinon on fermerait la feuille au lieu de faire défiler.
    const sc = scrollRef.current;
    if (sc && sc.scrollTop > 2) return;

    const t = e.touches[0];
    startY.current = t.clientY;
    lastY.current = t.clientY;
    startTime.current = performance.now();
    lastTime.current = startTime.current;
    setDragging(true);
  }, [mobile]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return;

    const t = e.touches[0];
    const delta = t.clientY - startY.current;

    lastY.current = t.clientY;
    lastTime.current = performance.now();

    // Vers le haut : résistance croissante. La feuille cède un peu
    // puis se raidit — comme un élastique qu'on tire.
    const resisted = delta < 0 ? delta * 0.22 : delta;

    // Vibration unique au franchissement du seuil de fermeture.
    // L'utilisateur sent que relâcher maintenant fermera.
    if (resisted > 110 && !passedThreshold.current) {
      passedThreshold.current = true;
      haptic("threshold");
    } else if (resisted < 90) {
      passedThreshold.current = false;
    }

    setDragY(resisted);
  }, [dragging]);

  const onTouchEnd = useCallback(() => {
    if (!dragging) return;
    setDragging(false);

    // Vélocité sur les derniers millimètres, en pixels par seconde.
    // Un geste vif ferme même sur une courte distance : c'est
    // l'intention qui compte, pas la distance parcourue.
    const dt = Math.max(performance.now() - lastTime.current, 1);
    const velocity = ((lastY.current - startY.current) / dt) * 1000;

    const shouldClose = dragY > 130 || velocity > 620;

    if (shouldClose) {
      haptic("tap");
      // On pousse la feuille hors champ avant de démonter, sinon
      // elle disparaît d'un coup au milieu du geste
      setDragY(window.innerHeight);
      setTimeout(onClose, 190);
    } else {
      setDragY(0);
    }
  }, [dragging, dragY, onClose]);

  if (!open) return null;

  const closing = dragY > window.innerHeight * 0.5;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      dir={isRTL ? "rtl" : "ltr"}
      className="sh-backdrop"
      style={{
        // Le voile s'éclaircit à mesure que la feuille descend :
        // le geste a une conséquence visible avant même d'aboutir
        opacity: dragging ? Math.max(1 - dragY / 340, 0.25) : 1,
      }}
      onClick={e => {
        if (e.target === e.currentTarget) { haptic("tap"); onClose(); }
      }}
    >
      <div
        ref={sheetRef}
        className={`sh-sheet os-glass-3 ${mobile ? "sh-mobile" : "sh-desktop"} ${closing ? "" : "sh-in"}`}
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragging
            ? "none"
            : "transform 340ms cubic-bezier(0.32, 1.28, 0.5, 1)",
          maxHeight: `${maxHeight}vh`,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        {/* Poignée — la seule affordance nécessaire.
            Personne ne lit « faites glisser pour fermer » ; tout le
            monde comprend une barre arrondie en haut d'un panneau. */}
        {mobile && (
          <div className="sh-grip-zone">
            <span className="sh-grip" />
          </div>
        )}

        {(title || !mobile) && (
          <header className="sh-head">
            <div className="sh-head-text">
              {title && <h2 className="sh-title">{title}</h2>}
              {subtitle && <p className="sh-subtitle">{subtitle}</p>}
            </div>
            <button
              onClick={() => { haptic("tap"); onClose(); }}
              className="sh-close os-press"
              aria-label={isRTL ? "إغلاق" : "Fermer"}
            >
              <X size={17} />
            </button>
          </header>
        )}

        <div ref={scrollRef} className="sh-body">
          {children}
        </div>
      </div>

      <style jsx>{`
        .sh-backdrop {
          position: fixed;
          inset: 0;
          z-index: 400;
          background: rgba(4, 0, 10, 0.72);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(5px);
          display: flex;
          animation: shFade 220ms ease;
        }
        @keyframes shFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .sh-sheet {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          will-change: transform;
        }

        /* ── Mobile : ancrée en bas ── */
        .sh-mobile {
          margin-top: auto;
          width: 100%;
          border-radius: 26px 26px 0 0;
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
        .sh-mobile.sh-in {
          animation: shUp 380ms cubic-bezier(0.22, 1.2, 0.36, 1);
        }
        @keyframes shUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        /* ── Écran large : modal centré ── */
        .sh-desktop {
          margin: auto;
          width: 100%;
          max-width: 540px;
          border-radius: 22px;
        }
        .sh-desktop.sh-in {
          animation: shPop 300ms cubic-bezier(0.22, 1.2, 0.36, 1);
        }
        @keyframes shPop {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to { opacity: 1; transform: none; }
        }

        /* ── Poignée ── */
        .sh-grip-zone {
          display: flex;
          justify-content: center;
          padding: 11px 0 4px;
          /* Zone de saisie généreuse : le doigt n'est pas précis */
          touch-action: none;
          cursor: grab;
        }
        .sh-grip {
          width: 40px;
          height: 4px;
          border-radius: 999px;
          background: rgba(196, 181, 253, 0.34);
        }

        /* ── En-tête ── */
        .sh-head {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 20px 12px;
          flex-shrink: 0;
        }
        .sh-head-text { flex: 1; min-width: 0; }
        .sh-title {
          margin: 0;
          color: #fff;
          font-weight: 800;
          font-size: 17px;
          letter-spacing: -0.3px;
        }
        .sh-subtitle {
          margin: 3px 0 0;
          color: #a78bfa;
          font-size: 12.5px;
        }
        .sh-close {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          border-radius: 10px;
          background: rgba(124, 58, 237, 0.16);
          border: none;
          color: #a78bfa;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        /* ── Contenu ── */
        .sh-body {
          flex: 1;
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          padding: 4px 20px 22px;
        }
        .sh-body::-webkit-scrollbar { width: 5px; }
        .sh-body::-webkit-scrollbar-thumb {
          background: rgba(124, 58, 237, 0.3);
          border-radius: 999px;
        }

        @media (prefers-reduced-motion: reduce) {
          .sh-backdrop,
          .sh-mobile.sh-in,
          .sh-desktop.sh-in { animation: none; }
        }
      `}</style>
    </div>
  );
}
