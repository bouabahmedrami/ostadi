"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang-context";
import { Download, X, Smartphone } from "lucide-react";

/**
 * Invitation à installer l'application.
 *
 * Une PWA installée démarre plus vite et occupe une icône sur l'écran
 * d'accueil — sur un téléphone d'entrée de gamme, c'est bien plus léger
 * qu'un APK, et ça évite au parent de retaper l'adresse à chaque fois.
 *
 * Le bandeau n'apparaît qu'après une vraie visite : proposer
 * d'installer avant même que la personne ait vu un cours ne convertit
 * pas et agace. On attend 45 secondes, et on ne redemande pas avant
 * deux semaines si elle refuse.
 */

const DISMISS_KEY = "ostadi-install-dismissed";
const DELAY_MS = 45_000;
const SNOOZE_DAYS = 14;

export default function InstallPrompt() {
  const { isRTL } = useLang();
  const [prompt, setPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Déjà installée ?
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((window.navigator as any).standalone) return;

    // Refusée récemment ?
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const days = (Date.now() - Number(dismissed)) / 86_400_000;
        if (days < SNOOZE_DAYS) return;
      }
    } catch { /* localStorage indisponible en navigation privée */ }

    // iOS ne propose pas d'invite native — on affiche les instructions
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    function onBeforeInstall(e: any) {
      e.preventDefault();
      setPrompt(e);
      setTimeout(() => setVisible(true), DELAY_MS);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Sur iOS, pas d'événement : on affiche après le même délai
    let t: any;
    if (ios) t = setTimeout(() => setVisible(true), DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      if (t) clearTimeout(t);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { }
  }

  async function install() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    else dismiss();
    setPrompt(null);
  }

  if (!visible) return null;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        position: "fixed",
        bottom: 16,
        insetInlineStart: 16,
        insetInlineEnd: 16,
        zIndex: 300,
        maxWidth: 440,
        margin: "0 auto",
        background: "linear-gradient(160deg, #1f0f42, #12062a)",
        border: "1px solid rgba(255,140,0,0.32)",
        borderRadius: 18,
        padding: 16,
        boxShadow: "0 18px 44px rgba(0,0,0,0.55)",
        animation: "ipUp 0.4s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 13 }}>
        <span style={{
          width: 44, height: 44, borderRadius: 14, flexShrink: 0,
          background: "linear-gradient(140deg, rgba(255,140,0,0.24), rgba(124,58,237,0.2))",
          border: "1px solid rgba(255,140,0,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22,
        }}>
          🎓
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "white", fontWeight: 750, fontSize: 14.5, marginBottom: 3 }}>
            {isRTL ? "أضف أستاذي إلى شاشتك" : "Ajoutez Ostadi à votre écran"}
          </div>
          <p style={{ color: "#a78bfa", fontSize: 12, margin: 0, lineHeight: 1.55 }}>
            {isIOS
              ? (isRTL
                  ? "اضغط على زر المشاركة ثم « إضافة إلى الشاشة الرئيسية »."
                  : "Appuyez sur Partager, puis « Sur l'écran d'accueil ».")
              : (isRTL
                  ? "وصول أسرع، دون إعادة كتابة العنوان في كل مرة."
                  : "Accès direct, sans retaper l'adresse à chaque fois.")}
          </p>
        </div>

        <button
          onClick={dismiss}
          aria-label={isRTL ? "إغلاق" : "Fermer"}
          style={{
            background: "none", border: "none", color: "#6d28d9",
            cursor: "pointer", padding: 0, flexShrink: 0,
          }}
        >
          <X size={16} />
        </button>
      </div>

      {!isIOS && prompt && (
        <button
          onClick={install}
          style={{
            width: "100%", marginTop: 14,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: "linear-gradient(135deg, #FF8C00, #FF6B00)",
            color: "white", fontWeight: 750, padding: "12px",
            borderRadius: 12, border: "none", cursor: "pointer",
            fontSize: 13.5, fontFamily: "inherit",
          }}
        >
          <Download size={15} />
          {isRTL ? "تثبيت التطبيق" : "Installer l'application"}
        </button>
      )}

      {isIOS && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          marginTop: 12, paddingTop: 12,
          borderTop: "1px solid rgba(124,58,237,0.16)",
        }}>
          <Smartphone size={13} style={{ color: "#FF8C00", flexShrink: 0 }} />
          <span style={{ color: "#8b7bb8", fontSize: 11 }}>
            {isRTL ? "Safari فقط" : "Depuis Safari uniquement"}
          </span>
        </div>
      )}

      <style>{`
        @keyframes ipUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
