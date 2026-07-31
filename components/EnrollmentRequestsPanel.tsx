"use client";
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { acceptEnrollmentRequest, rejectEnrollmentRequest } from "@/lib/firestore";
import { useLang } from "@/lib/lang-context";
import { EnrollmentRequest } from "@/lib/types";
import {
  Inbox, Check, X, MessageCircle, Phone, Clock, AlertTriangle, Loader2,
} from "lucide-react";

export default function EnrollmentRequestsPanel({ teacherId }: { teacherId: string }) {
  const { isRTL } = useLang();
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ── Écoute en temps réel ─────────────────────────────────
     Avant : un seul chargement au montage. Le professeur devait
     recharger la page pour voir une nouvelle demande arriver.   */
  useEffect(() => {
    if (!teacherId) return;

    const q = query(
      collection(db, "enrollmentRequests"),
      where("teacherId", "==", teacherId),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      snap => {
        setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as EnrollmentRequest)));
        setLoading(false);
      },
      err => {
        console.error("Écoute des demandes échouée :", err);
        setError(
          err?.code === "failed-precondition"
            ? (isRTL
                ? "الفهرس مفقود. افتح رابط الخطأ في الطرفية لإنشائه."
                : "Index Firestore manquant. Ouvrez le lien affiché dans le terminal.")
            : (isRTL ? "تعذّر تحميل الطلبات" : "Impossible de charger les demandes")
        );
        setLoading(false);
      }
    );

    return () => unsub();
  }, [teacherId, isRTL]);

  /* ── Accepter ─────────────────────────────────────────── */
  async function handleAccept(req: EnrollmentRequest) {
    const ok = window.confirm(
      isRTL
        ? `قبول ${req.studentName}؟\n\nسيحصل فوراً على وصول كامل إلى الدرس والفيديو المباشر.\n\nتأكد من استلام الدفع أولاً.`
        : `Accepter ${req.studentName} ?\n\nIl obtiendra immédiatement l'accès complet au cours et à la salle vidéo.\n\nVérifiez d'abord que le paiement a été reçu.`
    );
    if (!ok) return;

    setProcessing(req.id);
    setError(null);
    try {
      await acceptEnrollmentRequest(req);
      // La liste se met à jour toute seule via onSnapshot
    } catch (err: any) {
      console.error("Acceptation échouée :", err);
      setError(
        err?.code === "permission-denied"
          ? (isRTL ? "ليست لديك صلاحية لهذا الإجراء." : "Vous n'avez pas le droit d'effectuer cette action.")
          : (isRTL ? "فشل القبول. حاول مرة أخرى." : "Échec de l'acceptation. Réessayez.")
      );
    } finally {
      setProcessing(null);
    }
  }

  /* ── Refuser ──────────────────────────────────────────── */
  async function handleReject(req: EnrollmentRequest) {
    const ok = window.confirm(
      isRTL
        ? `رفض طلب ${req.studentName}؟\n\nسيتلقّى إشعاراً بالرفض.`
        : `Refuser la demande de ${req.studentName} ?\n\nIl recevra une notification de refus.`
    );
    if (!ok) return;

    setProcessing(req.id);
    setError(null);
    try {
      await rejectEnrollmentRequest(req);
    } catch (err: any) {
      console.error("Refus échoué :", err);
      setError(isRTL ? "فشل الرفض. حاول مرة أخرى." : "Échec du refus. Réessayez.");
    } finally {
      setProcessing(null);
    }
  }

  /* ── Ancienneté de la demande ─────────────────────────── */
  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return isRTL ? "الآن" : "à l'instant";
    if (min < 60) return isRTL ? `${min} د` : `${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return isRTL ? `${h} س` : `${h} h`;
    const j = Math.floor(h / 24);
    return isRTL ? `${j} ي` : `${j} j`;
  }

  /* ── Une demande de plus de 48h mérite l'attention ────── */
  function isStale(iso: string) {
    return Date.now() - new Date(iso).getTime() > 48 * 3600 * 1000;
  }

  if (loading) {
    return (
      <div className="erp-skeleton">
        <div className="erp-skeleton-bar" />
      </div>
    );
  }

  if (error && requests.length === 0) {
    return (
      <div className="erp-error-block">
        <AlertTriangle size={16} />
        <p>{error}</p>
      </div>
    );
  }

  if (requests.length === 0) return null;

  return (
    <div className="erp" dir={isRTL ? "rtl" : "ltr"}>

      {/* ═══ EN-TÊTE ═══ */}
      <div className="erp-head">
        <div className="erp-head-icon"><Inbox size={18} /></div>
        <div className="erp-head-text">
          <h2>{isRTL ? "طلبات التسجيل" : "Demandes d'inscription"}</h2>
          <p>
            {isRTL
              ? `${requests.length} ${requests.length > 1 ? "طلاب في انتظار الموافقة" : "طالب في انتظار الموافقة"}`
              : `${requests.length} élève${requests.length > 1 ? "s" : ""} en attente de validation`}
          </p>
        </div>
        <span className="erp-count">{requests.length}</span>
      </div>

      {/* ═══ ERREUR ═══ */}
      {error && (
        <div className="erp-error">
          <AlertTriangle size={14} />
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={13} /></button>
        </div>
      )}

      {/* ═══ LISTE ═══ */}
      <div className="erp-list">
        {requests.map(req => {
          const stale = isStale(req.createdAt);
          const busy = processing === req.id;

          return (
            <div key={req.id} className={`erp-card ${stale ? "erp-card-stale" : ""}`}>

              <div className="erp-card-top">
                <div className="erp-avatar">
                  {req.studentName.charAt(0).toUpperCase()}
                </div>

                <div className="erp-info">
                  <div className="erp-name-row">
                    <span className="erp-name">{req.studentName}</span>
                    <span className={`erp-time ${stale ? "erp-time-stale" : ""}`}>
                      <Clock size={11} />
                      {isRTL ? "منذ" : "il y a"} {timeAgo(req.createdAt)}
                    </span>
                  </div>

                  <a
                    href={`tel:${req.studentPhone}`}
                    className="erp-phone"
                  >
                    <Phone size={12} />
                    {req.studentPhone}
                  </a>

                  <div className="erp-course">
                    {isRTL ? "الدرس : " : "Cours : "}
                    <strong>{req.classeTitle}</strong>
                  </div>

                  {req.message && (
                    <div className="erp-message">"{req.message}"</div>
                  )}
                </div>
              </div>

              {/* ═══ ACTIONS ═══ */}
              <div className="erp-actions">
                <a
                  href={`https://wa.me/${req.studentPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    isRTL
                      ? `مرحباً ${req.studentName}، بخصوص طلبك للدرس "${req.classeTitle}"...`
                      : `Bonjour ${req.studentName}, concernant votre demande pour le cours "${req.classeTitle}"...`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="erp-btn erp-btn-wa"
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </a>

                <button
                  onClick={() => handleAccept(req)}
                  disabled={busy}
                  className="erp-btn erp-btn-accept"
                >
                  {busy ? <Loader2 size={14} className="erp-spin" /> : <Check size={14} />}
                  {isRTL ? "قبول" : "Accepter"}
                </button>

                <button
                  onClick={() => handleReject(req)}
                  disabled={busy}
                  className="erp-btn erp-btn-reject"
                >
                  <X size={14} />
                  {isRTL ? "رفض" : "Refuser"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ RAPPEL ═══ */}
      <p className="erp-tip">
        💡 {isRTL
          ? "تواصل مع الطالب عبر واتساب لترتيب الدفع، ثم اضغط «قبول» لمنحه الوصول."
          : "Contactez l'élève sur WhatsApp pour convenir du paiement, puis cliquez sur Accepter pour lui donner accès."}
      </p>

      <style jsx>{`
        .erp {
          background: linear-gradient(140deg, rgba(255,140,0,0.08), rgba(124,58,237,0.05));
          border: 1px solid rgba(255,140,0,0.35);
          border-radius: 18px;
          padding: 20px;
          margin-bottom: 20px;
        }

        /* ── Chargement ── */
        .erp-skeleton {
          background: rgba(17,2,37,0.8);
          border: 1px solid rgba(88,28,135,0.4);
          border-radius: 16px; padding: 20px; margin-bottom: 20px;
        }
        .erp-skeleton-bar {
          height: 58px; border-radius: 12px;
          background: linear-gradient(90deg,
            rgba(124,58,237,0.06) 25%,
            rgba(124,58,237,0.16) 50%,
            rgba(124,58,237,0.06) 75%);
          background-size: 200% 100%;
          animation: erpShimmer 1.6s ease-in-out infinite;
        }
        @keyframes erpShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .erp-error-block {
          display: flex; align-items: flex-start; gap: 10px;
          background: rgba(239,68,68,0.09);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 14px; padding: 14px 16px; margin-bottom: 20px;
        }
        .erp-error-block :global(svg) { color: #f87171; flex-shrink: 0; margin-top: 1px; }
        .erp-error-block p { color: #fca5a5; font-size: 12.5px; margin: 0; line-height: 1.55; }

        /* ── En-tête ── */
        .erp-head {
          display: flex; align-items: center; gap: 11px; margin-bottom: 16px;
        }
        .erp-head-icon {
          width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0;
          background: rgba(255,140,0,0.2);
          display: flex; align-items: center; justify-content: center;
          color: #FF8C00;
        }
        .erp-head-text { flex: 1; min-width: 0; }
        .erp-head-text h2 {
          color: white; font-weight: 800; font-size: 15.5px; margin: 0;
        }
        .erp-head-text p {
          color: #a78bfa; font-size: 12px; margin: 2px 0 0;
        }
        .erp-count {
          background: #FF8C00; color: white;
          font-size: 13px; font-weight: 800;
          min-width: 26px; height: 26px; border-radius: 999px; padding: 0 8px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        /* ── Erreur inline ── */
        .erp-error {
          display: flex; align-items: center; gap: 8px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.28);
          border-radius: 11px; padding: 10px 12px; margin-bottom: 12px;
        }
        .erp-error :global(svg) { color: #f87171; flex-shrink: 0; }
        .erp-error span { color: #fca5a5; font-size: 12px; flex: 1; }
        .erp-error button {
          background: none; border: none; color: #f87171;
          cursor: pointer; display: flex; padding: 0; opacity: 0.7;
        }
        .erp-error button:hover { opacity: 1; }

        /* ── Cartes ── */
        .erp-list { display: flex; flex-direction: column; gap: 10px; }
        .erp-card {
          background: rgba(10,0,20,0.5);
          border: 1px solid rgba(124,58,237,0.2);
          border-radius: 14px; padding: 14px;
          transition: border-color 0.22s ease;
        }
        .erp-card:hover { border-color: rgba(168,85,247,0.35); }
        .erp-card-stale { border-color: rgba(251,191,36,0.35); }

        .erp-card-top {
          display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;
        }
        .erp-avatar {
          width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
          background: linear-gradient(140deg, rgba(124,58,237,0.4), rgba(124,58,237,0.15));
          border: 1px solid rgba(168,85,247,0.3);
          display: flex; align-items: center; justify-content: center;
          color: #e9d5ff; font-weight: 800; font-size: 17px;
        }
        .erp-info { flex: 1; min-width: 0; }
        .erp-name-row {
          display: flex; align-items: center; gap: 9px; flex-wrap: wrap;
        }
        .erp-name { color: white; font-weight: 700; font-size: 14px; }
        .erp-time {
          display: inline-flex; align-items: center; gap: 3px;
          color: #6d28d9; font-size: 11px;
        }
        .erp-time-stale { color: #fbbf24; font-weight: 600; }

        .erp-phone {
          display: inline-flex; align-items: center; gap: 5px;
          color: #a78bfa; font-size: 12.5px; text-decoration: none;
          margin-top: 3px; transition: color 0.2s ease;
        }
        .erp-phone:hover { color: #FF8C00; }

        .erp-course {
          color: #8b7bb8; font-size: 12px; margin-top: 4px;
        }
        .erp-course strong { color: #c4b5fd; font-weight: 600; }

        .erp-message {
          margin-top: 8px; padding: 8px 11px;
          background: rgba(124,58,237,0.1);
          border-radius: 9px;
          color: #c4b5fd; font-size: 12px; font-style: italic;
          line-height: 1.5;
        }

        /* ── Actions ── */
        .erp-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .erp-btn {
          flex: 1; min-width: 108px;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          font-weight: 700; padding: 10px; border-radius: 10px;
          font-size: 12.5px; font-family: inherit;
          text-decoration: none; cursor: pointer; border: none;
          transition: transform 0.2s ease, filter 0.2s ease;
        }
        .erp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .erp-btn:hover:not(:disabled) { transform: translateY(-1px); }

        .erp-btn-wa { background: #16a34a; color: white; }
        .erp-btn-wa:hover { filter: brightness(1.1); }
        .erp-btn-accept {
          background: linear-gradient(135deg, #FF8C00, #FF6B00);
          color: white;
          box-shadow: 0 4px 14px rgba(255,140,0,0.25);
        }
        .erp-btn-reject {
          background: transparent; color: #f87171;
          border: 1px solid rgba(239,68,68,0.4);
        }
        .erp-btn-reject:hover:not(:disabled) { background: rgba(239,68,68,0.08); }

        .erp-tip {
          color: #8b7bb8; font-size: 11.5px;
          margin: 14px 0 0; line-height: 1.55;
        }

        .erp-spin { animation: erpSpin 0.8s linear infinite; }
        @keyframes erpSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
