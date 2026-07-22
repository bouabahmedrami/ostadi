"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { getUserChatRooms } from "@/lib/firestore";
import { MessageCircle, BookOpen, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function ChatListPage() {
  const { user, profile, loading } = useAuth();
  const { isRTL } = useLang();
  const router = useRouter();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading]);

  useEffect(() => {
    if (user && profile) {
      getUserChatRooms(user.uid, profile.role)
        .then(setRooms)
        .finally(() => setLoadingData(false));
    }
  }, [user, profile]);

  function formatTime(iso?: string) {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return isRTL ? "الآن" : "À l'instant";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} ${isRTL ? "د" : "min"}`;
    if (diff < 86400000) return d.toLocaleTimeString(isRTL ? "ar" : "fr", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", { day: "2-digit", month: "short" });
  }

  if (loading || loadingData) return (
    <div className="flex items-center justify-center min-h-screen text-purple-400 grid-bg">
      {isRTL ? "جارٍ التحميل..." : "Chargement..."}
    </div>
  );

  return (
    <div className="grid-bg min-h-screen" dir={isRTL ? "rtl" : "ltr"}>
      {/* Ambient */}
      <div className="fixed top-0 left-1/3 w-96 h-96 bg-purple-700/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className={`flex items-center gap-3 mb-8 ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className="w-12 h-12 rounded-2xl bg-purple-900/60 border border-purple-700/40 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-[#FF8C00]" />
          </div>
          <div className={isRTL ? "text-right" : ""}>
            <h1 className="text-2xl font-black text-white">
              {isRTL ? "المحادثات" : "Messagerie"}
            </h1>
            <p className="text-purple-400 text-sm">
              {isRTL ? "تواصل مع أساتذتك أو طلابك" : "Échangez avec vos profs ou élèves"}
            </p>
          </div>
        </div>

        {/* Rooms list */}
        {rooms.length === 0 ? (
          <div className="card text-center py-16">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-purple-700 opacity-50" />
            <p className="text-purple-300 font-medium">
              {isRTL ? "لا توجد محادثات بعد" : "Aucune conversation pour le moment"}
            </p>
            <p className="text-purple-500 text-sm mt-1">
              {isRTL
                ? "ستظهر محادثاتك هنا بعد التسجيل في دروس"
                : "Vos conversations apparaîtront après inscription à des cours"}
            </p>
            <Link href="/" className="btn-primary inline-block mt-6 text-sm">
              {isRTL ? "تصفح الدروس" : "Parcourir les cours"}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {rooms.map((room) => (
              <Link
                key={room.classeId}
                href={`/chat/${room.classeId}`}
                className={`card hover:border-purple-600/60 transition-all flex items-center gap-4 ${
                  room.unreadCount > 0 ? "border-[#FF8C00]/30" : ""
                } ${isRTL ? "flex-row-reverse" : ""}`}
              >
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  room.unreadCount > 0
                    ? "bg-orange-900/40 border border-[#FF8C00]/40"
                    : "bg-purple-900/60 border border-purple-700/40"
                }`}>
                  <BookOpen className={`w-5 h-5 ${room.unreadCount > 0 ? "text-[#FF8C00]" : "text-purple-400"}`} />
                </div>

                {/* Content */}
                <div className={`flex-1 min-w-0 ${isRTL ? "text-right" : ""}`}>
                  <div className={`flex items-center justify-between gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <h3 className="font-bold text-white text-sm truncate">{room.title}</h3>
                    <div className={`flex items-center gap-2 shrink-0 ${isRTL ? "flex-row-reverse" : ""}`}>
                      {room.lastMessageAt && (
                        <span className="text-xs text-purple-500">{formatTime(room.lastMessageAt)}</span>
                      )}
                      {room.unreadCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-[#FF8C00] text-white text-xs font-black flex items-center justify-center">
                          {room.unreadCount > 9 ? "9+" : room.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 mt-0.5 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <span className="badge-purple text-xs">{room.subject}</span>
                    <span className="badge bg-blue-900/40 text-blue-300 border border-blue-700/30 text-xs">{room.level}</span>
                  </div>
                  {room.lastMessage && (
                    <p className="text-xs text-purple-400 mt-1 truncate">
                      {room.lastMessage}
                    </p>
                  )}
                  {!room.lastMessage && (
                    <p className="text-xs text-purple-600 mt-1">
                      {isRTL ? "لا توجد رسائل بعد" : "Aucun message encore"}
                    </p>
                  )}
                </div>

                <ChevronRight className={`w-4 h-4 text-purple-600 shrink-0 ${isRTL ? "rotate-180" : ""}`} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
