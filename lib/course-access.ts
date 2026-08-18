/**
 * Fenêtre d'accès à la salle de cours.
 *
 * Utilisé à la fois par la route API (qui fait foi) et par l'interface
 * (qui l'anticipe pour éviter des clics inutiles). Fonction pure, sans
 * dépendance Firebase, pour tourner des deux côtés.
 */

/** Ouverture avant l'heure de début, pour laisser le professeur s'installer */
export const OPEN_BEFORE_MIN = 15;

/** Fermeture après la fin théorique de la séance */
export const CLOSE_AFTER_MIN = 60;

export type AccessReason = "open" | "too-early" | "ended";

export interface CourseAccess {
  open: boolean;
  reason: AccessReason;
  /** Prochaine séance à venir (ISO), si reason = "too-early" */
  nextSession?: string;
  /** Heure de fermeture de la séance en cours (ISO), si reason = "open" */
  closesAt?: string;
  sessionNumber?: number;
  totalSessions?: number;
}

interface ClasseLike {
  dateTime: string;
  durationMinutes?: number;
  status?: string;
  sessions?: string[];
}

/**
 * Lecture d'une date de séance.
 *
 * ═══════════════════════════════════════════════════════════
 * ⚠️ C'ÉTAIT LA CAUSE DU BLOCAGE.
 *
 * Deux formats coexistent en base, selon la façon dont le cours a
 * été créé :
 *
 *   • cours à la séance   → "2026-08-18T17:00"
 *     (valeur brute d'un <input type="datetime-local">, sans fuseau)
 *   • cours mensuel       → "2026-08-18T16:00:00.000Z"
 *     (converti en UTC par SessionsPicker)
 *
 * Sur une chaîne sans fuseau, les moteurs JavaScript ne s'accordent
 * pas : la spécification ES5 la lisait comme de l'UTC, ES2015 comme
 * de l'heure locale. Chrome moderne applique l'heure locale, mais
 * certains WebView Android et anciens Safari renvoient une date
 * invalide, ou décalent d'une heure — l'Algérie étant à UTC+1.
 *
 * Résultat : un cours prévu à 17 h était lu comme 18 h. À 17 h 05,
 * la salle affichait encore « ouvre dans 55 minutes ».
 *
 * On normalise donc explicitement : sans fuseau, on interprète comme
 * heure locale, en construisant la date composant par composant.
 * Aucune ambiguïté possible.
 * ═══════════════════════════════════════════════════════════
 */
export function parseSessionDate(value: string): number {
  if (!value) return NaN;

  // Déjà un instant absolu — Z ou décalage explicite
  if (/[Zz]$|[+-]\d{2}:?\d{2}$/.test(value)) {
    return new Date(value).getTime();
  }

  // Forme naïve « AAAA-MM-JJTHH:MM » ou « AAAA-MM-JJTHH:MM:SS »
  const m = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/
  );
  if (m) {
    /**
     * ⚠️ Le fuseau algérien est imposé, pas déduit de la machine.
     *
     * C'était le cœur du problème : le client tourne en Algérie
     * (UTC+1), le serveur Vercel en UTC. La même chaîne « 17:00 »
     * y donnait deux instants différents, à une heure d'écart.
     *
     * Concrètement : à 17 h 05 heure algérienne, le navigateur
     * calculait « la salle est ouverte » et affichait la page,
     * mais la route qui délivre le jeton LiveKit calculait
     * « il reste 55 minutes » et refusait l'accès.
     *
     * L'Algérie n'applique pas d'heure d'été : le décalage est
     * constant à UTC+1 toute l'année. Un simple retrait d'une
     * heure suffit, sans bibliothèque de fuseaux.
     */
    const ALGERIA_OFFSET_MIN = 60;

    const asUTC = Date.UTC(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4]),
      Number(m[5]),
      Number(m[6] || 0)
    );

    return asUTC - ALGERIA_OFFSET_MIN * 60_000;
  }

  // Dernier recours
  return new Date(value).getTime();
}

