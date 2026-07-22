"use client";
import { useEffect, useState } from "react";
import { getTopTeachers } from "@/lib/firestore";
import { UserProfile } from "@/lib/types";
import { StarDisplay } from "./StarRating";
import { useLang } from "@/lib/lang-context";
import { Trophy, Users, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function TopTeachers() {
  const { isRTL } = useLang();
  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTopTeachers(6).then(setTeachers).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="card animate-pulse">
          <div className="w-14 h-14 rounded-full bg-purple-900/50 mx-auto mb-3" />
          <div className="h-3 bg-purple-900/50 rounded w-3/4 mx-auto mb-2" />
          <div className="h-3 bg-purple-900/50 rounded w-1/2 mx-auto" />
        </div>
      ))}
    </div>
  );

  if (teachers.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {teachers.map((teacher, idx) => (
        <Link key={teacher.uid} href={`/professeur/${teacher.uid}`}
          className={`card hover:border-purple-600/60 transition-all cursor-pointer flex flex-col items-center text-center gap-3 relative block ${
            idx === 0 ? "border-[#FF8C00]/40 neon-orange" : ""
          }`}>
          {/* Rank badge */}
          {idx < 3 && (
            <div className={`absolute top-3 ${isRTL ? "left-3" : "right-3"} w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
              idx === 0 ? "bg-[#FF8C00] text-white" :
              idx === 1 ? "bg-purple-600 text-white" :
              "bg-purple-900 text-purple-300"
            }`}>
              {idx + 1}
            </div>
          )}

          {/* Avatar */}
          <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-2xl font-black ${
            idx === 0
              ? "bg-orange-900/40 border-[#FF8C00]/60 text-[#FF8C00]"
              : "bg-purple-900/60 border-purple-700/40 text-purple-300"
          }`}>
            {teacher.displayName.charAt(0).toUpperCase()}
          </div>

          {/* Name */}
          <div>
            <div className="font-bold text-white text-sm">{teacher.displayName}</div>
            {teacher.featured && (
              <span className="badge-orange text-xs mt-1">⭐ {isRTL ? "مميز" : "Populaire"}</span>
            )}
          </div>

          {/* Rating */}
          <StarDisplay rating={teacher.rating} count={teacher.ratingCount} size="sm" />

          {/* Subjects */}
          {teacher.subjects && teacher.subjects.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center">
              {teacher.subjects.slice(0, 2).map(s => (
                <span key={s} className="badge-purple text-xs">{s}</span>
              ))}
            </div>
          )}

          {/* Verified badge */}
          {teacher.diplomaVerified && (
            <div className={`flex items-center gap-1 text-xs text-emerald-400 ${isRTL ? "flex-row-reverse" : ""}`}>
              <CheckCircle className="w-3 h-3" />
              {isRTL ? "موثق" : "Vérifié"}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
