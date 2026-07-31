"use client";
import { useBandwidth } from "@/lib/hooks/useBandwidth";
import { useLang } from "@/lib/lang-context";
import { Wifi, Volume2, Video, VideoOff, Signal } from "lucide-react";

export default function BandwidthSettings() {
  const { settings, updateSettings, networkSpeed } = useBandwidth();
  const { isRTL } = useLang();

  const speedColors: Record<string, string> = {
    fast: "#34d399",
    medium: "#fbbf24",
    slow: "#f87171",
    unknown: "#a78bfa",
  };

  const speedLabels: Record<string, string> = {
    fast: isRTL ? "سريع (4G)" : "Rapide (4G)",
    medium: isRTL ? "متوسط (3G)" : "Moyen (3G)",
    slow: isRTL ? "بطيء (2G)" : "Lent (2G)",
    unknown: isRTL ? "غير معروف" : "Inconnu",
  };

  const qualities = [
    { id: "off", fr: "Désactivé", ar: "إيقاف", icon: <VideoOff size={16} /> },
    { id: "low", fr: "Basse", ar: "منخفضة", icon: <Video size={16} /> },
    { id: "medium", fr: "Moyenne", ar: "متوسطة", icon: <Video size={16} /> },
  ] as const;

  return (
    <div className="bw-card" dir={isRTL ? "rtl" : "ltr"}>

      {/* ═══ EN-TÊTE ═══ */}
      <div className="bw-head">
        <div className="bw-head-icon"><Signal size={19} /></div>
        <div>
          <h3 className="bw-title">
            {isRTL ? "وضع توفير البيانات" : "Mode économie de données"}
          </h3>
          <div className="bw-speed" style={{ color: speedColors[networkSpeed] || speedColors.unknown }}>
            <Wifi size={12} />
            {speedLabels[networkSpeed] || speedLabels.unknown}
          </div>
        </div>
      </div>

      <div className="bw-body">

        {/* ═══ INTERRUPTEUR PRINCIPAL ═══ */}
        <div className="bw-row">
          <div className="bw-row-text">
            <div className="bw-row-title">
              {isRTL ? "تفعيل الوضع" : "Activer le mode"}
            </div>
            <div className="bw-row-hint">
              {isRTL ? "يقلل استهلاك الإنترنت" : "Réduit la consommation internet"}
            </div>
          </div>
          <button
            onClick={() => updateSettings({ enabled: !settings.enabled })}
            className={`bw-toggle ${settings.enabled ? "bw-toggle-on" : ""}`}
            role="switch"
            aria-checked={settings.enabled}
            aria-label={isRTL ? "تفعيل وضع توفير البيانات" : "Activer le mode économie"}
          >
            <span className="bw-knob" />
          </button>
        </div>

        {settings.enabled && (
          <>
            {/* ═══ QUALITÉ VIDÉO ═══ */}
            <div className="bw-field">
              <label className="bw-label">
                {isRTL ? "جودة الفيديو" : "Qualité vidéo"}
              </label>
              <div className="bw-quality-grid">
                {qualities.map(q => {
                  const on = settings.videoQuality === q.id;
                  return (
                    <button
                      key={q.id}
                      onClick={() => updateSettings({
                        videoQuality: q.id,
                        audioOnly: q.id === "off",
                      })}
                      className={`bw-quality ${on ? "bw-quality-on" : ""}`}
                      aria-pressed={on}
                    >
                      {q.icon}
                      <span>{isRTL ? q.ar : q.fr}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ═══ AUDIO SEULEMENT ═══ */}
            <div className="bw-row">
              <div className="bw-row-with-icon">
                <Volume2 size={16} />
                <div className="bw-row-text">
                  <div className="bw-row-title">
                    {isRTL ? "صوت فقط" : "Audio seulement"}
                  </div>
                  <div className="bw-row-hint">
                    {isRTL ? "يوفر حتى 80٪ من البيانات" : "Économise jusqu'à 80 % de données"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => updateSettings({
                  audioOnly: !settings.audioOnly,
                  videoQuality: !settings.audioOnly ? "off" : "low",
                })}
                className={`bw-toggle ${settings.audioOnly ? "bw-toggle-on" : ""}`}
                role="switch"
                aria-checked={settings.audioOnly}
                aria-label={isRTL ? "صوت فقط" : "Audio seulement"}
              >
                <span className="bw-knob" />
              </button>
            </div>

            {/* ═══ INFO ═══ */}
            <div className="bw-info">
              <span>💡</span>
              <p>
                {isRTL
                  ? "يقلل هذا الوضع جودة الفيديو لكنه يضمن استمرار الصوت حتى على شبكة 3G ضعيفة."
                  : "Ce mode réduit la qualité vidéo mais garantit l'audio même sur une 3G faible."}
              </p>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .bw-card {
          background: linear-gradient(145deg, rgba(20,8,45,0.9), rgba(15,5,30,0.9));
          border: 1px solid rgba(124,58,237,0.2);
          border-radius: 18px;
          padding: 20px;
        }

        /* ── En-tête ── */
        .bw-head {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 20px;
        }
        .bw-head-icon {
          width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0;
          background: linear-gradient(140deg, rgba(255,140,0,0.18), rgba(124,58,237,0.16));
          border: 1px solid rgba(255,140,0,0.26);
          display: flex; align-items: center; justify-content: center;
          color: #FF8C00;
        }
        .bw-title {
          color: white; font-weight: 750; font-size: 14.5px; margin: 0;
        }
        .bw-speed {
          display: flex; align-items: center; gap: 5px;
          font-size: 11.5px; font-weight: 600; margin-top: 3px;
        }

        .bw-body { display: flex; flex-direction: column; gap: 18px; }

        /* ── Lignes ── */
        .bw-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 14px;
        }
        .bw-row-with-icon {
          display: flex; align-items: center; gap: 11px; flex: 1; min-width: 0;
        }
        .bw-row-with-icon :global(svg) { color: #a78bfa; flex-shrink: 0; }
        .bw-row-text { min-width: 0; }
        .bw-row-title { color: white; font-size: 13.5px; font-weight: 600; }
        .bw-row-hint { color: #8b7bb8; font-size: 11.5px; margin-top: 2px; }

        /* ── Interrupteur ── */
        .bw-toggle {
          position: relative; flex-shrink: 0;
          width: 46px; height: 26px; border-radius: 999px;
          background: rgba(124,58,237,0.2);
          border: 1px solid rgba(124,58,237,0.3);
          cursor: pointer;
          transition: background 0.28s ease, border-color 0.28s ease;
        }
        .bw-toggle-on {
          background: #FF8C00; border-color: #FF8C00;
        }
        .bw-knob {
          position: absolute; top: 3px; inset-inline-start: 3px;
          width: 18px; height: 18px; border-radius: 50%;
          background: white; display: block;
          box-shadow: 0 2px 5px rgba(0,0,0,0.25);
          transition: transform 0.28s cubic-bezier(0.34,1.4,0.64,1);
        }
        /* Le décalage s'inverse automatiquement en RTL */
        .bw-toggle-on .bw-knob { transform: translateX(20px); }
        :global([dir="rtl"]) .bw-toggle-on .bw-knob { transform: translateX(-20px); }

        /* ── Qualité ── */
        .bw-field { display: flex; flex-direction: column; gap: 9px; }
        .bw-label {
          color: #a78bfa; font-size: 11.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .bw-quality-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
        }
        .bw-quality {
          display: flex; flex-direction: column; align-items: center; gap: 5px;
          padding: 11px 6px; border-radius: 12px;
          background: rgba(26,10,60,0.5);
          border: 1px solid rgba(124,58,237,0.22);
          color: #a78bfa; cursor: pointer;
          transition: all 0.22s cubic-bezier(0.34,1.4,0.64,1);
        }
        .bw-quality:hover {
          border-color: rgba(168,85,247,0.42);
          transform: translateY(-1px);
        }
        .bw-quality span { font-size: 11.5px; font-weight: 600; }
        .bw-quality-on {
          background: rgba(255,140,0,0.14);
          border-color: rgba(255,140,0,0.5);
          color: #FF8C00;
        }

        /* ── Info ── */
        .bw-info {
          display: flex; align-items: flex-start; gap: 9px;
          background: rgba(251,191,36,0.08);
          border: 1px solid rgba(251,191,36,0.22);
          border-radius: 12px; padding: 11px 13px;
        }
        .bw-info span { flex-shrink: 0; font-size: 14px; line-height: 1.3; }
        .bw-info p {
          color: #fbbf24; font-size: 11.5px; margin: 0; line-height: 1.6;
        }
      `}</style>
    </div>
  );
}
