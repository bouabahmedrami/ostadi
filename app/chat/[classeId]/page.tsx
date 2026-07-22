"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import {
  subscribeToMessages, sendMessage,
  markMessagesAsRead, getClasseById
} from "@/lib/firestore";
import { Message, Classe } from "@/lib/types";
import { Send, ArrowLeft, BookOpen, Phone, Video } from "lucide-react";
import Link from "next/link";

function MessageBubble({ msg, isOwn, isRTL }: { msg: Message; isOwn: boolean; isRTL: boolean }) {
  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(isRTL ? "ar" : "fr", {
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className={`flex flex-col gap-1 max-w-[78%] ${isOwn ? "self-end items-end" : "self-start items-start"}`}>
      {/* Sender name */}
      {!isOwn && (
        <span className="text-xs text-purple-500 px-1">{msg.senderName}</span>
      )}

      {/* Bubble */}
      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
        isOwn
          ? "bg-[#FF8C00] text-white rounded-tr-sm"
          : msg.senderRole === "teacher"
          ? "bg-purple-800/60 text-purple-100 border border-purple-700/40 rounded-tl-sm"
          : "bg-[#1A0A3C] text-purple-200 border border-purple-800/40 rounded-tl-sm"
      }`}
        dir={isRTL ? "rtl" : "ltr"}
      >
        {msg.text}
      </div>

      {/* Time + read status */}
      <div className={`flex items-center gap-1 px-1 ${isOwn ? "flex-row-reverse" : ""}`}>
        <span className="text-xs text-purple-600">{formatTime(msg.createdAt)}</span>
        {isOwn && (
          <span className={`text-xs ${msg.read ? "text-[#FF8C00]" : "text-purple-600"}`}>
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) { router.push("/auth"); return; }
    loadClasse();
  }, [user]);

  useEffect(() => {
    if (!classeId || !user) return;

    // Subscribe to real-time messages
    const unsub = subscribeToMessages(classeId as string, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      // Mark as read
      markMessagesAsRead(classeId as string, user.uid);
    });

    return () => unsub();
  }, [classeId, user]);

  useEffect(() => {
    // Auto scroll to bottom on new messages
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadClasse() {
    const c = await getClasseById(classeId as string);
    setClasse(c);
  }

  async function handleSend() {
    if (!text.trim() || !user || !profile || sending) return;
    const msgText = text.trim();
    setText("");
    setSending(true);
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

  // Group messages by date
  function getDateLabel(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString())
      return isRTL ? "اليوم" : "Aujourd'hui";
    if (d.toDateString() === yesterday.toDateString())
      return isRTL ? "أمس" : "Hier";
    return d.toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
      day: "2-digit", month: "long",
    });
  }

  function groupByDate(msgs: Message[]) {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    msgs.forEach(m => {
      const dateLabel = getDateLabel(m.createdAt);
      if (dateLabel !== currentDate) {
        currentDate = dateLabel;
        groups.push({ date: dateLabel, messages: [m] });
      } else {
        groups[groups.length - 1].messages.push(m);
      }
    });
    return groups;
  }

  const grouped = groupByDate(messages);

  return (
    <div className="flex flex-col h-screen bg-[#0D0118]" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="bg-[#110225] border-b border-purple-900/40 px-4 py-3 flex items-center gap-3 shrink-0">
        <Link
          href="/chat"
          className={`text-purple-400 hover:text-white transition-colors ${isRTL ? "order-last" : ""}`}
        >
          <ArrowLeft className={`w-5 h-5 ${isRTL ? "rotate-180" : ""}`} />
        </Link>

        {/* Class info */}
        <div className="w-10 h-10 rounded-xl bg-purple-900/60 border border-purple-700/40 flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5 text-[#FF8C00]" />
        </div>

        <div className={`flex-1 min-w-0 ${isRTL ? "text-right" : ""}`}>
          <h2 className="font-bold text-white text-sm truncate">
            {classe?.title || (isRTL ? "المحادثة" : "Conversation")}
          </h2>
          <p className="text-xs text-purple-400">
            {classe ? `${classe.subject} · ${classe.level}` : ""}
          </p>
        </div>

        {/* Join class button */}
        {classe && (
          <Link
            href={`/classe/${classe.id}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#FF8C00] hover:text-orange-300 transition-colors border border-[#FF8C00]/30 rounded-xl px-3 py-1.5 shrink-0"
          >
            <Video className="w-3.5 h-3.5" />
            {isRTL ? "الدرس" : "Cours"}
          </Link>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Grid bg subtle */}
        <div className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: "linear-gradient(rgba(168,85,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {loading ? (
          <div className="flex items-center justify-center h-full text-purple-500 text-sm">
            {isRTL ? "جارٍ تحميل الرسائل..." : "Chargement des messages..."}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-purple-900/40 border border-purple-700/30 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-purple-400 font-medium">
              {isRTL ? "لا توجد رسائل بعد" : "Aucun message pour l'instant"}
            </p>
            <p className="text-purple-600 text-sm">
              {isRTL
                ? "ابدأ المحادثة مع أستاذك"
                : "Commencez la conversation avec votre professeur"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 relative">
            {grouped.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-purple-900/40" />
                  <span className="text-xs text-purple-500 bg-[#0D0118] px-3 py-1 rounded-full border border-purple-900/40">
                    {group.date}
                  </span>
                  <div className="flex-1 h-px bg-purple-900/40" />
                </div>

                {/* Messages */}
                <div className="flex flex-col gap-2">
                  {group.messages.map((msg) => (
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

      {/* Input area */}
      <div className="bg-[#110225] border-t border-purple-900/40 px-4 py-3 shrink-0">
        <div className={`flex items-end gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRTL ? "اكتب رسالة..." : "Écrivez un message..."}
            className={`flex-1 bg-[#1A0A3C] border border-purple-800/50 rounded-2xl px-4 py-3 text-sm text-white placeholder-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none max-h-32 ${isRTL ? "text-right" : ""}`}
            rows={1}
            style={{ minHeight: "44px" }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
              text.trim()
                ? "bg-[#FF8C00] hover:bg-orange-500 text-white neon-orange"
                : "bg-purple-900/40 text-purple-600"
            } disabled:opacity-50`}
          >
            <Send className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          </button>
        </div>
        <p className="text-xs text-purple-700 mt-2 text-center">
          {isRTL ? "Enter للإرسال · Shift+Enter لسطر جديد" : "Entrée pour envoyer · Shift+Entrée pour nouvelle ligne"}
        </p>
      </div>
    </div>
  );
}
