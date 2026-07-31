"use client";
import { useLang } from "@/lib/lang-context";

export default function LangSwitcher() {
  const { lang, setLang } = useLang();

  const options = [
    { code: "fr" as const, label: "FR", full: "Français", color: "#7C3AED" },
    { code: "ar" as const, label: "عر", full: "العربية", color: "#FF8C00" },
  ];

  return (
    <div className="lsw" role="group" aria-label="Langue / اللغة">
      {/* Curseur glissant : plus fluide qu'un simple changement de fond */}
      <span
        className="lsw-slider"
        style={{
          background: lang === "ar" ? "#FF8C00" : "#7C3AED",
          transform: lang === "ar" ? "translateX(100%)" : "translateX(0)",
        }}
      />

      {options.map(o => (
        <button
          key={o.code}
          onClick={() => setLang(o.code)}
          className={`lsw-btn ${lang === o.code ? "lsw-btn-on" : ""}`}
          aria-pressed={lang === o.code}
          aria-label={o.full}
          title={o.full}
          lang={o.code}
        >
          {o.label}
        </button>
      ))}

      <style jsx>{`
        .lsw {
          position: relative;
          display: inline-flex;
          align-items: center;
          background: #1A0A3C;
          border: 1px solid rgba(124, 58, 237, 0.4);
          border-radius: 11px;
          overflow: hidden;
          /* Toujours de gauche à droite : FR reste à gauche même en arabe,
             sinon le curseur et les libellés s'inversent à chaque bascule */
          direction: ltr;
        }

        .lsw-slider {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: 50%;
          transition: transform 0.3s cubic-bezier(0.34, 1.25, 0.64, 1),
                      background 0.3s ease;
          pointer-events: none;
        }

        .lsw-btn {
          position: relative;
          z-index: 1;
          padding: 6px 13px;
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: 0.3px;
          color: #a78bfa;
          background: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
          transition: color 0.25s ease;
          min-width: 42px;
        }
        .lsw-btn:hover:not(.lsw-btn-on) {
          color: #d8b4fe;
        }
        .lsw-btn-on {
          color: #ffffff;
        }

        /* Contour visible au clavier uniquement */
        .lsw-btn:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.6);
          outline-offset: -3px;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}
