"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import {
  getAllUsersForAdmin, suspendAccount, unsuspendAccount, changeUserRole,
} from "@/lib/firestore";
import { useToast } from "./Toast";
import { useConfirm } from "@/lib/useOptimistic";
import ConfirmDialog from "./ConfirmDialog";
import { haptic } from "@/lib/haptics";
import Sheet from "./Sheet";
import {
  Search, Ban, CheckCircle2, Trash2, Loader2, AlertTriangle,
  GraduationCap, User, ShieldAlert, RefreshCw,
} from "lucide-react";

/**
 * Gestion des comptes.
 *
 * ═══════════════════════════════════════════════════════════
 * Deux actions, volontairement inégales en accessibilité :
 *
 * • SUSPENDRE — réversible, bloque l'accès, conserve tout.
 *   C'est l'outil du quotidien : un signalement à instruire, un
 *   comportement à faire cesser, un doute à lever.
 *
 * • SUPPRIMER — définitif, détruit le profil et les données.
 *   Réservé à une demande explicite de l'intéressé ou à un compte
 *   frauduleux. Le bouton est plus discret, la confirmation plus
 *   exigeante : il faut saisir le nom exact.
 *
 * Cette asymétrie est délibérée. Un administrateur pressé doit
 * tomber naturellement sur la suspension, pas sur la suppression.
 * ═══════════════════════════════════════════════════════════
 */
