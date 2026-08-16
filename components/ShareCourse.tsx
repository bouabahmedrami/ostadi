"use client";
import { useState, useRef } from "react";
import { useLang } from "@/lib/lang-context";
import { trSubject, trLevel, trWilaya } from "@/lib/i18n/translate";
import {
  Share2, Copy, Check, X, MessageCircle,
  Loader2, ImageIcon,
} from "lucide-react";

/**
 * Logo Facebook.
 *
 * Les versions récentes de lucide-react ont retiré les icônes de
 * marques pour des raisons de licence. On le dessine donc à la main.
 */
function FacebookIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}

/**
 * Partage d'un cours.
 *
 * Un professeur qui veut promouvoir son cours n'a aujourd'hui qu'un
 * lien nu à copier. Une image reprenant titre, matière, prix et
 * professeur se partage mieux sur Facebook et WhatsApp — les deux
 * canaux où se joue l'acquisition en Algérie.
 *
 * L'image est dessinée sur un canvas plutôt que capturée : pas de
 * dépendance externe, et le rendu est identique partout.
 */
export default function ShareCourse({
  classe,
  teacherName,
}: {
  classe: any;
  teacherName: string;
}) {
  const { isRTL } = useLang();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const url = typeof window !== "undefined"
    ? `${window.location.origin}/classe/${classe.id}`
    : "";

  const shareText = isRTL
    ? `📚 ${classe.title}\n${trSubject(classe.subject, isRTL)} · ${trLevel(classe.level, isRTL)}\n💰 ${classe.price} دج\n👨‍🏫 ${teacherName}\n\n${url}`
    : `📚 ${classe.title}\n${trSubject(classe.subject, isRTL)} · ${trLevel(classe.level, isRTL)}\n💰 ${classe.price} DA\n👨‍🏫 ${teacherName}\n\n${url}`;

  function copyLink() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /** Partage natif — disponible sur mobile, plus fluide que les liens */
  async function nativeShare() {
    if (!navigator.share) return false;
    try {
      await navigator.share({
        title: classe.title,
        text: shareText,
        url,
      });
      return true;
    } catch {
      // L'utilisateur a annulé — comportement normal
      return true;
    }
  }

  /**
   * Dessine la carte du cours sur un canvas.
   *
   * 1080×1080 : format carré, adapté au feed Instagram et Facebook.
   */
  async function generateImage() {
    setGenerating(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const W = 1080, H = 1080;
      canvas.width = W;
      canvas.height = H;

      // Fond
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#1a0d38");
      bg.addColorStop(0.55, "#0A0014");
      bg.addColorStop(1, "#2a1050");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Halos
      const halo = (x: number, y: number, r: number, color: string) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      };
      halo(W * 0.8, 140, 420, "rgba(255,140,0,0.22)");
      halo(120, H - 160, 400, "rgba(124,58,237,0.28)");

      // Grille
      ctx.strokeStyle = "rgba(168,85,247,0.05)";
      ctx.lineWidth = 1;
      for (let i = 0; i < W; i += 60) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke();
      }

      const PAD = 90;
      let y = 130;

      // Marque
      ctx.textAlign = "left";
      ctx.font = "900 42px Inter, system-ui, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("Ostadi", PAD, y);
      const w1 = ctx.measureText("Ostadi").width;
      ctx.font = "900 34px 'Noto Sans Arabic', sans-serif";
      ctx.fillStyle = "#FF8C00";
      ctx.fillText("أستاذي", PAD + w1 + 16, y);

      y += 90;

      // Étiquettes matière / niveau
      const pill = (text: string, x: number, yy: number, bgc: string, fg: string) => {
        ctx.font = "700 26px Inter, system-ui, sans-serif";
        const tw = ctx.measureText(text).width;
        const pw = tw + 44, ph = 52;
        ctx.fillStyle = bgc;
        ctx.beginPath();
        (ctx as any).roundRect(x, yy - ph + 14, pw, ph, 26);
        ctx.fill();
        ctx.fillStyle = fg;
        ctx.fillText(text, x + 22, yy);
        return pw + 14;
      };

      let px = PAD;
      px += pill(trSubject(classe.subject, false), px, y, "rgba(124,58,237,0.28)", "#d8b4fe");
      pill(trLevel(classe.level, false), px, y, "rgba(59,130,246,0.22)", "#93c5fd");

      y += 100;

      // Titre — retour à la ligne automatique
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 62px Inter, system-ui, sans-serif";
      const words = String(classe.title).split(" ");
      let line = "";
      const maxW = W - PAD * 2;
      let lines = 0;
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxW && line) {
          ctx.fillText(line, PAD, y);
          y += 76;
          line = word;
          lines++;
          if (lines >= 2) break;
        } else {
          line = test;
        }
      }
      if (lines < 3) ctx.fillText(line, PAD, y);

      y += 90;

      // Professeur
      ctx.fillStyle = "rgba(196,181,253,0.75)";
      ctx.font = "600 32px Inter, system-ui, sans-serif";
      ctx.fillText(`👨‍🏫  ${teacherName}`, PAD, y);
      y += 56;
      ctx.fillStyle = "rgba(139,123,184,0.9)";
      ctx.font = "500 28px Inter, system-ui, sans-serif";
      ctx.fillText(`📍  ${trWilaya(classe.wilaya, false)}`, PAD, y);

      // Prix — bloc en bas
      const boxY = H - 300;
      ctx.fillStyle = "rgba(255,140,0,0.12)";
      ctx.beginPath();
      (ctx as any).roundRect(PAD, boxY, W - PAD * 2, 120, 24);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,140,0,0.4)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#FF8C00";
      ctx.font = "900 56px Inter, system-ui, sans-serif";
      ctx.fillText(`${Number(classe.price).toLocaleString("fr-DZ")} DA`, PAD + 34, boxY + 78);

      ctx.fillStyle = "rgba(196,181,253,0.7)";
      ctx.font = "600 26px Inter, system-ui, sans-serif";
      const priceLabel = classe.priceType === "monthly" ? "/ mois" : "/ séance";
      const pw2 = ctx.measureText(`${Number(classe.price).toLocaleString("fr-DZ")} DA`).width;
      ctx.font = "900 56px Inter, system-ui, sans-serif";
      const realW = ctx.measureText(`${Number(classe.price).toLocaleString("fr-DZ")} DA`).width;
      ctx.font = "600 26px Inter, system-ui, sans-serif";
      ctx.fillText(priceLabel, PAD + 34 + realW + 16, boxY + 78);

      // Pied
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(139,123,184,0.65)";
      ctx.font = "600 26px Inter, system-ui, sans-serif";
      ctx.fillText("Inscrivez-vous sur Ostadi", W / 2, H - 110);

      // Téléchargement
      canvas.toBlob(blob => {
        if (!blob) return;
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `ostadi-${String(classe.title).slice(0, 24).replace(/\s+/g, "-")}.png`;
        link.click();
        URL.revokeObjectURL(link.href);
      }, "image/png");
    } catch (err) {
      console.error("Génération de l'image échouée :", err);
    } finally {
      setGenerating(false);
    }
  }

  async function handleOpen() {
    // Sur mobile, le partage natif est plus direct — on l'essaie d'abord
    const shared = await nativeShare();
    if (!shared) setOpen(true);
  }

  return (
    <>
      <button
        onClick={handleOpen}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          background: "rgba(59,130,246,0.14)", color: "#93c5fd",
          border: "1px solid rgba(59,130,246,0.3)",
          fontSize: 13, fontWeight: 700, padding: "9px 16px",
          borderRadius: 11, cursor: "pointer", fontFamily: "inherit",
        }}
      >
        <Share2 size={15} />
        {isRTL ? "مشاركة" : "Partager"}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          dir={isRTL ? "rtl" : "ltr"}
          style={{
            position: "fixed", inset: 0, zIndex: 250,
            background: "rgba(0,0,0,0.76)", backdropFilter: "blur(5px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: "linear-gradient(160deg, #1a0d38, #0d0520)",
            border: "1px solid rgba(124,58,237,0.35)",
            borderRadius: 20, padding: 24, width: "100%", maxWidth: 420,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 18,
            }}>
              <h3 style={{ color: "white", fontWeight: 800, fontSize: 16.5, margin: 0 }}>
                {isRTL ? "شارك هذا الدرس" : "Partager ce cours"}
              </h3>
              <button onClick={() => setOpen(false)} style={{
                width: 32, height: 32, borderRadius: 10,
                background: "rgba(124,58,237,0.18)", border: "none", color: "#a78bfa",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ color: "#6d28d9", fontSize: 11.5, margin: "0 0 16px", lineHeight: 1.55 }}>
              {isRTL
                ? "الصورة تجذب انتباهاً أكثر من رابط بسيط على فيسبوك وواتساب."
                : "Une image attire davantage qu'un lien nu sur Facebook et WhatsApp."}
            </p>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <button onClick={generateImage} disabled={generating} style={mainBtn}>
                {generating
                  ? <Loader2 size={16} style={{ animation: "sp 0.8s linear infinite" }} />
                  : <ImageIcon size={16} />}
                {isRTL ? "تحميل صورة الدرس" : "Télécharger l'image du cours"}
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...actionBtn("rgba(34,197,94,0.13)", "#4ade80", "rgba(34,197,94,0.28)"), textDecoration: "none" }}
              >
                <MessageCircle size={15} /> WhatsApp
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...actionBtn("rgba(59,130,246,0.13)", "#93c5fd", "rgba(59,130,246,0.28)"), textDecoration: "none" }}
              >
                <FacebookIcon size={15} /> Facebook
              </a>

              <button
                onClick={copyLink}
                style={actionBtn(
                  copied ? "rgba(34,197,94,0.13)" : "rgba(124,58,237,0.12)",
                  copied ? "#4ade80" : "#c4b5fd",
                  copied ? "rgba(34,197,94,0.28)" : "rgba(124,58,237,0.28)"
                )}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied
                  ? (isRTL ? "تم النسخ" : "Lien copié")
                  : (isRTL ? "نسخ الرابط" : "Copier le lien")}
              </button>
            </div>

            <canvas ref={canvasRef} style={{ display: "none" }} />
            <style>{`@keyframes sp { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      )}
    </>
  );
}

const mainBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
  background: "linear-gradient(135deg, #FF8C00, #FF6B00)",
  color: "white", fontWeight: 800, padding: 13,
  borderRadius: 12, border: "none", cursor: "pointer",
  fontSize: 13.5, fontFamily: "inherit",
};

function actionBtn(bg: string, color: string, border: string): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
    background: bg, color, border: `1px solid ${border}`,
    fontWeight: 700, padding: 12, borderRadius: 12,
    cursor: "pointer", fontSize: 13, fontFamily: "inherit",
  };
}
