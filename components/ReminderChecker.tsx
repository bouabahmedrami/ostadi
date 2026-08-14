"use client";
import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { checkAndCreateReminders } from "@/lib/firestore";

/**
 * Vérificateur de rappels de cours.
 *
 * Ne rend rien à l'écran. Au chargement de l'application, il regarde
 * les cours à venir de l'utilisateur et crée les notifications
 * manquantes — 24 h avant, puis 1 h avant chaque séance.
 *
 * Pourquoi côté client : une Cloud Function planifiée exigerait le
 * plan Blaze de Firebase. Ici, c'est le passage de l'utilisateur qui
 * déclenche la vérification. Un élève qui ouvre l'app le matin reçoit
 * son rappel pour le cours du soir.
 *
 * Limite assumée : un utilisateur qui n'ouvre jamais l'application ne
 * reçoit rien. Pour un rappel garanti, il faudra passer par les
 * notifications push ou le SMS — un autre chantier.
 */
export default function ReminderChecker() {
  const { user, profile } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (!user || !profile?.role || done.current) return;
    done.current = true;

    // Léger différé : laisse la page se peindre avant d'écrire en base
    const t = setTimeout(async () => {
      try {
        const n = await checkAndCreateReminders(user.uid, profile.role);
        if (n > 0) console.info(`${n} rappel(s) créé(s)`);
      } catch (err) {
        // Non bloquant : l'absence de rappel ne doit pas gêner l'utilisateur
        console.warn("Vérification des rappels échouée :", err);
      }
    }, 2500);

    return () => clearTimeout(t);
  }, [user, profile]);

  return null;
}
