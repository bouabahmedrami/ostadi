"use client";
import { useState, useEffect, useCallback } from "react";
import { auth } from "@/lib/firebase";
import { useLang } from "@/lib/lang-context";
import {
  LiveKitRoom, VideoConference, RoomAudioRenderer,
  ControlBar, useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { AlertCircle, Video, Loader2, Lock } from "lucide-react";

interface Props {
  classeId: string;
  isTeacher?: boolean;
  /** @deprecated conservé pour compatibilité — le serveur détermine le nom */
  displayName?: string;
  /** @deprecated le serveur détermine la salle depuis classeId */
  roomName?: string;
}

export default function LiveKitVideoRoom({ classeId, isTeacher }: Props) {
  const { isRTL } = useLang();
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        setError(isRTL ? "يجب تسجيل الدخول أولاً" : "Vous devez être connecté");
        return;
      }

      // ⚠️ Le jeton Firebase prouve l'identité au serveur
      const idToken = await user.getIdToken();

      const res = await fetch("/api/livekit-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ classeId }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Messages adaptés selon la raison du refus
        const messages: Record<string, [string, string]> = {
          "unauthenticated": [
            "Session expirée. Reconnectez-vous.",
            "انتهت الجلسة. أعد تسجيل الدخول.",
          ],
          "not-enrolled": [
            "Vous n'êtes pas inscrit à ce cours.",
            "لست مسجلاً في هذا الدرس.",
          ],
          "classe-not-found": [
            "Ce cours n'existe plus.",
            "هذا الدرس لم يعد موجوداً.",
          ],
          "server-misconfigured": [
            "Service vidéo temporairement indisponible.",
            "خدمة الفيديو غير متاحة مؤقتاً.",
          ],
        };
        const pair = messages[data?.error];
        setError(pair
          ? (isRTL ? pair[1] : pair[0])
          : (data?.message || (isRTL ? "تعذّر الاتصال" : "Connexion impossible")));
        return;
      }

      setToken(data.token);
      setServerUrl(data.url);
      setConnected(true);
    } catch (err: any) {
      console.error("Erreur LiveKit :", err);
      setError(isRTL
        ? "خطأ في الاتصال. تحقق من شبكتك."
        : "Erreur de connexion. Vérifiez votre réseau.");
    } finally {
      setLoading(false);
    }
  }, [classeId, isRTL]);

  /* ── Écran avant connexion ────────────────────────────── */
  if (!connected) {
    return (
      <div className="lk-pre">
        <div className={`lk-pre-icon ${isTeacher ? "lk-pre-icon-teacher" : ""}`}>
          {error ? <Lock size={30} /> : <Video size={30} />}
        </div>

        <h3 className="lk-pre-title">
          {error
            ? (isRTL ? "الوصول غير متاح" : "Accès non disponible")
            : isTeacher
              ? (isRTL ? "ابدأ الدرس المباشر" : "Démarrer le cours en direct")
              : (isRTL ? "انضم إلى الدرس" : "Rejoindre le cours")}
        </h3>

        {error ? (
          <div className="lk-error">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        ) : (
          <p className="lk-pre-hint">
            {isRTL
              ? "تأكد من السماح بالوصول إلى الكاميرا والميكروفون"
              : "Autorisez l'accès à votre caméra et micro"}
          </p>
        )}

        <button
          onClick={fetchToken}
          disabled={loading}
          className={`lk-btn ${isTeacher ? "lk-btn-teacher" : ""}`}
        >
          {loading ? (
            <><Loader2 size={16} className="lk-spin" /> {isRTL ? "جارٍ الاتصال..." : "Connexion..."}</>
          ) : error ? (
            <>{isRTL ? "إعادة المحاولة" : "Réessayer"}</>
          ) : (
            <><Video size={16} /> {isTeacher
              ? (isRTL ? "بدء البث" : "Démarrer")
              : (isRTL ? "انضم الآن" : "Rejoindre")}</>
          )}
        </button>

        <style jsx>{`
          .lk-pre {
            display: flex; flex-direction: column; align-items: center;
            gap: 13px; padding: 38px 24px; text-align: center;
            background: linear-gradient(150deg, rgba(22,10,48,0.9), rgba(14,6,30,0.92));
            border: 1px solid rgba(124,58,237,0.2); border-radius: 18px;
          }
          .lk-pre-icon {
            width: 68px; height: 68px; border-radius: 22px;
            background: linear-gradient(140deg, rgba(124,58,237,0.24), rgba(124,58,237,0.1));
            border: 1px solid rgba(168,85,247,0.28);
            display: flex; align-items: center; justify-content: center;
            color: #a78bfa;
          }
          .lk-pre-icon-teacher {
            background: linear-gradient(140deg, rgba(255,140,0,0.22), rgba(255,140,0,0.08));
            border-color: rgba(255,140,0,0.3); color: #FF8C00;
          }
          .lk-pre-title { color: white; font-weight: 750; font-size: 16px; margin: 0; }
          .lk-pre-hint { color: #8b7bb8; font-size: 12.5px; margin: 0; max-width: 280px; line-height: 1.55; }
          .lk-error {
            display: flex; align-items: flex-start; gap: 8px;
            background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.28);
            border-radius: 11px; padding: 10px 13px; max-width: 320px;
          }
          .lk-error :global(svg) { color: #f87171; flex-shrink: 0; margin-top: 1px; }
          .lk-error span { color: #fca5a5; font-size: 12.5px; text-align: start; line-height: 1.5; }
          .lk-btn {
            display: inline-flex; align-items: center; justify-content: center; gap: 8px;
            background: linear-gradient(135deg, #7C3AED, #6D28D9); color: white;
            font-weight: 700; padding: 12px 26px; border-radius: 13px;
            border: none; cursor: pointer; font-size: 14px; font-family: inherit;
            box-shadow: 0 6px 20px rgba(124,58,237,0.3);
            transition: transform 0.24s cubic-bezier(0.34,1.4,0.64,1), filter 0.2s ease;
          }
          .lk-btn-teacher {
            background: linear-gradient(135deg, #FF8C00, #FF6B00);
            box-shadow: 0 6px 20px rgba(255,140,0,0.3);
          }
          .lk-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.08); }
          .lk-btn:disabled { opacity: 0.6; cursor: not-allowed; }
          .lk-spin { animation: lkspin 0.8s linear infinite; }
          @keyframes lkspin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  /* ── Salle connectée ──────────────────────────────────── */
  return (
    <div className="lk-room">
      <LiveKitRoom
        token={token!}
        serverUrl={serverUrl!}
        connect
        video
        audio
        onDisconnected={() => {
          setConnected(false);
          setToken(null);
        }}
        onError={(e) => {
          console.error("LiveKit :", e);
          setError(isRTL ? "انقطع الاتصال" : "Connexion interrompue");
          setConnected(false);
        }}
        data-lk-theme="default"
        style={{ height: "100%", borderRadius: "14px", overflow: "hidden" }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>

      <style jsx>{`
        .lk-room {
          height: 440px; border-radius: 14px; overflow: hidden;
          border: 1px solid rgba(124,58,237,0.25);
          background: #000;
        }
        @media (max-width: 640px) { .lk-room { height: 360px; } }
      `}</style>
    </div>
  );
}
