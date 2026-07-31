"use client";
import { useEffect } from "react";
import { useLang } from "@/lib/lang-context";

/**
 * Synchronise les attributs <html lang> et <html dir> avec la langue choisie.
 *
 * Le layout est un composant serveur : il ne peut pas lire le contexte de langue.
 * Ce composant client s'en charge côté navigateur, dès que la langue change.
 *
 * Sans ça, la page reste déclarée `lang="fr" dir="ltr"` même en arabe —
 * ce qui casse le rendu du texte, les lecteurs d'écran et le référencement.
 */
export default function HtmlLangSync() {
  const { lang, isRTL } = useLang();

  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = isRTL ? "rtl" : "ltr";

    // Police adaptée : Noto Sans Arabic en arabe, Inter sinon
    html.style.fontFamily = isRTL
      ? "'Noto Sans Arabic', 'Inter', system-ui, sans-serif"
      : "'Inter', 'Noto Sans Arabic', system-ui, sans-serif";
  }, [lang, isRTL]);

  return null;
}