export default function AccountManager() {
  const { user } = useAuth();
  const { isRTL } = useLang();
  const toast = useToast();
  const { confirm, confirmState, answerConfirm } = useConfirm();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "teacher" | "student" | "suspended">("all");
  const [busy, setBusy] = useState<string | null>(null);

  /* Suppression : confirmation par saisie du nom */
  const [target, setTarget] = useState<any>(null);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      setUsers(await getAllUsersForAdmin());
    } catch (err) {
      console.error("Chargement des comptes échoué :", err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleSuspend(u: any) {
    const suspended = !!u.suspended;

    if (!suspended) {
      const ok = await confirm(
        isRTL ? `تعليق حساب ${u.displayName}؟` : `Suspendre ${u.displayName} ?`,
        {
          message: isRTL
            ? "لن يتمكّن من الدخول. الإجراء قابل للتراجع في أيّ وقت."
            : "Il ne pourra plus se connecter. Réversible à tout moment.",
        }
      );
      if (!ok) return;
    }

    setBusy(u.uid);
    haptic("tap");
    try {
      if (suspended) {
        await unsuspendAccount(u.uid);
        toast.success(isRTL ? "تمّ رفع التعليق" : "Suspension levée");
      } else {
        await suspendAccount(u.uid, "Décision administrateur");
        toast.success(isRTL ? "تمّ التعليق" : "Compte suspendu");
      }
      await load();
    } catch (err) {
      console.error("Changement de statut échoué :", err);
      toast.error(isRTL ? "فشلت العملية" : "Action impossible");
    } finally {
      setBusy(null);
    }
  }

  /**
   * Bascule élève ↔ professeur.
   *
   * ⚠️ Remplace le cycle « supprimer puis recréer », qui ne
   * fonctionnait pas : Firebase sépare l'authentification des
   * données. Supprimer le profil Firestore laisse le compte Auth
   * intact — la personne se reconnecte, l'application lui recrée un
   * profil avec le rôle par défaut, et elle reste élève.
   */
  async function switchRole(u: any) {
    const target = u.role === "teacher" ? "student" : "teacher";

    const ok = await confirm(
      target === "teacher"
        ? (isRTL ? `تحويل ${u.displayName} إلى أستاذ؟` : `Passer ${u.displayName} en Professeur ?`)
        : (isRTL ? `تحويل ${u.displayName} إلى طالب؟` : `Passer ${u.displayName} en Élève ?`),
      {
        message: target === "teacher"
          ? (isRTL
              ? "سيتمكّن من نشر الدروس. التوثيق يبقى مطلوباً."
              : "Il pourra publier des cours. La vérification reste à faire.")
          : (isRTL
              ? "لن يعود بإمكانه نشر الدروس."
              : "Il ne pourra plus publier de cours."),
        danger: target === "student",
      }
    );
    if (!ok) return;

    setBusy(u.uid);
    haptic("tap");
    try {
      const r = await changeUserRole(u.uid, target);

      if (r.warning) {
        // Des cours actifs perdent leur professeur : on le signale
        // plutôt que de laisser découvrir le problème plus tard
        toast.toast(
          isRTL
            ? `تمّ التحويل — انتبه: ${r.warning}`
            : `Rôle changé — attention : ${r.warning}`,
          "info"
        );
      } else {
        haptic("success");
        toast.success(isRTL ? "تمّ تغيير الدور" : "Rôle modifié");
      }

      await load();
    } catch (err) {
      console.error("Changement de rôle échoué :", err);
      toast.error(isRTL ? "فشل التغيير" : "Changement impossible");
    } finally {
      setBusy(null);
    }
  }

  async function doDelete() {
    if (!target || !user) return;

    // La saisie doit correspondre exactement — un clic distrait ne
    // suffit pas à détruire un compte
    if (typed.trim() !== target.displayName) return;

    setDeleting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: target.uid }),
      });

      const data = await res.json();

      if (res.status === 409 && data.error === "has-active-classes") {
        toast.error(
          isRTL
            ? `لديه ${data.count} درس قادم مع طلبة مسجّلين. ألغِ الدروس أوّلاً.`
            : `${data.count} cours à venir avec des élèves inscrits. Annulez-les d'abord.`
        );
        return;
      }

      if (!res.ok) {
        toast.error(isRTL ? "فشل الحذف" : "Suppression impossible");
        return;
      }

      haptic("success");
      toast.success(isRTL ? "تمّ حذف الحساب" : "Compte supprimé");
      setTarget(null);
      setTyped("");
      await load();
    } catch (err) {
      console.error("Suppression échouée :", err);
      toast.error(isRTL ? "خطأ في الاتصال" : "Erreur de connexion");
    } finally {
      setDeleting(false);
    }
  }

  const filtered = users.filter(u => {
    if (filter === "suspended" && !u.suspended) return false;
    if (filter === "teacher" && u.role !== "teacher") return false;
    if (filter === "student" && u.role !== "student") return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.displayName || "").toLowerCase().includes(q)
        || (u.email || "").toLowerCase().includes(q)
        || (u.phone || "").includes(q);
  });

  const FILTERS = [
    { id: "all", fr: "Tous", ar: "الكل" },
    { id: "teacher", fr: "Professeurs", ar: "الأساتذة" },
    { id: "student", fr: "Élèves", ar: "الطلبة" },
    { id: "suspended", fr: "Suspendus", ar: "المعلّقون" },
  ];

  return (
    <div className="os-glass-2" style={{ padding: 18 }}>
      <h3 style={{
        display: "flex", alignItems: "center", gap: 9,
        color: "white", fontWeight: 750, fontSize: 15, margin: "0 0 4px",
      }}>
        <ShieldAlert size={16} style={{ color: "#FF8C00" }} />
        {isRTL ? "إدارة الحسابات" : "Gestion des comptes"}
      </h3>
      <p style={{ color: "#6d28d9", fontSize: 11.5, margin: "0 0 15px", lineHeight: 1.6 }}>
        {isRTL
          ? "التعليق قابل للتراجع ويحفظ كلّ شيء. الحذف نهائي."
          : "La suspension est réversible et conserve tout. La suppression est définitive."}
      </p>

      {/* ═══ RECHERCHE ═══ */}
      <div style={{ position: "relative", marginBottom: 11 }}>
        <Search size={14} style={{
          position: "absolute", insetInlineStart: 13, top: "50%",
          transform: "translateY(-50%)", color: "#6d28d9",
        }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={isRTL ? "اسم، بريد، أو هاتف..." : "Nom, email ou téléphone..."}
          className="os-input"
          style={{ paddingInlineStart: 36 }}
        />
      </div>

      {/* ═══ FILTRES ═══ */}
      <div style={{ display: "flex", gap: 7, marginBottom: 15, flexWrap: "wrap" }}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => { haptic("select"); setFilter(f.id as any); }}
            className={filter === f.id ? "os-chip os-chip-on" : "os-chip"}
            style={{ cursor: "pointer", fontFamily: "inherit" }}
          >
            {isRTL ? f.ar : f.fr}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 26 }}>
          <Loader2 size={20} style={{ color: "#FF8C00", animation: "amspin 0.8s linear infinite" }} />
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ color: "#6d28d9", fontSize: 12.5, textAlign: "center", padding: "18px 0", margin: 0 }}>
          {isRTL ? "لا نتائج" : "Aucun résultat"}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.slice(0, 60).map(u => (
            <div key={u.uid} style={{
              display: "flex", alignItems: "center", gap: 11,
              background: u.suspended ? "rgba(239,68,68,0.06)" : "rgba(10,0,20,0.4)",
              border: `1px solid ${u.suspended ? "rgba(239,68,68,0.22)" : "rgba(124,58,237,0.14)"}`,
              borderRadius: 12, padding: "11px 13px",
            }}>
              <span style={{
                width: 34, height: 34, borderRadius: 11, flexShrink: 0,
                background: u.role === "teacher"
                  ? "rgba(255,140,0,0.13)"
                  : "rgba(124,58,237,0.15)",
                color: u.role === "teacher" ? "#FF8C00" : "#a78bfa",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {u.role === "teacher" ? <GraduationCap size={16} /> : <User size={16} />}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap",
                }}>
                  <span style={{ color: "white", fontSize: 13, fontWeight: 650 }}>
                    {u.displayName || "—"}
                  </span>
                  {u.suspended && (
                    <span style={{
                      background: "rgba(239,68,68,0.16)", color: "#f87171",
                      fontSize: 9.5, fontWeight: 800,
                      padding: "2px 8px", borderRadius: 999,
                      textTransform: "uppercase", letterSpacing: "0.5px",
                    }}>
                      {isRTL ? "معلّق" : "suspendu"}
                    </span>
                  )}
                </div>
                <div style={{
                  color: "#6d28d9", fontSize: 10.5, marginTop: 2,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {u.email || u.phone || u.uid.slice(0, 12)}
                </div>
              </div>

              {/* Suspendre — l'action principale, bien visible */}
              <button
                onClick={() => toggleSuspend(u)}
                disabled={busy === u.uid}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
                  background: u.suspended ? "rgba(34,197,94,0.14)" : "rgba(251,191,36,0.13)",
                  color: u.suspended ? "#4ade80" : "#fbbf24",
                  border: `1px solid ${u.suspended ? "rgba(34,197,94,0.3)" : "rgba(251,191,36,0.28)"}`,
                  fontSize: 11.5, fontWeight: 700, padding: "7px 13px",
                  borderRadius: 9, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {busy === u.uid
                  ? <Loader2 size={12} style={{ animation: "amspin 0.8s linear infinite" }} />
                  : u.suspended ? <CheckCircle2 size={12} /> : <Ban size={12} />}
                {u.suspended
                  ? (isRTL ? "رفع" : "Rétablir")
                  : (isRTL ? "تعليق" : "Suspendre")}
              </button>

              {/* Changer de rôle — la solution au cas « il reste élève » */}
              <button
                onClick={() => switchRole(u)}
                disabled={busy === u.uid}
                title={u.role === "teacher"
                  ? (isRTL ? "تحويل إلى طالب" : "Passer en Élève")
                  : (isRTL ? "تحويل إلى أستاذ" : "Passer en Professeur")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0,
                  background: "rgba(124,58,237,0.15)",
                  color: "#a78bfa",
                  border: "1px solid rgba(124,58,237,0.3)",
                  fontSize: 11.5, fontWeight: 700, padding: "7px 11px",
                  borderRadius: 9, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                <RefreshCw size={12} />
                {u.role === "teacher"
                  ? (isRTL ? "طالب" : "Élève")
                  : (isRTL ? "أستاذ" : "Prof")}
              </button>

              {/* Supprimer — volontairement discret */}
              <button
                onClick={() => { haptic("warning"); setTarget(u); setTyped(""); }}
                title={isRTL ? "حذف نهائي" : "Suppression définitive"}
                style={{
                  background: "none", border: "none", color: "#4c1d95",
                  cursor: "pointer", padding: 4, display: "flex", flexShrink: 0,
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          {filtered.length > 60 && (
            <p style={{ color: "#4c1d95", fontSize: 11, textAlign: "center", margin: "6px 0 0" }}>
              {isRTL
                ? `${filtered.length - 60} حساب إضافي — استعمل البحث`
                : `${filtered.length - 60} autres — affinez la recherche`}
            </p>
          )}
        </div>
      )}

      {/* ═══ SUPPRESSION ═══ */}
      <Sheet
        open={!!target}
        onClose={() => { setTarget(null); setTyped(""); }}
        title={isRTL ? "حذف نهائي" : "Suppression définitive"}
        subtitle={target?.displayName}
      >
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 11,
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.28)",
          borderRadius: 13, padding: "14px 15px", marginBottom: 18,
        }}>
          <AlertTriangle size={17} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ color: "#fca5a5", fontSize: 12.5, margin: "0 0 8px", fontWeight: 650, lineHeight: 1.6 }}>
              {isRTL
                ? "سيُحذف الحساب وكلّ بياناته نهائياً."
                : "Le compte et ses données seront détruits définitivement."}
            </p>
            <p style={{ color: "#8b7bb8", fontSize: 11.5, margin: 0, lineHeight: 1.7 }}>
              {isRTL
                ? "الدروس، التسجيلات، الإشعارات، القسائم. تُحفظ الاشتراكات والبلاغات كوثائق محاسبية."
                : "Cours, inscriptions, notifications, bons. Les abonnements et signalements sont conservés comme pièces comptables."}
            </p>
          </div>
        </div>

        <p style={{ color: "#a78bfa", fontSize: 12, margin: "0 0 9px", lineHeight: 1.6 }}>
          {isRTL
            ? "اكتب الاسم كاملاً للتأكيد :"
            : "Saisissez le nom exact pour confirmer :"}
        </p>
        <p style={{
          color: "#fff", fontSize: 13.5, fontWeight: 700,
          background: "rgba(124,58,237,0.1)", borderRadius: 9,
          padding: "9px 13px", margin: "0 0 11px",
        }}>
          {target?.displayName}
        </p>

        <input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          placeholder={target?.displayName}
          className="os-input"
          style={{ marginBottom: 18 }}
        />

        <div style={{ display: "flex", gap: 9 }}>
          <button
            onClick={() => { setTarget(null); setTyped(""); }}
            className="os-btn-ghost"
            style={{ flex: 1, padding: 13, fontSize: 13.5 }}
          >
            {isRTL ? "إلغاء" : "Annuler"}
          </button>
          <button
            onClick={doDelete}
            disabled={typed.trim() !== target?.displayName || deleting}
            style={{
              flex: 1, padding: 13, fontSize: 13.5, fontWeight: 750,
              borderRadius: 14, border: "none", color: "white",
              background: "linear-gradient(135deg, #dc2626, #b91c1c)",
              cursor: typed.trim() === target?.displayName && !deleting ? "pointer" : "not-allowed",
              opacity: typed.trim() === target?.displayName && !deleting ? 1 : 0.4,
              fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}
          >
            {deleting
              ? <><Loader2 size={15} style={{ animation: "amspin 0.8s linear infinite" }} /> {isRTL ? "جارٍ..." : "Suppression..."}</>
              : <><Trash2 size={15} /> {isRTL ? "حذف" : "Supprimer"}</>}
          </button>
        </div>
      </Sheet>

      <ConfirmDialog state={confirmState} onAnswer={answerConfirm} />

      <style>{`@keyframes amspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
