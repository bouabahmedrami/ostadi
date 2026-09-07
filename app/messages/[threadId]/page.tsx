"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import {
  subscribeToPrivateMessages, sendPrivateMessage, markThreadRead,
  PrivateMessage,
} from "@/lib/firestore";
import { haptic } from "@/lib/haptics";
import { ChatSkeleton } from "@/components/Skeletons";
import ReportButton from "@/components/ReportButton";
import { Send, ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";

/**
 * Conversation privée.
 *
 * Reprend la mise en forme du chat de cours pour ne pas dérouter,
 * mais avec deux différences : un seul interlocuteur, et un rappel
 * visible que l'échange est modéré.
 */
export default function PrivateThreadPage() {
  const { threadId } = useParams();
  const { user, profile } = useAuth();
  const { isRTL } = useLang();
  const router = useRouter();

  const [thread, setThread] = useState<any>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) { router.push("/auth"); return; }
    loadThread();
  }, [user, threadId]);

  async function loadThread() {
    try {
      const snap = await getDoc(doc(db, "threads", threadId as string));
      if (!snap.exists()) {
        setError(isRTL ? "المحادثة غير موجودة" : "Conversation introuvable");
        setLoading(false);
        return;
      }
      const t = snap.data() as any;

      // Un tiers ne doit pas pouvoir lire en devinant l'identifiant
      if (!t.participants?.includes(user!.uid)) {
        setError(isRTL ? "ليس لديك صلاحية" : "Accès non autorisé");
        setLoading(false);
        return;
      }

      setThread({ id: snap.id, ...t });
    } catch (err) {
      console.error("Chargement de la conversation échoué :", err);
      setError(isRTL ? "تعذّر التحميل" : "Chargement impossible");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!threadId || !user || !thread) return;

    const unsub = subscribeToPrivateMessages(
      threadId as string,
      user.uid,
      msgs => {
        setMessages(msgs);
        setLoading(false);
        markThreadRead(threadId as string, user.uid).catch(() => {});
      },
      err => {
        setLoading(false);
        setError(
          err?.code === "failed-precondition"
            ? (isRTL ? "الفهرس مفقود — راجع الطرفية." : "Index Firestore manquant — voir le terminal.")
            : (isRTL ? "تعذّر تحميل الرسائل." : "Impossible de charger les messages.")
        );
      }
    );

    return () => unsub();
  }, [threadId, user, thread, isRTL]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!text.trim() || !user || !profile || sending) return;
    const msg = text.trim();
    setText("");
    setSending(true);
    haptic("tap");

    try {
      await sendPrivateMessage({
        threadId: threadId as string,
        senderId: user.uid,
        senderName: profile.displayName,
        text: msg,
      });
    } catch (err) {
      console.error("Envoi échoué :", err);
      setText(msg); // on ne perd pas le texte
      setError(isRTL ? "فشل الإرسال." : "Échec de l'envoi.");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function onInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 128) + "px";
  }

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString(isRTL ? "ar-DZ" : "fr-DZ", {
      hour: "2-digit", minute: "2-digit",
    });
  }

  function dateLabel(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return isRTL ? "اليوم" : "Aujourd'hui";
    if (d.toDateString() === yesterday.toDateString()) return isRTL ? "أمس" : "Hier";
    return d.toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", { day: "2-digit", month: "long" });
  }

  const grouped: { date: string; items: PrivateMessage[] }[] = [];
  let current = "";
  messages.forEach(m => {
    const l = dateLabel(m.createdAt);
    if (l !== current) { current = l; grouped.push({ date: l, items: [m] }); }
    else grouped[grouped.length - 1].items.push(m);
  });

  const otherId = thread?.participants?.find((p: string) => p !== user?.uid);
  const otherName = thread?.names?.[otherId] || "—";
  const otherRole = thread?.roles?.[otherId];

  if (error && !thread) {
    return (
      <div className="pt-page" dir={isRTL ? "rtl" : "ltr"}>
        <div style={{
          minHeight: "60vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 14,
        }}>
          <Lock size={30} style={{ color: "#f87171" }} />
          <p style={{ color: "#fca5a5", fontSize: 14 }}>{error}</p>
          <Link href="/messages" className="os-btn-ghost" style={{
            padding: "11px 20px", fontSize: 13, textDecoration: "none",
          }}>
            {isRTL ? "العودة إلى الرسائل" : "Retour aux messages"}
          </Link>
        </div>
        <style jsx global>{`.pt-page { min-height: 100vh; }`}</style>
      </div>
    );
  }

  return (
    <div className="pt-page" dir={isRTL ? "rtl" : "ltr"}>

      {/* ═══ EN-TÊTE ═══ */}
      <header className="pt-head">
        <Link href="/messages" className="pt-back" onClick={() => haptic("tap")}>
          <ArrowLeft size={19} className="os-flip" />
        </Link>

        <span className="pt-avatar">
          {otherName.charAt(0).toUpperCase()}
        </span>

        <div className="pt-info">
          <h2 className="pt-name">{otherName}</h2>
          <p className="pt-role">
            {otherRole === "teacher"
              ? (isRTL ? "أستاذ" : "Professeur")
              : (isRTL ? "طالب" : "Élève")}
          </p>
        </div>

        {otherId && (
          <ReportButton
            targetType="message"
            targetId={threadId as string}
            targetName={otherName}
            compact
          />
        )}
      </header>

      {/* ═══ MESSAGES ═══ */}
      <div className="pt-body">
        {loading ? (
          <ChatSkeleton />
        ) : messages.length === 0 ? (
          <div className="pt-empty">
            <div className="pt-empty-icon">💬</div>
            <p className="pt-empty-title">
              {isRTL ? "ابدأ المحادثة" : "Démarrez la conversation"}
            </p>
            <p className="pt-empty-hint">
              {isRTL
                ? "هذه محادثة خاصة — لا يراها أحد غيركما."
                : "Cet échange est privé — personne d'autre ne le voit."}
            </p>
          </div>
        ) : (
          <div className="pt-list">
            {grouped.map(g => (
              <div key={g.date}>
                <div className="pt-sep">
                  <span className="pt-sep-line" />
                  <span className="pt-sep-label">{g.date}</span>
                  <span className="pt-sep-line" />
                </div>
                <div className="pt-group">
                  {g.items.map(m => {
                    const own = m.senderId === user?.uid;
                    return (
                      <div key={m.id} className={`pt-wrap ${own ? "pt-own" : ""}`}>
                        <div className={`pt-bubble ${own ? "pt-bubble-own" : "pt-bubble-other"}`}>
                          {m.text}
                        </div>
                        <span className="pt-time">{fmtTime(m.createdAt)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ═══ ERREUR ═══ */}
      {error && thread && (
        <div className="pt-error">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* ═══ SAISIE ═══ */}
      <footer className="pt-input-bar">
        <div className="pt-input-row">
          <textarea
            ref={inputRef}
            value={text}
            onChange={onInput}
            onKeyDown={onKeyDown}
            placeholder={isRTL ? "اكتب رسالة..." : "Écrivez un message..."}
            rows={1}
            maxLength={1000}
            className="pt-textarea"
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending}
            className={`pt-send ${text.trim() ? "pt-send-on" : ""}`}
            aria-label={isRTL ? "إرسال" : "Envoyer"}
          >
            <Send size={17} className="os-flip" />
          </button>
        </div>

        {/* Rappel de modération — sur une plateforme où des adultes
            échangent avec des mineurs, mieux vaut que chacun sache
            que l'échange peut être examiné. */}
        <p className="pt-notice">
          <Lock size={10} />
          {isRTL
            ? "محادثة خاصة — يمكن مراجعتها في حال الإبلاغ."
            : "Échange privé — consultable en cas de signalement."}
        </p>
      </footer>

      <style jsx global>{`
        .pt-page {
          display: flex;
          flex-direction: column;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
        }

        .pt-head {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
          background: rgba(20, 8, 43, 0.72);
          backdrop-filter: blur(20px) saturate(1.6);
          -webkit-backdrop-filter: blur(20px) saturate(1.6);
          border-bottom: 1px solid rgba(168, 85, 247, 0.2);
          padding: 12px 16px;
        }
        .pt-back {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 11px;
          flex-shrink: 0;
          color: #a78bfa;
          text-decoration: none;
        }
        .pt-back:hover { background: rgba(124, 58, 237, 0.15); color: #fff; }
        .pt-avatar {
          width: 40px;
          height: 40px;
          border-radius: 13px;
          flex-shrink: 0;
          background: linear-gradient(140deg, rgba(124,58,237,0.4), rgba(124,58,237,0.15));
          border: 1px solid rgba(168,85,247,0.28);
          color: #e9d5ff;
          font-weight: 800;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pt-info { flex: 1; min-width: 0; }
        .pt-name {
          color: #fff;
          font-weight: 750;
          font-size: 14.5px;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .pt-role { color: #8b7bb8; font-size: 11.5px; margin: 2px 0 0; }

        .pt-body {
          flex: 1;
          overflow-y: auto;
          padding: 18px 16px;
        }
        .pt-body::-webkit-scrollbar { width: 6px; }
        .pt-body::-webkit-scrollbar-thumb {
          background: rgba(124,58,237,0.25);
          border-radius: 999px;
        }

        .pt-list { display: flex; flex-direction: column; gap: 4px; }
        .pt-group { display: flex; flex-direction: column; gap: 9px; }

        .pt-sep { display: flex; align-items: center; gap: 12px; margin: 18px 0 14px; }
        .pt-sep-line { flex: 1; height: 1px; background: rgba(124,58,237,0.16); }
        .pt-sep-label {
          color: #8b7bb8;
          font-size: 11px;
          font-weight: 600;
          background: rgba(20,8,45,0.9);
          border: 1px solid rgba(124,58,237,0.18);
          padding: 4px 13px;
          border-radius: 999px;
          white-space: nowrap;
        }

        .pt-wrap {
          display: flex;
          flex-direction: column;
          gap: 3px;
          max-width: 78%;
          align-self: flex-start;
          align-items: flex-start;
        }
        .pt-own { align-self: flex-end; align-items: flex-end; }
        .pt-bubble {
          padding: 10px 15px;
          border-radius: 17px;
          font-size: 13.5px;
          line-height: 1.55;
          word-break: break-word;
          white-space: pre-wrap;
        }
        .pt-bubble-own {
          background: linear-gradient(135deg, #FF8C00, #FF6B00);
          color: #fff;
          border-start-end-radius: 5px;
          box-shadow: 0 3px 12px rgba(255,140,0,0.2);
        }
        .pt-bubble-other {
          background: rgba(38, 20, 74, 0.7);
          color: #e9d5ff;
          border: 1px solid rgba(124,58,237,0.28);
          border-start-start-radius: 5px;
        }
        .pt-time { color: #5b21b6; font-size: 10.5px; padding-inline: 4px; }

        .pt-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 10px;
          text-align: center;
        }
        .pt-empty-icon { font-size: 38px; opacity: 0.5; }
        .pt-empty-title { color: #d8b4fe; font-weight: 700; font-size: 15px; margin: 0; }
        .pt-empty-hint {
          color: #6d28d9;
          font-size: 12.5px;
          margin: 0;
          max-width: 260px;
          line-height: 1.6;
        }

        .pt-error {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: rgba(239,68,68,0.12);
          border-top: 1px solid rgba(239,68,68,0.3);
          color: #fca5a5;
          font-size: 12.5px;
          padding: 10px 16px;
          flex-shrink: 0;
        }
        .pt-error button {
          background: none;
          border: none;
          color: #f87171;
          cursor: pointer;
          font-size: 14px;
        }

        .pt-input-bar {
          flex-shrink: 0;
          background: rgba(20, 8, 43, 0.72);
          backdrop-filter: blur(20px) saturate(1.6);
          -webkit-backdrop-filter: blur(20px) saturate(1.6);
          border-top: 1px solid rgba(168,85,247,0.2);
          padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
        }
        .pt-input-row { display: flex; align-items: flex-end; gap: 11px; }
        .pt-textarea {
          flex: 1;
          background: rgba(26,10,60,0.7);
          border: 1px solid rgba(124,58,237,0.25);
          border-radius: 18px;
          padding: 12px 16px;
          font-size: 13.5px;
          color: #fff;
          font-family: inherit;
          outline: none;
          resize: none;
          min-height: 44px;
          max-height: 128px;
          line-height: 1.5;
        }
        .pt-textarea:focus {
          border-color: rgba(255,140,0,0.45);
          background: rgba(26,10,60,0.9);
        }
        .pt-textarea::placeholder { color: #6d28d9; }
        .pt-send {
          width: 44px;
          height: 44px;
          border-radius: 15px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(124,58,237,0.18);
          color: #6d28d9;
          border: none;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34,1.4,0.64,1);
        }
        .pt-send-on {
          background: linear-gradient(135deg, #FF8C00, #FF6B00);
          color: #fff;
          box-shadow: 0 4px 16px rgba(255,140,0,0.32);
        }
        .pt-send-on:hover { transform: translateY(-2px) scale(1.04); }
        .pt-send:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        .pt-notice {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          color: #4c1d95;
          font-size: 10.5px;
          margin: 9px 0 0;
        }
      `}</style>
    </div>
  );
}
