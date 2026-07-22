"use client";
import { useState, useEffect } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
} from "@livekit/components-react";
import "@livekit/components-styles";

interface LiveKitRoomProps {
  roomName: string;
  displayName: string;
  isTeacher?: boolean;
}

export default function LiveKitVideoRoom({ roomName, displayName, isTeacher = false }: LiveKitRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    fetchToken();
  }, [roomName, displayName]);

  async function fetchToken() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/livekit-token?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent(displayName)}`
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setToken(data.token);
      setWsUrl(data.url);
    } catch (e: any) {
      setError(e.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', background: '#0D0118', borderRadius: '16px', border: '1px solid rgba(88,28,135,0.4)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #FF8C00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ color: '#a78bfa', fontSize: '14px' }}>Connexion à la salle...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', background: 'rgba(127,29,29,0.2)', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.3)' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#fca5a5', fontSize: '14px', marginBottom: '12px' }}>❌ {error}</p>
        <button onClick={fetchToken} style={{ background: '#FF8C00', color: 'white', fontWeight: 700, padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}>
          Réessayer
        </button>
      </div>
    </div>
  );

  if (!token || !wsUrl) return null;

  if (!connected) return (
    <div style={{ background: '#110225', border: '1px solid rgba(88,28,135,0.4)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎥</div>
      <h3 style={{ color: 'white', fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>
        {isTeacher ? "Démarrer le cours en direct" : "Rejoindre le cours"}
      </h3>
      <p style={{ color: '#a78bfa', fontSize: '14px', marginBottom: '24px' }}>
        {isTeacher
          ? "Cliquez pour démarrer la session vidéo avec vos élèves"
          : "Le professeur est en direct — rejoignez maintenant !"}
      </p>
      <button
        onClick={() => setConnected(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: isTeacher ? '#FF8C00' : '#7C3AED',
          color: 'white', fontWeight: 700, padding: '14px 28px',
          borderRadius: '14px', border: 'none', cursor: 'pointer',
          fontSize: '15px',
          boxShadow: isTeacher ? '0 0 20px rgba(255,140,0,0.4)' : '0 0 20px rgba(124,58,237,0.4)'
        }}
      >
        {isTeacher ? "🔴 Démarrer maintenant" : "▶ Rejoindre le cours"}
      </button>
    </div>
  );

  return (
    <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(88,28,135,0.4)', height: '600px' }}>
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={wsUrl}
        style={{ height: '100%' }}
        onDisconnected={() => setConnected(false)}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
