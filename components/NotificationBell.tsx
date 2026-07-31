"use client";
import { useState, useEffect, useRef } from "react";
import { Bell, MessageCircle, Video, Star, ShieldCheck, Crown, Check, AlertCircle } from "lucide-react";
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLang } from "@/lib/lang-context";
import Link from "next/link";

interface Notification {
  id: string;
  userId: string;
  type: "message" | "course_starting" | "course_live" | "rating" | "verification" | "subscription";
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

const ICONS: Record<string, any> = {
  message: MessageCircle,
  course_starting: Video,
  course_live: Video,
  rating: Star,
  verification: ShieldCheck,
  subscription: Crown,
};

const COLORS: Record<string, string> = {
  message: "#60a5fa",
  course_starting: "#FF8C00",
  course_live: "#ef4444",
  rating: "#FF8C00",
  verification: "#a78bfa",
  subscription: "#FF8C00",
};

export default function NotificationBell({ userId }: { userId: string }) {
  const { isRTL } = useLang();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
        setLoadError(null);
      },
      (err) => {
        // ⚠️ AVANT : aucun callback d'erreur — la cloche restait vide sans explication.
        // L'index composite manquant est le cas le plus courant.
        console.error("Écoute des notifications échouée :", err);
        setLoadError(
          err?.code === "failed-precondition"
            ? (isRTL
                ? "الفهرس مفقود — افتح الرابط في الطرفية."
                : "Index Firestore manquant — voir le lien dans le terminal.")
            : (isRTL ? "تعذّر تحميل الإشعارات" : "Chargement impossible")
        );
      }
    );
    return () => unsub();
  }, [userId, isRTL]);

  // L'écouteur ne tourne que quand le panneau est ouvert
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  // Le flux est limité à 20 : au-delà on affiche « 20+ »
  const unreadCount = notifs.filter(n => !n.read).length;
  const hasMore = notifs.length >= 20;

  async function markAllRead() {
    const unread = notifs.filter(n => !n.read);
    if (unread.length === 0) return;
    setMarking(true);
    try {
      const batch = writeBatch(db);
      unread.forEach(n => batch.update(doc(db, "notifications", n.id), { read: true }));
      await batch.commit();
    } catch (err) {
      console.error("Marquage échoué :", err);
      setLoadError(isRTL ? "فشلت العملية" : "Action échouée");
    } finally {
      setMarking(false);
    }
  }

  async function handleNotifClick(notif: Notification) {
    setOpen(false);
    if (notif.read) return;
    try {
      await updateDoc(doc(db, "notifications", notif.id), { read: true });
    } catch (err) {
      // Non bloquant : la navigation a déjà eu lieu
      console.error("Marquage comme lu échoué :", err);
    }
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return isRTL ? "الآن" : "À l'instant";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} ${isRTL ? "د" : "min"}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ${isRTL ? "س" : "h"}`;
    return `${Math.floor(diff / 86400000)} ${isRTL ? "ي" : "j"}`;
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="ostadi-bell-btn"
        aria-label={
          unreadCount > 0
            ? (isRTL ? `${unreadCount} إشعارات غير مقروءة` : `${unreadCount} notifications non lues`)
            : (isRTL ? "الإشعارات" : "Notifications")
        }
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="ostadi-bell-badge">{unreadCount >= 20 ? '20+' : unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className={`ostadi-notif-dropdown ${isRTL ? 'ostadi-notif-dropdown-rtl' : ''}`}>
          <div className="ostadi-notif-header">
            <span className="ostadi-notif-title">{isRTL ? "الإشعارات" : "Notifications"}</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={marking}
                className="ostadi-notif-mark-all"
              >
                <Check size={12} />
                {marking
                  ? (isRTL ? "جارٍ..." : "…")
                  : (isRTL ? "تعليم الكل كمقروء" : "Tout marquer lu")}
              </button>
            )}
          </div>

          {loadError && (
            <div className="ostadi-notif-error">
              <AlertCircle size={13} />
              <span>{loadError}</span>
            </div>
          )}

          <div className="ostadi-notif-list">
            {notifs.length === 0 ? (
              <div className="ostadi-notif-empty">
                <Bell size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p>{isRTL ? "لا توجد إشعارات" : "Aucune notification"}</p>
              </div>
            ) : (
              notifs.map(notif => {
                const Icon = ICONS[notif.type] || Bell;
                const color = COLORS[notif.type] || "#a78bfa";
                const content = (
                  <div className={`ostadi-notif-item ${!notif.read ? 'ostadi-notif-item-unread' : ''}`}>
                    <div className="ostadi-notif-icon" style={{ background: `${color}22`, color }}>
                      <Icon size={15} />
                    </div>
                    <div className="ostadi-notif-content">
                      <div className="ostadi-notif-item-title">{notif.title}</div>
                      <div className="ostadi-notif-item-body">{notif.body}</div>
                      <div className="ostadi-notif-time">{timeAgo(notif.createdAt)}</div>
                    </div>
                    {!notif.read && <div className="ostadi-notif-dot" />}
                  </div>
                );

                return notif.link ? (
                  <Link key={notif.id} href={notif.link} onClick={() => handleNotifClick(notif)} style={{ textDecoration: 'none' }}>
                    {content}
                  </Link>
                ) : (
                  <div key={notif.id} onClick={() => handleNotifClick(notif)} style={{ cursor: 'pointer' }}>
                    {content}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .ostadi-bell-btn {
          position: relative; background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.2);
          color: #c4b5fd; width: 36px; height: 36px; border-radius: 11px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;
        }
        .ostadi-bell-btn:hover { background: rgba(124,58,237,0.2); color: white; }
        .ostadi-bell-badge {
          position: absolute; top: -4px; right: -4px; background: #FF8C00; color: white;
          font-size: 10px; font-weight: 800; width: 17px; height: 17px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; border: 2px solid #0A0014;
        }

        .ostadi-notif-dropdown {
          position: absolute; top: calc(100% + 10px); right: 0; width: 340px; max-width: 90vw;
          background: linear-gradient(160deg, #150a2e, #0a0014);
          border: 1px solid rgba(124,58,237,0.25); border-radius: 18px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5); z-index: 200; overflow: hidden;
          animation: notifSlideIn 0.2s ease;
        }
        .ostadi-notif-dropdown-rtl { right: auto; left: 0; }
        @keyframes notifSlideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }

        .ostadi-notif-error {
          display: flex; align-items: center; gap: 8px;
          background: rgba(239,68,68,0.1);
          border-bottom: 1px solid rgba(239,68,68,0.25);
          padding: 9px 14px;
        }
        .ostadi-notif-error svg { color: #f87171; flex-shrink: 0; }
        .ostadi-notif-error span { color: #fca5a5; font-size: 11.5px; line-height: 1.45; }
        .ostadi-notif-mark-all:disabled { opacity: 0.5; cursor: not-allowed; }

        .ostadi-notif-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px; border-bottom: 1px solid rgba(124,58,237,0.15);
        }
        .ostadi-notif-title { color: white; font-weight: 800; font-size: 14px; }
        .ostadi-notif-mark-all {
          display: flex; align-items: center; gap: 4px; background: none; border: none;
          color: #FF8C00; font-size: 11px; font-weight: 600; cursor: pointer;
        }

        .ostadi-notif-list { max-height: 400px; overflow-y: auto; }
        .ostadi-notif-empty { text-align: center; padding: 40px 20px; color: #6d28d9; font-size: 13px; }

        .ostadi-notif-item {
          display: flex; align-items: flex-start; gap: 11px; padding: 13px 16px;
          border-bottom: 1px solid rgba(124,58,237,0.08); transition: background 0.15s ease; position: relative;
        }
        .ostadi-notif-item:hover { background: rgba(124,58,237,0.08); }
        .ostadi-notif-item-unread { background: rgba(255,140,0,0.04); }
        .ostadi-notif-icon { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ostadi-notif-content { flex: 1; min-width: 0; }
        .ostadi-notif-item-title { color: white; font-weight: 700; font-size: 12.5px; margin-bottom: 2px; }
        .ostadi-notif-item-body { color: #a78bfa; font-size: 12px; line-height: 1.4; }
        .ostadi-notif-time { color: #6d28d9; font-size: 10.5px; margin-top: 4px; }
        .ostadi-notif-dot { width: 7px; height: 7px; border-radius: 50%; background: #FF8C00; flex-shrink: 0; margin-top: 4px; }
      `}</style>
    </div>
  );
}
