"use client";

interface JitsiRoomProps {
  roomName: string;
  displayName: string;
}

export default function JitsiRoom({ roomName, displayName }: JitsiRoomProps) {
  const jitsiUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="${encodeURIComponent(displayName)}"&config.startWithVideoMuted=false&config.startWithAudioMuted=false`;

  return (
    <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(88,28,135,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#110225', borderBottom: '1px solid rgba(88,28,135,0.3)' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
        <span style={{ color: '#a78bfa', fontSize: '13px', fontWeight: 600 }}>Cours en direct</span>
      </div>
      <iframe
        src={jitsiUrl}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        style={{ width: '100%', height: '520px', border: 'none', display: 'block' }}
        title="Ostadi Live"
      />
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  );
}