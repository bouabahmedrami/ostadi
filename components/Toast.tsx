"use client";
import {
  createContext, useContext, useState, useCallback,
  ReactNode, useEffect, useRef,
} from "react";
import { useLang } from "@/lib/lang-context";
import { haptic } from "@/lib/haptics";
import { Check, AlertTriangle, X, Info, Loader2 } from "lucide-react";

/**
 * Messages éphémères.
 *
 * ═══════════════════════════════════════════════════════════
 * Remplace window.alert() et window.confirm().
 *
 * Une boîte de dialogue système est ce qui casse le plus
 * brutalement l'illusion d'une application : police du système
 * d'exploitation, bouton « OK » en anglais sur certains
 * appareils, blocage complet de la page, et sur Android
 * l'affichage du nom de domaine — « ostadi-eta.vercel.app
 * indique... ». Rien ne dit plus fort « ceci est un site web ».
 * ═══════════════════════════════════════════════════════════
 */

type ToastKind = "success" | "error" | "info" | "loading";

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  /** Durée en millisecondes ; 0 = permanent, à fermer manuellement */
  duration: number;
  action?: { label: string; onClick: () => void };
}

interface ToastContext {
  toast: (message: string, kind?: ToastKind, opts?: Partial<Toast>) => number;
  success: (message: string) => number;
  error: (message: string) => number;
  loading: (message: string) => number;
  dismiss: (id: number) => void;
}

const Ctx = createContext<ToastContext | null>(null);

export function useToast(): ToastContext {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Repli silencieux plutôt qu'une exception : un message
    // d'information ne doit jamais faire tomber une page.
    return {
      toast: () => 0, success: () => 0,
      error: () => 0, loading: () => 0, dismiss: () => {},
    };
  }
  return ctx;
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const { isRTL } = useLang();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, any>>(new Map());

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
    setToasts(prev => prev.filter(x => x.id !== id));
  }, []);

  const toast = useCallback((
    message: string,
    kind: ToastKind = "info",
    opts: Partial<Toast> = {}
  ) => {
    const id = nextId++;

    // Durée proportionnelle à la longueur : un message court se lit
    // en deux secondes, une phrase de deux lignes en demande cinq.
    const duration = opts.duration ?? (
      kind === "loading" ? 0 :
      Math.min(Math.max(message.length * 55, 2600), 6500)
    );

    setToasts(prev => {
      // Au-delà de trois, on empile trop : le plus ancien sort.
      const next = [...prev, { id, kind, message, duration, action: opts.action }];
      return next.slice(-3);
    });

    haptic(kind === "error" ? "error" : kind === "success" ? "success" : "tap");

    if (duration > 0) {
      timers.current.set(id, setTimeout(() => dismiss(id), duration));
    }

    return id;
  }, [dismiss]);

  const success = useCallback((m: string) => toast(m, "success"), [toast]);
  const error = useCallback((m: string) => toast(m, "error"), [toast]);
  const loading = useCallback((m: string) => toast(m, "loading"), [toast]);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);

  return (
    <Ctx.Provider value={{ toast, success, error, loading, dismiss }}>
      {children}

      <div
        className="ts-stack"
        dir={isRTL ? "rtl" : "ltr"}
        role="status"
        aria-live="polite"
      >
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>

      <style jsx global>{`
        .ts-stack {
          position: fixed;
          bottom: calc(18px + env(safe-area-inset-bottom, 0px));
          inset-inline-start: 14px;
          inset-inline-end: 14px;
          z-index: 500;
          display: flex;
          flex-direction: column;
          gap: 9px;
          align-items: center;
          pointer-events: none;
        }
        @media (min-width: 641px) {
          .ts-stack {
            inset-inline-start: auto;
            inset-inline-end: 22px;
            bottom: 22px;
            align-items: flex-end;
          }
        }
      `}</style>
    </Ctx.Provider>
  );
}

