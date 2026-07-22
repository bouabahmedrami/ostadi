"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Wallet, Calendar, Download, TrendingUp, Filter } from "lucide-react";

interface PaymentRecord {
  id: string;
  studentName: string;
  studentPhone: string;
  classeTitle: string;
  classeSubject: string;
  amount: number;
  enrolledAt: string;
}

export default function HistoriquePaiementsPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<"all" | "month" | "year">("all");

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "teacher")) router.push("/auth");
  }, [user, profile, loading]);

  useEffect(() => {
    if (user && profile?.role === "teacher") loadPayments();
  }, [user, profile]);

  async function loadPayments() {
    setLoadingData(true);
    try {
      // Get all teacher's classes
      const classesSnap = await getDocs(
        query(collection(db, "classes"), where("teacherId", "==", user!.uid))
      );
      const classesMap = new Map(
        classesSnap.docs.map(d => [d.id, d.data()])
      );

      // Get all enrollments for these classes
      const records: PaymentRecord[] = [];
      for (const [classeId, classeData] of classesMap.entries()) {
        const enrollSnap = await getDocs(
          query(collection(db, "enrollments"), where("classeId", "==", classeId))
        );
        enrollSnap.docs.forEach(d => {
          const enr = d.data();
          records.push({
            id: d.id,
            studentName: enr.studentName,
            studentPhone: enr.studentPhone,
            classeTitle: (classeData as any).title,
            classeSubject: (classeData as any).subject,
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

  function filterByPeriod(records: PaymentRecord[]) {
    if (periodFilter === "all") return records;
    const now = new Date();
    return records.filter(r => {
      const d = new Date(r.enrolledAt);
      if (periodFilter === "month") {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return d.getFullYear() === now.getFullYear();
    });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-DZ", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  function exportCSV() {
    const filtered = filterByPeriod(payments);
    const headers = ["Date", "Élève", "Téléphone", "Cours", "Matière", "Montant (DA)"];
    const rows = filtered.map(p => [
      formatDate(p.enrolledAt), p.studentName, p.studentPhone, p.classeTitle, p.classeSubject, p.amount
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `paiements-ostadi-${periodFilter}.csv`;
    link.click();
  }

  if (loading || loadingData) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#a78bfa', background: '#0A0014' }}>
      Chargement...
    </div>
  );

  const filtered = filterByPeriod(payments);
  const totalAmount = filtered.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="ostadi-history-page">
      <div className="ostadi-history-container">

        {/* Header */}
        <div className="ostadi-history-header">
          <div className="ostadi-history-icon"><Wallet size={20} /></div>
          <div>
            <h1 className="ostadi-history-title">Historique des paiements</h1>
            <p className="ostadi-history-subtitle">Tous les paiements reçus de vos élèves</p>
          </div>
        </div>

        {/* Summary card */}
        <div className="ostadi-summary-card">
          <div>
            <div className="ostadi-summary-label">Total {periodFilter === "all" ? "" : periodFilter === "month" ? "ce mois" : "cette année"}</div>
            <div className="ostadi-summary-value">{totalAmount.toLocaleString()} <span style={{ fontSize: '16px' }}>DA</span></div>
            <div className="ostadi-summary-count">{filtered.length} transaction(s)</div>
          </div>
          <button onClick={exportCSV} className="ostadi-export-btn">
            <Download size={14} /> Exporter CSV
          </button>
        </div>

        {/* Filter tabs */}
        <div className="ostadi-period-tabs">
          {[
            { id: "all", label: "Tout" },
            { id: "month", label: "Ce mois" },
            { id: "year", label: "Cette année" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setPeriodFilter(t.id as any)}
              className={`ostadi-period-tab ${periodFilter === t.id ? 'ostadi-period-tab-active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Payments list */}
        {filtered.length === 0 ? (
          <div className="ostadi-empty-history">
            <Wallet size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>Aucun paiement pour cette période</p>
          </div>
        ) : (
          <div className="ostadi-payments-list">
            {filtered.map(p => (
              <div key={p.id} className="ostadi-payment-row">
                <div className="ostadi-payment-avatar">{p.studentName.charAt(0).toUpperCase()}</div>
                <div className="ostadi-payment-info">
                  <div className="ostadi-payment-student">{p.studentName}</div>
                  <div className="ostadi-payment-course">{p.classeTitle} · {p.classeSubject}</div>
                  <div className="ostadi-payment-date">
                    <Calendar size={11} /> {formatDate(p.enrolledAt)}
                  </div>
                </div>
                <div className="ostadi-payment-amount">+{p.amount.toLocaleString()} DA</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        .ostadi-history-page {
          background: #0A0014; min-height: 100vh;
          background-image: radial-gradient(circle at 20% 10%, rgba(124,58,237,0.1) 0%, transparent 50%),
            linear-gradient(rgba(168,85,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.03) 1px, transparent 1px);
          background-size: auto, 44px 44px, 44px 44px;
          padding: 32px 16px 60px;
        }
        .ostadi-history-container { max-width: 720px; margin: 0 auto; }

        .ostadi-history-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
        .ostadi-history-icon {
          width: 46px; height: 46px; border-radius: 14px;
          background: linear-gradient(135deg, rgba(52,211,153,0.2), rgba(124,58,237,0.15));
          border: 1px solid rgba(52,211,153,0.3);
          display: flex; align-items: center; justify-content: center; color: #34d399;
        }
        .ostadi-history-title { color: white; font-weight: 900; font-size: 21px; margin: 0; letter-spacing: -0.3px; }
        .ostadi-history-subtitle { color: #a78bfa; font-size: 13px; margin: 2px 0 0; }

        .ostadi-summary-card {
          background: linear-gradient(135deg, rgba(52,211,153,0.1), rgba(124,58,237,0.08));
          border: 1px solid rgba(52,211,153,0.25); border-radius: 18px; padding: 22px;
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;
          margin-bottom: 20px;
        }
        .ostadi-summary-label { color: #a78bfa; font-size: 12.5px; font-weight: 600; margin-bottom: 4px; }
        .ostadi-summary-value { color: #34d399; font-weight: 900; font-size: 28px; }
        .ostadi-summary-count { color: #8b7bb8; font-size: 12px; margin-top: 2px; }
        .ostadi-export-btn {
          display: flex; align-items: center; gap: 7px; background: rgba(124,58,237,0.15);
          color: #d8b4fe; border: 1px solid rgba(168,85,247,0.3); padding: 10px 16px; border-radius: 11px;
          font-size: 12.5px; font-weight: 700; cursor: pointer; transition: all 0.2s ease;
        }
        .ostadi-export-btn:hover { background: rgba(124,58,237,0.25); }

        .ostadi-period-tabs { display: flex; gap: 6px; margin-bottom: 20px; }
        .ostadi-period-tab {
          background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.18); color: #a78bfa;
          padding: 8px 16px; border-radius: 10px; font-size: 12.5px; font-weight: 600; cursor: pointer;
          transition: all 0.2s ease;
        }
        .ostadi-period-tab-active { background: #FF8C00; border-color: #FF8C00; color: white; }

        .ostadi-payments-list { display: flex; flex-direction: column; gap: 8px; }
        .ostadi-payment-row {
          display: flex; align-items: center; gap: 12px;
          background: linear-gradient(145deg, rgba(20,8,45,0.9), rgba(15,5,30,0.9));
          border: 1px solid rgba(124,58,237,0.15); border-radius: 14px; padding: 14px;
          transition: border-color 0.2s ease;
        }
        .ostadi-payment-row:hover { border-color: rgba(124,58,237,0.3); }
        .ostadi-payment-avatar {
          width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
          background: linear-gradient(135deg, rgba(124,58,237,0.4), rgba(124,58,237,0.15));
          display: flex; align-items: center; justify-content: center; color: #e9d5ff; font-weight: 800;
        }
        .ostadi-payment-info { flex: 1; min-width: 0; }
        .ostadi-payment-student { color: white; font-weight: 700; font-size: 13.5px; }
        .ostadi-payment-course { color: #a78bfa; font-size: 12px; margin-top: 1px; }
        .ostadi-payment-date { display: flex; align-items: center; gap: 4px; color: #6d28d9; font-size: 11px; margin-top: 3px; }
        .ostadi-payment-amount { color: #34d399; font-weight: 800; font-size: 14.5px; flex-shrink: 0; }

        .ostadi-empty-history { text-align: center; padding: 60px 20px; color: #8b7bb8; }
      `}</style>
    </div>
  );
}
