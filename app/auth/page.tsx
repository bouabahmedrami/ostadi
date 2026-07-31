"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { trWilaya } from "@/lib/i18n/translate";
import { WILAYAS, UserRole } from "@/lib/types";
import {
  Eye, EyeOff, AlertCircle, Check, ArrowLeft, Mail,
  KeyRound, CheckCircle2, Send, ArrowRight,
} from "lucide-react";
import Link from "next/link";

type Mode = "login" | "register" | "reset";

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, register, resetPassword, user, profile } = useAuth() as any;
  const { isRTL } = useLang();

  const [mode, setMode] = useState<Mode>(
    params.get("mode") === "register" ? "register" : "login"
  );
  const [role, setRole] = useState<UserRole>(
    params.get("role") === "teacher" ? "teacher" : "student"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState("Alger");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);
  const [acceptedCGU, setAcceptedCGU] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    // Ne redirige pas immédiatement après inscription — on montre l'écran de vérification
    if (user && profile && !justRegistered) {
      router.push(profile.role === "teacher" ? "/dashboard" : "/mes-cours");
    }
  }, [user, profile, router, justRegistered]);

  /* ── Changement de mode avec reset propre ─────────────── */
  function switchMode(m: Mode) {
    setMode(m);
    setError("");
    setResetSent(false);
    setAcceptedCGU(false);
  }

  /* ── Validation ───────────────────────────────────────── */
  function validate(): string | null {
    if (!email.trim()) return isRTL ? "البريد الإلكتروني مطلوب" : "L'email est requis";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return isRTL ? "البريد الإلكتروني غير صالح" : "Format d'email invalide";

    if (mode === "reset") return null;

    if (!password) return isRTL ? "كلمة المرور مطلوبة" : "Le mot de passe est requis";

    if (mode === "register") {
      if (password.length < 6)
        return isRTL
          ? "كلمة المرور: 6 أحرف على الأقل"
          : "Mot de passe : 6 caractères minimum";
      if (!name.trim()) return isRTL ? "الاسم الكامل مطلوب" : "Le nom complet est requis";
      if (!phone.trim()) return isRTL ? "رقم الهاتف مطلوب" : "Le téléphone est requis";
      const cleaned = phone.replace(/\D/g, "");
      if (cleaned.length < 9 || cleaned.length > 13)
        return isRTL ? "رقم الهاتف غير صالح" : "Numéro de téléphone invalide";
      if (!acceptedCGU)
        return isRTL
          ? "يجب قبول شروط الاستخدام للمتابعة"
          : "Vous devez accepter les conditions d'utilisation";
    }
    return null;
  }

  const errorMessages: Record<string, [string, string]> = {
    "auth/email-already-in-use": ["Cet email est déjà utilisé. Connectez-vous.", "هذا البريد مستخدم. سجّل الدخول."],
    "auth/invalid-email": ["Format d'email invalide.", "صيغة البريد غير صحيحة."],
    "auth/weak-password": ["Mot de passe trop faible (6 caractères min).", "كلمة المرور ضعيفة (6 أحرف على الأقل)."],
    "auth/wrong-password": ["Mot de passe incorrect.", "كلمة المرور غير صحيحة."],
    "auth/user-not-found": ["Aucun compte avec cet email.", "لا يوجد حساب بهذا البريد."],
    "auth/invalid-credential": ["Email ou mot de passe incorrect.", "البريد أو كلمة المرور غير صحيحة."],
    "auth/too-many-requests": ["Trop de tentatives. Réessayez plus tard.", "محاولات كثيرة. حاول لاحقاً."],
    "auth/network-request-failed": ["Problème de connexion.", "مشكلة في الاتصال."],
  };

  async function handleSubmit() {
    const v = validate();
    if (v) { setError(v); return; }

    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else if (mode === "register") {
        await register(email.trim(), password, name.trim(), phone.trim(), wilaya, role);
        setJustRegistered(true);
      } else {
        await resetPassword(email.trim());
        setResetSent(true);
      }
    } catch (e: any) {
      const pair = errorMessages[e?.code || ""];
      setError(pair
        ? (isRTL ? pair[1] : pair[0])
        : (isRTL ? "حدث خطأ. حاول مرة أخرى." : "Une erreur s'est produite. Réessayez."));
    } finally {
      setLoading(false);
    }
  }

  /* ── Force du mot de passe ────────────────────────────── */
  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return Math.min(s, 4);
  })();
  const sLabels = isRTL
    ? ["ضعيفة جداً", "ضعيفة", "متوسطة", "جيدة", "قوية"]
    : ["Très faible", "Faible", "Moyenne", "Bonne", "Forte"];
  const sColors = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

  /* ═══ ÉCRAN : inscription réussie → vérifier l'email ═══ */
  if (justRegistered) {
    return (
      <div className="au-page" dir={isRTL ? "rtl" : "ltr"}>
        <div className="au-orb au-orb-1" />
        <div className="au-wrap au-in">
          <div className="au-card au-card-center">
            <div className="au-success-icon">
              <Mail size={30} />
              <span className="au-success-ping" />
            </div>

            <h2 className="au-success-title">
              {isRTL ? "تحقق من بريدك الإلكتروني" : "Vérifiez votre email"}
            </h2>

            <p className="au-success-text">
              {isRTL
                ? "أرسلنا رابط تأكيد إلى"
                : "Nous avons envoyé un lien de confirmation à"}
              <br />
              <b>{email}</b>
            </p>

            <div className="au-steps">
              {[
                isRTL ? "افتح بريدك الإلكتروني" : "Ouvrez votre boîte mail",
                isRTL ? "اضغط على رابط التأكيد" : "Cliquez sur le lien de confirmation",
                isRTL ? "ارجع وابدأ الاستخدام" : "Revenez et commencez à utiliser Ostadi",
              ].map((s, i) => (
                <div key={i} className="au-step">
                  <span className="au-step-num">{i + 1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>

            <p className="au-success-hint">
              {isRTL
                ? "لم تجد الرسالة؟ تحقق من مجلد الرسائل غير المرغوب فيها."
                : "Vous ne trouvez pas l'email ? Vérifiez vos spams."}
            </p>

            <button
              onClick={() => {
                setJustRegistered(false);
                router.push(profile?.role === "teacher" ? "/dashboard" : "/mes-cours");
              }}
              className="au-submit"
            >
              {isRTL ? "متابعة إلى المنصة" : "Continuer vers la plateforme"}
              <ArrowRight size={16} className={isRTL ? "au-flip" : ""} />
            </button>
          </div>
        </div>
        <style jsx global>{AU_STYLES}</style>
      </div>
    );
  }

  /* ═══ ÉCRAN : email de réinitialisation envoyé ═══ */
  if (resetSent) {
    return (
      <div className="au-page" dir={isRTL ? "rtl" : "ltr"}>
        <div className="au-orb au-orb-1" />
        <div className="au-wrap au-in">
          <div className="au-card au-card-center">
            <div className="au-success-icon au-success-icon-green">
              <CheckCircle2 size={30} />
              <span className="au-success-ping au-success-ping-green" />
            </div>

            <h2 className="au-success-title">
              {isRTL ? "تم إرسال الرابط" : "Email envoyé !"}
            </h2>

            <p className="au-success-text">
              {isRTL
                ? "أرسلنا رابط إعادة تعيين كلمة المرور إلى"
                : "Un lien de réinitialisation a été envoyé à"}
              <br />
              <b>{email}</b>
            </p>

            <p className="au-success-hint">
              {isRTL
                ? "الرابط صالح لمدة ساعة واحدة. تحقق من مجلد الرسائل غير المرغوب فيها إن لم تجده."
                : "Le lien est valable 1 heure. Pensez à vérifier vos spams."}
            </p>

            <button onClick={() => switchMode("login")} className="au-submit">
              <ArrowLeft size={16} className={isRTL ? "au-flip" : ""} />
              {isRTL ? "العودة لتسجيل الدخول" : "Retour à la connexion"}
            </button>

            <button onClick={() => setResetSent(false)} className="au-link-btn">
              {isRTL ? "إعادة الإرسال" : "Renvoyer l'email"}
            </button>
          </div>
        </div>
        <style jsx global>{AU_STYLES}</style>
      </div>
    );
  }

  /* ═══ ÉCRAN PRINCIPAL ═══ */
  return (
    <div className="au-page" dir={isRTL ? "rtl" : "ltr"}>
      <div className="au-orb au-orb-1" />
      <div className="au-orb au-orb-2" />

      <div className={`au-wrap ${mounted ? "au-in" : "au-out"}`}>

        <Link href="/" className="au-back">
          <ArrowLeft size={14} className={isRTL ? "au-flip" : ""} />
          {isRTL ? "الرئيسية" : "Accueil"}
        </Link>

        {/* ── Marque ── */}
        <div className="au-brand">
          <Link href="/" className="au-logo">
            <span className="au-logo-icon">🎓</span>
            <span className="au-logo-text">
              Ostadi<span className="au-logo-ar"> أستاذي</span>
            </span>
          </Link>
          <p className="au-tagline">
            {mode === "reset"
              ? (isRTL ? "استعد الوصول إلى حسابك" : "Récupérez l'accès à votre compte")
              : mode === "login"
                ? (isRTL ? "مرحباً بعودتك!" : "Bon retour parmi nous !")
                : (isRTL ? "انضم إلى أستاذي اليوم" : "Rejoignez Ostadi aujourd'hui")}
          </p>
        </div>

        <div className="au-card">

          {/* ── Onglets (masqués en mode reset) ── */}
          {mode !== "reset" && (
            <div className="au-tabs">
              <span
                className="au-tab-slider"
                style={{ transform: mode === "register" ? "translateX(100%)" : "translateX(0)" }}
              />
              {(["login", "register"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`au-tab ${mode === m ? "au-tab-on" : ""}`}
                >
                  {m === "login"
                    ? (isRTL ? "تسجيل الدخول" : "Connexion")
                    : (isRTL ? "إنشاء حساب" : "Inscription")}
                </button>
              ))}
            </div>
          )}

          {/* ── En-tête mode reset ── */}
          {mode === "reset" && (
            <div className="au-reset-head">
              <button onClick={() => switchMode("login")} className="au-reset-back">
                <ArrowLeft size={15} className={isRTL ? "au-flip" : ""} />
              </button>
              <div className="au-reset-icon"><KeyRound size={17} /></div>
              <div>
                <h3>{isRTL ? "نسيت كلمة المرور؟" : "Mot de passe oublié ?"}</h3>
                <p>
                  {isRTL
                    ? "سنرسل لك رابطاً لإعادة التعيين"
                    : "Nous vous enverrons un lien de réinitialisation"}
                </p>
              </div>
            </div>
          )}

          <div className="au-form" key={mode}>

            {/* ── Rôle ── */}
            {mode === "register" && (
              <div className="au-field au-anim" style={{ animationDelay: "0ms" }}>
                <label className="au-label">{isRTL ? "أنا" : "Je suis"}</label>
                <div className="au-roles">
                  {(["student", "teacher"] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`au-role ${role === r ? "au-role-on" : ""}`}
                    >
                      <span className="au-role-emoji">{r === "student" ? "🎓" : "👨‍🏫"}</span>
                      <span className="au-role-label">
                        {r === "student"
                          ? (isRTL ? "طالب / ولي أمر" : "Élève / Parent")
                          : (isRTL ? "أستاذ" : "Professeur")}
                      </span>
                      {role === r && <span className="au-role-check"><Check size={11} /></span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === "register" && (
              <>
                <div className="au-field au-anim" style={{ animationDelay: "50ms" }}>
                  <label className="au-label">{isRTL ? "الاسم الكامل" : "Nom complet"}</label>
                  <input
                    className="au-input"
                    placeholder={isRTL ? "محمد عمراني" : "Mohamed Amrani"}
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>

                <div className="au-field au-anim" style={{ animationDelay: "100ms" }}>
                  <label className="au-label">{isRTL ? "رقم الهاتف" : "Téléphone"}</label>
                  <input
                    className="au-input"
                    type="tel"
                    placeholder="0555 XX XX XX"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>

                <div className="au-field au-anim" style={{ animationDelay: "150ms" }}>
                  <label className="au-label">{isRTL ? "الولاية" : "Wilaya"}</label>
                  <select
                    className="au-input"
                    value={wilaya}
                    onChange={e => setWilaya(e.target.value)}
                  >
                    {WILAYAS.map(w => (
                      <option key={w} value={w} style={{ background: '#1A0A3C' }}>
                        {trWilaya(w, isRTL)}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* ── Email ── */}
            <div className="au-field au-anim" style={{ animationDelay: "200ms" }}>
              <label className="au-label">{isRTL ? "البريد الإلكتروني" : "Email"}</label>
              <div className="au-input-icon-wrap">
                <Mail size={15} className="au-input-icon" />
                <input
                  className="au-input au-input-with-icon"
                  type="email"
                  autoComplete="email"
                  placeholder={isRTL ? "you@email.com" : "vous@email.com"}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && mode === "reset" && handleSubmit()}
                />
              </div>
            </div>

            {/* ── Mot de passe ── */}
            {mode !== "reset" && (
              <div className="au-field au-anim" style={{ animationDelay: "250ms" }}>
                <div className="au-label-row">
                  <label className="au-label">{isRTL ? "كلمة المرور" : "Mot de passe"}</label>
                  {mode === "login" && (
                    <button onClick={() => switchMode("reset")} className="au-forgot">
                      {isRTL ? "نسيتها؟" : "Oublié ?"}
                    </button>
                  )}
                </div>
                <div className="au-pass-wrap">
                  <KeyRound size={15} className="au-input-icon" />
                  <input
                    className="au-input au-input-with-icon au-input-pass"
                    type={showPass ? "text" : "password"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="au-eye"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {mode === "register" && password && (
                  <div className="au-strength">
                    <div className="au-strength-bars">
                      {[0, 1, 2, 3].map(i => (
                        <span
                          key={i}
                          className="au-strength-bar"
                          style={{ background: i < strength ? sColors[strength] : 'rgba(124,58,237,0.15)' }}
                        />
                      ))}
                    </div>
                    <span className="au-strength-label" style={{ color: sColors[strength] }}>
                      {sLabels[strength]}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ── Conditions d'utilisation ── */}
            {mode === "register" && (
              <label className="au-cgu au-anim" style={{ animationDelay: "300ms" }}>
                <input
                  type="checkbox"
                  checked={acceptedCGU}
                  onChange={e => setAcceptedCGU(e.target.checked)}
                />
                <span className="au-cgu-box">
                  {acceptedCGU && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="au-cgu-text">
                  {isRTL ? "أوافق على " : "J'accepte les "}
                  <Link href="/conditions" target="_blank" rel="noopener noreferrer">
                    {isRTL ? "شروط الاستخدام" : "conditions d'utilisation"}
                  </Link>
                  {role === "teacher" && (
                    isRTL
                      ? "، وألتزم بعمولة 10٪ وبقواعد حماية القُصّر."
                      : ", la commission de 10 % et les règles de protection des élèves mineurs."
                  )}
                  {role === "student" && (isRTL ? "." : ".")}
                </span>
              </label>
            )}

            {/* ── Erreur ── */}
            {error && (
              <div className="au-error">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* ── Bouton ── */}
            <button
              onClick={handleSubmit}
              disabled={loading || (mode === "register" && !acceptedCGU)}
              className="au-submit"
            >
              {loading ? (
                <><span className="au-spinner" /> {isRTL ? "جارٍ..." : "Chargement..."}</>
              ) : mode === "login" ? (
                <>{isRTL ? "تسجيل الدخول" : "Se connecter"}<ArrowRight size={16} className={isRTL ? "au-flip" : ""} /></>
              ) : mode === "register" ? (
                <>{isRTL ? "إنشاء حسابي" : "Créer mon compte"}<ArrowRight size={16} className={isRTL ? "au-flip" : ""} /></>
              ) : (
                <><Send size={15} /> {isRTL ? "إرسال الرابط" : "Envoyer le lien"}</>
              )}
            </button>

            {/* ── Bascule ── */}
            {mode !== "reset" && (
              <p className="au-switch">
                {mode === "login" ? (
                  <>
                    {isRTL ? "ليس لديك حساب؟" : "Pas encore de compte ?"}{" "}
                    <button onClick={() => switchMode("register")}>
                      {isRTL ? "أنشئ حساباً" : "Inscrivez-vous"}
                    </button>
                  </>
                ) : (
                  <>
                    {isRTL ? "لديك حساب؟" : "Déjà inscrit ?"}{" "}
                    <button onClick={() => switchMode("login")}>
                      {isRTL ? "سجّل الدخول" : "Connectez-vous"}
                    </button>
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{AU_STYLES}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
const AU_STYLES = `
  .au-page {
    position: relative; overflow: hidden;
    background: #0A0014; min-height: 100vh; min-height: 100dvh;
    background-image:
      linear-gradient(rgba(168,85,247,0.022) 1px, transparent 1px),
      linear-gradient(90deg, rgba(168,85,247,0.022) 1px, transparent 1px);
    background-size: 44px 44px;
    display: flex; align-items: center; justify-content: center;
    padding: 32px 16px;
  }
  .au-orb { position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none; }
  .au-orb-1 {
    top: 6%; left: 50%; transform: translateX(-50%);
    width: 400px; height: 400px; background: rgba(124,58,237,0.15);
    animation: auFloat 9s ease-in-out infinite;
  }
  .au-orb-2 {
    bottom: 4%; right: 10%; width: 270px; height: 270px;
    background: rgba(255,140,0,0.08);
    animation: auFloat 11s ease-in-out infinite reverse;
  }
  @keyframes auFloat {
    0%,100% { transform: translate(-50%, 0) scale(1); }
    50% { transform: translate(-50%, -22px) scale(1.06); }
  }

  .au-wrap { position: relative; width: 100%; max-width: 424px; }
  .au-in { opacity: 1; transform: translateY(0) scale(1); transition: opacity 0.55s cubic-bezier(0.22,1,0.36,1), transform 0.55s cubic-bezier(0.22,1,0.36,1); }
  .au-out { opacity: 0; transform: translateY(18px) scale(0.98); }

  .au-back {
    display: inline-flex; align-items: center; gap: 6px;
    color: #6d28d9; text-decoration: none; font-size: 12.5px; font-weight: 600;
    margin-bottom: 18px; transition: all 0.2s ease;
  }
  .au-back:hover { color: #a78bfa; gap: 9px; }

  /* ── Marque ── */
  .au-brand { text-align: center; margin-bottom: 24px; }
  .au-logo { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; margin-bottom: 9px; }
  .au-logo-icon {
    width: 44px; height: 44px; border-radius: 14px;
    background: linear-gradient(140deg, rgba(255,140,0,0.24), rgba(124,58,237,0.2));
    border: 1px solid rgba(255,140,0,0.32);
    display: flex; align-items: center; justify-content: center; font-size: 22px;
    transition: transform 0.35s cubic-bezier(0.34,1.5,0.64,1);
  }
  .au-logo:hover .au-logo-icon { transform: rotate(-8deg) scale(1.08); }
  .au-logo-text { color: white; font-weight: 900; font-size: 26px; letter-spacing: -0.8px; }
  .au-logo-ar { color: #FF8C00; font-size: 20px; }
  .au-tagline { color: #8b7bb8; font-size: 13px; margin: 0; }

  /* ── Carte ── */
  .au-card {
    background: linear-gradient(155deg, rgba(24,12,52,0.94), rgba(15,6,32,0.96));
    border: 1px solid rgba(124,58,237,0.24);
    border-radius: 22px; padding: 24px;
    box-shadow: 0 22px 55px rgba(0,0,0,0.45);
  }
  .au-card-center { text-align: center; }

  /* ── Onglets avec curseur glissant ── */
  .au-tabs {
    position: relative; display: flex; gap: 0; padding: 4px;
    background: rgba(10,0,20,0.6); border-radius: 14px; margin-bottom: 22px;
  }
  .au-tab-slider {
    position: absolute; top: 4px; bottom: 4px; left: 4px;
    width: calc(50% - 4px); border-radius: 11px;
    background: linear-gradient(135deg, #7C3AED, #6D28D9);
    box-shadow: 0 4px 14px rgba(124,58,237,0.32);
    transition: transform 0.35s cubic-bezier(0.34,1.25,0.64,1);
  }
  [dir="rtl"] .au-tab-slider { left: auto; right: 4px; }
  [dir="rtl"] .au-tab-slider[style*="translateX(100%)"] { transform: translateX(-100%) !important; }
  .au-tab {
    position: relative; z-index: 1; flex: 1; padding: 11px;
    border: none; cursor: pointer; background: transparent;
    color: #8b7bb8; font-size: 13px; font-weight: 700;
    font-family: inherit; transition: color 0.25s ease;
  }
  .au-tab:hover { color: #c4b5fd; }
  .au-tab-on { color: white; }

  /* ── En-tête reset ── */
  .au-reset-head {
    display: flex; align-items: center; gap: 11px; margin-bottom: 20px;
    padding-bottom: 18px; border-bottom: 1px solid rgba(124,58,237,0.16);
  }
  .au-reset-back {
    width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
    background: rgba(124,58,237,0.14); border: none; color: #a78bfa;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    transition: all 0.2s ease;
  }
  .au-reset-back:hover { background: rgba(124,58,237,0.26); color: white; }
  .au-reset-icon {
    width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0;
    background: rgba(255,140,0,0.14); border: 1px solid rgba(255,140,0,0.26);
    display: flex; align-items: center; justify-content: center; color: #FF8C00;
  }
  .au-reset-head h3 { color: white; font-weight: 800; font-size: 15px; margin: 0; }
  .au-reset-head p { color: #8b7bb8; font-size: 11.5px; margin: 2px 0 0; }

  /* ── Formulaire ── */
  .au-form { display: flex; flex-direction: column; gap: 15px; }
  .au-field { display: flex; flex-direction: column; gap: 7px; }
  .au-anim { animation: auSlideIn 0.4s cubic-bezier(0.22,1,0.36,1) backwards; }
  @keyframes auSlideIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .au-label-row { display: flex; align-items: center; justify-content: space-between; }
  .au-label {
    color: #a78bfa; font-size: 11.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.4px;
  }
  .au-forgot {
    background: none; border: none; color: #FF8C00;
    font-size: 11.5px; font-weight: 700; cursor: pointer;
    font-family: inherit; padding: 0; transition: color 0.2s ease;
  }
  .au-forgot:hover { color: #FFB347; text-decoration: underline; }

  .au-input {
    width: 100%; box-sizing: border-box;
    background: rgba(26,10,60,0.6); border: 1px solid rgba(124,58,237,0.24);
    border-radius: 12px; padding: 12px 14px;
    font-size: 14px; color: white; font-family: inherit;
    outline: none; transition: border-color 0.22s ease, background 0.22s ease, box-shadow 0.22s ease;
  }
  .au-input:focus {
    border-color: rgba(255,140,0,0.5); background: rgba(26,10,60,0.9);
    box-shadow: 0 0 0 3px rgba(255,140,0,0.08);
  }
  .au-input::placeholder { color: #5b21b6; }

  .au-input-icon-wrap, .au-pass-wrap { position: relative; }
  .au-input-icon {
    position: absolute; top: 50%; inset-inline-start: 13px;
    transform: translateY(-50%); color: #6d28d9;
    pointer-events: none; z-index: 1;
  }
  .au-input-with-icon { padding-inline-start: 38px; }
  .au-input-pass { padding-inline-end: 44px; }
  .au-eye {
    position: absolute; top: 50%; inset-inline-end: 12px;
    transform: translateY(-50%);
    background: none; border: none; color: #6d28d9;
    cursor: pointer; display: flex; padding: 0; transition: color 0.2s ease;
  }
  .au-eye:hover { color: #a78bfa; }

  /* ── Rôles ── */
  .au-roles { display: flex; gap: 10px; }
  .au-role {
    position: relative; flex: 1;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    padding: 14px 10px; border-radius: 14px; cursor: pointer;
    background: rgba(26,10,60,0.4); border: 2px solid rgba(124,58,237,0.2);
    font-family: inherit; transition: all 0.28s cubic-bezier(0.34,1.4,0.64,1);
  }
  .au-role:hover { border-color: rgba(168,85,247,0.4); transform: translateY(-2px); }
  .au-role-on { border-color: #FF8C00; background: rgba(255,140,0,0.1); }
  .au-role-emoji { font-size: 22px; transition: transform 0.3s cubic-bezier(0.34,1.5,0.64,1); }
  .au-role-on .au-role-emoji { transform: scale(1.15); }
  .au-role-label { color: #a78bfa; font-size: 12px; font-weight: 700; text-align: center; }
  .au-role-on .au-role-label { color: #FF8C00; }
  .au-role-check {
    position: absolute; top: 7px; inset-inline-end: 7px;
    width: 18px; height: 18px; border-radius: 50%;
    background: #FF8C00; color: white;
    display: flex; align-items: center; justify-content: center;
    animation: auPop 0.3s cubic-bezier(0.34,1.6,0.64,1);
  }
  @keyframes auPop { from { transform: scale(0); } to { transform: scale(1); } }

  /* ── Force ── */
  .au-strength { display: flex; align-items: center; gap: 10px; margin-top: 3px; }
  .au-strength-bars { display: flex; gap: 4px; flex: 1; }
  .au-strength-bar { flex: 1; height: 3px; border-radius: 999px; transition: background 0.35s ease; }
  .au-strength-label { font-size: 10.5px; font-weight: 700; min-width: 62px; text-align: end; }

  /* ── Erreur ── */
  .au-error {
    display: flex; align-items: flex-start; gap: 9px;
    background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
    border-radius: 12px; padding: 11px 13px;
    animation: auShake 0.4s ease;
  }
  @keyframes auShake {
    0%,100% { transform: translateX(0); }
    20% { transform: translateX(-5px); }
    40% { transform: translateX(5px); }
    60% { transform: translateX(-3px); }
    80% { transform: translateX(3px); }
  }
  .au-error svg { color: #f87171; flex-shrink: 0; margin-top: 1px; }
  .au-error span { color: #fca5a5; font-size: 12.5px; line-height: 1.5; }

  /* ── Bouton ── */
  .au-submit {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 9px;
    background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white;
    font-weight: 800; padding: 14px; border-radius: 14px;
    border: none; cursor: pointer; font-size: 14.5px; font-family: inherit;
    margin-top: 4px;
    box-shadow: 0 7px 22px rgba(255,140,0,0.3);
    transition: transform 0.25s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.25s ease, filter 0.25s ease;
  }
  .au-submit:hover:not(:disabled) {
    transform: translateY(-2px); filter: brightness(1.06);
    box-shadow: 0 12px 32px rgba(255,140,0,0.42);
  }
  .au-submit:active:not(:disabled) { transform: translateY(0) scale(0.985); }
  .au-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .au-spinner {
    width: 15px; height: 15px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.35); border-top-color: white;
    animation: auspin 0.7s linear infinite;
  }
  @keyframes auspin { to { transform: rotate(360deg); } }

  .au-switch { text-align: center; color: #6d28d9; font-size: 12.5px; margin: 4px 0 0; }
  .au-switch button {
    background: none; border: none; color: #FF8C00;
    font-weight: 700; font-size: 12.5px; cursor: pointer;
    font-family: inherit; padding: 0; text-decoration: underline;
  }
  .au-switch button:hover { color: #FFB347; }

  .au-link-btn {
    background: none; border: none; color: #a78bfa;
    font-size: 12.5px; font-weight: 600; cursor: pointer;
    font-family: inherit; margin-top: 12px; text-decoration: underline;
  }
  .au-link-btn:hover { color: white; }

  /* ── Écrans de succès ── */
  .au-success-icon {
    position: relative; width: 72px; height: 72px; border-radius: 24px;
    margin: 6px auto 20px;
    background: linear-gradient(140deg, rgba(255,140,0,0.2), rgba(124,58,237,0.16));
    border: 1px solid rgba(255,140,0,0.3);
    display: flex; align-items: center; justify-content: center; color: #FF8C00;
    animation: auPopIn 0.5s cubic-bezier(0.34,1.5,0.64,1);
  }
  .au-success-icon-green {
    background: linear-gradient(140deg, rgba(34,197,94,0.2), rgba(124,58,237,0.14));
    border-color: rgba(34,197,94,0.3); color: #22C55E;
  }
  @keyframes auPopIn { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
  .au-success-ping {
    position: absolute; inset: -6px; border-radius: 28px;
    border: 2px solid rgba(255,140,0,0.4);
    animation: auPing 2s cubic-bezier(0,0,0.2,1) infinite;
  }
  .au-success-ping-green { border-color: rgba(34,197,94,0.4); }
  @keyframes auPing {
    0% { transform: scale(0.92); opacity: 0.9; }
    75%, 100% { transform: scale(1.25); opacity: 0; }
  }

  .au-success-title { color: white; font-weight: 900; font-size: 20px; margin: 0 0 10px; letter-spacing: -0.4px; }
  .au-success-text { color: #a78bfa; font-size: 13.5px; line-height: 1.7; margin: 0 0 20px; }
  .au-success-text b { color: white; font-weight: 700; word-break: break-all; }
  .au-success-hint { color: #6d28d9; font-size: 11.5px; line-height: 1.6; margin: 18px 0 20px; }

  .au-steps {
    display: flex; flex-direction: column; gap: 10px;
    background: rgba(10,0,20,0.4); border-radius: 14px; padding: 16px;
    text-align: start;
  }
  .au-step { display: flex; align-items: center; gap: 11px; }
  .au-step span:last-child { color: #c4b5fd; font-size: 12.5px; }
  .au-step-num {
    width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
    background: rgba(255,140,0,0.16); color: #FF8C00;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 800;
  }

  /* ── Case CGU ── */
  .au-cgu {
    display: flex; align-items: flex-start; gap: 11px;
    cursor: pointer; padding: 13px 14px;
    background: rgba(124,58,237,0.06);
    border: 1px solid rgba(124,58,237,0.16);
    border-radius: 13px;
    transition: border-color 0.22s ease, background 0.22s ease;
  }
  .au-cgu:hover {
    border-color: rgba(168,85,247,0.34);
    background: rgba(124,58,237,0.1);
  }
  .au-cgu input {
    position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none;
  }
  .au-cgu-box {
    width: 19px; height: 19px; border-radius: 6px; flex-shrink: 0;
    border: 2px solid rgba(124,58,237,0.45); margin-top: 1px;
    display: flex; align-items: center; justify-content: center;
    color: white; background: transparent;
    transition: all 0.24s cubic-bezier(0.34,1.6,0.64,1);
  }
  .au-cgu input:checked ~ .au-cgu-box {
    background: #FF8C00; border-color: #FF8C00;
    transform: scale(1.08);
  }
  .au-cgu input:focus-visible ~ .au-cgu-box {
    box-shadow: 0 0 0 3px rgba(255,140,0,0.25);
  }
  .au-cgu-text {
    color: #a78bfa; font-size: 12px; line-height: 1.65;
  }
  .au-cgu-text a {
    color: #FF8C00; font-weight: 700; text-decoration: underline;
    text-underline-offset: 2px;
  }
  .au-cgu-text a:hover { color: #FFB347; }

  .au-flip { transform: scaleX(-1); }
`;

export default function AuthPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#0A0014', minHeight: '100vh' }} />}>
      <AuthForm />
    </Suspense>
  );
}
