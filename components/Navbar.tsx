"use client";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { LogOut, LayoutDashboard, GraduationCap, Menu, X, MessageCircle, Video } from "lucide-react";
import { useState, useEffect } from "react";
import LangSwitcher from "./LangSwitcher";
import NotificationBell from "./NotificationBell";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

function useTotalUnread(userId?: string) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, "messages"), where("read", "==", false));
    const unsub = onSnapshot(q, (snap) => {
      setCount(snap.docs.filter(d => d.data().senderId !== userId).length);
    });
    return () => unsub();
  }, [userId]);
  return count;
}

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const { t, isRTL } = useLang();
  const [open, setOpen] = useState(false);
  const unread = useTotalUnread(user?.uid);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const navLinks = [
    ...(user && profile?.role === "teacher" ? [{ href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard }] : []),
    ...(user && profile?.role === "student" ? [{ href: "/mes-cours", label: t.nav.myCourses, icon: GraduationCap }] : []),
    ...(user ? [{ href: "/chat", label: isRTL ? "المحادثات" : "Messages", icon: MessageCircle, badge: unread }] : []),
    ...(user ? [{ href: "/enregistrements", label: isRTL ? "التسجيلات" : "Vidéos", icon: Video }] : []),
  ];

  return (
    <>
      <nav className="ostadi-nav">
        <div className="ostadi-nav-inner">
          <Link href="/" className="ostadi-logo">
            <div className="ostadi-logo-icon">🎓</div>
            <span className="ostadi-logo-text">
              Ostadi<span className="ostadi-logo-accent"> أستاذي</span>
            </span>
          </Link>

          <div className="ostadi-nav-desktop">
            <Link href="/" className="ostadi-nav-link">{t.nav.home}</Link>
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} className="ostadi-nav-link ostadi-nav-link-icon">
                <link.icon size={15} />
                {link.label}
                {link.badge ? <span className="ostadi-badge-count">{link.badge > 9 ? '9+' : link.badge}</span> : null}
              </Link>
            ))}
            {user && (profile as any)?.role === "admin" && (
              <Link href="/admin" className="ostadi-nav-link ostadi-admin-link">⚙️ Admin</Link>
            )}

            {user && <NotificationBell userId={user.uid} />}
            <LangSwitcher />

            {user ? (
              <div className="ostadi-user-block">
                <Link href="/profile" className="ostadi-user-name" style={{ textDecoration: 'none' }}>
                  {profile?.displayName}
                </Link>
                <button onClick={logout} className="ostadi-logout-btn">
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '8px' }}>
                <Link href="/auth" className="ostadi-btn-ghost">{t.nav.login}</Link>
                <Link href="/auth?mode=register" className="ostadi-btn-cta">{t.nav.register}</Link>
              </div>
            )}
          </div>

          <div className="ostadi-nav-mobile-controls">
            {user && <NotificationBell userId={user.uid} />}
            <LangSwitcher />
            <button className="ostadi-burger" onClick={() => setOpen(!open)} aria-label="Menu">
              <div className={`ostadi-burger-line ${open ? 'ostadi-burger-line-1-open' : ''}`} />
              <div className={`ostadi-burger-line ${open ? 'ostadi-burger-line-2-open' : ''}`} />
              <div className={`ostadi-burger-line ${open ? 'ostadi-burger-line-3-open' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      <div className={`ostadi-mobile-overlay ${open ? 'ostadi-mobile-overlay-open' : ''}`} onClick={() => setOpen(false)} />

      <div className={`ostadi-mobile-drawer ${open ? 'ostadi-mobile-drawer-open' : ''} ${isRTL ? 'ostadi-mobile-drawer-rtl' : ''}`}>
        <div className="ostadi-mobile-drawer-header">
          <span className="ostadi-logo-text" style={{ fontSize: '18px' }}>Ostadi</span>
          <button onClick={() => setOpen(false)} className="ostadi-drawer-close">
            <X size={18} />
          </button>
        </div>

        <div className="ostadi-mobile-links">
          <Link href="/" className="ostadi-mobile-link" onClick={() => setOpen(false)}>
            <span>🏠</span> {t.nav.home}
          </Link>
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} className="ostadi-mobile-link" onClick={() => setOpen(false)}>
              <link.icon size={17} style={{ color: '#FF8C00' }} />
              {link.label}
              {link.badge ? <span className="ostadi-badge-count" style={{ marginLeft: 'auto' }}>{link.badge}</span> : null}
            </Link>
          ))}
        </div>

        <div className="ostadi-mobile-bottom">
          {user ? (
            <>
              <Link href="/profile" className="ostadi-mobile-user" style={{ textDecoration: 'none' }} onClick={() => setOpen(false)}>
                <div className="ostadi-mobile-avatar">{profile?.displayName?.charAt(0).toUpperCase()}</div>
                <span>{profile?.displayName}</span>
              </Link>
              <button onClick={() => { logout(); setOpen(false); }} className="ostadi-mobile-logout">
                <LogOut size={16} /> {t.nav.logout}
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link href="/auth" className="ostadi-btn-ghost" style={{ textAlign: 'center' }} onClick={() => setOpen(false)}>
                {t.nav.login}
              </Link>
              <Link href="/auth?mode=register" className="ostadi-btn-cta" style={{ textAlign: 'center' }} onClick={() => setOpen(false)}>
                {t.nav.register}
              </Link>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .ostadi-nav {
          background: rgba(10,0,20,0.85);
          backdrop-filter: blur(20px) saturate(180%);
          border-bottom: 1px solid rgba(124,58,237,0.15);
          position: sticky; top: 0; z-index: 100;
        }
        .ostadi-nav-inner {
          max-width: 1152px; margin: 0 auto; padding: 0 16px;
          height: 64px; display: flex; align-items: center; justify-content: space-between;
        }
        .ostadi-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; }
        .ostadi-logo-icon {
          width: 34px; height: 34px; border-radius: 10px;
          background: linear-gradient(135deg, rgba(255,140,0,0.25), rgba(124,58,237,0.2));
          border: 1px solid rgba(255,140,0,0.3);
          display: flex; align-items: center; justify-content: center; font-size: 16px;
        }
        .ostadi-logo-text { font-weight: 900; font-size: 19px; color: white; letter-spacing: -0.5px; }
        .ostadi-logo-accent { color: #FF8C00; font-size: 15px; }

        .ostadi-nav-desktop { display: none; align-items: center; gap: 6px; }
        @media (min-width: 768px) { .ostadi-nav-desktop { display: flex; } .ostadi-nav-mobile-controls { display: none !important; } }

        .ostadi-nav-link {
          color: rgba(196,181,253,0.75); text-decoration: none; font-size: 13.5px; font-weight: 600;
          padding: 8px 12px; border-radius: 10px; transition: all 0.2s ease; position: relative;
        }
        .ostadi-nav-link:hover { color: white; background: rgba(124,58,237,0.12); }
        .ostadi-nav-link-icon { display: flex; align-items: center; gap: 6px; }
        .ostadi-admin-link { color: #FF8C00; font-weight: 700; }

        .ostadi-badge-count {
          background: #FF8C00; color: white; font-size: 10px; font-weight: 800;
          width: 17px; height: 17px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }

        .ostadi-user-block { display: flex; align-items: center; gap: 10px; margin-inline-start: 6px; }
        .ostadi-user-name { color: #d8b4fe; font-size: 13px; font-weight: 600; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ostadi-user-name:hover { color: #FF8C00; }
        .ostadi-logout-btn {
          background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2);
          width: 32px; height: 32px; border-radius: 9px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;
        }
        .ostadi-logout-btn:hover { background: rgba(239,68,68,0.2); transform: scale(1.05); }

        .ostadi-btn-ghost {
          color: #c4b5fd; text-decoration: none; font-size: 13.5px; font-weight: 700;
          padding: 9px 16px; border-radius: 10px; transition: all 0.2s ease;
        }
        .ostadi-btn-ghost:hover { background: rgba(124,58,237,0.12); color: white; }
        .ostadi-btn-cta {
          background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white; text-decoration: none;
          font-size: 13.5px; font-weight: 700; padding: 9px 18px; border-radius: 10px;
          box-shadow: 0 4px 14px rgba(255,140,0,0.3); transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        .ostadi-btn-cta:hover { transform: translateY(-1px) scale(1.02); box-shadow: 0 6px 18px rgba(255,140,0,0.4); }

        .ostadi-nav-mobile-controls { display: flex; align-items: center; gap: 10px; }
        .ostadi-burger {
          background: none; border: none; cursor: pointer; padding: 8px;
          display: flex; flex-direction: column; gap: 4px; width: 34px; height: 34px;
          align-items: center; justify-content: center;
        }
        .ostadi-burger-line { width: 18px; height: 2px; background: white; border-radius: 2px; transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
        .ostadi-burger-line-1-open { transform: translateY(6px) rotate(45deg); }
        .ostadi-burger-line-2-open { opacity: 0; }
        .ostadi-burger-line-3-open { transform: translateY(-6px) rotate(-45deg); }

        .ostadi-mobile-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
          z-index: 101; opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
        }
        .ostadi-mobile-overlay-open { opacity: 1; pointer-events: all; }

        .ostadi-mobile-drawer {
          position: fixed; top: 0; right: 0; bottom: 0; width: 82%; max-width: 340px;
          background: linear-gradient(160deg, #150a2e, #0a0014);
          border-left: 1px solid rgba(124,58,237,0.2);
          z-index: 102; transform: translateX(100%);
          transition: transform 0.35s cubic-bezier(0.32,0.72,0,1);
          display: flex; flex-direction: column; padding: 20px;
        }
        .ostadi-mobile-drawer-rtl { right: auto; left: 0; border-left: none; border-right: 1px solid rgba(124,58,237,0.2); transform: translateX(-100%); }
        .ostadi-mobile-drawer-open { transform: translateX(0); }
        .ostadi-mobile-drawer-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid rgba(124,58,237,0.15); }
        .ostadi-drawer-close { background: rgba(124,58,237,0.15); border: none; color: #c4b5fd; width: 32px; height: 32px; border-radius: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center; }

        .ostadi-mobile-links { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .ostadi-mobile-link {
          display: flex; align-items: center; gap: 12px; color: white; text-decoration: none;
          font-size: 14.5px; font-weight: 600; padding: 13px 14px; border-radius: 12px;
          transition: all 0.2s ease;
        }
        .ostadi-mobile-link:hover, .ostadi-mobile-link:active { background: rgba(124,58,237,0.15); }

        .ostadi-mobile-bottom { padding-top: 16px; border-top: 1px solid rgba(124,58,237,0.15); }
        .ostadi-mobile-user { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding: 10px; border-radius: 12px; transition: background 0.2s ease; }
        .ostadi-mobile-user:hover { background: rgba(124,58,237,0.1); }
        .ostadi-mobile-avatar {
          width: 38px; height: 38px; border-radius: 12px;
          background: linear-gradient(135deg, rgba(124,58,237,0.4), rgba(124,58,237,0.15));
          display: flex; align-items: center; justify-content: center; color: white; font-weight: 800;
        }
        .ostadi-mobile-user span { color: white; font-weight: 700; font-size: 14px; }
        .ostadi-mobile-logout {
          display: flex; align-items: center; gap: 8px; width: 100%; background: rgba(239,68,68,0.1);
          color: #f87171; border: 1px solid rgba(239,68,68,0.2); padding: 12px; border-radius: 12px;
          font-weight: 700; font-size: 13.5px; cursor: pointer;
        }
      `}</style>
    </>
  );
}
