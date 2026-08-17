"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import {
  joinWaitlist, leaveWaitlist, getMyWaitlistEntry, WaitlistEntry,
} from "@/lib/firestore";
import {
  Users, Bell, BellOff, Check, Loader2, AlertCircle, Hourglass,
} from "lucide-react";

/**
 * Liste d'attente pour un cours complet.
 *
 * Sans elle, un élève qui trouve un cours plein repart et ne revient
 * jamais. Avec, il reste dans la boucle — et le professeur voit qu'il
 * existe une demande latente, ce qui l'aide à décider de reconduire
 * son cours ou d'augmenter sa capacité.
 */
export default function WaitlistButton({
  classe,
}: {
  classe: any;
}) {
  const { user, profile } = useAuth();
  const { isRTL } = useLang();

  const [entry, setEntry] = useState<WaitlistEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !classe?.id) { setLoading(false); return; }
    getMyWaitlistEntry(classe.id, user.uid)
      .then(setEntry)
      .catch(err => console.warn("Liste d'attente indisponible :", err))
      .finally(() => setLoading(false));
  }, [user, classe?.id]);

  async function handleJoin() {
    if (!user || !profile) return;
    setBusy(true);
    setError(null);
    try {
      await joinWaitlist({
        classeId: classe.id,
        classeTitle: classe.title,
        teacherId: classe.teacherId,
        studentId: user.uid,
        studentName: profile.displayName,
        studentPhone: profile.phone || "",
      });
      const e = await getMyWaitlistEntry(classe.id, user.uid);
      setEntry(e);
    } catch (err) {
      console.error("Inscription en attente échouée :", err);
      setError(isRTL ? "فشلت العملية. حاول مرة أخرى." : "Échec. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await leaveWaitlist(classe.id, user.uid);
      setEntry(null);
    } catch (err) {
      console.error("Retrait échoué :", err);
      setError(isRTL ? "فشلت العملية." : "Échec de l'opération.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  /* ── Déjà inscrit sur la liste ── */
  if (entry) {
    return (
      <div style={{
        background: "linear-gradient(135deg, rgba(251,191,36,0.07), rgba(124,58,237,0.05))",
        border: "1px solid rgba(251,191,36,0.3)",
        borderRadius: 18, padding: "28px 24px", textAlign: "center",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
          background: "rgba(251,191,36,0.15)", color: "#fbbf24",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Hourglass size={26} />
        </div>

        <p style={{ color: "#fbbf24", fontWeight: 700, fontSize: 16, margin: "0 0 8px" }}>
          {isRTL ? "أنت على قائمة الانتظار" : "Vous êtes sur la liste d'attente"}
        </p>

        {entry.position && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.28)",
            borderRadius: 999, padding: "7px 16px", marginBottom: 14,
          }}>
            <Users size={13} style={{ color: "#fbbf24" }} />
            <span style={{ color: "#fde68a", fontSize: 13, fontWeight: 700 }}>
              {isRTL
                ? `المركز ${entry.position}`
                : `Position ${entry.position}`}
            </span>
          </div>
        )}

        <p style={{
          color: "#a78bfa", fontSize: 13, maxWidth: 380,
          margin: "0 auto 20px", lineHeight: 1.65,
        }}>
          {isRTL
            ? "سنُعلمك فوراً عند تحرّر مقعد. ستحتاج بعدها إلى إرسال طلب التسجيل."
            : "Nous vous préviendrons dès qu'une place se libère. Vous devrez ensuite envoyer votre demande d'inscription."}
        </p>

        <button
          onClick={handleLeave}
          disabled={busy}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: "transparent", color: "#8b7bb8",
            border: "1px solid rgba(124,58,237,0.28)",
            fontSize: 12.5, fontWeight: 600, padding: "10px 18px",
            borderRadius: 11, cursor: busy ? "not-allowed" : "pointer",
            fontFamily: "inherit", opacity: busy ? 0.6 : 1,
          }}
        >
          {busy
            ? <Loader2 size={13} style={{ animation: "wlspin 0.8s linear infinite" }} />
            : <BellOff size={13} />}
          {isRTL ? "إلغاء التنبيه" : "Quitter la liste"}
        </button>

        {error && (
          <p style={{ color: "#fca5a5", fontSize: 12, marginTop: 12 }}>{error}</p>
        )}

        <style>{`@keyframes wlspin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ── Cours complet, pas encore inscrit ── */
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(59,130,246,0.06), rgba(124,58,237,0.04))",
      border: "1px solid rgba(59,130,246,0.28)",
      borderRadius: 18, padding: "30px 24px", textAlign: "center",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
        background: "rgba(59,130,246,0.14)", color: "#60a5fa",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Users size={26} />
      </div>

      <p style={{ color: "#93c5fd", fontWeight: 700, fontSize: 16, margin: "0 0 8px" }}>
        {isRTL ? "الدرس مكتمل" : "Ce cours est complet"}
      </p>

      <p style={{
        color: "#8b7bb8", fontSize: 13.5, maxWidth: 400,
        margin: "0 auto 22px", lineHeight: 1.65,
      }}>
        {isRTL
          ? `المقاعد الـ${classe.maxStudents} محجوزة كلها. سجّل نفسك لتُعلَم أول من يتحرّر مقعد.`
          : `Les ${classe.maxStudents} places sont prises. Inscrivez-vous pour être prévenu dès qu'une se libère.`}
      </p>

      {user ? (
        <button
          onClick={handleJoin}
          disabled={busy}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
            background: "linear-gradient(135deg, #3B82F6, #2563EB)",
            color: "white", fontWeight: 800, padding: "14px 26px",
            borderRadius: 13, border: "none",
            cursor: busy ? "not-allowed" : "pointer",
            fontSize: 14, fontFamily: "inherit",
            boxShadow: "0 6px 20px rgba(59,130,246,0.26)",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy
            ? <><Loader2 size={16} style={{ animation: "wlspin 0.8s linear infinite" }} /> {isRTL ? "جارٍ..." : "Inscription..."}</>
            : <><Bell size={16} /> {isRTL ? "أعلمني عند توفّر مقعد" : "Me prévenir dès qu'une place se libère"}</>}
        </button>
      ) : (
        <a
          href="/auth"
          style={{
            display: "inline-flex", alignItems: "center", gap: 9,
            background: "linear-gradient(135deg, #3B82F6, #2563EB)",
            color: "white", fontWeight: 800, padding: "14px 26px",
            borderRadius: 13, textDecoration: "none", fontSize: 14,
          }}
        >
          <Bell size={16} />
          {isRTL ? "سجّل الدخول للانضمام" : "Connectez-vous pour vous inscrire"}
        </a>
      )}

      {error && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          marginTop: 14,
        }}>
          <AlertCircle size={13} style={{ color: "#f87171" }} />
          <span style={{ color: "#fca5a5", fontSize: 12 }}>{error}</span>
        </div>
      )}

      <style>{`@keyframes wlspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
