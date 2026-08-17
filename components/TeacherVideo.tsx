"use client";
import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import { Play, Video, X } from "lucide-react";

/**
 * Vidéo de présentation du professeur.
 *
 * Le champ `demoVideoURL` était collecté au moment de la vérification
 * mais n'était affiché nulle part. C'est pourtant le meilleur outil de
 * conversion : un parent qui voit et entend le professeur pendant une
 * minute décide beaucoup plus vite qu'en lisant une biographie.
 *
 * La vidéo ne se charge qu'au clic — sur une connexion 3G, précharger
 * un fichier de plusieurs mégaoctets ferait fuir le visiteur avant même
 * qu'il ait vu le profil.
 */
export default function TeacherVideo({
  url,
  teacherName,
}: {
  url?: string;
  teacherName: string;
}) {
  const { isRTL } = useLang();
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!url || failed) return null;

  const isYouTube = /youtube\.com|youtu\.be/.test(url);
  const youtubeId = isYouTube
    ? url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/)?.[1]
    : null;

  return (
    <div style={{
      background: "linear-gradient(145deg, rgba(20,8,45,0.9), rgba(15,5,30,0.9))",
      border: "1px solid rgba(255,140,0,0.28)",
      borderRadius: 18,
      overflow: "hidden",
      marginBottom: 18,
    }}>
      {/* ── En-tête ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 16px",
        borderBottom: playing ? "1px solid rgba(124,58,237,0.16)" : "none",
      }}>
        <span style={{
          width: 34, height: 34, borderRadius: 11, flexShrink: 0,
          background: "rgba(255,140,0,0.15)", color: "#FF8C00",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Video size={16} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>
            {isRTL ? "فيديو تعريفي" : "Vidéo de présentation"}
          </div>
          <div style={{ color: "#6d28d9", fontSize: 11.5, marginTop: 1 }}>
            {isRTL
              ? `تعرّف على ${teacherName} قبل التسجيل`
              : `Découvrez ${teacherName} avant de vous inscrire`}
          </div>
        </div>
        {playing && (
          <button
            onClick={() => setPlaying(false)}
            aria-label={isRTL ? "إغلاق" : "Fermer"}
            style={{
              width: 30, height: 30, borderRadius: 9, flexShrink: 0,
              background: "rgba(124,58,237,0.18)", border: "none", color: "#a78bfa",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Lecteur ── */}
      {playing ? (
        <div style={{
          position: "relative",
          width: "100%",
          paddingTop: "56.25%", // ratio 16:9
          background: "#000",
        }}>
          {youtubeId ? (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
              title={`Présentation ${teacherName}`}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%", border: "none",
              }}
            />
          ) : (
            <video
              src={url}
              controls
              autoPlay
              playsInline
              onError={() => setFailed(true)}
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%", objectFit: "contain",
              }}
            />
          )}
        </div>
      ) : (
        /* ── Miniature cliquable ── */
        <button
          onClick={() => setPlaying(true)}
          style={{
            width: "100%",
            border: "none",
            cursor: "pointer",
            padding: "28px 20px 32px",
            background: "linear-gradient(140deg, rgba(255,140,0,0.07), rgba(124,58,237,0.06))",
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 12,
            fontFamily: "inherit",
          }}
        >
          <span style={{
            width: 62, height: 62, borderRadius: "50%",
            background: "linear-gradient(135deg, #FF8C00, #FF6B00)",
            color: "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 26px rgba(255,140,0,0.32)",
          }}>
            <Play size={26} fill="white" style={{ marginInlineStart: 3 }} />
          </span>
          <span style={{ color: "#fdba74", fontSize: 13, fontWeight: 650 }}>
            {isRTL ? "شاهد الفيديو" : "Regarder la vidéo"}
          </span>
          <span style={{ color: "#5b21b6", fontSize: 10.5 }}>
            {isRTL
              ? "لن يُحمَّل الفيديو إلا عند الضغط"
              : "La vidéo ne se charge qu'au clic"}
          </span>
        </button>
      )}
    </div>
  );
}
