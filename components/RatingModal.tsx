"use client";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { useLang } from "@/lib/lang-context";
import { StarPicker } from "./StarRating";
import { X, Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface RatingModalProps {
  classeId: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  onClose: () => void;
  onDone: () => void;
}

const MAX_COMMENT = 300;

export default function RatingModal({
  classeId, teacherName, onClose, onDone,
}: RatingModalProps) {
  const { isRTL } = useLang();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading && !done) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [loading, done, onClose]);

  const labels = isRTL
    ? ["", "ضعيف جداً", "ضعيف", "مقبول", "جيد", "ممتاز!"]
    : ["", "Très mauvais", "Mauvais", "Moyen", "Bien", "Excellent !"];

  /**
   * L'envoi passe désormais par une route serveur.
   *
   * Auparavant le client tentait d'écrire directement dans Firestore,
   * y compris pour recalculer la moyenne du professeur — ce que les
   * règles refusent, à raison : un élève ne doit pas pouvoir modifier
   * le profil d'un enseignant.
   */
  async function handleSubmit() {
    if (stars === 0) return;
    setError(null);
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        setError(isRTL ? "يجب تسجيل الدخول" : "Vous devez être connecté");
        setLoading(false);
        return;
      }

      const idToken = await user.getIdToken();

      const res = await fetch("/api/submit-rating", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ classeId, stars, comment: comment.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        const messages: Record<string, [string, string]> = {
          "not-enrolled": [
            "Vous n'êtes pas inscrit à ce cours.",
            "لست مسجلاً في هذا الدرس.",
          ],
          "not-attended": [
            "Vous devez avoir assisté au cours pour l'évaluer.",
            "يجب أن تحضر الدرس لتقييمه.",
          ],
          "already-rated": [
            "Vous avez déjà évalué ce cours.",
            "لقد قيّمت هذا الدرس بالفعل.",
          ],
          "self-rating": [
            "Vous ne pouvez pas vous évaluer vous-même.",
            "لا يمكنك تقييم نفسك.",
          ],
          "unauthenticated": [
            "Session expirée. Reconnectez-vous.",
            "انتهت الجلسة. أعد تسجيل الدخول.",
          ],
        };
        const pair = messages[data?.error];
        setError(
          pair
            ? (isRTL ? pair[1] : pair[0])
            : (data?.message || (isRTL ? "فشل الإرسال" : "Échec de l'envoi"))
        );
        setLoading(false);
        return;
      }

      setDone(true);
      setTimeout(() => { onDone(); onClose(); }, 1600);
    } catch (err: any) {
      console.error("Envoi de l'avis échoué :", err);
      setError(
        isRTL
          ? "فشل الإرسال. تحقق من اتصالك."
          : "Échec de l'envoi. Vérifiez votre connexion."
      );
      setLoading(false);
    }
  }

  return (
    <div
      className="rm-overlay"
      dir={isRTL ? "rtl" : "ltr"}
      onClick={() => !loading && !done && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={isRTL ? "تقييم الأستاذ" : "Évaluer le professeur"}
    >
      <div className="rm-modal" onClick={e => e.stopPropagation()}>

        {done ? (
          <div className="rm-done">
            <div className="rm-done-icon">
              <CheckCircle size={34} />
              <span className="rm-ping" />
            </div>
            <h2>{isRTL ? "شكراً على تقييمك!" : "Merci pour votre avis !"}</h2>
            <p>
              {isRTL
                ? "سيساعد رأيك الطلاب الآخرين على الاختيار."
                : "Votre retour aidera d'autres élèves à choisir."}
            </p>
          </div>
        ) : (
          <>
            <div className="rm-head">
              <div className="rm-head-left">
                <span className="rm-avatar">
                  {teacherName.charAt(0).toUpperCase()}
                </span>
                <div>
                  <h2 className="rm-title">
                    {isRTL ? "تقييم الأستاذ" : "Évaluer le professeur"}
                  </h2>
                  <p className="rm-teacher">{teacherName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                className="rm-close"
                aria-label={isRTL ? "إغلاق" : "Fermer"}
              >
                <X size={17} />
              </button>
            </div>

            <div className="rm-stars-block">
              <p className="rm-question">
                {isRTL ? "كيف كان الدرس؟" : "Comment s'est passé ce cours ?"}
              </p>
              <div className="rm-stars">
                <StarPicker value={stars} onChange={setStars} size="lg" />
              </div>
              <p className={`rm-label ${stars > 0 ? "rm-label-on" : ""}`}>
                {stars > 0
                  ? labels[stars]
                  : (isRTL ? "اختر عدد النجوم" : "Sélectionnez une note")}
              </p>
            </div>

            <div className="rm-field">
              <label className="rm-field-label">
                {isRTL ? "تعليقك (اختياري)" : "Votre commentaire (optionnel)"}
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                maxLength={MAX_COMMENT}
                rows={3}
                disabled={loading}
                className="rm-textarea"
                placeholder={isRTL
                  ? "ما الذي أعجبك؟ ما الذي يمكن تحسينه؟"
                  : "Qu'avez-vous apprécié ? Que pourrait-il améliorer ?"}
              />
              <span className="rm-count">{comment.length}/{MAX_COMMENT}</span>
            </div>

            {error && (
              <div className="rm-error">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={stars === 0 || loading}
              className="rm-submit"
            >
              {loading ? (
                <><Loader2 size={16} className="rm-spin" /> {isRTL ? "جارٍ الإرسال..." : "Envoi..."}</>
              ) : (
                <><Send size={15} /> {isRTL ? "إرسال التقييم" : "Envoyer mon avis"}</>
              )}
            </button>

            <p className="rm-note">
              {isRTL
                ? "يظهر تقييمك علناً على ملف الأستاذ."
                : "Votre avis sera visible publiquement sur le profil du professeur."}
            </p>
          </>
        )}
      </div>

      <style jsx>{`
        .rm-overlay {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(5px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: rmFade 0.2s ease;
        }
        @keyframes rmFade { from { opacity: 0; } to { opacity: 1; } }

        .rm-modal {
          background: linear-gradient(160deg, #1a0d38, #0d0520);
          border: 1px solid rgba(124, 58, 237, 0.35);
          border-radius: 22px;
          width: 100%; max-width: 430px;
          padding: 24px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
          animation: rmSlide 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes rmSlide {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .rm-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; margin-bottom: 22px;
        }
        .rm-head-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .rm-avatar {
          width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0;
          background: linear-gradient(140deg, rgba(124, 58, 237, 0.42), rgba(124, 58, 237, 0.16));
          border: 1px solid rgba(168, 85, 247, 0.3);
          display: flex; align-items: center; justify-content: center;
          color: #e9d5ff; font-weight: 800; font-size: 17px;
        }
        .rm-title { color: white; font-weight: 800; font-size: 16px; margin: 0; }
        .rm-teacher { color: #a78bfa; font-size: 12.5px; margin: 2px 0 0; }
        .rm-close {
          width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
          background: rgba(124, 58, 237, 0.16); border: none; color: #a78bfa;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s ease;
        }
        .rm-close:hover:not(:disabled) { background: rgba(124, 58, 237, 0.3); color: white; }
        .rm-close:disabled { opacity: 0.4; cursor: not-allowed; }

        .rm-stars-block {
          text-align: center; padding: 18px 0 20px;
          border-radius: 16px; background: rgba(10, 0, 20, 0.35);
          margin-bottom: 18px;
        }
        .rm-question { color: #c4b5fd; font-size: 13.5px; margin: 0 0 14px; }
        .rm-stars { display: flex; justify-content: center; margin-bottom: 12px; }
        .rm-label {
          color: #5b21b6; font-size: 12.5px; font-weight: 600;
          margin: 0; min-height: 18px; transition: color 0.25s ease;
        }
        .rm-label-on { color: #FF8C00; font-weight: 700; }

        .rm-field {
          position: relative; display: flex; flex-direction: column;
          gap: 7px; margin-bottom: 16px;
        }
        .rm-field-label {
          color: #a78bfa; font-size: 11.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .rm-textarea {
          width: 100%; box-sizing: border-box; resize: none;
          background: rgba(26, 10, 60, 0.65);
          border: 1px solid rgba(124, 58, 237, 0.25);
          border-radius: 12px; padding: 12px 14px;
          font-size: 13.5px; color: white; font-family: inherit;
          line-height: 1.6; outline: none;
          transition: border-color 0.2s ease;
        }
        .rm-textarea:focus { border-color: rgba(255, 140, 0, 0.5); }
        .rm-textarea::placeholder { color: #5b21b6; }
        .rm-textarea:disabled { opacity: 0.6; }
        .rm-count {
          position: absolute; bottom: 9px; inset-inline-end: 12px;
          color: #5b21b6; font-size: 10px; pointer-events: none;
        }

        .rm-error {
          display: flex; align-items: flex-start; gap: 9px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 11px; padding: 11px 13px; margin-bottom: 14px;
        }
        .rm-error :global(svg) { color: #f87171; flex-shrink: 0; margin-top: 1px; }
        .rm-error span { color: #fca5a5; font-size: 12.5px; line-height: 1.5; }

        .rm-submit {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 9px;
          background: linear-gradient(135deg, #FF8C00, #FF6B00);
          color: white; font-weight: 800; padding: 14px;
          border-radius: 13px; border: none; cursor: pointer;
          font-size: 14.5px; font-family: inherit;
          box-shadow: 0 6px 20px rgba(255, 140, 0, 0.28);
          transition: transform 0.24s cubic-bezier(0.34, 1.4, 0.64, 1), filter 0.2s ease;
        }
        .rm-submit:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.06); }
        .rm-submit:disabled { opacity: 0.42; cursor: not-allowed; transform: none; }

        .rm-note {
          color: #5b21b6; font-size: 11px; text-align: center;
          margin: 12px 0 0; line-height: 1.5;
        }

        .rm-done { text-align: center; padding: 26px 0 20px; }
        .rm-done-icon {
          position: relative; width: 74px; height: 74px; border-radius: 24px;
          margin: 0 auto 18px;
          background: linear-gradient(140deg, rgba(255, 140, 0, 0.2), rgba(124, 58, 237, 0.14));
          border: 1px solid rgba(255, 140, 0, 0.3);
          display: flex; align-items: center; justify-content: center;
          color: #FF8C00;
          animation: rmPop 0.45s cubic-bezier(0.34, 1.5, 0.64, 1);
        }
        @keyframes rmPop {
          from { opacity: 0; transform: scale(0.6); }
          to { opacity: 1; transform: scale(1); }
        }
        .rm-ping {
          position: absolute; inset: -6px; border-radius: 28px;
          border: 2px solid rgba(255, 140, 0, 0.4);
          animation: rmPing 1.9s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes rmPing {
          0% { transform: scale(0.92); opacity: 0.85; }
          75%, 100% { transform: scale(1.25); opacity: 0; }
        }
        .rm-done h2 { color: white; font-weight: 800; font-size: 18px; margin: 0 0 8px; }
        .rm-done p { color: #a78bfa; font-size: 13px; margin: 0; line-height: 1.6; }

        .rm-spin { animation: rmSpin 0.8s linear infinite; }
        @keyframes rmSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
