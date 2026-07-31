"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { getTeacherSubscription, createSubscriptionRequest } from "@/lib/firestore";
import { Subscription } from "@/lib/types";
import {
  Star, CheckCircle, Clock, Zap, Crown,
  ArrowLeft, Copy, Check, ShieldCheck
} from "lucide-react";
import Link from "next/link";

const PLANS = [
  {
    id: "monthly",
    labelFr: "Mensuel",
    labelAr: "شهري",
    price: 2000,
    durationDays: 30,
    descFr: "Idéal pour commencer",
    descAr: "مثالي للبداية",
    features: [
      { fr: "Cours illimités", ar: "دروس غير محدودة" },
      { fr: "Badge ⭐ Populaire", ar: "شارة ⭐ مميز" },
      { fr: "Priorité dans les résultats", ar: "أولوية في نتائج البحث" },
      { fr: "Statistiques détaillées", ar: "إحصاءات مفصلة" },
    ],
  },
  {
    id: "yearly",
    labelFr: "Annuel",
    labelAr: "سنوي",
    price: 18000,
    durationDays: 365,
    descFr: "Économisez 25%",
    descAr: "وفر 25%",
    popular: true,
    features: [
      { fr: "Tout du plan mensuel", ar: "كل مزايا الخطة الشهرية" },
      { fr: "Profil mis en avant", ar: "ملف شخصي مميز" },
      { fr: "Support prioritaire", ar: "دعم ذو أولوية" },
      { fr: "Badge ⭐ Annuel exclusif", ar: "شارة ⭐ سنوية حصرية" },
    ],
  },
];

const PAYMENT_METHODS = [
  { id: "baridimob", label: "BaridiMob", icon: "🏦", color: "bg-yellow-900/30 border-yellow-600/40" },
  { id: "cib", label: "CIB", icon: "💳", color: "bg-blue-900/30 border-blue-600/40" },
  { id: "cash", label: "Cash / Virement", icon: "💵", color: "bg-green-900/30 border-green-600/40" },
];

const BANK_INFO = {
  baridimob: { number: "0023 4567 8901 2345", name: "Ostadi SRL" },
  cib: { number: "0023 4567 8901 2345 6789", name: "Ostadi SRL" },
  cash: { rib: "00799999000123456789", name: "Ostadi SRL" },
};

