"use client";
import { useLang } from "@/lib/lang-context";

export default function LangSwitcher() {
  const { lang, setLang } = useLang();

  return (
    <div className="flex items-center bg-[#1A0A3C] border border-purple-800/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setLang("fr")}
        className={`px-3 py-1.5 text-xs font-bold transition-all ${
          lang === "fr"
            ? "bg-purple-700 text-white"
            : "text-purple-400 hover:text-purple-200"
        }`}
      >
        FR
      </button>
      <button
        onClick={() => setLang("ar")}
        className={`px-3 py-1.5 text-xs font-bold transition-all ${
          lang === "ar"
            ? "bg-[#FF8C00] text-white"
            : "text-purple-400 hover:text-purple-200"
        }`}
      >
        عر
      </button>
    </div>
  );
}
