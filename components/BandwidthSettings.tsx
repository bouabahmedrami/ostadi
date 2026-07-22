"use client";
import { useBandwidth } from "@/lib/hooks/useBandwidth";
import { useLang } from "@/lib/lang-context";
import { Wifi, WifiOff, Volume2, Video, VideoOff, Signal } from "lucide-react";

export default function BandwidthSettings() {
  const { settings, updateSettings, networkSpeed } = useBandwidth();
  const { isRTL } = useLang();

  const speedColors = {
    fast: "text-emerald-400",
    medium: "text-amber-400",
    slow: "text-red-400",
    unknown: "text-purple-400",
  };

  const speedLabels = {
    fast: isRTL ? "سريع (4G)" : "Rapide (4G)",
    medium: isRTL ? "متوسط (3G)" : "Moyen (3G)",
    slow: isRTL ? "بطيء (2G)" : "Lent (2G)",
    unknown: isRTL ? "غير معروف" : "Inconnu",
  };

  return (
    <div className="card" dir={isRTL ? "rtl" : "ltr"}>
      <div className={`flex items-center gap-3 mb-5 ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className="w-10 h-10 rounded-xl bg-purple-900/60 border border-purple-700/40 flex items-center justify-center">
          <Signal className="w-5 h-5 text-[#FF8C00]" />
        </div>
        <div className={isRTL ? "text-right" : ""}>
          <h3 className="font-bold text-white text-sm">
            {isRTL ? "إعدادات الشبكة" : "Mode économie de données"}
          </h3>
          <div className={`flex items-center gap-1.5 text-xs ${speedColors[networkSpeed]}`}>
            <Wifi className="w-3 h-3" />
            {speedLabels[networkSpeed]}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Low bandwidth toggle */}
        <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className={isRTL ? "text-right" : ""}>
            <div className="text-sm font-medium text-white">
              {isRTL ? "وضع توفير البيانات" : "Mode économie données"}
            </div>
            <div className="text-xs text-purple-400 mt-0.5">
              {isRTL ? "يقلل استهلاك الإنترنت" : "Réduit la consommation internet"}
            </div>
          </div>
          <button
            onClick={() => updateSettings({ enabled: !settings.enabled })}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.enabled ? "bg-[#FF8C00]" : "bg-purple-900/60 border border-purple-700/40"
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              settings.enabled
                ? isRTL ? "right-1" : "left-7"
                : isRTL ? "right-7" : "left-1"
            }`} />
          </button>
        </div>

        {settings.enabled && (
          <>
            {/* Video quality */}
            <div>
              <label className={`text-xs font-medium text-purple-300 mb-2 block ${isRTL ? "text-right" : ""}`}>
                {isRTL ? "جودة الفيديو" : "Qualité vidéo"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: "off", labelFr: "Désactivé", labelAr: "إيقاف", icon: <VideoOff className="w-4 h-4" /> },
                  { id: "low", labelFr: "Basse", labelAr: "منخفضة", icon: <Video className="w-4 h-4" /> },
                  { id: "medium", labelFr: "Moyenne", labelAr: "متوسطة", icon: <Video className="w-4 h-4" /> },
                ] as const).map(q => (
                  <button
                    key={q.id}
                    onClick={() => updateSettings({ videoQuality: q.id, audioOnly: q.id === "off" })}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                      settings.videoQuality === q.id
                        ? "bg-[#FF8C00]/20 border-[#FF8C00]/60 text-[#FF8C00]"
                        : "border-purple-800/40 text-purple-400 hover:border-purple-600"
                    }`}
                  >
                    {q.icon}
                    {isRTL ? q.labelAr : q.labelFr}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio only toggle */}
            <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                <Volume2 className="w-4 h-4 text-purple-400" />
                <div className={isRTL ? "text-right" : ""}>
                  <div className="text-sm font-medium text-white">
                    {isRTL ? "صوت فقط" : "Audio seulement"}
                  </div>
                  <div className="text-xs text-purple-400">
                    {isRTL ? "لتوفير الإنترنت" : "Économise jusqu'à 80% de données"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => updateSettings({
                  audioOnly: !settings.audioOnly,
                  videoQuality: !settings.audioOnly ? "off" : "low"
                })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.audioOnly ? "bg-[#FF8C00]" : "bg-purple-900/60 border border-purple-700/40"
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.audioOnly
                    ? isRTL ? "right-1" : "left-7"
                    : isRTL ? "right-7" : "left-1"
                }`} />
              </button>
            </div>

            {/* Info banner */}
            <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-3">
              <p className="text-xs text-amber-300">
                {isRTL
                  ? "💡 وضع توفير البيانات يقلل جودة الفيديو ولكن يضمن استمرار الصوت حتى على شبكة 3G ضعيفة."
                  : "💡 Le mode économie réduit la qualité vidéo mais garantit l'audio même sur une 3G faible."}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