export default function AbonnementPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { isRTL } = useLang();
  const router = useRouter();

  const [sub, setSub] = useState<Subscription | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
  const [selectedMethod, setSelectedMethod] = useState<"baridimob" | "cib" | "cash">("baridimob");
  const [paymentRef, setPaymentRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "teacher")) router.push("/auth");
  }, [user, profile, loading]);

  useEffect(() => {
    if (user) {
      getTeacherSubscription(user.uid)
        .then(setSub)
        .finally(() => setLoadingData(false));
    }
  }, [user]);

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit() {
    if (!paymentRef.trim()) return;
    setSubmitting(true);
    const plan = PLANS.find(p => p.id === selectedPlan)!;
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + plan.durationDays * 86400000).toISOString();
    try {
      await createSubscriptionRequest({
        teacherId: user!.uid,
        teacherName: profile!.displayName,
        plan: selectedPlan,
        amount: plan.price,
        status: "pending",
        startDate,
        endDate,
        paymentMethod: selectedMethod,
        paymentRef: paymentRef.trim(),
        createdAt: new Date().toISOString(),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
      day: "2-digit", month: "long", year: "numeric",
    });
  }

  if (loading || loadingData) return (
    <div className="flex items-center justify-center min-h-screen text-purple-400 grid-bg">
      {isRTL ? "جارٍ التحميل..." : "Chargement..."}
    </div>
  );

  // Active subscription view
  if (sub && sub.status === "active") {
    return (
      <div className="grid-bg min-h-screen flex items-center justify-center px-4" dir={isRTL ? "rtl" : "ltr"}>
        <div className="card max-w-md w-full text-center py-10 border border-[#FF8C00]/30 neon-orange">
          <Crown className="w-14 h-14 text-[#FF8C00] mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">
            {isRTL ? "أنت مشترك مميز 👑" : "Abonnement Actif 👑"}
          </h2>
          <div className="badge-orange mx-auto mb-4 w-fit">
            {sub.plan === "monthly"
              ? isRTL ? "خطة شهرية" : "Plan Mensuel"
              : isRTL ? "خطة سنوية" : "Plan Annuel"}
          </div>
          <p className="text-purple-400 text-sm mb-6">
            {isRTL ? "ينتهي في:" : "Expire le:"}{" "}
            <span className="text-white font-semibold">{formatDate(sub.endDate)}</span>
          </p>
          <div className="flex flex-col gap-2 text-sm text-purple-300 mb-6">
            {[
              { fr: "✅ Cours illimités", ar: "✅ دروس غير محدودة" },
              { fr: "✅ Badge Populaire actif", ar: "✅ شارة مميز نشطة" },
              { fr: "✅ Priorité dans les résultats", ar: "✅ أولوية في البحث" },
            ].map(f => (
              <div key={f.fr}>{isRTL ? f.ar : f.fr}</div>
            ))}
          </div>
          <Link href="/dashboard" className="btn-primary inline-block">
            {isRTL ? "العودة للوحة التحكم" : "Retour au dashboard"}
          </Link>
        </div>
      </div>
    );
  }

  // Submitted pending view
  if (submitted) {
    return (
      <div className="grid-bg min-h-screen flex items-center justify-center px-4" dir={isRTL ? "rtl" : "ltr"}>
        <div className="card max-w-md w-full text-center py-10 border border-amber-500/30 bg-amber-900/10">
          <Clock className="w-14 h-14 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-black text-white mb-2">
            {isRTL ? "طلبك قيد المراجعة ⏳" : "Demande en cours d'examen ⏳"}
          </h2>
          <p className="text-purple-400 text-sm mb-6">
            {isRTL
              ? "سنراجع دفعتك ونفعّل اشتراكك خلال 24 ساعة."
              : "Nous vérifierons votre paiement et activerons votre abonnement sous 24h."}
          </p>
          <Link href="/dashboard" className="btn-primary inline-block">
            {isRTL ? "العودة للوحة التحكم" : "Retour au dashboard"}
          </Link>
        </div>
      </div>
    );
  }

  const bankInfo = BANK_INFO[selectedMethod];
  const plan = PLANS.find(p => p.id === selectedPlan)!;

  return (
    <div className="grid-bg min-h-screen" dir={isRTL ? "rtl" : "ltr"}>
      <div className="fixed top-0 left-1/3 w-96 h-96 bg-purple-700/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-0 right-1/3 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-4 py-10">
        <Link href="/dashboard" className={`inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-200 mb-8 transition-colors ${isRTL ? "flex-row-reverse" : ""}`}>
          <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          {isRTL ? "رجوع" : "Retour"}
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-900/30 border border-[#FF8C00]/40 neon-orange mb-4">
            <Crown className="w-8 h-8 text-[#FF8C00]" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">
            {isRTL ? "اشترك في الخطة المميزة" : "Passez en Professeur Premium"}
          </h1>
          <p className="text-purple-400">
            {isRTL
              ? "اظهر في أعلى القائمة وأنشئ دروساً غير محدودة"
              : "Apparaissez en tête de liste et créez des cours illimités"}
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {PLANS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlan(p.id as "monthly" | "yearly")}
              className={`card text-${isRTL ? "right" : "left"} transition-all border-2 relative ${
                selectedPlan === p.id
                  ? "border-[#FF8C00] neon-orange"
                  : "border-purple-800/40 hover:border-purple-600/60"
              }`}
            >
              {p.popular && (
                <div className={`absolute -top-3 ${isRTL ? "left-4" : "right-4"}`}>
                  <span className="badge-orange text-xs font-bold px-3 py-1">
                    {isRTL ? "🔥 الأفضل" : "🔥 Meilleur choix"}
                  </span>
                </div>
              )}
              <div className={`flex items-start justify-between mb-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                <div className={isRTL ? "text-right" : ""}>
                  <div className="text-white font-black text-lg">
                    {isRTL ? p.labelAr : p.labelFr}
                  </div>
                  <div className="text-purple-400 text-xs mt-0.5">
                    {isRTL ? p.descAr : p.descFr}
                  </div>
                </div>
                <div className={isRTL ? "text-left" : "text-right"}>
                  <div className="text-2xl font-black text-[#FF8C00]">
                    {p.price.toLocaleString()} DA
                  </div>
                  <div className="text-purple-500 text-xs">
                    / {isRTL ? (p.id === "monthly" ? "شهر" : "سنة") : (p.id === "monthly" ? "mois" : "an")}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {p.features.map(f => (
                  <div key={f.fr} className={`flex items-center gap-2 text-sm text-purple-300 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <CheckCircle className="w-4 h-4 text-[#FF8C00] shrink-0" />
                    {isRTL ? f.ar : f.fr}
                  </div>
                ))}
              </div>
              {selectedPlan === p.id && (
                <div className={`absolute top-3 ${isRTL ? "right-3" : "left-3"} w-5 h-5 rounded-full bg-[#FF8C00] flex items-center justify-center`}>
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Payment Method */}
        <div className="card mb-6">
          <h2 className={`font-bold text-white mb-4 ${isRTL ? "text-right" : ""}`}>
            {isRTL ? "طريقة الدفع" : "Méthode de paiement"}
          </h2>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {PAYMENT_METHODS.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMethod(m.id as any)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  selectedMethod === m.id
                    ? `${m.color} border-opacity-100`
                    : "border-purple-800/40 hover:border-purple-600/40"
                }`}
              >
                <div className="text-2xl mb-1">{m.icon}</div>
                <div className="text-xs font-semibold text-white">{m.label}</div>
              </button>
            ))}
          </div>

          {/* Bank details */}
          <div className={`bg-[#0D0118] border border-purple-900/40 rounded-xl p-4 ${isRTL ? "text-right" : ""}`}>
            <h3 className="text-sm font-bold text-purple-300 mb-3">
              {isRTL ? "تفاصيل الدفع" : "Coordonnées de paiement"}
            </h3>
            <div className="flex flex-col gap-2">
              <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                <span className="text-purple-400 text-xs">
                  {selectedMethod === "cash"
                    ? isRTL ? "رقم الحساب (RIB)" : "Numéro de compte (RIB)"
                    : isRTL ? "رقم الحساب" : "Numéro de compte"}
                </span>
                <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <span className="text-white font-mono text-sm">
                   {selectedMethod === "cash"
                      ? (bankInfo as any).rib
                       : (bankInfo as any).number}
                  </span>
                  <button
                    onClick={() =>copyToClipboard(
                                                  selectedMethod === "cash"
                                                   ? (bankInfo as any).rib
                                                  : (bankInfo as any).number
                                                 )}                        
                    className="text-purple-400 hover:text-[#FF8C00] transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                <span className="text-purple-400 text-xs">{isRTL ? "الاسم" : "Nom"}</span>
                <span className="text-white text-sm font-semibold">{bankInfo.name}</span>
              </div>
              <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                <span className="text-purple-400 text-xs">{isRTL ? "المبلغ" : "Montant"}</span>
                <span className="text-[#FF8C00] font-bold">{plan.price.toLocaleString()} DA</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-amber-900/20 border border-amber-700/30 rounded-xl">
              <p className="text-amber-300 text-xs">
                {isRTL
                  ? "⚠️ قم بالدفع ثم أدخل مرجع الدفع أدناه. سيتم تفعيل اشتراكك خلال 24 ساعة."
                  : "⚠️ Effectuez le paiement puis entrez la référence ci-dessous. Votre abonnement sera activé sous 24h."}
              </p>
            </div>
          </div>
        </div>

        {/* Payment reference */}
        <div className="card mb-6">
          <h2 className={`font-bold text-white mb-3 ${isRTL ? "text-right" : ""}`}>
            {isRTL ? "مرجع الدفع" : "Référence de paiement"}
          </h2>
          <p className="text-purple-400 text-xs mb-3">
            {isRTL
              ? "أدخل رقم المعاملة أو مرجع التحويل الذي حصلت عليه بعد الدفع"
              : "Entrez le numéro de transaction ou la référence du virement reçue après paiement"}
          </p>
          <input
            className={`input-field ${isRTL ? "text-right" : ""}`}
            placeholder={isRTL ? "مثال: TXN-12345678" : "Ex: TXN-12345678"}
            value={paymentRef}
            onChange={e => setPaymentRef(e.target.value)}
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !paymentRef.trim()}
          className="btn-primary w-full py-4 text-base font-bold flex items-center justify-center gap-2 neon-orange disabled:opacity-40"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {isRTL ? "جارٍ الإرسال..." : "Envoi en cours..."}
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              {isRTL
                ? `تأكيد الدفع وتفعيل الاشتراك — ${plan.price.toLocaleString()} DA`
                : `Confirmer le paiement — ${plan.price.toLocaleString()} DA`}
            </>
          )}
        </button>

        <p className="text-xs text-purple-600 text-center mt-3">
          {isRTL
            ? "بتأكيد الدفع، توافق على شروط استخدام منصة أستاذي"
            : "En confirmant, vous acceptez les conditions d'utilisation d'Ostadi"}
        </p>
      </div>
    </div>
  );
}
