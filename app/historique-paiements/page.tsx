"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { trSubject } from "@/lib/i18n/translate";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Wallet, Calendar, Download, ArrowLeft, Users, Percent, Search, X,
} from "lucide-react";
import Link from "next/link";

interface PaymentRecord {
  id: string;
  studentName: string;
  studentPhone: string;
  classeTitle: string;
  classeSubject: string;
  amount: number;
  enrolledAt: string;
}

const COMMISSION_RATE = 0.10;

export default function HistoriquePaiementsPage() {
  const { user, profile, loading } = useAuth();
  const { isRTL } = useLang();
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<"all" | "month" | "year">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "teacher")) router.push("/auth");
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (user && profile?.role === "teacher") loadPayments();
  }, [user, profile]);

  async function loadPayments() {
    setLoadingData(true);
    try {
      const classesSnap = await getDocs(
        query(collection(db, "classes"), where("teacherId", "==", user!.uid))
      );
      const classesMap = new Map(classesSnap.docs.map(d => [d.id, d.data()]));

      const records: PaymentRecord[] = [];
      for (const [classeId, classeData] of classesMap.entries()) {
        const enrollSnap = await getDocs(
          query(collection(db, "enrollments"), where("classeId", "==", classeId))
        );
        enrollSnap.docs.forEach(d => {
          const enr = d.data();
          records.push({
            id: d.id,
            studentName: enr.studentName || "—",
            studentPhone: enr.studentPhone || "—",
            classeTitle: (classeData as any).title || "—",
            classeSubject: (classeData as any).subject || "—",
            amount: (classeData as any).price || 0,
            enrolledAt: enr.enrolledAt,
          });
        });
      }

      records.sort((a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime());
      setPayments(records);
    } finally {
      setLoadingData(false);
    }
  }

  /* ── Filtrage ─────────────────────────────────────────── */
  function applyFilters(records: PaymentRecord[]) {
    let list = records;

    // Période
    if (periodFilter !== "all") {
      const now = new Date();
      list = list.filter(r => {
        const d = new Date(r.enrolledAt);
        if (periodFilter === "month") {
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        return d.getFullYear() === now.getFullYear();
      });
    }

    // Recherche
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r =>
        r.studentName.toLowerCase().includes(q) ||
        r.studentPhone.includes(q) ||
        r.classeTitle.toLowerCase().includes(q)
      );
    }

    return list;
  }

  function formatDate(iso: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  /* ── Export CSV corrigé ───────────────────────────────── */
  function exportCSV() {
    const list = applyFilters(payments);
    if (list.length === 0) return;

    // ⚠️ Échappe les valeurs : un nom contenant une virgule cassait le fichier
    const esc = (v: any) => {
      const s = String(v ?? "");
      return `"${s.replace(/"/g, '""')}"`;
    };

    const headers = isRTL
      ? ["التاريخ", "الطالب", "الهاتف", "الدرس", "المادة", "المبلغ (دج)"]
      : ["Date", "Élève", "Téléphone", "Cours", "Matière", "Montant (DA)"];

    const rows = list.map(p => [
      formatDate(p.enrolledAt),
      p.studentName,
      p.studentPhone,
      p.classeTitle,
      trSubject(p.classeSubject, isRTL),
      p.amount,
    ]);

    // Point-virgule : Excel FR/AR l'utilise comme séparateur par défaut
    const csv = [headers, ...rows]
      .map(r => r.map(esc).join(";"))
      .join("\r\n");

    // BOM UTF-8 pour qu'Excel affiche correctement les accents et l'arabe
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `paiements-ostadi-${periodFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // ⚠️ évite la fuite mémoire
  }

  if (loading || loadingData) return (
    <div className="hp-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '46px', height: '46px' }}>
        <div style={{ position: 'absolute', inset: 0, border: '3px solid rgba(124,58,237,0.15)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 0, border: '3px solid transparent', borderTopColor: '#22C55E', borderRadius: '50%', animation: 'hpspin 0.8s linear infinite' }} />
      </div>
      <style jsx global>{`
        @keyframes hpspin { to { transform: rotate(360deg); } }
        .hp-page { background: #0A0014; min-height: 100vh; }
      `}</style>
    </div>
  );

  const filtered = applyFilters(payments);
  const totalAmount = filtered.reduce((s, p) => s + p.amount, 0);
  const commission = Math.round(totalAmount * COMMISSION_RATE);
  const net = totalAmount - commission;
  const uniqueStudents = new Set(filtered.map(p => p.studentPhone)).size;

  const periodLabel = periodFilter === "all"
    ? ""
    : periodFilter === "month"
      ? (isRTL ? "هذا الشهر" : "ce mois")
      : (isRTL ? "هذه السنة" : "cette année");

  return (
    <div className="hp-page" dir={isRTL ? "rtl" : "ltr"}>
      <div className="hp-container">

        <Link href="/dashboard" className="hp-back">
          <ArrowLeft size={15} style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
          {isRTL ? "لوحة التحكم" : "Dashboard"}
        </Link>

        {/* ═══ HEADER ═══ */}
        <div className="hp-header">
          <div className="hp-header-icon"><Wallet size={20} /></div>
          <div style={{ flex: 1 }}>
            <h1 className="hp-title">
              {isRTL ? "سجل المدفوعات" : "Historique des paiements"}
            </h1>
            <p className="hp-sub">
              {isRTL ? "كل المدفوعات المستلمة من طلابك" : "Tous les paiements reçus de vos élèves"}
            </p>
          </div>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="hp-export"
          >
            <Download size={14} /> CSV
          </button>
        </div>

        {/* ═══ RÉSUMÉ ═══ */}
        <div className="hp-summary">
          <div className="hp-summary-main">
            <span className="hp-summary-label">
              {isRTL ? "الإيراد الإجمالي" : "Revenu total"} {periodLabel}
            </span>
            <span className="hp-summary-value">
              {totalAmount.toLocaleString()} <em>DA</em>
            </span>
            <span className="hp-summary-count">
              {filtered.length} {isRTL ? "معاملة" : filtered.length > 1 ? "transactions" : "transaction"}
              {" · "}
              {uniqueStudents} {isRTL ? "طالب" : uniqueStudents > 1 ? "élèves" : "élève"}
            </span>
          </div>

          <div className="hp-breakdown">
            <div className="hp-break-row">
              <span><Percent size={12} /> {isRTL ? "عمولة أستاذي (10%)" : "Commission Ostadi (10%)"}</span>
              <b className="hp-neg">− {commission.toLocaleString()} DA</b>
            </div>
            <div className="hp-break-divider" />
            <div className="hp-break-row hp-break-net">
              <span>{isRTL ? "صافي أرباحك" : "Votre net"}</span>
              <b>{net.toLocaleString()} DA</b>
            </div>
          </div>
        </div>

        {/* ═══ FILTRES ═══ */}
        <div className="hp-filters">
          <div className="hp-tabs">
            {[
              { id: "all", label: isRTL ? "الكل" : "Tout" },
              { id: "month", label: isRTL ? "هذا الشهر" : "Ce mois" },
              { id: "year", label: isRTL ? "هذه السنة" : "Cette année" },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setPeriodFilter(t.id as any)}
                className={`hp-tab ${periodFilter === t.id ? "hp-tab-on" : ""}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="hp-search">
            <Search size={14} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isRTL ? "ابحث عن طالب..." : "Rechercher un élève..."}
            />
            {search && (
              <button onClick={() => setSearch("")}><X size={13} /></button>
            )}
          </div>
        </div>

        {/* ═══ LISTE ═══ */}
        {filtered.length === 0 ? (
          <div className="hp-empty">
            <div className="hp-empty-icon"><Wallet size={28} /></div>
            <p>
              {search
                ? (isRTL ? "لا توجد نتائج" : "Aucun résultat")
                : (isRTL ? "لا توجد مدفوعات لهذه الفترة" : "Aucun paiement pour cette période")}
            </p>
          </div>
        ) : (
          <div className="hp-list">
            {filtered.map(p => (
              <div key={p.id} className="hp-row">
                <div className="hp-avatar">{p.studentName.charAt(0).toUpperCase()}</div>
                <div className="hp-info">
                  <div className="hp-student">{p.studentName}</div>
                  <div className="hp-course">
                    {p.classeTitle}
                    <span className="hp-dot" />
                    {trSubject(p.classeSubject, isRTL)}
                  </div>
                  <div className="hp-date">
                    <Calendar size={11} /> {formatDate(p.enrolledAt)}
                    <span className="hp-dot" />
                    <Users size={11} /> {p.studentPhone}
                  </div>
                </div>
                <div className="hp-amount">+{p.amount.toLocaleString()} DA</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        .hp-page {
          background: #0A0014; min-height: 100vh;
          background-image:
            radial-gradient(circle at 18% 8%, rgba(34,197,94,0.06) 0%, transparent 45%),
            radial-gradient(circle at 82% 15%, rgba(124,58,237,0.08) 0%, transparent 45%),
            linear-gradient(rgba(168,85,247,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168,85,247,0.022) 1px, transparent 1px);
          background-size: auto, auto, 44px 44px, 44px 44px;
          padding: 28px 16px 60px;
        }
        .hp-container { max-width: 760px; margin: 0 auto; }

        .hp-back {
          display: inline-flex; align-items: center; gap: 7px;
          color: #a78bfa; text-decoration: none; font-size: 13px; font-weight: 600;
          margin-bottom: 20px; padding: 7px 13px; border-radius: 10px; transition: all 0.2s ease;
        }
        .hp-back:hover { background: rgba(124,58,237,0.12); color: white; gap: 9px; }

        .hp-header { display: flex; align-items: center; gap: 13px; margin-bottom: 20px; flex-wrap: wrap; }
        .hp-header-icon {
          width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
          background: linear-gradient(135deg, rgba(34,197,94,0.2), rgba(124,58,237,0.14));
          border: 1px solid rgba(34,197,94,0.3);
          display: flex; align-items: center; justify-content: center; color: #22C55E;
        }
        .hp-title { color: white; font-weight: 900; font-size: 21px; margin: 0; letter-spacing: -0.4px; }
        .hp-sub { color: #8b7bb8; font-size: 12.5px; margin: 3px 0 0; }
        .hp-export {
          display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0;
          background: rgba(124,58,237,0.15); color: #d8b4fe;
          border: 1px solid rgba(168,85,247,0.28);
          padding: 10px 17px; border-radius: 11px;
          font-size: 12.5px; font-weight: 700; cursor: pointer; transition: all 0.2s ease;
        }
        .hp-export:hover:not(:disabled) { background: rgba(124,58,237,0.26); color: white; }
        .hp-export:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── Résumé ── */
        .hp-summary {
          display: flex; gap: 22px; flex-wrap: wrap; align-items: center;
          background: linear-gradient(140deg, rgba(34,197,94,0.09), rgba(124,58,237,0.07));
          border: 1px solid rgba(34,197,94,0.24); border-radius: 18px;
          padding: 22px; margin-bottom: 20px;
        }
        .hp-summary-main { flex: 1; min-width: 180px; }
        .hp-summary-label { display: block; color: #a78bfa; font-size: 12px; font-weight: 600; margin-bottom: 5px; }
        .hp-summary-value {
          display: block; color: #22C55E; font-weight: 900; font-size: 30px;
          letter-spacing: -1px; line-height: 1;
        }
        .hp-summary-value em { font-size: 16px; font-style: normal; }
        .hp-summary-count { display: block; color: #8b7bb8; font-size: 11.5px; margin-top: 7px; }

        .hp-breakdown {
          min-width: 220px; flex: 1;
          background: rgba(10,0,20,0.35); border-radius: 13px; padding: 14px 16px;
        }
        .hp-break-row {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
        }
        .hp-break-row span {
          display: inline-flex; align-items: center; gap: 6px;
          color: #a78bfa; font-size: 12px;
        }
        .hp-break-row b { color: white; font-size: 13px; font-weight: 800; }
        .hp-neg { color: #f87171 !important; }
        .hp-break-divider { height: 1px; background: rgba(124,58,237,0.18); margin: 10px 0; }
        .hp-break-net span { color: #c4b5fd; font-weight: 600; font-size: 12.5px; }
        .hp-break-net b { color: #22C55E !important; font-size: 16px; }

        /* ── Filtres ── */
        .hp-filters {
          display: flex; gap: 12px; flex-wrap: wrap; align-items: center;
          margin-bottom: 18px;
        }
        .hp-tabs { display: flex; gap: 6px; }
        .hp-tab {
          background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.18);
          color: #a78bfa; padding: 9px 16px; border-radius: 10px;
          font-size: 12.5px; font-weight: 700; cursor: pointer; transition: all 0.2s ease;
        }
        .hp-tab:hover { background: rgba(124,58,237,0.16); }
        .hp-tab-on { background: #FF8C00; border-color: #FF8C00; color: white; }

        .hp-search {
          display: flex; align-items: center; gap: 8px; flex: 1; min-width: 180px;
          background: rgba(26,10,60,0.6); border: 1px solid rgba(124,58,237,0.22);
          border-radius: 11px; padding: 0 12px;
          transition: border-color 0.2s ease;
        }
        .hp-search:focus-within { border-color: rgba(255,140,0,0.45); }
        .hp-search > svg { color: #6d28d9; flex-shrink: 0; }
        .hp-search input {
          flex: 1; background: transparent; border: none; outline: none;
          color: white; font-size: 13px; font-family: inherit; padding: 10px 0;
        }
        .hp-search input::placeholder { color: #6d28d9; }
        .hp-search button {
          background: none; border: none; color: #6d28d9; cursor: pointer;
          display: flex; padding: 0; flex-shrink: 0;
        }
        .hp-search button:hover { color: #a78bfa; }

        /* ── Liste ── */
        .hp-list { display: flex; flex-direction: column; gap: 9px; }
        .hp-row {
          display: flex; align-items: center; gap: 13px;
          background: linear-gradient(145deg, rgba(20,8,45,0.88), rgba(15,5,30,0.88));
          border: 1px solid rgba(124,58,237,0.15); border-radius: 15px; padding: 14px 16px;
          transition: border-color 0.24s ease, transform 0.24s ease;
        }
        .hp-row:hover { border-color: rgba(34,197,94,0.28); transform: translateY(-1px); }
        .hp-avatar {
          width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0;
          background: linear-gradient(140deg, rgba(124,58,237,0.42), rgba(124,58,237,0.14));
          border: 1px solid rgba(168,85,247,0.24);
          display: flex; align-items: center; justify-content: center;
          color: #e9d5ff; font-weight: 800; font-size: 16px;
        }
        .hp-info { flex: 1; min-width: 0; }
        .hp-student { color: white; font-weight: 700; font-size: 13.5px; }
        .hp-course {
          display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
          color: #a78bfa; font-size: 12px; margin-top: 2px;
        }
        .hp-date {
          display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
          color: #6d28d9; font-size: 10.5px; margin-top: 4px;
        }
        .hp-dot {
          width: 3px; height: 3px; border-radius: 50%;
          background: rgba(124,58,237,0.4); flex-shrink: 0;
        }
        .hp-amount {
          color: #22C55E; font-weight: 800; font-size: 14.5px; flex-shrink: 0;
        }

        /* ── Vide ── */
        .hp-empty { text-align: center; padding: 60px 20px; }
        .hp-empty-icon {
          width: 62px; height: 62px; border-radius: 18px; margin: 0 auto 14px;
          background: rgba(124,58,237,0.09); display: flex; align-items: center; justify-content: center;
          color: #7c3aed;
        }
        .hp-empty p { color: #8b7bb8; font-size: 14px; margin: 0; }
      `}</style>
    </div>
  );
}
