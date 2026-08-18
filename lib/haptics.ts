/**
 * Retour haptique.
 *
 * ═══════════════════════════════════════════════════════════
 * C'est le geste le moins coûteux qui rapproche le plus une
 * application web d'une application native. Une vibration de dix
 * millisecondes au moment du toucher, et le doigt croit avoir
 * appuyé sur quelque chose de réel.
 *
 * Presque personne ne le fait sur le web. C'est pourtant une
 * ligne de code.
 * ═══════════════════════════════════════════════════════════
 *
 * Fonctionne sur Android — Chrome, Samsung Internet, Firefox.
 * iOS ne supporte pas l'API Vibration : les appels y sont
 * silencieusement ignorés, sans erreur.
 */

type Pattern = number | number[];

/**
 * Les motifs.
 *
 * Chaque durée a été choisie pour rester sous le seuil de
 * conscience : on ne « sent une vibration », on sent que le
 * bouton a répondu. Au-delà de 30 ms, ça devient une alerte,
 * et l'effet s'inverse — l'utilisateur trouve ça agressif.
 */
const PATTERNS = {
  /** Toucher d'un élément — le plus courant */
  tap: 8,
  /** Sélection dans une liste, changement d'onglet */
  select: 12,
  /** Action réussie — deux impulsions courtes */
  success: [14, 40, 22],
  /** Avertissement — plus long, une seule impulsion */
  warning: 32,
  /** Erreur — trois impulsions, rythme cassé */
  error: [18, 50, 18, 50, 34],
  /** Franchissement d'un seuil pendant un geste */
  threshold: 6,
  /** Appui long reconnu */
  hold: 20,
} as const;

export type HapticKind = keyof typeof PATTERNS;

let enabled = true;
let supported: boolean | null = null;

/** Détection différée — `navigator` n'existe pas au rendu serveur */
function isSupported(): boolean {
  if (supported !== null) return supported;
  supported =
    typeof navigator !== "undefined" &&
    typeof navigator.vibrate === "function";
  return supported;
}

/**
 * Déclenche une vibration.
 *
 * Volontairement silencieux en cas d'échec : un retour haptique
 * absent ne doit jamais interrompre le flux. Certains navigateurs
 * lèvent une exception si la page n'a pas encore reçu d'interaction.
 */
export function haptic(kind: HapticKind = "tap"): void {
  if (!enabled || !isSupported()) return;

  // Le réglage système prime : quelqu'un qui a réduit les animations
  // a souvent aussi une sensibilité aux stimuli répétés.
  if (typeof window !== "undefined") {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (reduced?.matches) return;
  }

  try {
    navigator.vibrate(PATTERNS[kind] as Pattern);
  } catch {
    // Ignoré : l'absence de vibration n'est pas un incident
  }
}

/** Coupe le retour haptique pour toute la session */
export function setHapticsEnabled(value: boolean): void {
  enabled = value;
  try {
    localStorage.setItem("ostadi-haptics", value ? "1" : "0");
  } catch { /* navigation privée */ }
}

/** Restaure la préférence enregistrée — à appeler au démarrage */
export function loadHapticPreference(): void {
  try {
    const saved = localStorage.getItem("ostadi-haptics");
    if (saved !== null) enabled = saved === "1";
  } catch { /* navigation privée */ }
}

export function hapticsAvailable(): boolean {
  return isSupported();
}

/**
 * Enveloppe un gestionnaire d'événement pour y ajouter la vibration.
 *
 *   <button onClick={withHaptic(handleSave, "success")}>
 *
 * Plus lisible que d'appeler haptic() manuellement dans chaque
 * fonction, et ça évite d'oublier.
 */
export function withHaptic<T extends (...args: any[]) => any>(
  fn: T,
  kind: HapticKind = "tap"
): T {
  return ((...args: any[]) => {
    haptic(kind);
    return fn(...args);
  }) as T;
}
