"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { followTeacher, unfollowTeacher, isFollowing } from "@/lib/firestore";
import { useToast } from "./Toast";
import { haptic } from "@/lib/haptics";
import { UserPlus, UserCheck, Users, Loader2 } from "lucide-react";

/**
 * Bouton de suivi.
 *
 * L'état bascule immédiatement, le réseau suit. Sur une connexion
 * algérienne, attendre la confirmation du serveur pendant une seconde
 * donne l'impression que le bouton n'a pas répondu — et l'utilisateur
 * appuie une deuxième fois, ce qui annule son propre geste.
 */
export default function FollowButton({
  teacherId,
  teacherName,
  followerCount = 0,
  compact = false,
}: {
  teacherId: string;
  teacherName: string;
  followerCount?: number;
  compact?: boolean;
}) {
  const { user, profile } = useAuth();
  const { isRTL } = useLang();
  const toast = useToast();

  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(followerCount);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setCount(followerCount); }, [followerCount]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    isFollowing(user.uid, teacherId)
      .then(setFollowing)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, teacherId]);

  async function toggle() {
    if (!user || !profile || busy) return;

    const next = !following;

    // L'écran change d'abord
    setFollowing(next);
    setCount(c => Math.max(c + (next ? 1 : -1), 0));
    setBusy(true);
    haptic(next ? "success" : "tap");

    try {
      if (next) {
        await followTeacher({
          studentId: user.uid,
          studentName: profile.displayName,
          teacherId,
        });
      } else {
        await unfollowTeacher(user.uid, teacherId);
      }
    } catch (err) {
      // Retour en arrière : mieux vaut un bouton qui revient à son
      // état d'origine qu'un utilisateur croyant suivre quelqu'un
      // sans que ce soit enregistré
      console.error("Suivi échoué :", err);
      setFollowing(!next);
      setCount(c => Math.max(c + (next ? -1 : 1), 0));
      toast.error(isRTL ? "فشلت العملية" : "L'action n'a pas abouti");
    } finally {
      setBusy(false);
    }
  }

  // Un professeur ne se suit pas lui-même, et ne suit pas ses confrères
  const canFollow = user && profile?.role === "student" && user.uid !== teacherId;

  if (loading) return null;

  /* ── Version compacte : le compteur seul ── */
  if (compact || !canFollow) {
    if (count === 0) return null;
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        color: "#a78bfa", fontSize: 12.5, fontWeight: 600,
      }}>
        <Users size={13} style={{ color: "#7c3aed" }} />
        {count} {isRTL ? "متابع" : count > 1 ? "abonnés" : "abonné"}
      </span>
    );
  }

  /* ── Bouton complet ── */
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
      <button
        onClick={toggle}
        disabled={busy}
        className={following ? "os-btn-ghost" : "os-btn-chalk"}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "9px 17px", fontSize: 13, fontWeight: 700,
          ...(following ? {
            background: "rgba(34,197,94,0.11)",
            borderColor: "rgba(34,197,94,0.3)",
            color: "#4ade80",
          } : {}),
        }}
      >
        {busy
          ? <Loader2 size={14} style={{ animation: "fbspin 0.8s linear infinite" }} />
          : following ? <UserCheck size={14} /> : <UserPlus size={14} />}
        {following
          ? (isRTL ? "متابَع" : "Abonné")
          : (isRTL ? "متابعة" : "Suivre")}
      </button>

      {count > 0 && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          color: "#a78bfa", fontSize: 12.5, fontWeight: 600,
        }}>
          <Users size={13} style={{ color: "#7c3aed" }} />
          {count}
        </span>
      )}

      <style>{`@keyframes fbspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
