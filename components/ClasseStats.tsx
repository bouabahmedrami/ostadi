"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang-context";
import { trSubject } from "@/lib/i18n/translate";
import { getTeacherClassesStats } from "@/lib/firestore";
import {
  Eye, TrendingUp, Users, Inbox, Loader2, BarChart3,
  ArrowRight, Lightbulb,
} from "lucide-react";
import Link from "next/link";

/**
 * Performance des annonces.
 *
 * Un professeur publie un cours et attend, sans savoir si personne ne
 * le voit ou si les visiteurs renoncent au moment de s'inscrire.
 * Ces chiffres lui disent où ça bloque — et quoi corriger.
 */
export default function ClasseStats({ teacherId }: { teacherId: string }) {
  const { isRTL } = useLang();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [teacherId]);

  async function load() {
    setLoading(true);
    try {
      setList(await getTeacherClassesStats(teacherId));
    } catch (err) {
      console.error("Chargement des statistiques échoué :", err);
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 34 }}>
        <Loader2 size={22} style={{ color: "#FF8C00", animation: "sp 0.8s linear infinite" }} />
        <style>{`@keyframes sp { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <p style={{ color: "#6d28d9", fontSize: 13, textAlign: "center", padding: "24px 0" }}>
        {isRTL ? "لم تنشئ أي درس بعد." : "Vous n'avez pas encore créé de cours."}
      </p>
    );
  }

  const totals = list.reduce(
    (a, c) => ({
      views: a.views + c.views,
      views7: a.views7 + c.viewsLast7Days,
      requests: a.requests + c.requests,
      enrollments: a.enrollments + c.enrollments,
    }),
    { views: 0, views7: 0, requests: 0, enrollments: 0 }
  );

  const globalConv = totals.views > 0
    ? Math.round((totals.enrollments / totals.views) * 100)
    : 0;

  /* ── Diagnostic — l'intérêt réel de cet écran ── */
  function advice() {
    if (totals.views < 20) {
      return isRTL
        ? "دروسك لم تُشاهَد كثيراً بعد. شاركها على فيسبوك وواتساب لجذب أول الطلاب."
        : "Vos cours sont encore peu vus. Partagez-les sur Facebook et WhatsApp pour attirer vos premiers élèves.";
    }
    if (totals.requests === 0) {
      return isRTL
        ? "الزوار يشاهدون لكن لا يطلبون. راجع السعر أو أضف وصفاً أوضح لما سيتعلّمونه."
        : "Des visiteurs regardent mais ne demandent rien. Revoyez le prix, ou détaillez ce que l'élève va apprendre.";
    }
    const rate = Math.round((totals.requests / totals.views) * 100);
    if (rate < 5) {
      return isRTL
        ? "نسبة الطلبات منخفضة. صورة شخصية وسيرة ذاتية واضحة تزيد الثقة كثيراً."
        : "Peu de visiteurs passent à l'action. Une photo de profil et une bio détaillée changent beaucoup la donne.";
    }
    if (totals.enrollments < totals.requests * 0.5) {
      return isRTL
        ? "طلبات كثيرة لم تُقبل بعد. الردّ السريع يحوّل أكثر — الطالب الذي ينتظر يذهب لغيرك."
        : "Beaucoup de demandes restent en attente. Répondre vite convertit mieux — un élève qui attend va voir ailleurs.";
    }
    return isRTL
      ? "أداء جيد. واصل نشر دروسك بانتظام للحفاظ على الزخم."
      : "Bonne performance. Continuez à publier régulièrement pour garder cette dynamique.";
  }

  return (
    <div>
      {/* ═══ TOTAUX ═══ */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 10, marginBottom: 14,
      }}>
        <Box icon={<Eye size={15} />} value={totals.views}
          label={isRTL ? "مشاهدات" : "Vues"} color="#3B82F6"
          sub={totals.views7 > 0 ? `+${totals.views7} ${isRTL ? "هذا الأسبوع" : "cette semaine"}` : undefined} />
        <Box icon={<Inbox size={15} />} value={totals.requests}
          label={isRTL ? "طلبات" : "Demandes"} color="#a78bfa" />
        <Box icon={<Users size={15} />} value={totals.enrollments}
          label={isRTL ? "تسجيلات" : "Inscrits"} color="#22C55E" />
        <Box icon={<TrendingUp size={15} />} value={`${globalConv}%`}
          label={isRTL ? "التحويل" : "Conversion"} color="#FF8C00" />
      </div>

      {/* ═══ CONSEIL ═══ */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.22)",
        borderRadius: 12, padding: "12px 14px", marginBottom: 16,
      }}>
        <Lightbulb size={15} style={{ color: "#fbbf24", flexShrink: 0, marginTop: 1 }} />
        <p style={{ color: "#fde68a", fontSize: 12, margin: 0, lineHeight: 1.6 }}>
          {advice()}
        </p>
      </div>

      {/* ═══ PAR COURS ═══ */}
      <h4 style={{
        display: "flex", alignItems: "center", gap: 8,
        color: "#a78bfa", fontSize: 11.5, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 10px",
      }}>
        <BarChart3 size={14} style={{ color: "#FF8C00" }} />
        {isRTL ? "حسب الدرس" : "Détail par cours"}
      </h4>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map(c => {
          const maxViews = Math.max(list[0]?.views || 1, 1);
          return (
            <Link
              key={c.classeId}
              href={`/classe/${c.classeId}`}
              style={{
                display: "block", textDecoration: "none",
                background: "rgba(20,8,45,0.55)",
                border: "1px solid rgba(124,58,237,0.16)",
                borderRadius: 12, padding: "12px 14px",
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                marginBottom: 9, flexWrap: "wrap",
              }}>
                <span style={{
                  color: "white", fontWeight: 650, fontSize: 13, flex: 1, minWidth: 110,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{c.title}</span>

                <span style={{
                  background: "rgba(124,58,237,0.16)", color: "#c4b5fd",
                  fontSize: 10.5, fontWeight: 600, padding: "3px 9px", borderRadius: 7,
                }}>{trSubject(c.subject, isRTL)}</span>

                {c.pendingRequests > 0 && (
                  <span style={{
                    background: "rgba(255,140,0,0.18)", color: "#FF8C00",
                    fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 7,
                  }}>
                    {c.pendingRequests} {isRTL ? "في الانتظار" : "en attente"}
                  </span>
                )}

                <ArrowRight size={13} style={{
                  color: "#6d28d9", flexShrink: 0,
                  transform: isRTL ? "scaleX(-1)" : "none",
                }} />
              </div>

              {/* Barre de vues, relative au meilleur cours */}
              <div style={{
                height: 5, background: "rgba(124,58,237,0.12)",
                borderRadius: 999, overflow: "hidden", marginBottom: 8,
              }}>
                <div style={{
                  height: "100%",
                  width: `${Math.max((c.views / maxViews) * 100, 2)}%`,
                  background: "linear-gradient(90deg, #3B82F6, #7C3AED)",
                  borderRadius: 999,
                }} />
              </div>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <Mini icon={<Eye size={11} />} value={c.views}
                  label={isRTL ? "مشاهدة" : "vues"} color="#60a5fa" />
                <Mini icon={<Inbox size={11} />} value={c.requests}
                  label={isRTL ? "طلب" : "demandes"} color="#a78bfa" />
                <Mini icon={<Users size={11} />} value={c.enrollments}
                  label={isRTL ? "مسجّل" : "inscrits"} color="#4ade80" />
                {c.views > 0 && (
                  <Mini icon={<TrendingUp size={11} />} value={`${c.conversionRate}%`}
                    label={isRTL ? "تحويل" : "conversion"} color="#FF8C00" />
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <style>{`@keyframes sp { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Box({ icon, value, label, color, sub }: any) {
  return (
    <div style={{
      background: "rgba(20,8,45,0.6)",
      border: "1px solid rgba(124,58,237,0.16)",
      borderRadius: 12, padding: "12px 13px", textAlign: "center",
    }}>
      <div style={{ color, display: "flex", justifyContent: "center", marginBottom: 5 }}>{icon}</div>
      <div style={{ color: "white", fontWeight: 800, fontSize: 17 }}>{value}</div>
      <div style={{ color: "#8b7bb8", fontSize: 10.5 }}>{label}</div>
      {sub && <div style={{ color: "#4ade80", fontSize: 9.5, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Mini({ icon, value, label, color }: any) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      color: "#8b7bb8", fontSize: 11,
    }}>
      <span style={{ color, display: "flex" }}>{icon}</span>
      <b style={{ color: "white", fontWeight: 700 }}>{value}</b> {label}
    </span>
  );
}
