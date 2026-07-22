"use client";
import { Classe } from "@/lib/types";
import { Star, Users, Clock, MapPin, MessageCircle, Calendar } from "lucide-react";
import Link from "next/link";

function StarRating({ rating, count }: { rating?: number; count?: number }) {
  const r = rating || 0;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(r) ? "fill-[#FF8C00] text-[#FF8C00]" : "text-purple-800"}`} />
      ))}
      <span className="text-xs text-purple-400 ml-0.5">
        {r > 0 ? r.toFixed(1) : "Nouveau"} {count && count > 0 ? `(${count})` : ""}
      </span>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-DZ", {
    weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export default function ClasseCard({ classe, showActions = true }: { classe: Classe; showActions?: boolean }) {
  const isLive = classe.status === "live";
  const isEnded = classe.status === "ended";

  return (
    <div className={`card hover:border-purple-600/60 transition-all duration-200 flex flex-col gap-4 ${isLive ? "border-[#FF8C00]/50 neon-orange" : ""}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {classe.teacherRating && classe.teacherRating >= 4.5 && (
              <span className="badge-orange">⭐ Populaire</span>
            )}
            {isLive && <span className="badge-red animate-pulse">🔴 En direct</span>}
            {isEnded && <span className="badge bg-gray-800 text-gray-400">Terminé</span>}
          </div>
          <h3 className="font-bold text-white text-base leading-snug">{classe.title}</h3>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-neon-orange">{classe.price.toLocaleString()} DA</div>
          <div className="text-xs text-purple-400">/ {classe.priceType === "session" ? "séance" : "mois"}</div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <span className="badge-purple">{classe.subject}</span>
        <span className="badge bg-blue-900/40 text-blue-300 border border-blue-700/30">{classe.level}</span>
        <span className="badge bg-[#1A0A3C] text-purple-400 border border-purple-800/30 flex items-center gap-1">
          <MapPin className="w-3 h-3" />{classe.wilaya}
        </span>
      </div>

      {/* Teacher */}
      <Link href={`/professeur/${classe.teacherId}`} className="flex items-center gap-3 py-2.5 border-y border-purple-900/40 hover:opacity-80 transition-opacity">
        <div className="w-9 h-9 rounded-full bg-purple-900/60 border border-purple-700/40 flex items-center justify-center text-purple-300 font-bold text-sm shrink-0">
          {classe.teacherName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{classe.teacherName}</div>
          <StarRating rating={classe.teacherRating} />
        </div>
      </Link>

      {/* Meta */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs text-purple-400">
          <Calendar className="w-3.5 h-3.5 text-[#FF8C00]" />
          <span>{formatDate(classe.dateTime)}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-purple-400">
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{classe.durationMinutes} min</span>
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{classe.enrolledCount} inscrits</span>
        </div>
      </div>

      {/* Description */}
      {classe.description && (
        <p className="text-xs text-purple-400/70 line-clamp-2">{classe.description}</p>
      )}

      {/* Actions */}
      {showActions && !isEnded && (
        <div className="flex gap-2 mt-1">
          {classe.whatsapp && (
            <a
              href={`https://wa.me/${classe.whatsapp.replace(/\D/g, "")}?text=Bonjour, je suis intéressé par votre cours: ${classe.title}`}
              target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-green-600/80 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-500 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          )}
          <Link href={`/classe/${classe.id}`}
            className="flex-1 btn-secondary text-sm text-center flex items-center justify-center">
            Voir détails
          </Link>
        </div>
      )}
    </div>
  );
}
