"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import {
  subscribeToThreads, openPrivateThread,
  getContactableTeachers, getContactableStudents,
  PrivateThread,
} from "@/lib/firestore";
import { useToast } from "@/components/Toast";
import { haptic } from "@/lib/haptics";
import { MessageListSkeleton, EmptyState } from "@/components/Skeletons";
import Sheet from "@/components/Sheet";
import {
  MessageSquare, Plus, ArrowLeft, Search, Loader2, ArrowRight,
} from "lucide-react";
import Link from "next/link";

/**
 * Conversations privées.
 *
 * Distinctes du chat de cours, qui est collectif. Un élève qui n'a
 * pas compris un point, ou qui doit signaler une absence, ne veut pas
 * écrire devant vingt camarades.
 */
export default function MessagesPage() {
  const { user, profile, loading } = useAuth();
  const { isRTL } = useLang();
  const router = useRouter();
  const toast = useToast();

  const [threads, setThreads] = useState<PrivateThread[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [picker, setPicker] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [search, setSearch] = useState("");
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToThreads(
      user.uid,
      t => { setThreads(t); setLoadingData(false); },
      () => setLoadingData(false)
    );
    return () => unsub();
  }, [user]);

  async function openPicker() {
    haptic("tap");
    setPicker(true);
    setLoadingContacts(true);
    try {
      const list = profile?.role === "student"
        ? await getContactableTeachers(user!.uid)
        : await getContactableStudents(user!.uid);
      setContacts(list);
    } catch (err) {
      console.error("Chargement des contacts échoué :", err);
    } finally {
      setLoadingContacts(false);
    }
  }

  async function startThread(other: any) {
    if (!user || !profile) return;
    setOpening(other.uid);
    try {
      const id = await openPrivateThread({
        meId: user.uid,
        meName: profile.displayName,
        meRole: profile.role,
        otherId: other.uid,
        otherName: other.displayName || "—",
        otherRole: profile.role === "student" ? "teacher" : "student",
      });
      haptic("success");
      setPicker(false);
      router.push(`/messages/${id}`);
    } catch (err: any) {
      console.error("Ouverture de conversation échouée :", err);
      // Trois causes distinctes, trois messages : « impossible » sans
      // explication laissait l'utilisateur sans recours
      const msg =
        err?.message === "no-relation"
          ? (isRTL
              ? "يجب أن تكون مسجّلاً في أحد دروسه أوّلاً."
              : "Inscrivez-vous d'abord à l'un de ses cours.")
          : err?.message === "relation-check-failed"
          ? (isRTL
              ? "تعذّر التحقّق. حاول مرّة أخرى."
              : "Vérification impossible. Réessayez dans un instant.")
          : (isRTL ? "تعذّر فتح المحادثة." : "Impossible d'ouvrir la conversation.");

      toast.error(msg);
    } finally {
      setOpening(null);
    }
  }

  function fmtTime(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString(isRTL ? "ar-DZ" : "fr-DZ", {
        hour: "2-digit", minute: "2-digit",
      });
    }
    return d.toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
      day: "2-digit", month: "short",
    });
  }

  const filtered = contacts.filter(c =>
    !search || (c.displayName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh" }} dir={isRTL ? "rtl" : "ltr"}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "26px 16px 60px" }}>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, marginBottom: 22, flexWrap: "wrap",
        }}>
          <Link href="/" style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            color: "#a78bfa", textDecoration: "none", fontSize: 13, fontWeight: 600,
          }}>
            <ArrowLeft size={15} className="os-flip" />
            {isRTL ? "رجوع" : "Retour"}
          </Link>

          <button onClick={openPicker} className="os-btn-chalk" style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "10px 17px", fontSize: 13,
          }}>
            <Plus size={15} />
            {isRTL ? "محادثة جديدة" : "Nouveau message"}
          </button>
        </div>

        <h1 className="os-display os-h2" style={{ margin: "0 0 6px" }}>
          {isRTL ? "الرسائل الخاصة" : "Messages privés"}
        </h1>
        <p className="os-muted" style={{ fontSize: 13, margin: "0 0 22px", lineHeight: 1.65 }}>
          {isRTL
            ? "محادثات فردية، بعيداً عن محادثة الدرس الجماعية."
            : "Échanges en tête-à-tête, à part du chat collectif du cours."}
        </p>

        {loadingData ? (
          <MessageListSkeleton count={4} />
        ) : threads.length === 0 ? (
          <EmptyState
            icon={<MessageSquare size={28} />}
            title={isRTL ? "لا محادثات بعد" : "Aucune conversation"}
            hint={isRTL
              ? "ابدأ محادثة خاصة مع أستاذك لطرح سؤال أو الإعلام عن غياب."
              : "Démarrez un échange privé pour poser une question ou signaler une absence."}
            action={
              <button onClick={openPicker} className="os-btn-chalk" style={{
                padding: "11px 22px", fontSize: 13.5,
                display: "inline-flex", alignItems: "center", gap: 7,
              }}>
                <Plus size={15} />
                {isRTL ? "محادثة جديدة" : "Nouveau message"}
              </button>
            }
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {threads.map(t => {
              const other = t.participants.find(p => p !== user?.uid) || "";
              const name = t.names?.[other] || "—";
              const unread = t.unread?.[user?.uid || ""] || 0;
              const mine = t.lastSenderId === user?.uid;

              return (
                <Link
                  key={t.id}
                  href={`/messages/${t.id}`}
                  onClick={() => haptic("tap")}
                  className="os-glass os-card"
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "13px 14px", textDecoration: "none",
                    borderRadius: 14,
                  }}
                >
                  <span style={{
                    width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                    background: unread > 0
                      ? "linear-gradient(140deg, rgba(255,140,0,0.28), rgba(255,140,0,0.1))"
                      : "linear-gradient(140deg, rgba(124,58,237,0.36), rgba(124,58,237,0.14))",
                    color: unread > 0 ? "#FF8C00" : "#e9d5ff",
                    fontWeight: 800, fontSize: 16,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {name.charAt(0).toUpperCase()}
                  </span>

                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      display: "flex", alignItems: "baseline",
                      justifyContent: "space-between", gap: 10,
                    }}>
                      <span style={{
                        color: "white", fontSize: 14,
                        fontWeight: unread > 0 ? 800 : 650,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{name}</span>
                      <span style={{ color: "#6d28d9", fontSize: 10.5, flexShrink: 0 }}>
                        {fmtTime(t.lastMessageAt)}
                      </span>
                    </span>

                    <span style={{
                      display: "block", marginTop: 3,
                      color: unread > 0 ? "#c4b5fd" : "#8b7bb8",
                      fontSize: 12.5,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {mine && <span style={{ color: "#6d28d9" }}>{isRTL ? "أنت : " : "Vous : "}</span>}
                      {t.lastMessage || (isRTL ? "محادثة جديدة" : "Nouvelle conversation")}
                    </span>
                  </span>

                  {unread > 0 && (
                    <span style={{
                      minWidth: 20, height: 20, borderRadius: 999, flexShrink: 0,
                      background: "#FF8C00", color: "white",
                      fontSize: 11, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 6px",
                    }}>
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ CHOIX DU DESTINATAIRE ═══ */}
      <Sheet
        open={picker}
        onClose={() => setPicker(false)}
        title={isRTL ? "مراسلة" : "Écrire à"}
        subtitle={profile?.role === "student"
          ? (isRTL ? "أساتذتك" : "Vos professeurs")
          : (isRTL ? "طلابك" : "Vos élèves")}
      >
        {contacts.length > 6 && (
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isRTL ? "بحث..." : "Rechercher..."}
            className="os-input"
            style={{ marginBottom: 14 }}
          />
        )}

        {loadingContacts ? (
          <div style={{ textAlign: "center", padding: 30 }}>
            <Loader2 size={22} style={{ color: "#FF8C00", animation: "mspin 0.8s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <p className="os-muted" style={{
            fontSize: 13, textAlign: "center", padding: "26px 0",
            margin: 0, lineHeight: 1.7,
          }}>
            {profile?.role === "student"
              ? (isRTL
                  ? "لا يمكنك مراسلة أستاذ إلا بعد التسجيل في أحد دروسه أو إرسال طلب."
                  : "Vous pourrez écrire à un professeur après vous être inscrit à l'un de ses cours ou lui avoir envoyé une demande.")
              : (isRTL
                  ? "لا طلاب مسجّلون بعد."
                  : "Aucun élève inscrit pour l'instant.")}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(c => (
              <button
                key={c.uid}
                onClick={() => startThread(c)}
                disabled={opening === c.uid}
                className="os-glass"
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", borderRadius: 13,
                  cursor: "pointer", fontFamily: "inherit",
                  textAlign: isRTL ? "right" : "left",
                }}
              >
                <span style={{
                  width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                  background: "linear-gradient(140deg, rgba(124,58,237,0.36), rgba(124,58,237,0.14))",
                  color: "#e9d5ff", fontWeight: 800, fontSize: 15,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {(c.displayName || "?").charAt(0).toUpperCase()}
                </span>

                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: "block", color: "white", fontSize: 13.5, fontWeight: 650,
                  }}>{c.displayName || "—"}</span>
                  {c.wilaya && (
                    <span style={{ display: "block", color: "#6d28d9", fontSize: 11, marginTop: 2 }}>
                      {c.wilaya}
                    </span>
                  )}
                </span>

                {opening === c.uid
                  ? <Loader2 size={15} style={{ color: "#FF8C00", animation: "mspin 0.8s linear infinite" }} />
                  : <ArrowRight size={15} className="os-flip" style={{ color: "#4c1d95" }} />}
              </button>
            ))}
          </div>
        )}

        <style>{`@keyframes mspin { to { transform: rotate(360deg); } }`}</style>
      </Sheet>
    </div>
  );
}