/* ═══════════════════════════════════════════════════════════
   Un message
   ═══════════════════════════════════════════════════════════ */

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const { isRTL } = useLang();
  const [leaving, setLeaving] = useState(false);
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const dragging = useRef(false);

  const META = {
    success: { icon: <Check size={15} />, color: "#22C55E" },
    error: { icon: <AlertTriangle size={15} />, color: "#EF4444" },
    info: { icon: <Info size={15} />, color: "#60a5fa" },
    loading: {
      icon: <Loader2 size={15} style={{ animation: "tsSpin 0.8s linear infinite" }} />,
      color: "#a78bfa",
    },
  }[toast.kind];

  function close() {
    setLeaving(true);
    setTimeout(onDismiss, 200);
  }

  /* ── Balayage latéral pour écarter ──
     Le geste attendu sur mobile. Sans lui, un message qui masque
     un bouton oblige à attendre qu'il disparaisse. */
  function onStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    dragging.current = true;
  }

  function onMove(e: React.TouchEvent) {
    if (!dragging.current) return;
    setOffset(e.touches[0].clientX - startX.current);
  }

  function onEnd() {
    dragging.current = false;
    if (Math.abs(offset) > 88) {
      haptic("tap");
      setOffset(offset > 0 ? 420 : -420);
      setTimeout(onDismiss, 180);
    } else {
      setOffset(0);
    }
  }

  return (
    <div
      className={`ts-item os-glass-3 ${leaving ? "ts-out" : "ts-in"}`}
      style={{
        transform: offset ? `translateX(${offset}px)` : undefined,
        opacity: offset ? Math.max(1 - Math.abs(offset) / 200, 0) : undefined,
        transition: dragging.current ? "none" : undefined,
      }}
      onTouchStart={onStart}
      onTouchMove={onMove}
      onTouchEnd={onEnd}
    >
      <span className="ts-icon" style={{ background: `${META.color}22`, color: META.color }}>
        {META.icon}
      </span>

      <span className="ts-message">{toast.message}</span>

      {toast.action && (
        <button
          className="ts-action"
          onClick={() => { haptic("tap"); toast.action!.onClick(); close(); }}
        >
          {toast.action.label}
        </button>
      )}

      {toast.kind !== "loading" && (
        <button
          className="ts-close"
          onClick={close}
          aria-label={isRTL ? "إغلاق" : "Fermer"}
        >
          <X size={13} />
        </button>
      )}

      <style jsx>{`
        .ts-item {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 11px;
          width: 100%;
          max-width: 420px;
          padding: 12px 14px;
          border-radius: 15px;
          touch-action: pan-y;
          will-change: transform, opacity;
        }
        .ts-in {
          animation: tsIn 340ms cubic-bezier(0.22, 1.28, 0.36, 1);
        }
        .ts-out {
          animation: tsOut 200ms ease forwards;
        }
        @keyframes tsIn {
          from { opacity: 0; transform: translateY(22px) scale(0.94); }
          to { opacity: 1; transform: none; }
        }
        @keyframes tsOut {
          to { opacity: 0; transform: translateY(10px) scale(0.96); }
        }

        .ts-icon {
          width: 28px;
          height: 28px;
          border-radius: 9px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ts-message {
          flex: 1;
          min-width: 0;
          color: #f3ecff;
          font-size: 13px;
          line-height: 1.5;
        }
        .ts-action {
          flex-shrink: 0;
          background: rgba(255, 140, 0, 0.16);
          border: 1px solid rgba(255, 140, 0, 0.32);
          color: #FF8C00;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 13px;
          border-radius: 9px;
          cursor: pointer;
          font-family: inherit;
        }
        .ts-close {
          flex-shrink: 0;
          background: none;
          border: none;
          color: #6d28d9;
          cursor: pointer;
          padding: 2px;
          display: flex;
        }
      `}</style>

      <style jsx global>{`
        @keyframes tsSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
