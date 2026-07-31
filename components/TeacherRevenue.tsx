"use client";
import { useState, useEffect } from "react";
import { getTeacherEarnings } from "@/lib/firestore";
import { TeacherEarnings } from "@/lib/types";
import { TrendingUp, Users, Wallet, AlertCircle, Calendar, CalendarDays } from "lucide-react";
import { useLang } from "@/lib/lang-context";

interface TeacherRevenueProps {
  teacherId: string;
}

export default function TeacherRevenue({ teacherId }: TeacherRevenueProps) {
  const { isRTL } = useLang();
  const [earnings, setEarnings] = useState<TeacherEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "year">("month");
  const [error, setError] = useState(false);

  useEffect(() => {
    getTeacherEarnings(teacherId)
      .then(setEarnings)
      .catch(err => {
        // ⚠️ AVANT : pas de .catch() — le composant disparaissait
        // silencieusement si le calcul échouait
        console.error("Calcul des revenus échoué :", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [teacherId]);

  if (loading) return (
    <div className="ostadi-rev-card">
      <div className="ostadi-rev-skeleton" style={{ height: '120px' }} />
    </div>
  );

  if (error) return (
    <div className="ostadi-rev-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0' }}>
        <AlertCircle size={17} style={{ color: '#f87171', flexShrink: 0 }} />
        <span style={{ color: '#fca5a5', fontSize: '13px' }}>
          {isRTL ? "تعذّر حساب الأرباح" : "Impossible de calculer vos revenus"}
        </span>
      </div>
    </div>
  );

  if (!earnings) return null;

  const students = view === "month" ? earnings.monthlyStudents : earnings.yearlyStudents;
  const revenue = view === "month" ? earnings.monthlyRevenue : earnings.yearlyRevenue;
  const commission = view === "month" ? earnings.monthlyCommissionDue : earnings.yearlyCommissionDue;
  const netEarnings = revenue - commission;

  return (
    <div className="ostadi-rev-card">
      {/* Header with toggle */}
      <div className="ostadi-rev-header">
        <h2 className="ostadi-rev-title">
          <Wallet size={17} style={{ color: '#FF8C00' }} />
          {isRTL ? "أرباحي" : "Mes Revenus"}
        </h2>
        <div className="ostadi-rev-toggle">
          <button
            onClick={() => setView("month")}
            className={`ostadi-rev-toggle-btn ${view === "month" ? "ostadi-rev-toggle-active" : ""}`}
          >
            <Calendar size={13} /> {isRTL ? "هذا الشهر" : "Ce mois"}
          </button>
          <button
            onClick={() => setView("year")}
            className={`ostadi-rev-toggle-btn ${view === "year" ? "ostadi-rev-toggle-active" : ""}`}
          >
            <CalendarDays size={13} /> {isRTL ? "هذه السنة" : "Cette année"}
          </button>
        </div>
      </div>

      {/* Main stats grid */}
      <div className="ostadi-rev-grid">
        <div className="ostadi-rev-stat">
          <div className="ostadi-rev-stat-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <Users size={18} style={{ color: '#60a5fa' }} />
          </div>
          <div>
            <div className="ostadi-rev-stat-value">{students}</div>
            <div className="ostadi-rev-stat-label">Élèves inscrits</div>
          </div>
        </div>

        <div className="ostadi-rev-stat">
          <div className="ostadi-rev-stat-icon" style={{ background: 'rgba(52,211,153,0.15)' }}>
            <TrendingUp size={18} style={{ color: '#34d399' }} />
          </div>
          <div>
            <div className="ostadi-rev-stat-value">{revenue.toLocaleString()} <span style={{ fontSize: '13px' }}>{isRTL ? 'دج' : 'DA'}</span></div>
            <div className="ostadi-rev-stat-label">Revenu brut</div>
          </div>
        </div>
      </div>

      {/* Commission breakdown */}
      <div className="ostadi-rev-breakdown">
        <div className="ostadi-rev-breakdown-row">
          <span className="ostadi-rev-breakdown-label">Revenu total ({view === "month" ? "mois" : "année"})</span>
          <span className="ostadi-rev-breakdown-value">{revenue.toLocaleString()} {isRTL ? 'دج' : 'DA'}</span>
        </div>
        <div className="ostadi-rev-breakdown-row">
          <span className="ostadi-rev-breakdown-label">
            Commission Ostadi ({(earnings.platformCommissionRate * 100).toFixed(0)}%)
          </span>
          <span className="ostadi-rev-breakdown-value" style={{ color: '#fca5a5' }}>
            − {commission.toLocaleString()} DA
          </span>
        </div>
        <div className="ostadi-rev-divider" />
        <div className="ostadi-rev-breakdown-row">
          <span className="ostadi-rev-breakdown-label" style={{ fontWeight: 700, color: 'white' }}>{isRTL ? "صافي أرباحك" : "Votre net"}</span>
          <span className="ostadi-rev-net-value">{netEarnings.toLocaleString()} {isRTL ? 'دج' : 'DA'}</span>
        </div>
      </div>

      {/* Alert if commission due */}
      {commission > 0 && (
        <div className="ostadi-rev-alert">
          <AlertCircle size={16} style={{ flexShrink: 0, color: '#FF8C00' }} />
          <p>
            Vous devez <strong>{commission.toLocaleString()} {isRTL ? 'دج' : 'DA'}</strong> à Ostadi pour {view === "month" ? "ce mois" : "cette année"}.
            Envoyez via BaridiMob ou CIB — coordonnées dans <a href="/abonnement">Mon Abonnement</a>.
          </p>
        </div>
      )}

      <style jsx global>{`
        .ostadi-rev-card {
          background: linear-gradient(145deg, rgba(20,8,45,0.9), rgba(15,5,30,0.9));
          border: 1px solid rgba(124,58,237,0.2);
          border-radius: 18px;
          padding: 22px;
        }
        .ostadi-rev-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 18px; }
        .ostadi-rev-title { color: white; font-weight: 800; font-size: 16px; margin: 0; display: flex; align-items: center; gap: 8px; }
        .ostadi-rev-toggle { display: flex; background: rgba(124,58,237,0.1); border-radius: 10px; padding: 3px; gap: 2px; }
        .ostadi-rev-toggle-btn {
          display: flex; align-items: center; gap: 5px;
          background: none; border: none; color: #a78bfa; font-size: 12px; font-weight: 600;
          padding: 7px 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;
        }
        .ostadi-rev-toggle-active { background: #FF8C00; color: white; }

        .ostadi-rev-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
        .ostadi-rev-stat { display: flex; align-items: center; gap: 12px; background: rgba(124,58,237,0.06); border-radius: 14px; padding: 14px; }
        .ostadi-rev-stat-icon { width: 40px; height: 40px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ostadi-rev-stat-value { color: white; font-weight: 800; font-size: 19px; line-height: 1.1; }
        .ostadi-rev-stat-label { color: #a78bfa; font-size: 11.5px; margin-top: 2px; }

        .ostadi-rev-breakdown { background: rgba(10,0,20,0.4); border-radius: 14px; padding: 16px; }
        .ostadi-rev-breakdown-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; }
        .ostadi-rev-breakdown-label { color: #a78bfa; font-size: 13px; }
        .ostadi-rev-breakdown-value { color: white; font-weight: 600; font-size: 13.5px; }
        .ostadi-rev-divider { height: 1px; background: rgba(124,58,237,0.2); margin: 8px 0; }
        .ostadi-rev-net-value { color: #34d399; font-weight: 800; font-size: 17px; }

        .ostadi-rev-alert {
          display: flex; align-items: flex-start; gap: 10px; margin-top: 16px;
          background: rgba(255,140,0,0.08); border: 1px solid rgba(255,140,0,0.25);
          border-radius: 12px; padding: 12px 14px;
        }
        .ostadi-rev-alert p { color: #fdba74; font-size: 12.5px; line-height: 1.6; margin: 0; }
        .ostadi-rev-alert a { color: #FF8C00; font-weight: 700; text-decoration: underline; }

        .ostadi-rev-skeleton {
          background: linear-gradient(90deg, rgba(124,58,237,0.08) 25%, rgba(124,58,237,0.18) 50%, rgba(124,58,237,0.08) 75%);
          background-size: 200% 100%; border-radius: 12px; animation: shimmer 1.6s ease-in-out infinite;
        }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </div>
  );
}
