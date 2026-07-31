"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { trSubject, trLevel } from "@/lib/i18n/translate";
import { getUserChatRooms } from "@/lib/firestore";
import {
  MessageCircle, BookOpen, ChevronRight, Search, X, Inbox,
} from "lucide-react";
import Link from "next/link";

export default function ChatListPage() {
  const { user, profile, loading } = useAuth();
  const { isRTL } = useLang();
  const router = useRouter();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (user && profile) {
      getUserChatRooms(user.uid, profile.role)
        .then(rs => {
          // Trie : non-lus d'abord, puis par date du dernier message
          const sorted = [...rs].sort((a, b) => {
            if ((b.unreadCount || 0) !== (a.unreadCount || 0)) {
              return (b.unreadCount || 0) - (a.unreadCount || 0);
            }
            const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
            const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
            return tb - ta;
          });
          setRooms(sorted);
        })
        .finally(() => setLoadingData(false));
    }
  }, [user, profile]);

  function formatTime(iso?: string) {
    if (!iso) return "";
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return isRTL ? "الآن" : "À l'instant";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} ${isRTL ? "د" : "min"}`;
    if (diff < 86400000) {
      return d.toLocaleTimeString(isRTL ? "ar-DZ" : "fr-DZ", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", { day: "2-digit", month: "short" });
  }

  const filtered = search.trim()
    ? rooms.filter(r => {
        const q = search.trim().toLowerCase();
        return (r.title || "").toLowerCase().includes(q)
          || (r.teacherName || "").toLowerCase().includes(q)
          || (r.subject || "").toLowerCase().includes(q);
      })
    : rooms;

  const totalUnread = rooms.reduce((s, r) => s + (r.unreadCount || 0), 0);

  if (loading || loadingData) return (
    <div className="cl-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '46px', height: '46px' }}>
        <div style={{ position: 'absolute', inset: 0, border: '3px solid rgba(124,58,237,0.15)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 0, border: '3px solid transparent', borderTopColor: '#FF8C00', borderRadius: '50%', animation: 'clspin 0.8s linear infinite' }} />
      </div>
      <style jsx global>{`
        @keyframes clspin { to { transform: rotate(360deg); } }
        .cl-page { background: #0A0014; min-height: 100vh; }
      `}</style>
    </div>
  );

  return (
    <div className="cl-page" dir={isRTL ? "rtl" : "ltr"}>
      <div className="cl-orb" />

      <div className={`cl-container ${mounted ? 'cl-in' : 'cl-out'}`}>

        {/* ═══ HEADER ═══ */}
        <div className="cl-header">
          <div className="cl-header-icon">
            <MessageCircle size={20} />
            {totalUnread > 0 && <span className="cl-header-badge">{totalUnread > 99 ? "99+" : totalUnread}</span>}
          </div>
          <div>
            <h1 className="cl-title">{isRTL ? "المحادثات" : "Messagerie"}</h1>
            <p className="cl-sub">
              {totalUnread > 0
                ? (isRTL
                    ? `${totalUnread} ${totalUnread > 1 ? "رسائل جديدة" : "رسالة جديدة"}`
                    : `${totalUnread} message${totalUnread > 1 ? "s" : ""} non lu${totalUnread > 1 ? "s" : ""}`)
                : (profile?.role === "teacher"
                    ? (isRTL ? "تواصل مع طلابك" : "Échangez avec vos élèves")
                    : (isRTL ? "تواصل مع أساتذتك" : "Échangez avec vos professeurs"))}
            </p>
          </div>
        </div>

        {/* ═══ RECHERCHE ═══ */}
        {rooms.length > 3 && (
          <div className="cl-search">
            <Search size={15} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isRTL ? "ابحث عن محادثة..." : "Rechercher une conversation..."}
            />
            {search && <button onClick={() => setSearch("")}><X size={14} /></button>}
          </div>
        )}

        {/* ═══ LISTE ═══ */}
        {filtered.length === 0 ? (
          <div className="cl-empty">
            <div className="cl-empty-icon">
              {search ? <Search size={28} /> : <Inbox size={28} />}
            </div>
            <h3>
              {search
                ? (isRTL ? "لا توجد نتائج" : "Aucun résultat")
                : (isRTL ? "لا توجد محادثات بعد" : "Aucune conversation")}
            </h3>
            {!search && (
              <>
                <p>
                  {profile?.role === "teacher"
                    ? (isRTL
                        ? "ستظهر المحادثات بعد إنشاء دروسك وتسجيل الطلاب"
                        : "Les conversations apparaîtront après création de vos cours")
                    : (isRTL
                        ? "ستظهر محادثاتك هنا بعد التسجيل في دروس"
                        : "Vos conversations apparaîtront après inscription à des cours")}
                </p>
                <Link href={profile?.role === "teacher" ? "/dashboard" : "/"} className="cl-empty-cta">
                  {profile?.role === "teacher"
                    ? (isRTL ? "لوحة التحكم" : "Mon dashboard")
                    : (isRTL ? "تصفح الدروس" : "Parcourir les cours")}
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="cl-list">
            {filtered.map(room => {
              const unread = room.unreadCount > 0;
              return (
                <Link
                  key={room.classeId}
                  href={`/chat/${room.classeId}`}
                  className={`cl-room ${unread ? "cl-room-unread" : ""}`}
                >
                  {/* Icône */}
                  <div className={`cl-room-icon ${unread ? "cl-room-icon-on" : ""}`}>
                    <BookOpen size={19} />
                  </div>

                  {/* Contenu */}
                  <div className="cl-room-body">
                    <div className="cl-room-top">
                      <h3 className={`cl-room-title ${unread ? "cl-room-title-unread" : ""}`}>
                        {room.title}
                      </h3>
                      <div className="cl-room-right">
                        {room.lastMessageAt && (
                          <span className={`cl-room-time ${unread ? "cl-room-time-on" : ""}`}>
                            {formatTime(room.lastMessageAt)}
                          </span>
                        )}
                        {unread && (
                          <span className="cl-room-badge">
                            {room.unreadCount > 9 ? "9+" : room.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="cl-room-tags">
                      {room.subject && (
                        <span className="cl-tag cl-tag-purple">{trSubject(room.subject, isRTL)}</span>
                      )}
                      {room.level && (
                        <span className="cl-tag cl-tag-blue">{trLevel(room.level, isRTL)}</span>
                      )}
                      {profile?.role === "student" && room.teacherName && (
                        <span className="cl-room-teacher">{room.teacherName}</span>
                      )}
                    </div>

                    <p className={`cl-room-last ${unread ? "cl-room-last-unread" : ""}`}>
                      {room.lastMessage || (isRTL ? "لا توجد رسائل بعد" : "Aucun message encore")}
                    </p>
                  </div>

                  <ChevronRight
                    size={16}
                    className="cl-room-arrow"
                    style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }}
                  />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <style jsx global>{`
        .cl-page {
          background: #0A0014; min-height: 100vh; position: relative; overflow-x: hidden;
          background-image:
            linear-gradient(rgba(168,85,247,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168,85,247,0.022) 1px, transparent 1px);
          background-size: 44px 44px;
          padding: 28px 16px 60px;
        }
        .cl-orb {
          position: fixed; top: -80px; left: 28%;
          width: 340px; height: 340px; border-radius: 50%;
          background: rgba(124,58,237,0.12); filter: blur(70px);
          pointer-events: none;
        }
        .cl-container { position: relative; max-width: 680px; margin: 0 auto; }
        .cl-in { opacity: 1; transform: translateY(0); transition: opacity 0.45s ease, transform 0.45s ease; }
        .cl-out { opacity: 0; transform: translateY(12px); }

        /* ── Header ── */
        .cl-header { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
        .cl-header-icon {
          position: relative; flex-shrink: 0;
          width: 50px; height: 50px; border-radius: 16px;
          background: linear-gradient(140deg, rgba(255,140,0,0.2), rgba(124,58,237,0.18));
          border: 1px solid rgba(255,140,0,0.28);
          display: flex; align-items: center; justify-content: center; color: #FF8C00;
        }
        .cl-header-badge {
          position: absolute; top: -5px; inset-inline-end: -5px;
          min-width: 21px; height: 21px; border-radius: 999px; padding: 0 6px;
          background: #ef4444; color: white;
          font-size: 10.5px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #0A0014;
        }
        .cl-title { color: white; font-weight: 900; font-size: 23px; margin: 0; letter-spacing: -0.5px; }
        .cl-sub { color: #8b7bb8; font-size: 12.5px; margin: 3px 0 0; }

        /* ── Recherche ── */
        .cl-search {
          display: flex; align-items: center; gap: 9px;
          background: rgba(26,10,60,0.6); border: 1px solid rgba(124,58,237,0.22);
          border-radius: 13px; padding: 0 14px; margin-bottom: 18px;
          transition: border-color 0.2s ease;
        }
        .cl-search:focus-within { border-color: rgba(255,140,0,0.45); }
        .cl-search > svg { color: #6d28d9; flex-shrink: 0; }
        .cl-search input {
          flex: 1; background: transparent; border: none; outline: none;
          color: white; font-size: 13.5px; font-family: inherit; padding: 12px 0;
        }
        .cl-search input::placeholder { color: #6d28d9; }
        .cl-search button {
          background: none; border: none; color: #6d28d9;
          cursor: pointer; display: flex; padding: 0; flex-shrink: 0;
        }
        .cl-search button:hover { color: #a78bfa; }

        /* ── Liste ── */
        .cl-list { display: flex; flex-direction: column; gap: 9px; }
        .cl-room {
          display: flex; align-items: center; gap: 13px;
          background: linear-gradient(145deg, rgba(20,8,45,0.88), rgba(15,5,30,0.88));
          border: 1px solid rgba(124,58,237,0.16);
          border-radius: 16px; padding: 14px 16px; text-decoration: none;
          transition: transform 0.25s cubic-bezier(0.34,1.25,0.64,1), border-color 0.25s ease;
        }
        .cl-room:hover { transform: translateY(-2px); border-color: rgba(168,85,247,0.38); }
        .cl-room-unread {
          border-color: rgba(255,140,0,0.32);
          background: linear-gradient(145deg, rgba(38,20,50,0.9), rgba(18,7,34,0.9));
        }

        .cl-room-icon {
          width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
          background: rgba(124,58,237,0.16); border: 1px solid rgba(124,58,237,0.22);
          display: flex; align-items: center; justify-content: center; color: #a78bfa;
          transition: all 0.25s ease;
        }
        .cl-room-icon-on {
          background: rgba(255,140,0,0.16); border-color: rgba(255,140,0,0.34); color: #FF8C00;
        }

        .cl-room-body { flex: 1; min-width: 0; }
        .cl-room-top {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; margin-bottom: 5px;
        }
        .cl-room-title {
          color: #d8b4fe; font-weight: 650; font-size: 14px; margin: 0;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .cl-room-title-unread { color: white; font-weight: 800; }
        .cl-room-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .cl-room-time { color: #5b21b6; font-size: 10.5px; }
        .cl-room-time-on { color: #FF8C00; font-weight: 700; }
        .cl-room-badge {
          min-width: 20px; height: 20px; border-radius: 999px; padding: 0 6px;
          background: #FF8C00; color: white;
          font-size: 10.5px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
        }

        .cl-room-tags {
          display: flex; align-items: center; gap: 6px;
          flex-wrap: wrap; margin-bottom: 5px;
        }
        .cl-tag {
          font-size: 10.5px; font-weight: 600;
          padding: 3px 9px; border-radius: 7px;
        }
        .cl-tag-purple { background: rgba(124,58,237,0.18); color: #c4b5fd; }
        .cl-tag-blue { background: rgba(59,130,246,0.14); color: #93c5fd; }
        .cl-room-teacher { color: #6d28d9; font-size: 11px; }

        .cl-room-last {
          color: #6d28d9; font-size: 12px; margin: 0;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .cl-room-last-unread { color: #a78bfa; font-weight: 500; }

        .cl-room-arrow { color: #4c1d95; flex-shrink: 0; transition: transform 0.25s ease, color 0.25s ease; }
        .cl-room:hover .cl-room-arrow { color: #FF8C00; }

        /* ── Vide ── */
        .cl-empty { text-align: center; padding: 70px 20px; }
        .cl-empty-icon {
          width: 68px; height: 68px; border-radius: 20px; margin: 0 auto 16px;
          background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.16);
          display: flex; align-items: center; justify-content: center; color: #7c3aed;
        }
        .cl-empty h3 { color: #d8b4fe; font-weight: 700; font-size: 16px; margin: 0 0 8px; }
        .cl-empty p {
          color: #8b7bb8; font-size: 13px; line-height: 1.6;
          max-width: 330px; margin: 0 auto 22px;
        }
        .cl-empty-cta {
          display: inline-block;
          background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white;
          font-weight: 700; padding: 12px 26px; border-radius: 13px;
          text-decoration: none; font-size: 13.5px;
          box-shadow: 0 7px 22px rgba(255,140,0,0.28);
          transition: transform 0.25s cubic-bezier(0.34,1.4,0.64,1);
        }
        .cl-empty-cta:hover { transform: translateY(-2px) scale(1.02); }
      `}</style>
    </div>
  );
}
