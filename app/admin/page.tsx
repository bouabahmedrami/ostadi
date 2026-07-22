"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  getPlatformStats, getAllVerifications,
  getAllPendingSubscriptions, approveVerification,
  rejectVerification, activateSubscription, rejectSubscription
} from "@/lib/firestore";
import {
  Users, BookOpen, ShieldCheck, Crown,
  CheckCircle, XCircle, Clock, TrendingUp,
  BarChart2, AlertTriangle, Eye
} from "lucide-react";
import Link from "next/link";

function StatCard({ label, value, icon, color }: {
  label: string; value: string | number; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-black text-white">{value}</div>
        <div className="text-sm text-purple-400">{label}</div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [tab, setTab] = useState<"overview" | "verifications" | "subscriptions">("overview");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || (profile as any)?.role !== "admin")) {
      router.push("/");
    }
  }, [user, profile, loading]);

  useEffect(() => {
    if (user && (profile as any)?.role === "admin") loadData();
  }, [user, profile]);

  async function loadData() {
    setLoadingData(true);
    try {
      const [s, v, sub] = await Promise.all([
        getPlatformStats(),
        getAllVerifications(),
        getAllPendingSubscriptions(),
      ]);
      setStats(s);
      setVerifications(v);
      setSubscriptions(sub);
    } finally {
      setLoadingData(false);
    }
  }

  async function handleApproveVerification(id: string, teacherId: string) {
    setActionLoading(id);
    try {
      await approveVerification(id, teacherId);
      await loadData();
    } finally { setActionLoading(null); }
  }

  async function handleRejectVerification(id: string, teacherId: string) {
    if (!rejectReason.trim()) return;
    setActionLoading(id);
    try {
      await rejectVerification(id, teacherId, rejectReason);
      setRejectingId(null);
      setRejectReason("");
      await loadData();
    } finally { setActionLoading(null); }
  }

  async function handleActivateSubscription(sub: any) {
    setActionLoading(sub.id);
    try {
      await activateSubscription(sub.id, sub.teacherId, sub.endDate);
      await loadData();
    } finally { setActionLoading(null); }
  }

  async function handleRejectSubscription(id: string) {
    setActionLoading(id);
    try {
      await rejectSubscription(id);
      await loadData();
    } finally { setActionLoading(null); }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-DZ", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  if (loading || loadingData) return (
    <div className="flex items-center justify-center min-h-screen text-purple-400 grid-bg">
      Chargement...
    </div>
  );

  const pendingVerif = verifications.filter((v: any) => v.status === "pending");

  return (
    <div className="grid-bg min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <BarChart2 className="w-7 h-7 text-[#FF8C00]" />
              Admin Panel — Ostadi
            </h1>
            <p className="text-purple-400 text-sm mt-1">Tableau de bord administrateur</p>
          </div>
          {(pendingVerif.length > 0 || subscriptions.length > 0) && (
            <div className="flex items-center gap-2 badge-red animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              {pendingVerif.length + subscriptions.length} en attente
            </div>
          )}
        </div>

        {/* Stats grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <StatCard label="Professeurs" value={stats.totalTeachers} icon={<Users className="w-5 h-5 text-purple-300" />} color="bg-purple-900/60" />
            <StatCard label="Élèves" value={stats.totalStudents} icon={<Users className="w-5 h-5 text-blue-300" />} color="bg-blue-900/40" />
            <StatCard label="Cours" value={stats.totalClasses} icon={<BookOpen className="w-5 h-5 text-emerald-300" />} color="bg-emerald-900/40" />
            <StatCard label="Vérifications" value={stats.pendingVerifications} icon={<ShieldCheck className="w-5 h-5 text-amber-300" />} color="bg-amber-900/40" />
            <StatCard label="Abonnements" value={stats.activeSubscriptions} icon={<Crown className="w-5 h-5 text-[#FF8C00]" />} color="bg-orange-900/40" />
            <StatCard label="Revenus/mois" value={`${stats.monthlyRevenue.toLocaleString()} DA`} icon={<TrendingUp className="w-5 h-5 text-emerald-300" />} color="bg-emerald-900/40" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { id: "overview", label: "Aperçu", badge: null },
            { id: "verifications", label: "Vérifications", badge: pendingVerif.length },
            { id: "subscriptions", label: "Abonnements", badge: subscriptions.length },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                tab === t.id
                  ? "bg-purple-700 text-white"
                  : "text-purple-400 hover:text-white border border-purple-800/50"
              }`}
            >
              {t.label}
              {t.badge !== null && t.badge > 0 && (
                <span className="bg-[#FF8C00] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-black">
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {tab === "overview" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#FF8C00]" />
                Dernières vérifications
              </h2>
              {verifications.slice(0, 5).map((v: any) => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b border-purple-900/30 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-white">{v.teacherName}</div>
                    <div className="text-xs text-purple-400">{formatDate(v.submittedAt)}</div>
                  </div>
                  <span className={`badge ${
                    v.status === "approved" ? "badge-green" :
                    v.status === "rejected" ? "badge-red" :
                    "badge-orange"
                  }`}>
                    {v.status === "approved" ? "✅ Approuvé" : v.status === "rejected" ? "❌ Refusé" : "⏳ En attente"}
                  </span>
                </div>
              ))}
            </div>

            <div className="card">
              <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#FF8C00]" />
                Abonnements en attente
              </h2>
              {subscriptions.length === 0 ? (
                <p className="text-purple-400 text-sm">Aucun abonnement en attente</p>
              ) : subscriptions.slice(0, 5).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-purple-900/30 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-white">{s.teacherName}</div>
                    <div className="text-xs text-purple-400">{s.amount.toLocaleString()} DA · {s.paymentMethod}</div>
                  </div>
                  <span className="badge-orange">⏳ En attente</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verifications tab */}
        {tab === "verifications" && (
          <div className="flex flex-col gap-4">
            {verifications.length === 0 ? (
              <div className="card text-center py-12 text-purple-400">
                <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Aucune vérification</p>
              </div>
            ) : verifications.map((v: any) => (
              <div key={v.id} className={`card border ${
                v.status === "pending" ? "border-amber-500/30" :
                v.status === "approved" ? "border-emerald-500/20" :
                "border-red-500/20"
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white">{v.teacherName}</span>
                      <span className={`badge ${
                        v.status === "approved" ? "badge-green" :
                        v.status === "rejected" ? "badge-red" :
                        "badge-orange"
                      }`}>
                        {v.status === "approved" ? "✅ Approuvé" :
                         v.status === "rejected" ? "❌ Refusé" : "⏳ En attente"}
                      </span>
                    </div>
                    <div className="text-xs text-purple-400 mb-2">
                      Soumis le {formatDate(v.submittedAt)}
                    </div>
                    {v.bio && (
                      <p className="text-sm text-purple-300/70 mb-2 line-clamp-2">{v.bio}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {v.subjects?.map((s: string) => (
                        <span key={s} className="badge-purple text-xs">{s}</span>
                      ))}
                    </div>
                    {/* Document links */}
                    <div className="flex gap-3">
                      {v.diplomaURL && (
                        <a href={v.diplomaURL} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-200 underline">
                          <Eye className="w-3 h-3" /> Diplôme
                        </a>
                      )}
                      {v.cinURL && (
                        <a href={v.cinURL} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-200 underline">
                          <Eye className="w-3 h-3" /> CIN
                        </a>
                      )}
                      {v.demoVideoURL && (
                        <a href={v.demoVideoURL} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-200 underline">
                          <Eye className="w-3 h-3" /> Vidéo démo
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {v.status === "pending" && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveVerification(v.id, v.teacherId)}
                        disabled={actionLoading === v.id}
                        className="flex items-center gap-1.5 bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approuver
                      </button>
                      <button
                        onClick={() => setRejectingId(v.id)}
                        className="flex items-center gap-1.5 bg-red-900/40 text-red-300 text-xs font-bold px-3 py-2 rounded-xl hover:bg-red-900/60 transition-colors border border-red-700/40"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Refuser
                      </button>
                    </div>
                  )}
                </div>

                {/* Reject reason input */}
                {rejectingId === v.id && (
                  <div className="mt-4 pt-4 border-t border-purple-900/40">
                    <input
                      className="input-field text-sm mb-2"
                      placeholder="Raison du refus..."
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRejectVerification(v.id, v.teacherId)}
                        disabled={!rejectReason.trim() || actionLoading === v.id}
                        className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-red-500 disabled:opacity-50"
                      >
                        Confirmer le refus
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectReason(""); }}
                        className="text-purple-400 text-xs px-3 py-2"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Subscriptions tab */}
        {tab === "subscriptions" && (
          <div className="flex flex-col gap-4">
            {subscriptions.length === 0 ? (
              <div className="card text-center py-12 text-purple-400">
                <Crown className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Aucun abonnement en attente</p>
              </div>
            ) : subscriptions.map((s: any) => (
              <div key={s.id} className="card border border-amber-500/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white">{s.teacherName}</span>
                      <span className="badge-orange">⏳ En attente</span>
                    </div>
                    <div className="text-xs text-purple-400 mb-2">
                      Soumis le {formatDate(s.createdAt)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-purple-500 text-xs">Plan</span>
                        <div className="text-white font-medium capitalize">{s.plan}</div>
                      </div>
                      <div>
                        <span className="text-purple-500 text-xs">Montant</span>
                        <div className="text-[#FF8C00] font-bold">{s.amount?.toLocaleString()} DA</div>
                      </div>
                      <div>
                        <span className="text-purple-500 text-xs">Méthode</span>
                        <div className="text-white font-medium uppercase">{s.paymentMethod}</div>
                      </div>
                      <div>
                        <span className="text-purple-500 text-xs">Référence paiement</span>
                        <div className="text-white font-mono text-xs">{s.paymentRef || "—"}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => handleActivateSubscription(s)}
                      disabled={actionLoading === s.id}
                      className="flex items-center gap-1.5 bg-[#FF8C00] text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-orange-500 transition-colors disabled:opacity-50"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      Activer
                    </button>
                    <button
                      onClick={() => handleRejectSubscription(s.id)}
                      disabled={actionLoading === s.id}
                      className="flex items-center gap-1.5 bg-red-900/40 text-red-300 text-xs font-bold px-3 py-2 rounded-xl hover:bg-red-900/60 border border-red-700/40 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Rejeter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