/**
 * Normalise une date de séance en ISO absolu.
 * À appeler AVANT toute écriture en base, pour ne plus jamais
 * enregistrer de chaîne ambiguë.
 */
export function toAbsoluteISO(value: string): string {
  const ms = parseSessionDate(value);
  return Number.isNaN(ms) ? value : new Date(ms).toISOString();
}

/**
 * Détermine si la salle est accessible.
 *
 * Pour un cours mensuel, chaque séance ouvre sa propre fenêtre : la
 * salle est accessible pendant la séance 3 même si les 1 et 2 sont
 * passées.
 */
export function getCourseAccess(
  classe: ClasseLike,
  nowMs: number = Date.now()
): CourseAccess {
  const duration = classe.durationMinutes || 60;

  /**
   * ⚠️ Le statut « live » force l'ouverture.
   *
   * Si le professeur a démarré son cours, la salle s'ouvre même hors
   * fenêtre théorique — un cours qui commence avec dix minutes de
   * retard ne doit pas rester verrouillé.
   */
  if (classe.status === "live") {
    return { open: true, reason: "open" };
  }

  const list =
    Array.isArray(classe.sessions) && classe.sessions.length > 0
      ? [...classe.sessions].sort(
          (a, b) => parseSessionDate(a) - parseSessionDate(b)
        )
      : [classe.dateTime];

  const total = list.length;
  let upcoming: { iso: string; index: number } | null = null;

  for (let i = 0; i < list.length; i++) {
    const startMs = parseSessionDate(list[i]);
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

  /**
   * ⚠️ La fermeture est purement temporelle.
   *
   * L'ancienne version bloquait dès que `status === "ended"` — donc
   * dès que le professeur cliquait sur « Terminer ». Un clic
   * accidentel, ou un professeur qui termine avant que tous les
   * élèves aient quitté la salle, les mettait dehors immédiatement.
   *
   * Maintenant, seul le temps décide : la salle reste accessible
   * jusqu'à une heure après la fin théorique, quoi que fasse le
   * professeur. Le statut ne sert plus qu'à l'affichage.
   */
  return { open: false, reason: "ended", totalSessions: total };
}

/** Temps restant avant une échéance, en clair */
export function timeUntil(
  iso: string,
  isRTL: boolean,
  nowMs: number = Date.now()
): string {
  const diff = parseSessionDate(iso) - nowMs;
  if (Number.isNaN(diff) || diff <= 0) return isRTL ? "الآن" : "maintenant";

  const min = Math.round(diff / 60_000);
  if (min < 60) {
    return isRTL ? `${min} دقيقة` : `${min} minutes`;
  }

  const h = Math.floor(min / 60);
  const rest = min % 60;
  if (h < 24) {
    if (rest === 0) return isRTL ? `${h} ساعات` : `${h} h`;
    return isRTL ? `${h} س ${rest} د` : `${h} h ${rest}`;
  }

  const d = Math.round(h / 24);
  return isRTL ? `${d} ${d > 1 ? "أيام" : "يوم"}` : `${d} jour${d > 1 ? "s" : ""}`;
}

/** La séance est-elle passée ? Sert au tri et au filtrage */
export function isSessionPast(
  classe: ClasseLike,
  nowMs: number = Date.now()
): boolean {
  const duration = classe.durationMinutes || 60;
  const list =
    Array.isArray(classe.sessions) && classe.sessions.length > 0
      ? classe.sessions
      : [classe.dateTime];

  // Le cours est passé quand sa DERNIÈRE séance est terminée
  const lastMs = Math.max(
    ...list.map(parseSessionDate).filter(n => !Number.isNaN(n))
  );
  if (!Number.isFinite(lastMs)) return false;

  return nowMs > lastMs + (duration + CLOSE_AFTER_MIN) * 60_000;
}
