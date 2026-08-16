"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { trSubject, trLevel } from "@/lib/i18n/translate";
import {
  subscribeToMessages, sendMessage,
  markMessagesAsRead, getClasseById,
} from "@/lib/firestore";
import { Message, Classe } from "@/lib/types";
import { Send, ArrowLeft, BookOpen, Video, MessageSquare } from "lucide-react";
import ReportButton from "@/components/ReportButton";
import Link from "next/link";

/* ── Bulle de message ───────────────────────────────────── */
function MessageBubble({ msg, isOwn, isRTL }: { msg: Message; isOwn: boolean; isRTL: boolean }) {
  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(isRTL ? "ar-DZ" : "fr-DZ", {
      hour: "2-digit", minute: "2-digit",
    });
  }

  const isTeacher = msg.senderRole === "teacher";

  return (
    <div className={`cb-wrap ${isOwn ? "cb-own" : ""}`}>
      {!isOwn && <span className="cb-sender">{msg.senderName}</span>}

      <div className={`cb-bubble ${isOwn ? "cb-bubble-own" : isTeacher ? "cb-bubble-teacher" : "cb-bubble-student"}`}>
        {msg.text}
      </div>

      <div className="cb-foot">
        <span className="cb-time">{formatTime(msg.createdAt)}</span>
        {isOwn && (
          <span className={`cb-check ${msg.read ? "cb-check-read" : ""}`}>
            {msg.read ? "✓✓" : "✓"}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { classeId } = useParams();
  const { user, profile } = useAuth();
  const { isRTL } = useLang();
  const router = useRouter();

  const [classe, setClasse] = useState<Classe | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) { router.push("/auth"); return; }
    loadClasse();
  }, [user]);

  /**
   * Écoute des messages.
   *
   * ⚠️ La fonction prend maintenant l'identifiant de l'utilisateur :
   * la requête filtre sur `participants`, pas seulement sur `classeId`.
   *
   * Firestore évalue ses règles document par document — si une requête
   * renvoie un seul document interdit, elle échoue entièrement. Un élève
   * inscrit tardivement n'apparaît pas dans les participants des messages
   * antérieurs ; sans ce filtre, sa page afficherait une erreur au lieu
   * de la conversation.
   */
  useEffect(() => {
    if (!classeId || !user) return;

    const unsub = subscribeToMessages(
      classeId as string,
      user.uid,
      (msgs) => {
        setMessages(msgs);
        setLoading(false);
        setError(null);
        markMessagesAsRead(classeId as string, user.uid).catch(err =>
          console.warn("Marquage comme lu échoué :", err)
        );
      },
      (err) => {
        setLoading(false);
        setError(
          err?.code === "failed-precondition"
            ? (isRTL
                ? "الفهرس مفقود — افتح الرابط في الطرفية."
                : "Index Firestore manquant — voir le lien dans le terminal.")
            : (isRTL
                ? "تعذّر تحميل الرسائل."
                : "Impossible de charger les messages.")
        );
      }
    );

    return () => unsub();
  }, [classeId, user, isRTL]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadClasse() {
    try {
      const c = await getClasseById(classeId as string);
      setClasse(c);
    } catch (err) {
      console.error("Chargement du cours échoué :", err);
    }
  }

  /* ── Envoi avec gestion d'erreur ──────────────────────── */
  async function handleSend() {
    if (!text.trim() || !user || !profile || sending) return;
    const msgText = text.trim();
    setText("");
    setSending(true);
    setError(null);
    try {
      await sendMessage({
        classeId: classeId as string,
        senderId: user.uid,
        senderName: profile.displayName,
        senderRole: profile.role,
        text: msgText,
        read: false,
        createdAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Envoi échoué :", err);
      setText(msgText); // restaure le texte pour ne pas le perdre
      setError(
        err?.message === "not-a-participant"
          ? (isRTL
              ? "لست مشاركاً في هذه المحادثة."
              : "Vous ne faites pas partie de cette conversation.")
          : (isRTL
              ? "فشل إرسال الرسالة. تحقق من اتصالك."
              : "Échec de l'envoi. Vérifiez votre connexion.")
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  /* ── Auto-resize du textarea ──────────────────────────── */
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 128) + "px";
  }

  function getDateLabel(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return isRTL ? "اليوم" : "Aujourd'hui";
    if (d.toDateString() === yesterday.toDateString()) return isRTL ? "أمس" : "Hier";
    return d.toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", { day: "2-digit", month: "long" });
  }

  function groupByDate(msgs: Message[]) {
    const groups: { date: string; messages: Message[] }[] = [];
    let current = "";
    msgs.forEach(m => {
      const label = getDateLabel(m.createdAt);
      if (label !== current) {
        current = label;
        groups.push({ date: label, messages: [m] });
      } else {
        groups[groups.length - 1].messages.push(m);
      }
    });
    return groups;
  }

  const grouped = groupByDate(messages);

  return (
    <div className="ch-page" dir={isRTL ? "rtl" : "ltr"}>

      {/* ═══ HEADER ═══ */}
      <header className="ch-header">
        <Link href="/chat" className="ch-back">
          <ArrowLeft size={19} style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
        </Link>

        <div className="ch-avatar"><BookOpen size={18} /></div>

        <div className="ch-head-info">
          <h2 className="ch-head-title">
            {classe?.title || (isRTL ? "المحادثة" : "Conversation")}
          </h2>
          {classe && (
            <p className="ch-head-sub">
              {trSubject(classe.subject, isRTL)} · {trLevel(classe.level, isRTL)}
            </p>
          )}
        </div>

        {/* Signalement — discret, mais toujours accessible.
            Une conversation est l'endroit où un comportement déplacé
            se manifeste en premier. */}
        {classe && (
          <ReportButton
            targetType="message"
            targetId={classeId as string}
            targetName={classe.title}
            compact
          />
        )}

        {classe && (
          <Link href={`/classe/${classe.id}`} className="ch-course-btn">
            <Video size={14} />
            <span>{isRTL ? "الدرس" : "Cours"}</span>
          </Link>
        )}
      </header>

      {/* ═══ MESSAGES ═══ */}
      <div className="ch-messages">
        {loading ? (
          <div className="ch-center">
            <div className="ch-spinner" />
            <p>{isRTL ? "جارٍ تحميل الرسائل..." : "Chargement des messages..."}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="ch-center">
            <div className="ch-empty-icon"><MessageSquare size={28} /></div>
            <p className="ch-empty-title">
              {isRTL ? "لا توجد رسائل بعد" : "Aucun message pour l'instant"}
            </p>
            <p className="ch-empty-hint">
              {isRTL
                ? "ابدأ المحادثة — اطرح سؤالك على أستاذك"
                : "Lancez la conversation — posez votre question au professeur"}
            </p>
          </div>
        ) : (
          <div className="ch-list">
            {grouped.map(group => (
              <div key={group.date}>
                <div className="ch-date-sep">
                  <span className="ch-date-line" />
                  <span className="ch-date-label">{group.date}</span>
                  <span className="ch-date-line" />
                </div>
                <div className="ch-group">
                  {group.messages.map(msg => (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      isOwn={msg.senderId === user?.uid}
                      isRTL={isRTL}
                    />
                  ))}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ═══ ERREUR ═══ */}
      {error && (
        <div className="ch-error">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* ═══ SAISIE ═══ */}
      <footer className="ch-input-bar">
        <div className="ch-input-row">
          <textarea
            ref={inputRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={isRTL ? "اكتب رسالة..." : "Écrivez un message..."}
            rows={1}
            maxLength={1000}
            className="ch-textarea"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className={`ch-send ${text.trim() ? "ch-send-on" : ""}`}
            aria-label={isRTL ? "إرسال" : "Envoyer"}
          >
            <Send size={17} style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
          </button>
        </div>
        <p className="ch-hint">
          {isRTL
            ? "Enter للإرسال · Shift+Enter لسطر جديد"
            : "Entrée pour envoyer · Maj+Entrée pour aller à la ligne"}
        </p>
      </footer>

      <style jsx global>{`
        .ch-page {
          display: flex; flex-direction: column;
          height: 100vh; height: 100dvh;
          background: #0A0014;
          background-image:
            linear-gradient(rgba(168,85,247,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168,85,247,0.022) 1px, transparent 1px);
          background-size: 40px 40px;
          overflow: hidden;
        }

        /* ── Header ── */
        .ch-header {
          display: flex; align-items: center; gap: 12px; flex-shrink: 0;
          background: linear-gradient(180deg, rgba(24,12,52,0.98), rgba(18,8,40,0.98));
          border-bottom: 1px solid rgba(124,58,237,0.22);
          padding: 12px 16px;
          backdrop-filter: blur(12px);
        }
        .ch-back {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0;
          color: #a78bfa; text-decoration: none; transition: all 0.2s ease;
        }
        .ch-back:hover { background: rgba(124,58,237,0.15); color: white; }
        .ch-avatar {
          width: 40px; height: 40px; border-radius: 13px; flex-shrink: 0;
          background: linear-gradient(140deg, rgba(255,140,0,0.22), rgba(124,58,237,0.2));
          border: 1px solid rgba(255,140,0,0.28);
          display: flex; align-items: center; justify-content: center; color: #FF8C00;
        }
        .ch-head-info { flex: 1; min-width: 0; }
        .ch-head-title {
          color: white; font-weight: 750; font-size: 14.5px; margin: 0;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .ch-head-sub { color: #8b7bb8; font-size: 11.5px; margin: 2px 0 0; }
        .ch-course-btn {
          display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0;
          background: rgba(255,140,0,0.12); color: #FF8C00;
          border: 1px solid rgba(255,140,0,0.3);
          padding: 8px 14px; border-radius: 11px;
          font-size: 12px; font-weight: 700; text-decoration: none;
          transition: all 0.2s ease;
        }
        .ch-course-btn:hover { background: rgba(255,140,0,0.22); }
        @media (max-width: 420px) { .ch-course-btn span { display: none; } }

        /* ── Zone messages ── */
        .ch-messages {
          flex: 1; overflow-y: auto; padding: 18px 16px;
          scroll-behavior: smooth;
        }
        .ch-messages::-webkit-scrollbar { width: 6px; }
        .ch-messages::-webkit-scrollbar-thumb {
          background: rgba(124,58,237,0.25); border-radius: 999px;
        }
        .ch-list { display: flex; flex-direction: column; gap: 4px; }
        .ch-group { display: flex; flex-direction: column; gap: 9px; }

        .ch-center {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          height: 100%; gap: 11px; text-align: center;
        }
        .ch-center > p { color: #8b7bb8; font-size: 13.5px; margin: 0; }
        .ch-spinner {
          width: 30px; height: 30px; border-radius: 50%;
          border: 2.5px solid rgba(124,58,237,0.2); border-top-color: #FF8C00;
          animation: chspin 0.8s linear infinite;
        }
        @keyframes chspin { to { transform: rotate(360deg); } }
        .ch-empty-icon {
          width: 66px; height: 66px; border-radius: 20px;
          background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.18);
          display: flex; align-items: center; justify-content: center; color: #7c3aed;
        }
        .ch-empty-title { color: #d8b4fe; font-weight: 700; font-size: 15px; margin: 0; }
        .ch-empty-hint { color: #6d28d9; font-size: 12.5px; margin: 0; max-width: 260px; line-height: 1.5; }

        /* ── Séparateur de date ── */
        .ch-date-sep { display: flex; align-items: center; gap: 12px; margin: 18px 0 14px; }
        .ch-date-line { flex: 1; height: 1px; background: rgba(124,58,237,0.16); }
        .ch-date-label {
          color: #8b7bb8; font-size: 11px; font-weight: 600;
          background: rgba(20,8,45,0.9); border: 1px solid rgba(124,58,237,0.18);
          padding: 4px 13px; border-radius: 999px; white-space: nowrap;
        }

        /* ── Bulles ── */
        .cb-wrap {
          display: flex; flex-direction: column; gap: 3px;
          max-width: 78%; align-self: flex-start; align-items: flex-start;
        }
        .cb-own { align-self: flex-end; align-items: flex-end; }
        .cb-sender {
          color: #7c3aed; font-size: 11px; font-weight: 600;
          padding-inline: 4px;
        }
        .cb-bubble {
          padding: 10px 15px; border-radius: 17px;
          font-size: 13.5px; line-height: 1.55;
          word-break: break-word; white-space: pre-wrap;
        }
        .cb-bubble-own {
          background: linear-gradient(135deg, #FF8C00, #FF6B00);
          color: white; border-start-end-radius: 5px;
          box-shadow: 0 3px 12px rgba(255,140,0,0.2);
        }
        .cb-bubble-teacher {
          background: linear-gradient(140deg, rgba(76,29,149,0.65), rgba(60,20,120,0.65));
          color: #e9d5ff; border: 1px solid rgba(124,58,237,0.32);
          border-start-start-radius: 5px;
        }
        .cb-bubble-student {
          background: rgba(26,10,60,0.75);
          color: #c4b5fd; border: 1px solid rgba(124,58,237,0.2);
          border-start-start-radius: 5px;
        }
        .cb-foot {
          display: flex; align-items: center; gap: 5px;
          padding-inline: 4px;
        }
        .cb-own .cb-foot { flex-direction: row-reverse; }
        .cb-time { color: #5b21b6; font-size: 10.5px; }
        .cb-check { color: #5b21b6; font-size: 10.5px; }
        .cb-check-read { color: #FF8C00; }

        /* ── Erreur ── */
        .ch-error {
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          background: rgba(239,68,68,0.12); border-top: 1px solid rgba(239,68,68,0.3);
          color: #fca5a5; font-size: 12.5px;
          padding: 10px 16px; flex-shrink: 0;
        }
        .ch-error button {
          background: none; border: none; color: #f87171;
          cursor: pointer; font-size: 14px; padding: 0;
        }

        /* ── Barre de saisie ── */
        .ch-input-bar {
          flex-shrink: 0;
          background: linear-gradient(0deg, rgba(24,12,52,0.98), rgba(18,8,40,0.98));
          border-top: 1px solid rgba(124,58,237,0.22);
          padding: 12px 16px 14px;
          backdrop-filter: blur(12px);
        }
        .ch-input-row { display: flex; align-items: flex-end; gap: 11px; }
        .ch-textarea {
          flex: 1; background: rgba(26,10,60,0.7);
          border: 1px solid rgba(124,58,237,0.25); border-radius: 18px;
          padding: 12px 16px; font-size: 13.5px; color: white;
          font-family: inherit; outline: none; resize: none;
          min-height: 44px; max-height: 128px; line-height: 1.5;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .ch-textarea:focus {
          border-color: rgba(255,140,0,0.45);
          background: rgba(26,10,60,0.9);
        }
        .ch-textarea::placeholder { color: #6d28d9; }
        .ch-send {
          width: 44px; height: 44px; border-radius: 15px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: rgba(124,58,237,0.18); color: #6d28d9;
          border: none; cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34,1.4,0.64,1);
        }
        .ch-send-on {
          background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white;
          box-shadow: 0 4px 16px rgba(255,140,0,0.32);
        }
        .ch-send-on:hover { transform: translateY(-2px) scale(1.04); }
        .ch-send:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
        .ch-hint {
          color: #4c1d95; font-size: 10.5px; text-align: center;
          margin: 9px 0 0;
        }
        @media (max-width: 520px) { .ch-hint { display: none; } }
      `}</style>
    </div>
  );
}
