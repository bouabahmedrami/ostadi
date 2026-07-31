"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { trSubject, trWilaya } from "@/lib/i18n/translate";
import { updateUserProfile, updateTeacherProfile } from "@/lib/firestore";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { AvailabilityPicker } from "@/components/Availability";
import { WILAYAS, SUBJECTS } from "@/lib/types";
import {
  Camera, GraduationCap, Briefcase, MapPin, Save, CheckCircle,
  User, Phone, ArrowLeft, AlertCircle, X, Trash2, Clock,
} from "lucide-react";
import Link from "next/link";

const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 Mo

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { isRTL } = useLang();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState("Alger");
  const [photoURL, setPhotoURL] = useState("");
  const [bio, setBio] = useState("");
  const [diploma, setDiploma] = useState("");
  const [university, setUniversity] = useState("");
  const [yearsExperience, setYearsExperience] = useState(0);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setPhone(profile.phone || "");
      setWilaya(profile.wilaya || "Alger");
      setPhotoURL((profile as any).photoURL || "");
      setBio((profile as any).bio || "");
      setDiploma((profile as any).diploma || "");
      setUniversity((profile as any).university || "");
      setYearsExperience((profile as any).yearsExperience || 0);
      setSubjects((profile as any).subjects || []);
      setAvailability((profile as any).availability || []);
    }
  }, [profile]);

  function toggleSubject(s: string) {
    setSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  /* ── Upload photo avec gestion d'erreur complète ─────────── */
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setError(null);

    // Validation type
    if (!file.type.startsWith("image/")) {
      setError(isRTL
        ? "الملف يجب أن يكون صورة (JPG, PNG...)"
        : "Le fichier doit être une image (JPG, PNG...)");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    // Validation taille
    if (file.size > MAX_PHOTO_SIZE) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      setError(isRTL
        ? `الصورة كبيرة جداً (${mb} ميغا). الحد الأقصى 5 ميغا.`
        : `Image trop lourde (${mb} Mo). Maximum 5 Mo.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const storageRef = ref(storage, `profile-photos/${user.uid}_${Date.now()}.${ext}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPhotoURL(url);
    } catch (err: any) {
      // ⚠️ AVANT : l'erreur était avalée silencieusement
      console.error("Upload échoué:", err);
      const code = err?.code || "";
      let msg: string;

      if (code === "storage/unauthorized") {
        msg = isRTL
          ? "غير مصرح. تحقق من قواعد Firebase Storage."
          : "Non autorisé. Vérifiez les règles Firebase Storage.";
      } else if (code === "storage/unauthenticated") {
        msg = isRTL
          ? "انتهت الجلسة. أعد تسجيل الدخول."
          : "Session expirée. Reconnectez-vous.";
      } else if (code === "storage/retry-limit-exceeded") {
        msg = isRTL
          ? "فشل الرفع. تحقق من اتصالك بالإنترنت."
          : "Échec du téléversement. Vérifiez votre connexion.";
      } else if (code === "storage/quota-exceeded") {
        msg = isRTL ? "مساحة التخزين ممتلئة." : "Quota de stockage dépassé.";
      } else {
        msg = isRTL
          ? `خطأ في الرفع: ${code || err?.message || "غير معروف"}`
          : `Erreur d'upload : ${code || err?.message || "inconnue"}`;
      }
      setError(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removePhoto() {
    setPhotoURL("");
    setError(null);
  }

  /* ── Sauvegarde avec gestion d'erreur ────────────────────── */
  async function handleSave() {
    if (!user) return;

    setError(null);

    if (!displayName.trim()) {
      setError(isRTL ? "الاسم مطلوب" : "Le nom est obligatoire");
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        displayName: displayName.trim(),
        phone: phone.trim(),
        wilaya,
        photoURL,
        bio: bio.trim(),
      };
      if (profile?.role === "teacher") {
        data.diploma = diploma.trim();
        data.university = university.trim();
        data.yearsExperience = Number(yearsExperience);
        data.subjects = subjects;
        data.availability = availability;
      }

      // updateTeacherProfile propage la photo et le nom sur tous les cours
      if (profile?.role === "teacher") {
        await updateTeacherProfile(user.uid, data);
      } else {
        await updateUserProfile(user.uid, data);
      }
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2800);
    } catch (err: any) {
      console.error("Sauvegarde échouée:", err);
      setError(isRTL
        ? `فشل الحفظ: ${err?.message || "خطأ غير معروف"}`
        : `Échec de la sauvegarde : ${err?.message || "erreur inconnue"}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile) return (
    <div className="pf-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '46px', height: '46px' }}>
        <div style={{ position: 'absolute', inset: 0, border: '3px solid rgba(124,58,237,0.15)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 0, border: '3px solid transparent', borderTopColor: '#FF8C00', borderRadius: '50%', animation: 'pfspin 0.8s linear infinite' }} />
      </div>
      <style jsx global>{`
        @keyframes pfspin { to { transform: rotate(360deg); } }
        .pf-page { background: #0A0014; min-height: 100vh; }
      `}</style>
    </div>
  );

  const isTeacher = profile.role === "teacher";

  return (
    <div className="pf-page" dir={isRTL ? "rtl" : "ltr"}>
      <div className="pf-container">

        <Link href="/" className="pf-back">
          <ArrowLeft size={15} style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
          {isRTL ? "رجوع" : "Retour"}
        </Link>

        {/* ═══ HEADER ═══ */}
        <div className="pf-header">
          <div className="pf-header-icon"><User size={20} /></div>
          <div>
            <h1 className="pf-title">{isRTL ? "ملفي الشخصي" : "Mon profil"}</h1>
            <p className="pf-sub">
              {isRTL ? "إدارة معلوماتك الشخصية" : "Gérez vos informations personnelles"}
            </p>
          </div>
        </div>

        {/* ═══ ERREUR ═══ */}
        {error && (
          <div className="pf-error">
            <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '1px' }} />
            <p>{error}</p>
            <button onClick={() => setError(null)} className="pf-error-close">
              <X size={15} />
            </button>
          </div>
        )}

        <div className="pf-card">

          {/* ═══ PHOTO ═══ */}
          <div className="pf-photo-section">
            <div className="pf-photo-wrap" onClick={() => !uploading && fileRef.current?.click()}>
              {photoURL ? (
                <img src={photoURL} alt="" className="pf-photo-img" />
              ) : (
                <span className="pf-photo-initial">
                  {displayName ? displayName.charAt(0).toUpperCase() : <Camera size={22} />}
                </span>
              )}
              {uploading && (
                <div className="pf-photo-loading">
                  <div className="pf-photo-spinner" />
                </div>
              )}
              <span className="pf-photo-badge"><Camera size={12} /></span>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />

            <div className="pf-photo-actions">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="pf-photo-btn"
              >
                <Camera size={14} />
                {uploading
                  ? (isRTL ? "جارٍ الرفع..." : "Téléversement...")
                  : photoURL
                    ? (isRTL ? "تغيير الصورة" : "Changer la photo")
                    : (isRTL ? "إضافة صورة" : "Ajouter une photo")}
              </button>
              {photoURL && !uploading && (
                <button onClick={removePhoto} className="pf-photo-remove">
                  <Trash2 size={13} />
                </button>
              )}
              <p className="pf-photo-hint">
                {isRTL ? "JPG أو PNG · 5 ميغا كحد أقصى" : "JPG ou PNG · 5 Mo maximum"}
              </p>
            </div>
          </div>

          {/* ═══ INFOS DE BASE ═══ */}
          <div className="pf-grid">
            <Field
              label={isRTL ? "الاسم الكامل" : "Nom complet"}
              icon={<User size={13} />}
              value={displayName}
              onChange={setDisplayName}
              placeholder={isRTL ? "محمد عمراني" : "Mohamed Amrani"}
              required
            />
            <Field
              label={isRTL ? "رقم الهاتف" : "Téléphone"}
              icon={<Phone size={13} />}
              value={phone}
              onChange={setPhone}
              placeholder="0555 XX XX XX"
            />
            <div className="pf-field">
              <label className="pf-label"><MapPin size={13} /> {isRTL ? "الولاية" : "Wilaya"}</label>
              <select value={wilaya} onChange={e => setWilaya(e.target.value)} className="pf-input">
                {WILAYAS.map(w => (
                  <option key={w} value={w} style={{ background: '#1A0A3C' }}>
                    {trWilaya(w, isRTL)}
                  </option>
                ))}
              </select>
            </div>
            {isTeacher && (
              <div className="pf-field">
                <label className="pf-label">
                  <Briefcase size={13} /> {isRTL ? "سنوات الخبرة" : "Années d'expérience"}
                </label>
                <div className="pf-counter">
                  <button
                    onClick={() => setYearsExperience(Math.max(0, yearsExperience - 1))}
                    className="pf-counter-btn"
                    type="button"
                  >−</button>
                  <span className="pf-counter-val">{yearsExperience}</span>
                  <button
                    onClick={() => setYearsExperience(Math.min(50, yearsExperience + 1))}
                    className="pf-counter-btn pf-counter-btn-plus"
                    type="button"
                  >+</button>
                </div>
              </div>
            )}
          </div>

          {/* ═══ INFOS PROFESSIONNELLES ═══ */}
          {isTeacher && (
            <>
              <div className="pf-divider">
                {isRTL ? "معلومات مهنية" : "Informations professionnelles"}
              </div>

              <Field
                label={isRTL ? "الشهادة" : "Diplôme"}
                icon={<GraduationCap size={13} />}
                value={diploma}
                onChange={setDiploma}
                placeholder={isRTL ? "مثال: ليسانس في الرياضيات" : "Ex: Licence en Mathématiques"}
                full
              />
              <Field
                label={isRTL ? "الجامعة / المؤسسة" : "Université / Établissement"}
                value={university}
                onChange={setUniversity}
                placeholder={isRTL ? "مثال: جامعة هواري بومدين" : "Ex: USTHB Alger"}
                full
              />

              <div className="pf-field pf-field-full">
                <label className="pf-label">
                  {isRTL ? "المواد التي تدرّسها" : "Matières enseignées"}
                  {subjects.length > 0 && (
                    <span className="pf-count-badge">{subjects.length}</span>
                  )}
                </label>
                <div className="pf-chips">
                  {SUBJECTS.map(s => {
                    const on = subjects.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSubject(s)}
                        className={`pf-chip ${on ? "pf-chip-on" : ""}`}
                      >
                        {trSubject(s, isRTL)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ═══ DISPONIBILITÉS ═══ */}
              <div className="pf-field pf-field-full">
                <label className="pf-label">
                  <Clock size={13} />
                  {isRTL ? "الأوقات المتاحة" : "Mes disponibilités"}
                  {availability.length > 0 && (
                    <span className="pf-count-badge">{availability.length}</span>
                  )}
                </label>
                <p className="pf-field-hint">
                  {isRTL
                    ? "تظهر هذه الأوقات على ملفك العام لمساعدة الأولياء على الاختيار."
                    : "Ces créneaux apparaissent sur votre profil public et aident les parents à choisir."}
                </p>
                <AvailabilityPicker value={availability} onChange={setAvailability} />
              </div>
            </>
          )}

          {/* ═══ BIO ═══ */}
          <div className="pf-divider">{isRTL ? "نبذة عني" : "À propos"}</div>
          <div className="pf-field pf-field-full">
            <label className="pf-label">{isRTL ? "السيرة الذاتية" : "Biographie"}</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              className="pf-input pf-textarea"
              rows={4}
              maxLength={500}
              placeholder={isTeacher
                ? (isRTL ? "قدّم مسارك وطريقتك في التدريس..." : "Présentez votre parcours et méthode d'enseignement...")
                : (isRTL ? "تحدّث قليلاً عن نفسك..." : "Parlez un peu de vous...")}
            />
            <span className="pf-char-count">{bio.length}/500</span>
          </div>

          {/* ═══ SAUVEGARDE ═══ */}
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className={`pf-save ${saved ? "pf-save-done" : ""}`}
          >
            {saved ? (
              <><CheckCircle size={17} /> {isRTL ? "تم الحفظ!" : "Profil enregistré !"}</>
            ) : saving ? (
              <>{isRTL ? "جارٍ الحفظ..." : "Enregistrement..."}</>
            ) : (
              <><Save size={16} /> {isRTL ? "حفظ التعديلات" : "Enregistrer les modifications"}</>
            )}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .pf-page {
          background: #0A0014; min-height: 100vh;
          background-image:
            radial-gradient(circle at 20% 10%, rgba(124,58,237,0.09) 0%, transparent 48%),
            linear-gradient(rgba(168,85,247,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168,85,247,0.022) 1px, transparent 1px);
          background-size: auto, 44px 44px, 44px 44px;
          padding: 28px 16px 60px;
        }
        .pf-container { max-width: 660px; margin: 0 auto; }

        .pf-back {
          display: inline-flex; align-items: center; gap: 7px;
          color: #a78bfa; text-decoration: none; font-size: 13px; font-weight: 600;
          margin-bottom: 20px; padding: 7px 13px; border-radius: 10px; transition: all 0.2s ease;
        }
        .pf-back:hover { background: rgba(124,58,237,0.12); color: white; gap: 9px; }

        .pf-header { display: flex; align-items: center; gap: 13px; margin-bottom: 20px; }
        .pf-header-icon {
          width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
          background: linear-gradient(135deg, rgba(255,140,0,0.2), rgba(124,58,237,0.16));
          border: 1px solid rgba(255,140,0,0.28);
          display: flex; align-items: center; justify-content: center; color: #FF8C00;
        }
        .pf-title { color: white; font-weight: 900; font-size: 22px; margin: 0; letter-spacing: -0.4px; }
        .pf-sub { color: #8b7bb8; font-size: 12.5px; margin: 3px 0 0; }

        /* ── Erreur ── */
        .pf-error {
          display: flex; align-items: flex-start; gap: 10px;
          background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.32);
          border-radius: 13px; padding: 13px 15px; margin-bottom: 16px;
          animation: pfSlide 0.28s ease;
        }
        @keyframes pfSlide { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .pf-error svg { color: #f87171; }
        .pf-error p { color: #fca5a5; font-size: 13px; margin: 0; flex: 1; line-height: 1.5; }
        .pf-error-close {
          background: none; border: none; color: #f87171; cursor: pointer;
          display: flex; padding: 0; flex-shrink: 0; opacity: 0.7;
        }
        .pf-error-close:hover { opacity: 1; }

        /* ── Card ── */
        .pf-card {
          background: linear-gradient(150deg, rgba(22,10,48,0.92), rgba(14,6,30,0.95));
          border: 1px solid rgba(124,58,237,0.2); border-radius: 20px; padding: 26px;
        }

        /* ── Photo ── */
        .pf-photo-section {
          display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
          padding-bottom: 24px; margin-bottom: 22px;
          border-bottom: 1px solid rgba(124,58,237,0.14);
        }
        .pf-photo-wrap {
          position: relative; width: 86px; height: 86px; border-radius: 22px;
          cursor: pointer; flex-shrink: 0; overflow: hidden;
          background: linear-gradient(140deg, rgba(124,58,237,0.38), rgba(124,58,237,0.12));
          border: 2px solid rgba(168,85,247,0.32);
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.25s ease, transform 0.25s ease;
        }
        .pf-photo-wrap:hover { border-color: rgba(255,140,0,0.55); transform: scale(1.02); }
        .pf-photo-img { width: 100%; height: 100%; object-fit: cover; }
        .pf-photo-initial { color: #e9d5ff; font-weight: 900; font-size: 32px; display: flex; }
        .pf-photo-loading {
          position: absolute; inset: 0; background: rgba(10,0,20,0.7);
          display: flex; align-items: center; justify-content: center;
        }
        .pf-photo-spinner {
          width: 26px; height: 26px; border: 2.5px solid rgba(255,140,0,0.25);
          border-top-color: #FF8C00; border-radius: 50%;
          animation: pfspin 0.7s linear infinite;
        }
        .pf-photo-badge {
          position: absolute; bottom: 5px; inset-inline-end: 5px;
          width: 24px; height: 24px; border-radius: 8px;
          background: #FF8C00; color: white;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #14082c;
        }
        .pf-photo-actions { display: flex; flex-direction: column; gap: 8px; }
        .pf-photo-btn {
          display: inline-flex; align-items: center; gap: 7px; width: fit-content;
          background: rgba(124,58,237,0.16); color: #d8b4fe;
          border: 1px solid rgba(168,85,247,0.28);
          padding: 9px 16px; border-radius: 11px;
          font-size: 12.5px; font-weight: 700; cursor: pointer; transition: all 0.2s ease;
        }
        .pf-photo-btn:hover:not(:disabled) { background: rgba(124,58,237,0.26); }
        .pf-photo-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .pf-photo-remove {
          display: inline-flex; align-items: center; gap: 5px; width: fit-content;
          background: transparent; color: #f87171;
          border: 1px solid rgba(239,68,68,0.28);
          padding: 6px 12px; border-radius: 9px;
          font-size: 11.5px; cursor: pointer; transition: all 0.2s ease;
        }
        .pf-photo-remove:hover { background: rgba(239,68,68,0.1); }
        .pf-photo-hint { color: #6d28d9; font-size: 11px; margin: 0; }

        /* ── Formulaire ── */
        .pf-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 520px) { .pf-grid { grid-template-columns: 1fr 1fr; } }
        .pf-field { display: flex; flex-direction: column; gap: 7px; position: relative; }
        .pf-field-full { grid-column: 1 / -1; margin-top: 16px; }
        .pf-label {
          display: flex; align-items: center; gap: 6px;
          color: #a78bfa; font-size: 12px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .pf-label svg { color: #FF8C00; }
        .pf-required { color: #f87171; }
        .pf-count-badge {
          background: #FF8C00; color: white; font-size: 9.5px; font-weight: 800;
          min-width: 17px; height: 17px; border-radius: 999px;
          display: inline-flex; align-items: center; justify-content: center; padding: 0 5px;
          margin-inline-start: 4px;
        }
        .pf-input {
          width: 100%; background: rgba(26,10,60,0.65);
          border: 1px solid rgba(124,58,237,0.24); border-radius: 12px;
          padding: 11px 13px; font-size: 13.5px; color: white;
          outline: none; font-family: inherit; box-sizing: border-box;
          transition: border-color 0.22s ease, background 0.22s ease;
        }
        .pf-input:focus { border-color: rgba(255,140,0,0.5); background: rgba(26,10,60,0.85); }
        .pf-input::placeholder { color: #6d28d9; }
        .pf-textarea { resize: none; line-height: 1.6; }
        .pf-char-count {
          position: absolute; bottom: 9px; inset-inline-end: 12px;
          color: #6d28d9; font-size: 10.5px; pointer-events: none;
        }

        /* ── Compteur ── */
        .pf-counter {
          display: flex; align-items: center; gap: 10px;
          background: rgba(26,10,60,0.65); border: 1px solid rgba(124,58,237,0.24);
          border-radius: 12px; padding: 5px 8px; width: fit-content;
        }
        .pf-counter-btn {
          width: 30px; height: 30px; border-radius: 9px;
          background: rgba(124,58,237,0.18); border: none; color: #c4b5fd;
          font-size: 18px; font-weight: 700; cursor: pointer; line-height: 1;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.18s ease;
        }
        .pf-counter-btn:hover { background: rgba(124,58,237,0.32); color: white; }
        .pf-counter-btn-plus { background: rgba(255,140,0,0.18); color: #FF8C00; }
        .pf-counter-btn-plus:hover { background: rgba(255,140,0,0.3); }
        .pf-counter-val {
          color: white; font-weight: 800; font-size: 16px;
          min-width: 32px; text-align: center;
        }

        /* ── Divider ── */
        .pf-divider {
          color: #8b7bb8; font-size: 11.5px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.7px;
          margin: 26px 0 16px; padding-top: 20px;
          border-top: 1px solid rgba(124,58,237,0.14);
        }

        /* ── Chips matières ── */
        .pf-field-hint {
          color: #6d28d9; font-size: 11px; margin: -2px 0 8px; line-height: 1.5;
        }
        .pf-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .pf-chip {
          background: rgba(124,58,237,0.09); border: 1px solid rgba(124,58,237,0.2);
          color: #a78bfa; padding: 8px 14px; border-radius: 10px;
          font-size: 12.5px; font-weight: 600; cursor: pointer;
          transition: all 0.2s cubic-bezier(0.34,1.4,0.64,1);
        }
        .pf-chip:hover { border-color: rgba(168,85,247,0.4); transform: translateY(-1px); }
        .pf-chip-on {
          background: rgba(255,140,0,0.16); border-color: rgba(255,140,0,0.45);
          color: #FF8C00; font-weight: 700;
        }

        /* ── Bouton save ── */
        .pf-save {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 9px;
          background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white;
          font-weight: 800; padding: 15px; border-radius: 14px;
          border: none; cursor: pointer; font-size: 14.5px; margin-top: 26px;
          box-shadow: 0 7px 22px rgba(255,140,0,0.3);
          transition: all 0.25s cubic-bezier(0.34,1.4,0.64,1);
        }
        .pf-save:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 11px 30px rgba(255,140,0,0.42); }
        .pf-save:disabled { opacity: 0.6; cursor: not-allowed; }
        .pf-save-done {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          box-shadow: 0 7px 22px rgba(34,197,94,0.3);
        }
      `}</style>
    </div>
  );
}

/* ── Champ réutilisable ─────────────────────────────────── */
function Field({
  label, icon, value, onChange, placeholder, required, full,
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  full?: boolean;
}) {
  return (
    <div className={`pf-field ${full ? "pf-field-full" : ""}`}>
      <label className="pf-label">
        {icon}
        {label}
        {required && <span className="pf-required">*</span>}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pf-input"
      />
    </div>
  );
}
