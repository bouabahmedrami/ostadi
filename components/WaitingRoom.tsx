"use client";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/lang-context";
import { setTeacherPresence } from "@/lib/firestore";
import { haptic } from "@/lib/haptics";
import { Clock, Video, MessageCircle, Coffee, Wifi } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   CÔTÉ PROFESSEUR — signal de présence
   ═══════════════════════════════════════════════════════════ */

/**
 * Signale la présence du professeur tant qu'il est en salle.
 *
 * Un battement toutes les trente secondes. Si sa connexion lâche ou
 * qu'il ferme l'onglet, le signal s'arrête et les élèves le voient
 * au bout de quatre-vingt-dix secondes.
 *
 * Aucun bouton à cliquer : ouvrir la salle suffit. Un professeur
 * qui démarre en retard ou qui oublie de se signaler laissait ses
 * élèves devant un écran vide, sans savoir s'il fallait attendre.
 */
export function useTeacherPresence({
  classeId,
  active,
}: {
  classeId: string;
  /** Vrai seulement si c'est le professeur ET que la salle est ouverte */
  active: boolean;
}) {
  const timerRef = useRef<any>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active || !classeId) return;

    startedRef.current = true;
    setTeacherPresence(classeId, true);

    timerRef.current = setInterval(() => {
      setTeacherPresence(classeId, true);
    }, 30_000);

    /**
     * Départ signalé sur `visibilitychange`, pas `beforeunload`.
     *
     * Sur mobile, basculer vers WhatsApp ou verrouiller l'écran ne
     * déclenche jamais `beforeunload` — or c'est exactement ce que
     * fait un professeur qui termine son cours.
     */
    function leave() {
      if (!startedRef.current) return;
      setTeacherPresence(classeId, false);
    }

    function onHidden() {
      if (document.visibilityState === "hidden") leave();
      else setTeacherPresence(classeId, true);
    }

    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", leave);

    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", leave);
      if (timerRef.current) clearInterval(timerRef.current);
      leave();
    };
  }, [active, classeId]);
}


/* ═══════════════════════════════════════════════════════════
   CÔTÉ ÉLÈVE — salle d'attente
   ═══════════════════════════════════════════════════════════ */

/**
 * Écran d'attente du professeur.
 *
 * La salle ouvre quinze minutes avant, mais tant que le professeur
 * n'est pas arrivé, il n'y a rien à voir. Afficher une visio vide
 * laisse l'élève dans le doute : est-ce que ça ne marche pas, ou
 * est-ce que personne n'est là ?
 *
 * Ici, l'état est explicite — et le passage en direct se fait sans
 * rafraîchir la page.
 */
export function WaitingRoom({
  teacherName,
  startsAt,
  whatsapp,
  classeTitle,
}: {
  teacherName: string;
  /** Heure de début prévue (ISO) */
  startsAt: string;
  whatsapp?: string;
  classeTitle: string;
}) {
  const { isRTL } = useLang();
  /**
   * Ce compteur ne s'affiche pas : il force simplement un nouveau
   * rendu chaque minute, pour que le retard affiché reste juste
   * sans que l'élève ait à recharger.
   */
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const startMs = new Date(startsAt).getTime();
  const lateMin = Math.floor((Date.now() - startMs) / 60_000);
  const late = lateMin > 2;

  return (
    <div className="wr os-glass-2">
      <div className="wr-visual">
        {/* Trois points qui pulsent — l'attente est active,
            pas figée. Un écran immobile fait croire à un plantage. */}
        <div className="wr-dots">
          <span /><span /><span />
        </div>
        <Video size={28} className="wr-icon" />
      </div>

      <h2 className="wr-title">
        {isRTL ? "في انتظار الأستاذ" : "En attente du professeur"}
      </h2>

      <p className="wr-text">
        {late ? (
          isRTL
            ? `${teacherName} لم يصل بعد. كان الدرس مبرمجاً منذ ${lateMin} دقيقة.`
            : `${teacherName} n'est pas encore arrivé. Le cours devait commencer il y a ${lateMin} minutes.`
        ) : (
          isRTL
            ? `${teacherName} لم يفتح القاعة بعد. سيتمّ توصيلك تلقائياً فور وصوله.`
            : `${teacherName} n'a pas encore ouvert la salle. Vous serez connecté automatiquement dès son arrivée.`
        )}
      </p>

      {/* Retard notable : on propose une action concrète plutôt
          que de laisser l'élève attendre indéfiniment */}
      {late && lateMin > 10 && whatsapp && (
        <a
          href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
            isRTL
              ? `مرحباً، أنا في انتظار درس « ${classeTitle} ».`
              : `Bonjour, j'attends dans la salle du cours « ${classeTitle} ».`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="wr-contact"
          onClick={() => haptic("tap")}
        >
          <MessageCircle size={15} />
          {isRTL ? "تواصل مع الأستاذ" : "Prévenir le professeur"}
        </a>
      )}

      <div className="wr-tips">
        <span className="wr-tip">
          <Wifi size={12} />
          {isRTL ? "تأكّد من اتصالك" : "Vérifiez votre connexion"}
        </span>
        <span className="wr-tip">
          <Coffee size={12} />
          {isRTL ? "لا تغلق الصفحة" : "Ne fermez pas la page"}
        </span>
      </div>

      <style jsx>{`
        .wr {
          padding: 44px 26px;
          text-align: center;
          border-radius: 20px;
        }

        .wr-visual {
          position: relative;
          width: 84px;
          height: 84px;
          margin: 0 auto 22px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wr-visual :global(.wr-icon) {
          color: #a78bfa;
          position: relative;
          z-index: 2;
        }
        .wr-dots {
          position: absolute;
          inset: 0;
        }
        .wr-dots span {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid rgba(168, 85, 247, 0.4);
          animation: wrPing 2.4s cubic-bezier(0, 0.2, 0.8, 1) infinite;
        }
        .wr-dots span:nth-child(2) { animation-delay: 0.8s; }
        .wr-dots span:nth-child(3) { animation-delay: 1.6s; }
        @keyframes wrPing {
          0%   { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        .wr-title {
          color: #fff;
          font-weight: 800;
          font-size: 18px;
          margin: 0 0 10px;
          letter-spacing: -0.3px;
        }
        .wr-text {
          color: #a78bfa;
          font-size: 13.5px;
          line-height: 1.7;
          max-width: 380px;
          margin: 0 auto 22px;
        }

        .wr-contact {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: #fff;
          font-weight: 700;
          font-size: 13.5px;
          padding: 12px 22px;
          border-radius: 13px;
          text-decoration: none;
          box-shadow: 0 4px 16px rgba(34, 197, 94, 0.26);
          margin-bottom: 22px;
        }

        .wr-tips {
          display: flex;
          gap: 18px;
          justify-content: center;
          flex-wrap: wrap;
          padding-top: 18px;
          border-top: 1px solid rgba(124, 58, 237, 0.14);
        }
        .wr-tip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #6d28d9;
          font-size: 11.5px;
        }

        @media (prefers-reduced-motion: reduce) {
          .wr-dots span { animation: none; opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
