"use client";
import { useState } from "react";
import { submitRating } from "@/lib/firestore";
import { useLang } from "@/lib/lang-context";
import { StarPicker } from "./StarRating";
import { X, Send, CheckCircle } from "lucide-react";

interface RatingModalProps {
  classeId: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  onClose: () => void;
  onDone: () => void;
}

export default function RatingModal({
  classeId, teacherId, teacherName, studentId, onClose, onDone
}: RatingModalProps) {
  const { t, isRTL } = useLang();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (stars === 0) return;
    setLoading(true);
    try {
      await submitRating({
        classeId,
        teacherId,
        studentId,
        stars,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
      });
      setDone(true);
      setTimeout(() => { onDone(); onClose(); }, 1500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="bg-[#110225] border border-purple-800/50 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        {/* Header */}
        <div className={`flex items-center justify-between mb-6 ${isRTL ? "flex-row-reverse" : ""}`}>
          <h2 className="font-bold text-lg text-white">
            {isRTL ? "تقييم الأستاذ" : "Évaluer le professeur"}
          </h2>
          <button onClick={onClose} className="text-purple-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="text-center py-8">
            <CheckCircle className="w-14 h-14 text-[#FF8C00] mx-auto mb-3" />
            <p className="text-white font-bold text-lg">
              {isRTL ? "شكراً على تقييمك!" : "Merci pour votre avis !"}
            </p>
            <p className="text-purple-400 text-sm mt-1">
              {isRTL ? "سيساعد هذا الطلاب الآخرين" : "Cela aidera les autres élèves"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Teacher name */}
            <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className="w-12 h-12 rounded-full bg-purple-900/60 border border-purple-700/40 flex items-center justify-center text-purple-300 font-bold text-lg">
                {teacherName.charAt(0).toUpperCase()}
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <div className="text-white font-semibold">{teacherName}</div>
                <div className="text-purple-400 text-xs">
                  {isRTL ? "كيف كان الدرس؟" : "Comment était ce cours ?"}
                </div>
              </div>
            </div>

            {/* Stars */}
            <div className={`flex flex-col gap-2 ${isRTL ? "items-end" : "items-start"}`}>
              <label className="text-sm text-purple-300 font-medium">
                {isRTL ? "تقييمك" : "Votre note"}
              </label>
              <StarPicker value={stars} onChange={setStars} size="lg" />
              {stars > 0 && (
                <span className="text-xs text-[#FF8C00] font-medium">
                  {[
                    isRTL ? "ضعيف جداً" : "Très mauvais",
                    isRTL ? "ضعيف" : "Mauvais",
                    isRTL ? "مقبول" : "Moyen",
                    isRTL ? "جيد" : "Bien",
                    isRTL ? "ممتاز!" : "Excellent !",
                  ][stars - 1]}
                </span>
              )}
            </div>

            {/* Comment */}
            <div>
              <label className={`label ${isRTL ? "text-right block" : ""}`}>
                {isRTL ? "تعليق (اختياري)" : "Commentaire (optionnel)"}
              </label>
              <textarea
                className={`input-field resize-none ${isRTL ? "text-right" : ""}`}
                rows={3}
                placeholder={isRTL ? "شاركنا رأيك في هذا الدرس..." : "Partagez votre expérience..."}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={300}
              />
              <div className={`text-xs text-purple-500 mt-1 ${isRTL ? "text-left" : "text-right"}`}>
                {comment.length}/300
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={stars === 0 || loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <span>{isRTL ? "جارٍ الإرسال..." : "Envoi en cours..."}</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {isRTL ? "إرسال التقييم" : "Envoyer l'avis"}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
