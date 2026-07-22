"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import fr from "./i18n/fr";
import ar from "./i18n/ar";
import type { Translations } from "./i18n/fr";

type Lang = "fr" | "ar";

interface LangContextType {
  lang: Lang;
  t: Translations;
  setLang: (l: Lang) => void;
  isRTL: boolean;
}

const LangContext = createContext<LangContextType | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    const saved = localStorage.getItem("ostadi-lang") as Lang;
    if (saved === "ar" || saved === "fr") setLangState(saved);
  }, []);

  useEffect(() => {
    // Apply RTL to document
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    localStorage.setItem("ostadi-lang", lang);
  }, [lang]);

  function setLang(l: Lang) {
    setLangState(l);
  }

  const t = lang === "ar" ? ar : fr;
  const isRTL = lang === "ar";

  return (
    <LangContext.Provider value={{ lang, t, setLang, isRTL }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
