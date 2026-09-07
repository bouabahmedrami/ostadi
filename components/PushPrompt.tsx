"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import {
  pushSupported, pushPermission, enablePush, disablePush,
  onForegroundPush,
} from "@/lib/push";
import { useToast } from "./Toast";
import { haptic } from "@/lib/haptics";
import { Bell, BellOff, X, Check } from "lucide-react";

/**
 * Invitation à activer les notifications.
 *
 * ═══════════════════════════════════════════════════════════
 * ⚠️ Le moment de la demande décide de tout.
 *
 * Un navigateur ne pose la question qu'une fois. Si l'utilisateur
 * refuse, c'est définitif jusqu'à ce qu'il aille lui-même dans les
 * réglages — ce que personne ne fait.
 *
 * Demander au chargement de la page, c'est se faire refuser dans la
 * grande majorité des cas : l'utilisateur ne sait pas encore ce que
 * fait le site. On attend donc qu'il ait navigué un peu, et on
 * explique l'intérêt AVANT d'ouvrir la boîte du navigateur.
 * ═══════════════════════════════════════════════════════════
 */

/** Délai avant de proposer, en millisecondes */
const DELAY = 40_000;

/** Report après un refus poli, en jours */
const SNOOZE_DAYS = 21;

export default function PushPrompt() {
  const { user, profile } = useAuth();
  const { isRTL } = useLang();
  const toast = useToast();

  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  /* ── Messages reçus application ouverte ──
     Le service worker ne s'en charge pas dans ce cas : le navigateur
     considère que l'utilisateur voit déjà l'écran. Un message
     éphémère suffit, une notification système ferait doublon. */
  useEffect(() => {
    if (!user) return;
    return onForegroundPush(p => {
      toast.toast(p.body ? `${p.title} — ${p.body}` : p.title, "info");
    });
  }, [user, toast]);

  useEffect(() => {
    if (!user || !profile) return;

    let cancelled = false;

    (async () => {
      if (!(await pushSupported())) return;
      if (pushPermission() !== "default") return; // déjà répondu

      try {
        const snoozed = localStorage.getItem("ostadi-push-snooze");
        if (snoozed && Date.now() < Number(snoozed)) return;
      } catch { /* navigation privée */ }

      const t = setTimeout(() => { if (!cancelled) setShow(true); }, DELAY);
      return () => clearTimeout(t);
    })();

    return () => { cancelled = true; };
  }, [user, profile]);

  async function accept() {
    if (!user) return;
    setBusy(true);
    haptic("tap");
    try {
      const ok = await enablePush(user.uid);
      if (ok) {
        haptic("success");
        toast.success(isRTL ? "تم تفعيل الإشعارات" : "Notifications activées");
        setShow(false);
      } else {
        // Refus du navigateur : inutile d'insister, la réponse est
        // définitive côté système
        toast.error(isRTL
          ? "لم يتم منح الإذن."
          : "L'autorisation n'a pas été accordée.");
        setShow(false);
      }
    } finally {
      setBusy(false);
    }
  }

  function later() {
    haptic("tap");
    try {
      localStorage.setItem(
        "ostadi-push-snooze",
        String(Date.now() + SNOOZE_DAYS * 86_400_000)
      );
    } catch { /* navigation privée */ }
    setShow(false);
  }

  if (!show) return null;

  const isTeacher = profile?.role === "teacher";

  return (
    <div className="pp" dir={isRTL ? "rtl" : "ltr"}>
      <div className="pp-card os-glass-3">
        <button onClick={later} className="pp-close" aria-label={isRTL ? "إغلاق" : "Fermer"}>
          <X size={15} />
        </button>

        <span className="pp-icon">
          <Bell size={22} />
        </span>

        <h3 className="pp-title">
          {isRTL ? "لا تفوّت شيئاً" : "Ne manquez rien"}
        </h3>

        <p className="pp-text">
          {isTeacher
            ? (isRTL
                ? "كن أوّل من يعلم بطلبات التسجيل والرسائل، حتى والتطبيق مغلق. الأستاذ الذي يردّ بسرعة يستقبل طلاباً أكثر."
                : "Soyez prévenu des demandes d'inscription et des messages, même application fermée. Un professeur qui répond vite reçoit plus d'élèves.")
            : (isRTL
                ? "تذكير بدروسك، ردود أستاذك، ووثائق جديدة — حتى والتطبيق مغلق."
                : "Rappels de vos cours, réponses de votre professeur, nouveaux supports — même application fermée.")}
        </p>

        <div className="pp-actions">
          <button onClick={later} className="os-btn-ghost pp-later">
            {isRTL ? "لاحقاً" : "Plus tard"}
          </button>
          <button onClick={accept} disabled={busy} className="os-btn-chalk pp-accept">
            {busy
              ? (isRTL ? "..." : "...")
              : <><Check size={15} /> {isRTL ? "تفعيل" : "Activer"}</>}
          </button>
        </div>
      </div>

      <style jsx>{`
        .pp {
          position: fixed;
          inset-inline: 14px;
          bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          z-index: 320;
          display: flex;
          justify-content: center;
          pointer-events: none;
          animation: ppUp 420ms cubic-bezier(0.22, 1.24, 0.36, 1);
        }
        @keyframes ppUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: none; }
        }

        .pp-card {
          pointer-events: auto;
          position: relative;
          width: 100%;
          max-width: 400px;
          padding: 22px 20px 18px;
          border-radius: 20px;
          text-align: center;
        }

        .pp-close {
          position: absolute;
          top: 12px;
          inset-inline-end: 12px;
          width: 28px;
          height: 28px;
          border-radius: 9px;
          background: rgba(124, 58, 237, 0.16);
          border: none;
          color: #a78bfa;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pp-icon {
          width: 50px;
          height: 50px;
          border-radius: 16px;
          margin: 0 auto 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(140deg, rgba(255,140,0,0.24), rgba(124,58,237,0.18));
          border: 1px solid rgba(255,140,0,0.28);
          color: #FF8C00;
        }

        .pp-title {
          color: #fff;
          font-weight: 800;
          font-size: 16.5px;
          margin: 0 0 8px;
          letter-spacing: -0.2px;
        }
        .pp-text {
          color: #a78bfa;
          font-size: 12.5px;
          line-height: 1.7;
          margin: 0 0 18px;
        }

        .pp-actions { display: flex; gap: 9px; }
        .pp-later { flex: 1; padding: 11px; font-size: 13px; }
        .pp-accept {
          flex: 1.4;
          padding: 11px;
          font-size: 13.5px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }
      `}</style>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════
   RÉGLAGE — à placer dans la page de profil
   ═══════════════════════════════════════════════════════════ */

export function PushToggle() {
  const { user } = useAuth();
  const { isRTL } = useLang();
  const toast = useToast();

  const [state, setState] = useState<"loading" | "on" | "off" | "denied" | "unsupported">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!(await pushSupported())) { setState("unsupported"); return; }
      const p = pushPermission();
      if (p === "denied") setState("denied");
      else if (p === "granted") setState("on");
      else setState("off");
    })();
  }, []);

  async function toggle() {
    if (!user || busy) return;
    setBusy(true);
    haptic("tap");

    try {
      if (state === "on") {
        await disablePush();
        setState("off");
        toast.success(isRTL ? "تم التعطيل" : "Notifications désactivées");
      } else {
        const ok = await enablePush(user.uid);
        if (ok) {
          setState("on");
          haptic("success");
          toast.success(isRTL ? "تم التفعيل" : "Notifications activées");
        } else {
          setState(pushPermission() === "denied" ? "denied" : "off");
        }
      }
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unsupported") return null;

  /* Refus définitif : on ne peut plus rien faire depuis le code,
     seul l'utilisateur peut revenir en arrière dans ses réglages */
  if (state === "denied") {
    return (
      <div className="os-glass" style={{ padding: "13px 15px", borderRadius: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <BellOff size={17} style={{ color: "#6d28d9", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ color: "#c4b5fd", fontSize: 13, fontWeight: 650 }}>
              {isRTL ? "الإشعارات محظورة" : "Notifications bloquées"}
            </div>
            <div style={{ color: "#6d28d9", fontSize: 11, marginTop: 2, lineHeight: 1.5 }}>
              {isRTL
                ? "فعّلها من إعدادات المتصفّح لهذا الموقع."
                : "Réactivez-les dans les réglages du navigateur pour ce site."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const on = state === "on";

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="os-glass"
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 11,
        padding: "13px 15px", borderRadius: 13,
        cursor: busy ? "wait" : "pointer", fontFamily: "inherit",
        textAlign: isRTL ? "right" : "left",
      }}
    >
      <span style={{
        width: 34, height: 34, borderRadius: 11, flexShrink: 0,
        background: on ? "rgba(34,197,94,0.15)" : "rgba(124,58,237,0.15)",
        color: on ? "#4ade80" : "#a78bfa",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {on ? <Bell size={16} /> : <BellOff size={16} />}
      </span>

      <span style={{ flex: 1 }}>
        <span style={{ display: "block", color: "white", fontSize: 13.5, fontWeight: 650 }}>
          {isRTL ? "الإشعارات الفورية" : "Notifications push"}
        </span>
        <span style={{ display: "block", color: "#6d28d9", fontSize: 11, marginTop: 2 }}>
          {on
            ? (isRTL ? "مفعّلة على هذا الجهاز" : "Activées sur cet appareil")
            : (isRTL ? "معطّلة" : "Désactivées")}
        </span>
      </span>

      <span style={{
        width: 42, height: 24, borderRadius: 999, flexShrink: 0,
        background: on ? "#22C55E" : "rgba(124,58,237,0.24)",
        position: "relative",
        transition: "background 260ms ease",
      }}>
        <span style={{
          position: "absolute", top: 3,
          insetInlineStart: on ? 21 : 3,
          width: 18, height: 18, borderRadius: "50%",
          background: "white",
          transition: "inset-inline-start 260ms cubic-bezier(0.34,1.4,0.64,1)",
        }} />
      </span>
    </button>
  );
}
