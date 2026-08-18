"use client";
import { useEffect, useRef } from "react";
import {
  startAttendance, heartbeatAttendance, endAttendance,
} from "@/lib/firestore";

/**
 * Chronomètre de présence.
 *
 * ═══════════════════════════════════════════════════════════
 * Remplace le bouton « J'ai assisté à ce cours », que personne ne
 * cliquait — et qui ne prouvait rien de toute façon.
 *
 * Ici la présence est constatée à l'entrée en salle, puis
 * chronométrée. Un parent voit que son enfant est resté douze
 * minutes sur une séance d'une heure, ce qu'aucune case cochée
 * ne dirait.
 * ═══════════════════════════════════════════════════════════
 *
 * ⚠️ La difficulté n'est pas de mesurer, c'est de survivre aux
 * fins brutales. Batterie vide, navigateur fermé, tunnel sans
 * réseau : l'événement de sortie n'arrive jamais.
 *
 * D'où le battement de cœur : toutes les soixante secondes, on
 * écrit la durée courante. Si la session s'interrompt, la dernière
 * minute connue reste enregistrée. Sans lui, une présence coupée
 * compterait pour zéro.
 */
export function useAttendance({
  classeId,
  classeTitle,
  studentId,
  studentName,
  teacherId,
  sessionDate,
  /** Le chronomètre ne démarre que si la salle est vraiment rejointe */
  active,
}: {
  classeId: string;
  classeTitle: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  sessionDate: string;
  active: boolean;
}) {
  const idRef = useRef<string | null>(null);
  const timerRef = useRef<any>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active || !studentId || !classeId || startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const id = await startAttendance({
          classeId, classeTitle, studentId, studentName,
          teacherId, sessionDate,
        });
        if (cancelled) return;
        idRef.current = id;

        // Battement toutes les 60 secondes.
        // Plus fréquent gaspillerait le quota d'écritures Firestore ;
        // moins fréquent perdrait trop de temps en cas de coupure.
        timerRef.current = setInterval(() => {
          if (idRef.current) {
            heartbeatAttendance(idRef.current).catch(() => {
              // Silencieux : une écriture ratée n'interrompt pas le cours
            });
          }
        }, 60_000);
      } catch (err) {
        console.warn("Suivi de présence indisponible :", err);
      }
    })();

    return () => { cancelled = true; };
  }, [active, classeId, classeTitle, studentId, studentName, teacherId, sessionDate]);

  /* ── Clôture ── */
  useEffect(() => {
    function close() {
      if (!idRef.current) return;
      endAttendance(idRef.current).catch(() => {});
    }

    /**
     * `visibilitychange` plutôt que `beforeunload`.
     *
     * Sur mobile, `beforeunload` ne se déclenche pas quand on bascule
     * vers une autre application ou qu'on verrouille l'écran — les
     * deux situations les plus fréquentes en fin de cours. La page
     * passe simplement en arrière-plan, et l'événement n'arrive jamais.
     */
    function onHidden() {
      if (document.visibilityState === "hidden") close();
    }

    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", close);

    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", close);
      if (timerRef.current) clearInterval(timerRef.current);
      close();
    };
  }, []);

  return { attendanceId: idRef.current };
}
