/**
 * Fenêtre d'accès à la salle de cours.
 *
 * Utilisé à la fois par la route API (qui fait foi) et par l'interface
 * (qui l'anticipe pour éviter des clics inutiles). Fonction pure, sans
 * dépendance Firebase, pour pouvoir tourner des deux côtés.
 */

/** Ouverture avant l'heure de début, pour laisser le prof s'installer */
export const OPEN_BEFORE_MIN = 15;

/** Fermeture après la fin théorique de la séance */
export const CLOSE_AFTER_MIN = 60;

export type AccessReason = "open" | "too-early" | "ended";

export interface CourseAccess {
  /** La salle est-elle accessible maintenant ? */
  open: boolean;
  reason: AccessReason;
  /** Prochaine séance à venir (ISO), si reason = "too-early" */
  nextSession?: string;
  /** Heure de fermeture de la séance en cours (ISO), si reason = "open" */
  closesAt?: string;
  /** Numéro de la séance en cours ou à venir (1-indexé) */
  sessionNumber?: number;
  /** Nombre total de séances */
  totalSessions?: number;
}

interface ClasseLike {
  dateTime: string;
  durationMinutes?: number;
  status?: string;
  sessions?: string[];
}

/**
 * Détermine si la salle est accessible.
 *
 * Pour un cours mensuel, chaque séance ouvre sa propre fenêtre :
 * la salle est accessible pendant la séance 3 même si les séances
 * 1 et 2 sont passées.
 */
export function getCourseAccess(
  classe: ClasseLike,
  nowMs: number = Date.now()
): CourseAccess {
  const duration = classe.durationMinutes || 60;

  // Un cours explicitement terminé le reste
  if (classe.status === "ended") {
    return { reason: "ended", open: false };
  }

  // Cours mensuel → liste de séances ; sinon, séance unique
  const list =
    Array.isArray(classe.sessions) && classe.sessions.length > 0
      ? [...classe.sessions].sort()
      : [classe.dateTime];

  const total = list.length;
  let upcoming: { iso: string; index: number } | null = null;

  for (let i = 0; i < list.length; i++) {
    const startMs = new Date(list[i]).getTime();
    if (Number.isNaN(startMs)) continue;

    const openAt = startMs - OPEN_BEFORE_MIN * 60_000;
    const closeAt = startMs + (duration + CLOSE_AFTER_MIN) * 60_000;

    // Séance en cours
    if (nowMs >= openAt && nowMs <= closeAt) {
      return {
        open: true,
        reason: "open",
        closesAt: new Date(closeAt).toISOString(),
        sessionNumber: i + 1,
        totalSessions: total,
      };
    }

    // Première séance encore à venir
    if (nowMs < openAt && !upcoming) {
      upcoming = { iso: list[i], index: i };
    }
  }

  if (upcoming) {
    return {
      open: false,
      reason: "too-early",
      nextSession: upcoming.iso,
      sessionNumber: upcoming.index + 1,
      totalSessions: total,
    };
  }

  // Toutes les séances sont passées
  return { open: false, reason: "ended", totalSessions: total };
}

/** Temps restant avant l'ouverture, en texte court */
export function timeUntil(iso: string, isRTL: boolean, nowMs = Date.now()): string {
  const diff = new Date(iso).getTime() - nowMs;
  if (diff <= 0) return isRTL ? "الآن" : "maintenant";

  const min = Math.floor(diff / 60_000);
  if (min < 60) return isRTL ? `${min} دقيقة` : `${min} min`;

  const h = Math.floor(min / 60);
  if (h < 24) return isRTL ? `${h} ساعة` : `${h} h`;

  const j = Math.floor(h / 24);
  return isRTL ? `${j} ${j > 1 ? "أيام" : "يوم"}` : `${j} jour${j > 1 ? "s" : ""}`;
}
