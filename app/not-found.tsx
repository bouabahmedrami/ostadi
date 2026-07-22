"use client";
import Link from "next/link";
import { Home, Search, BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <div className="ostadi-404-page">
      <div className="ostadi-404-orb ostadi-404-orb-1" />
      <div className="ostadi-404-orb ostadi-404-orb-2" />

      <div className="ostadi-404-content">
        <div className="ostadi-404-icon-wrap">
          <BookOpen size={40} />
        </div>

        <h1 className="ostadi-404-number">4<span className="ostadi-404-zero">0</span>4</h1>

        <h2 className="ostadi-404-title">Page introuvable</h2>
        <p className="ostadi-404-subtitle">
          Cette page n'existe pas ou a été déplacée.<br />
          Retournez à l'accueil pour trouver votre cours.
        </p>

        <div className="ostadi-404-actions">
          <Link href="/" className="ostadi-404-btn-primary">
            <Home size={16} /> Retour à l'accueil
          </Link>
          <Link href="/recherche" className="ostadi-404-btn-secondary">
            <Search size={16} /> Rechercher un cours
          </Link>
        </div>
      </div>

      <style jsx global>{`
        .ostadi-404-page {
          background: #0A0014; min-height: 100vh; position: relative; overflow: hidden;
          display: flex; align-items: center; justify-content: center; padding: 20px;
          background-image: linear-gradient(rgba(168,85,247,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.025) 1px, transparent 1px);
          background-size: 44px 44px;
        }
        .ostadi-404-orb { position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none; }
        .ostadi-404-orb-1 { top: -100px; left: -60px; width: 320px; height: 320px; background: rgba(124,58,237,0.15); animation: float404 8s ease-in-out infinite; }
        .ostadi-404-orb-2 { bottom: -100px; right: -60px; width: 280px; height: 280px; background: rgba(255,140,0,0.1); animation: float404 10s ease-in-out infinite reverse; }
        @keyframes float404 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(20px,-20px); } }

        .ostadi-404-content { position: relative; text-align: center; max-width: 420px; }

        .ostadi-404-icon-wrap {
          width: 76px; height: 76px; border-radius: 22px; margin: 0 auto 24px;
          background: linear-gradient(135deg, rgba(255,140,0,0.2), rgba(124,58,237,0.15));
          border: 1px solid rgba(255,140,0,0.3);
          display: flex; align-items: center; justify-content: center; color: #FF8C00;
          animation: bounce404 2s ease-in-out infinite;
        }
        @keyframes bounce404 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

        .ostadi-404-number {
          font-size: 84px; font-weight: 900; margin: 0; line-height: 1;
          background: linear-gradient(135deg, #FF8C00, #7C3AED);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          letter-spacing: -4px;
        }
        .ostadi-404-zero { color: white; -webkit-text-fill-color: white; }

        .ostadi-404-title { color: white; font-weight: 800; font-size: 22px; margin: 12px 0 8px; }
        .ostadi-404-subtitle { color: #a78bfa; font-size: 14px; line-height: 1.6; margin-bottom: 32px; }

        .ostadi-404-actions { display: flex; flex-direction: column; gap: 10px; align-items: center; }
        .ostadi-404-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white; font-weight: 800;
          padding: 13px 28px; border-radius: 14px; text-decoration: none; font-size: 14px;
          box-shadow: 0 8px 24px rgba(255,140,0,0.3); transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
          width: 100%; justify-content: center; box-sizing: border-box;
        }
        .ostadi-404-btn-primary:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 12px 30px rgba(255,140,0,0.4); }
        .ostadi-404-btn-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(124,58,237,0.1); color: #c4b5fd; border: 1px solid rgba(124,58,237,0.25);
          font-weight: 700; padding: 13px 28px; border-radius: 14px; text-decoration: none; font-size: 14px;
          transition: all 0.2s ease; width: 100%; justify-content: center; box-sizing: border-box;
        }
        .ostadi-404-btn-secondary:hover { background: rgba(124,58,237,0.2); }
      `}</style>
    </div>
  );
}
