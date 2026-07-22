"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  getPublicTeacherProfile,
  getTeacherClasses,
  getRatingsByTeacher,
} from "@/lib/firestore";
import { useLang } from "@/lib/lang-context";
import { UserProfile, Classe, Rating } from "@/lib/types";
import { StarDisplay } from "@/components/StarRating";
import ClasseCard from "@/components/ClasseCard";
import {
  CheckCircle, MapPin, BookOpen, Users, Star,
  MessageCircle, ArrowLeft, Clock, ShieldCheck,
} from "lucide-react";
import Link from "next/link";

export default function TeacherProfilePage() {
  const { uid } = useParams();
  const { isRTL } = useLang();
  const [teacher, setTeacher] = useState<UserProfile | null>(null);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"courses" | "reviews">("courses");

  useEffect(() => {
    if (uid) loadProfile();
  }, [uid]);

  async function loadProfile() {
    setLoading(true);
    try {
      const [prof, cls, rats] = await Promise.all([
        getPublicTeacherProfile(uid as string),
        getTeacherClasses(uid as string),
        getRatingsByTeacher(uid as string),
      ]);
      setTeacher(prof);
      setClasses(cls.filter(c => c.status !== "ended"));
      setRatings(rats);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
      day: "2-digit", month: "long", year: "numeric",
    });
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen text-purple-400 grid-bg">
      {isRTL ? "جارٍ التحميل..." : "Chargement..."}
    </div>
  );

  if (!teacher) return (
    <div className="flex items-center justify-center min-h-screen text-purple-400 grid-bg">
      {isRTL ? "الأستاذ غير موجود" : "Professeur introuvable"}
    </div>
  );

  const totalStudents = classes.reduce((s, c) => s + (c.enrolledCount || 0), 0);
  const isVerified = teacher.verificationStatus === "approved" || teacher.diplomaVerified;

  return (
    <div className="grid-bg min-h-screen" dir={isRTL ? "rtl" : "ltr"}>
      {/* Hero banner */}
      <div className="relative bg-gradient-to-b from-purple-900/40 to-transparent border-b border-purple-900/30">
        {/* Ambient */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/3 w-64 h-64 bg-purple-700/20 rounded-full blur-3xl" />
          <div className="absolute top-0 right-1/3 w-48 h-48 bg-orange-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 py-10">
          <Link href="/" className={`inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-200 mb-8 transition-colors ${isRTL ? "flex-row-reverse" : ""}`}>
            <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
            {isRTL ? "رجوع" : "Retour"}
          </Link>

          <div className={`flex flex-col md:flex-row gap-6 items-start ${isRTL ? "md:flex-row-reverse" : ""}`}>
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-black border-2 ${
                isVerified
                  ? "bg-orange-900/40 border-[#FF8C00]/60 text-[#FF8C00] neon-orange"
                  : "bg-purple-900/60 border-purple-700/40 text-purple-300"
              }`}>
                {teacher.displayName.charAt(0).toUpperCase()}
              </div>
              {isVerified && (
                <div className={`absolute -bottom-2 ${isRTL ? "-left-2" : "-right-2"} w-7 h-7 rounded-full bg-[#FF8C00] flex items-center justify-center`}>
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className={`flex-1 ${isRTL ? "text-right" : ""}`}>
              <div className={`flex items-center gap-3 flex-wrap mb-1 ${isRTL ? "flex-row-reverse" : ""}`}>
                <h1 className="text-2xl font-black text-white">{teacher.displayName}</h1>
                {teacher.featured && (
                  <span className="badge-orange">⭐ {isRTL ? "مميز" : "Populaire"}</span>
                )}
                {isVerified && (
                  <span className="badge bg-emerald-900/40 text-emerald-300 border border-emerald-700/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {isRTL ? "موثق" : "Vérifié"}
                  </span>
                )}
              </div>

              {/* Meta row */}
              <div className={`flex items-center gap-4 flex-wrap text-sm text-purple-400 mb-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                <span className={`flex items-center gap-1 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <MapPin className="w-3.5 h-3.5" />{teacher.wilaya}
                </span>
                {teacher.subjects && teacher.subjects.length > 0 && (
                  <span className={`flex items-center gap-1 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <BookOpen className="w-3.5 h-3.5" />
                    {teacher.subjects.slice(0, 3).join(" · ")}
                  </span>
                )}
              </div>

              {/* Stars */}
              <StarDisplay rating={teacher.rating} count={teacher.ratingCount} size="md" />

              {/* Bio */}
              {teacher.bio && (
                <p className="text-purple-300/70 text-sm mt-3 leading-relaxed max-w-xl">
                  {teacher.bio}
                </p>
              )}
            </div>

            {/* Quick stats */}
            <div className={`flex md:flex-col gap-3 shrink-0 ${isRTL ? "md:items-end" : ""}`}>
              {[
                { icon: <Star className="w-4 h-4 text-[#FF8C00]" />, value: teacher.rating ? teacher.rating.toFixed(1) : "—", label: isRTL ? "التقييم" : "Note" },
                { icon: <Users className="w-4 h-4 text-purple-400" />, value: totalStudents, label: isRTL ? "طالب" : "Élèves" },
                { icon: <BookOpen className="w-4 h-4 text-purple-400" />, value: classes.length, label: isRTL ? "درس" : "Cours" },
                { icon: <Clock className="w-4 h-4 text-purple-400" />, value: ratings.length, label: isRTL ? "تقييم" : "Avis" },
              ].map((s) => (
                <div key={s.label} className="card card-light text-center min-w-[80px] py-3 px-4">
                  <div className={`flex items-center justify-center gap-1 mb-1 ${isRTL ? "flex-row-reverse" : ""}`}>
                    {s.icon}
                  </div>
                  <div className="text-xl font-black text-white">{s.value}</div>
                  <div className="text-xs text-purple-500">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <div className={`flex gap-2 mb-6 ${isRTL ? "flex-row-reverse" : ""}`}>
          {(["courses", "reviews"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t
                  ? "bg-purple-700 text-white neon-purple"
                  : "text-purple-400 hover:text-white border border-purple-800/50"
              }`}
            >
              {t === "courses"
                ? isRTL ? `الدروس (${classes.length})` : `Cours (${classes.length})`
                : isRTL ? `التقييمات (${ratings.length})` : `Avis (${ratings.length})`}
            </button>
          ))}
        </div>

        {/* Courses tab */}
        {tab === "courses" && (
          <div>
            {classes.length === 0 ? (
              <div className="card text-center py-12 text-purple-400">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>{isRTL ? "لا توجد دروس متاحة" : "Aucun cours disponible"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classes.map((c) => <ClasseCard key={c.id} classe={c} />)}
              </div>
            )}
          </div>
        )}

        {/* Reviews tab */}
        {tab === "reviews" && (
          <div className="flex flex-col gap-4 pb-10">
            {/* Rating summary */}
            {ratings.length > 0 && (
              <div className="card flex flex-col md:flex-row gap-6 items-center">
                {/* Big number */}
                <div className="text-center shrink-0">
                  <div className="text-6xl font-black text-[#FF8C00]">
                    {teacher.rating ? teacher.rating.toFixed(1) : "—"}
                  </div>
                  <StarDisplay rating={teacher.rating} size="md" />
                  <div className="text-purple-400 text-xs mt-1">
                    {ratings.length} {isRTL ? "تقييم" : "avis"}
                  </div>
                </div>
                {/* Bar chart */}
                <div className="flex-1 w-full flex flex-col gap-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = ratings.filter(r => r.stars === star).length;
                    const pct = ratings.length ? Math.round((count / ratings.length) * 100) : 0;
                    return (
                      <div key={star} className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <span className="text-xs text-purple-400 w-4 text-center">{star}</span>
                        <Star className="w-3 h-3 fill-[#FF8C00] text-[#FF8C00] shrink-0" />
                        <div className="flex-1 bg-purple-900/40 rounded-full h-2">
                          <div
                            className="bg-[#FF8C00] h-2 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-purple-400 w-8 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Individual reviews */}
            {ratings.length === 0 ? (
              <div className="card text-center py-12 text-purple-400">
                <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>{isRTL ? "لا توجد تقييمات بعد" : "Aucun avis pour le moment"}</p>
              </div>
            ) : (
              ratings.map((r) => (
                <div key={r.id} className="card flex flex-col gap-2">
                  <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <div className="w-8 h-8 rounded-full bg-purple-900/60 border border-purple-700/40 flex items-center justify-center text-purple-300 text-xs font-bold">
                        👤
                      </div>
                      <span className="text-sm font-medium text-purple-300">
                        {isRTL ? "طالب مجهول" : "Élève anonyme"}
                      </span>
                    </div>
                    <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <StarDisplay rating={r.stars} size="sm" />
                      <span className="text-xs text-purple-500">{formatDate(r.createdAt)}</span>
                    </div>
                  </div>
                  {r.comment && (
                    <p className={`text-sm text-purple-300/80 leading-relaxed ${isRTL ? "text-right" : ""}`}>
                      "{r.comment}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
