"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getEnrollmentsByStudent, getClasseById, markAttendance } from "@/lib/firestore";
import { Enrollment, Classe } from "@/lib/types";
import { Video, Calendar, Clock, CheckCircle, BookOpen, MessageCircle } from "lucide-react";
import Link from "next/link";

interface EnrolledClasse extends Classe {
  enrollment: Enrollment;
}

export default function MesCoursPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<EnrolledClasse[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) loadClasses();
  }, [user]);

  async function loadClasses() {
    setLoadingData(true);
    try {
      const enrollments = await getEnrollmentsByStudent(user!.uid);
      const withClasses = await Promise.all(
        enrollments.map(async (e) => {
          const classe = await getClasseById(e.classeId);
          if (!classe) return null;
          return { ...classe, enrollment: e } as EnrolledClasse;
        })
      );
      setClasses(withClasses.filter(Boolean) as EnrolledClasse[]);
    } finally {
      setLoadingData(false);
    }
  }

  async function handleAttendance(enrollment: Enrollment, classeId: string) {
    await markAttendance(enrollment.id, classeId);
    await loadClasses();
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-DZ", {
      weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit",
    });
  }

  function isNow(dateTime: string, durationMinutes: number) {
    const start = new Date(dateTime).getTime();
    const end = start + durationMinutes * 60000;
    const now = Date.now();
    return now >= start - 10 * 60000 && now <= end;
  }

  if (loading || loadingData) {
    return <div className="flex items-center justify-center min-h-screen text-gray-400">Chargement...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="section-title">Mes Cours</h1>
        <p className="text-purple-400 text-sm mt-1">Vos cours auxquels vous êtes inscrit(e)</p>
      </div>

      {classes.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Aucun cours inscrit</p>
          <p className="text-sm mt-1 mb-6">Contactez un professeur via WhatsApp pour vous inscrire</p>
          <Link href="/" className="btn-primary inline-block">Trouver un cours</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {classes.map((c) => {
            const live = isNow(c.dateTime, c.durationMinutes);
            return (
              <div key={c.id} className={`card border-2 ${live ? "border-emerald-400 shadow-md" : "border-purple-900/40"}`}>
                {live && (
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm mb-3 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    Cours en direct maintenant !
                  </div>
                )}
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="badge badge-green">{c.subject}</span>
                      <span className="badge bg-blue-50 text-blue-700">{c.level}</span>
                    </div>
                    <h3 className="font-bold text-white">{c.title}</h3>
                    <p className="text-sm text-purple-400 mt-1">Prof. {c.teacherName}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(c.dateTime)}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{c.durationMinutes} min</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {live ? (
                      <Link
                        href={`/classe/${c.id}`}
                        className="btn-primary flex items-center gap-2 text-sm"
                      >
                        <Video className="w-4 h-4" />
                        Rejoindre le cours
                      </Link>
                    ) : (
                      <Link href={`/classe/${c.id}`} className="btn-secondary text-sm text-center">
                        Voir les détails
                      </Link>
                    )}
                    <Link
                      href={`/chat/${c.id}`}
                      className="flex items-center justify-center gap-1.5 text-sm text-purple-300 hover:text-white border border-purple-700/40 rounded-xl py-2 px-4 transition-colors hover:border-purple-500"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {t.nav.myCourses === "دروسي" ? "المحادثة" : "Chat"}
                    </Link>
                    {!c.enrollment.attended ? (
                      <button
                        onClick={() => handleAttendance(c.enrollment, c.id)}
                        className="flex items-center justify-center gap-1.5 text-sm text-purple-400 hover:text-emerald-600 border border-gray-200 rounded-xl py-2 px-4 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Marquer présence
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 text-sm text-emerald-600 font-medium">
                        <CheckCircle className="w-4 h-4 fill-emerald-100" />
                        Présence confirmée
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
