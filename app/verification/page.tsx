"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { trSubject } from "@/lib/i18n/translate";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { submitVerification, getVerificationByTeacher } from "@/lib/firestore";
import { SUBJECTS } from "@/lib/types";
import {
  ShieldCheck, Upload, Check, X, AlertCircle, Clock, ArrowLeft,
  FileText, CreditCard, Video, Award, TrendingUp, Users, Loader2,
} from "lucide-react";
import Link from "next/link";

const MAX_DOC_SIZE = 10 * 1024 * 1024;   // 10 Mo
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 Mo

type UploadStatus = "idle" | "uploading" | "done" | "error";

/* ═══ Zone de téléversement ═══════════════════════════════ */
function UploadZone({
  label, hint, icon, accept, maxSize, uid, kind, onUploaded, isRTL, required,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  accept: string;
  maxSize: number;
  uid: string;
  kind: string;
  onUploaded: (url: string) => void;
  isRTL: boolean;
  required?: boolean;
}) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // ── Validation taille ──
    if (file.size > maxSize) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      const maxMb = Math.round(maxSize / 1024 / 1024);
      setError(isRTL
        ? `الملف كبير جداً (${mb} ميغا). الحد الأقصى ${maxMb} ميغا.`
        : `Fichier trop lourd (${mb} Mo). Maximum ${maxMb} Mo.`);
      setStatus("error");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // ── Validation type (l'attribut accept est contournable) ──
    const okType = accept.split(",").some(a => {
      const t = a.trim();
      if (t.endsWith("/*")) return file.type.startsWith(t.slice(0, -1));
      if (t.startsWith(".")) return file.name.toLowerCase().endsWith(t);
      return file.type === t;
    });
    if (!okType) {
      setError(isRTL ? "نوع الملف غير مقبول" : "Type de fichier non accepté");
      setStatus("error");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setStatus("uploading");
    setFileName(file.name);

    try {
      // ⚠️ Le chemin inclut l'UID — permet aux règles Storage de vérifier
      // que chaque prof n'accède qu'à ses propres documents
      const safeName = file.name.replace(/[^\w.-]/g, "_");
      const path = `verifications/${uid}/${kind}_${Date.now()}_${safeName}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      onUploaded(url);
      setStatus("done");
    } catch (err: any) {
      // ⚠️ AVANT : le catch était vide, aucun message affiché
      console.error("Upload échoué :", err);
      const code = err?.code || "";
      setError(
        code === "storage/unauthorized"
          ? (isRTL ? "غير مصرح. تحقق من قواعد Storage." : "Non autorisé. Vérifiez les règles Storage.")
          : code === "storage/retry-limit-exceeded"
            ? (isRTL ? "فشل الرفع — الاتصال ضعيف." : "Échec — connexion instable.")
            : (isRTL ? `خطأ: ${code || "غير معروف"}` : `Erreur : ${code || "inconnue"}`)
      );
      setStatus("error");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="vf-upload-field">
      <label className="vf-label">
        {icon} {label}
        {required && <span className="vf-req">*</span>}
      </label>

      <div
        onClick={() => status !== "uploading" && inputRef.current?.click()}
        className={`vf-drop vf-drop-${status}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          style={{ display: "none" }}
          onChange={handleFile}
        />

        {status === "uploading" ? (
          <>
            <Loader2 size={26} className="vf-spin" style={{ color: "#FF8C00" }} />
            <p className="vf-drop-label">{isRTL ? "جارٍ الرفع..." : "Téléversement..."}</p>
            <p className="vf-drop-name">{fileName}</p>
          </>
        ) : status === "done" ? (
          <>
            <Check size={26} style={{ color: "#4ade80" }} />
            <p className="vf-drop-label" style={{ color: "#4ade80" }}>
              {isRTL ? "تم الرفع ✓" : "Téléversé ✓"}
            </p>
            <p className="vf-drop-name">{fileName}</p>
            <span className="vf-drop-change">{isRTL ? "تغيير" : "Changer"}</span>
          </>
        ) : (
          <>
            <Upload size={26} style={{ color: status === "error" ? "#f87171" : "#7c3aed" }} />
            <p className="vf-drop-label">{isRTL ? "اضغط للاختيار" : "Cliquez pour choisir"}</p>
            <p className="vf-drop-hint">{hint}</p>
          </>
        )}
      </div>

      {error && (
        <div className="vf-field-error">
          <AlertCircle size={13} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

/* ═══ Page ════════════════════════════════════════════════ */
export default function VerificationPage() {
  const { user, profile, loading } = useAuth();
  const { isRTL } = useLang();
  const router = useRouter();

  const [existing, setExisting] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bio, setBio] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [diplomaURL, setDiplomaURL] = useState("");
  const [cinURL, setCinURL] = useState("");
  const [demoVideoURL, setDemoVideoURL] = useState("");

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "teacher")) router.push("/auth");
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (user) {
      getVerificationByTeacher(user.uid)
        .then(setExisting)
        .catch(err => {
          console.error(err);
          setError(isRTL ? "فشل تحميل الملف" : "Échec du chargement du dossier");
        })
        .finally(() => setLoadingData(false));
    }
  }, [user]);

  function toggleSubject(s: string) {
    setSelectedSubjects(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

  const canSubmit = diplomaURL && cinURL && bio.trim().length >= 30 && selectedSubjects.length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await submitVerification({
        teacherId: user!.uid,
        teacherName: profile!.displayName,
        diplomaURL,
        cinURL,
        demoVideoURL,
        subjects: selectedSubjects,
        bio: bio.trim(),
        status: "pending",
        submittedAt: new Date().toISOString(),
      });
      setSuccess(true);
    } catch (err: any) {
      console.error("Soumission échouée :", err);
      setError(isRTL
        ? "فشل إرسال الملف. حاول مرة أخرى."
        : "Échec de l'envoi du dossier. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || loadingData) return (
    <div className="vf-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: "46px", height: "46px" }}>
        <div style={{ position: "absolute", inset: 0, border: "3px solid rgba(124,58,237,0.15)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", inset: 0, border: "3px solid transparent", borderTopColor: "#FF8C00", borderRadius: "50%", animation: "vfspin 0.8s linear infinite" }} />
      </div>
      <style jsx global>{`
        @keyframes vfspin { to { transform: rotate(360deg); } }
        .vf-page { background: #0A0014; min-height: 100vh; }
      `}</style>
    </div>
  );

  const st = existing?.status;

  /* ── États : en attente / approuvé ── */
  if (success || st === "pending" || st === "approved") {
    const approved = st === "approved";
    return (
      <div className="vf-page" dir={isRTL ? "rtl" : "ltr"}>
        <div className="vf-container vf-center">
          <div className={`vf-status-icon ${approved ? "vf-status-icon-ok" : ""}`}>
            {approved ? <ShieldCheck size={32} /> : <Clock size={32} />}
            <span className={`vf-ping ${approved ? "vf-ping-ok" : ""}`} />
          </div>

          <h1 className="vf-status-title">
            {approved
              ? (isRTL ? "تهانينا! تم توثيق حسابك ✅" : "Félicitations, profil vérifié ✅")
              : (isRTL ? "ملفك قيد المراجعة ⏳" : "Dossier en cours d'examen ⏳")}
          </h1>

          <p className="vf-status-text">
            {approved
              ? (isRTL
                  ? "يظهر الآن شارة «موثق» على ملفك، وتحصل على أولوية في نتائج البحث."
                  : "Le badge « Vérifié » apparaît sur votre profil et vous bénéficiez d'une priorité dans les résultats.")
              : (isRTL
                  ? "سيراجع فريقنا ملفك خلال 48 ساعة. ستصلك إشعار بمجرد اتخاذ القرار."
                  : "Notre équipe examinera votre dossier sous 48h. Vous recevrez une notification dès la décision.")}
          </p>

          <Link href="/dashboard" className="vf-btn">
            {isRTL ? "العودة للوحة التحكم" : "Retour au dashboard"}
          </Link>
        </div>
        <style jsx global>{VF_STYLES}</style>
      </div>
    );
  }

  /* ── Formulaire ── */
  return (
    <div className="vf-page" dir={isRTL ? "rtl" : "ltr"}>
      <div className="vf-container">

        <Link href="/dashboard" className="vf-back">
          <ArrowLeft size={15} style={{ transform: isRTL ? "rotate(180deg)" : "none" }} />
          {isRTL ? "لوحة التحكم" : "Dashboard"}
        </Link>

        <div className="vf-header">
          <div className="vf-header-icon"><ShieldCheck size={20} /></div>
          <div>
            <h1 className="vf-title">{isRTL ? "توثيق الحساب" : "Vérification du profil"}</h1>
            <p className="vf-sub">
              {isRTL ? "احصل على شارة الثقة وزد فرصك" : "Obtenez le badge de confiance"}
            </p>
          </div>
        </div>

        {/* Refus précédent */}
        {st === "rejected" && (
          <div className="vf-rejected">
            <X size={17} />
            <div>
              <strong>{isRTL ? "تم رفض ملفك السابق" : "Votre dossier précédent a été refusé"}</strong>
              {existing?.rejectionReason && <p>{existing.rejectionReason}</p>}
              <span>{isRTL ? "يمكنك إعادة الإرسال بعد التصحيح." : "Vous pouvez soumettre à nouveau après correction."}</span>
            </div>
          </div>
        )}

        {/* Avantages */}
        <div className="vf-benefits">
          {[
            { icon: <Award size={17} />, fr: "Badge Vérifié", ar: "شارة موثق" },
            { icon: <TrendingUp size={17} />, fr: "Priorité recherche", ar: "أولوية في البحث" },
            { icon: <Users size={17} />, fr: "Confiance parents", ar: "ثقة الأولياء" },
          ].map((b, i) => (
            <div key={i} className="vf-benefit">
              <span>{b.icon}</span>
              <p>{isRTL ? b.ar : b.fr}</p>
            </div>
          ))}
        </div>

        {error && (
          <div className="vf-error">
            <AlertCircle size={16} />
            <p>{error}</p>
            <button onClick={() => setError(null)}><X size={14} /></button>
          </div>
        )}

        <div className="vf-card">
          {/* Bio */}
          <div className="vf-field">
            <label className="vf-label">
              <FileText size={13} /> {isRTL ? "نبذة عنك" : "Présentation"}
              <span className="vf-req">*</span>
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={4}
              maxLength={600}
              className="vf-textarea"
              placeholder={isRTL
                ? "قدّم مسارك، شهاداتك، خبرتك وطريقتك في التدريس..."
                : "Présentez votre parcours, vos diplômes, votre expérience et votre méthode..."}
            />
            <div className="vf-char">
              <span className={bio.trim().length < 30 ? "vf-char-low" : ""}>
                {bio.trim().length < 30
                  ? (isRTL ? `${30 - bio.trim().length} حرف متبقٍ على الأقل` : `Encore ${30 - bio.trim().length} caractères minimum`)
                  : (isRTL ? "✓ كافٍ" : "✓ Suffisant")}
              </span>
              <span>{bio.length}/600</span>
            </div>
          </div>

          {/* Matières */}
          <div className="vf-field">
            <label className="vf-label">
              {isRTL ? "المواد التي تدرّسها" : "Matières enseignées"}
              <span className="vf-req">*</span>
              {selectedSubjects.length > 0 && (
                <span className="vf-count">{selectedSubjects.length}</span>
              )}
            </label>
            <div className="vf-chips">
              {SUBJECTS.map(s => {
                const on = selectedSubjects.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSubject(s)}
                    className={`vf-chip ${on ? "vf-chip-on" : ""}`}
                  >
                    {trSubject(s, isRTL)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Documents */}
          <div className="vf-divider">
            {isRTL ? "الوثائق" : "Documents justificatifs"}
          </div>

          <UploadZone
            label={isRTL ? "الشهادة العلمية" : "Diplôme"}
            hint={isRTL ? "JPG, PNG أو PDF — 10 ميغا كحد أقصى" : "JPG, PNG ou PDF — 10 Mo max"}
            icon={<FileText size={13} />}
            accept="image/*,application/pdf"
            maxSize={MAX_DOC_SIZE}
            uid={user!.uid}
            kind="diploma"
            onUploaded={setDiplomaURL}
            isRTL={isRTL}
            required
          />

          <UploadZone
            label={isRTL ? "بطاقة الهوية" : "Pièce d'identité"}
            hint={isRTL ? "JPG, PNG أو PDF — 10 ميغا كحد أقصى" : "JPG, PNG ou PDF — 10 Mo max"}
            icon={<CreditCard size={13} />}
            accept="image/*,application/pdf"
            maxSize={MAX_DOC_SIZE}
            uid={user!.uid}
            kind="cin"
            onUploaded={setCinURL}
            isRTL={isRTL}
            required
          />

          <UploadZone
            label={isRTL ? "فيديو تعريفي (اختياري)" : "Vidéo de présentation (optionnel)"}
            hint={isRTL ? "MP4 — دقيقتان، 100 ميغا كحد أقصى" : "MP4 — 2 min, 100 Mo max"}
            icon={<Video size={13} />}
            accept="video/*"
            maxSize={MAX_VIDEO_SIZE}
            uid={user!.uid}
            kind="demo"
            onUploaded={setDemoVideoURL}
            isRTL={isRTL}
          />

          {/* Confidentialité */}
          <div className="vf-privacy">
            <ShieldCheck size={14} />
            <p>
              {isRTL
                ? "وثائقك مرئية فقط لفريق أستاذي وتُستعمل حصرياً للتحقق من هويتك."
                : "Vos documents sont visibles uniquement par l'équipe Ostadi et servent exclusivement à vérifier votre identité."}
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="vf-submit"
          >
            {submitting ? (
              <><Loader2 size={16} className="vf-spin" /> {isRTL ? "جارٍ الإرسال..." : "Envoi..."}</>
            ) : (
              <><ShieldCheck size={17} /> {isRTL ? "إرسال طلب التوثيق" : "Soumettre pour vérification"}</>
            )}
          </button>

          {!canSubmit && (
            <p className="vf-missing">
              {isRTL ? "مطلوب: " : "Manquant : "}
              {[
                bio.trim().length < 30 && (isRTL ? "النبذة" : "présentation"),
                selectedSubjects.length === 0 && (isRTL ? "المواد" : "matières"),
                !diplomaURL && (isRTL ? "الشهادة" : "diplôme"),
                !cinURL && (isRTL ? "بطاقة الهوية" : "pièce d'identité"),
              ].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>

      <style jsx global>{VF_STYLES}</style>
    </div>
  );
}

const VF_STYLES = `
  .vf-page {
    background: #0A0014; min-height: 100vh;
    background-image:
      radial-gradient(circle at 20% 8%, rgba(124,58,237,0.09) 0%, transparent 45%),
      linear-gradient(rgba(168,85,247,0.022) 1px, transparent 1px),
      linear-gradient(90deg, rgba(168,85,247,0.022) 1px, transparent 1px);
    background-size: auto, 44px 44px, 44px 44px;
    padding: 28px 16px 60px;
  }
  .vf-container { max-width: 620px; margin: 0 auto; }
  .vf-center { text-align: center; padding-top: 60px; }

  .vf-back {
    display: inline-flex; align-items: center; gap: 7px;
    color: #a78bfa; text-decoration: none; font-size: 13px; font-weight: 600;
    margin-bottom: 20px; padding: 7px 13px; border-radius: 10px; transition: all 0.2s ease;
  }
  .vf-back:hover { background: rgba(124,58,237,0.12); color: white; gap: 9px; }

  .vf-header { display: flex; align-items: center; gap: 13px; margin-bottom: 20px; }
  .vf-header-icon {
    width: 48px; height: 48px; border-radius: 15px; flex-shrink: 0;
    background: linear-gradient(140deg, rgba(255,140,0,0.2), rgba(124,58,237,0.18));
    border: 1px solid rgba(255,140,0,0.28);
    display: flex; align-items: center; justify-content: center; color: #FF8C00;
  }
  .vf-title { color: white; font-weight: 900; font-size: 21px; margin: 0; letter-spacing: -0.4px; }
  .vf-sub { color: #8b7bb8; font-size: 12.5px; margin: 3px 0 0; }

  .vf-rejected {
    display: flex; align-items: flex-start; gap: 11px;
    background: rgba(239,68,68,0.09); border: 1px solid rgba(239,68,68,0.3);
    border-radius: 14px; padding: 14px 16px; margin-bottom: 18px;
  }
  .vf-rejected > svg { color: #f87171; flex-shrink: 0; margin-top: 2px; }
  .vf-rejected strong { color: #fca5a5; font-size: 13.5px; display: block; }
  .vf-rejected p { color: #fca5a5; font-size: 12.5px; margin: 5px 0; font-style: italic; }
  .vf-rejected span { color: #a78bfa; font-size: 12px; }

  .vf-benefits { display: flex; gap: 10px; margin-bottom: 20px; }
  .vf-benefit {
    flex: 1; text-align: center; padding: 14px 8px;
    background: rgba(124,58,237,0.07); border: 1px solid rgba(124,58,237,0.15);
    border-radius: 14px;
  }
  .vf-benefit span { color: #FF8C00; display: block; margin-bottom: 6px; }
  .vf-benefit p { color: #c4b5fd; font-size: 11px; font-weight: 600; margin: 0; }

  .vf-error {
    display: flex; align-items: flex-start; gap: 10px;
    background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
    border-radius: 12px; padding: 12px 14px; margin-bottom: 16px;
  }
  .vf-error > svg { color: #f87171; flex-shrink: 0; margin-top: 1px; }
  .vf-error p { color: #fca5a5; font-size: 12.5px; margin: 0; flex: 1; }
  .vf-error button { background: none; border: none; color: #f87171; cursor: pointer; display: flex; padding: 0; }

  .vf-card {
    background: linear-gradient(150deg, rgba(22,10,48,0.92), rgba(14,6,30,0.94));
    border: 1px solid rgba(124,58,237,0.2); border-radius: 20px; padding: 24px;
  }

  .vf-field, .vf-upload-field { margin-bottom: 20px; }
  .vf-label {
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
    color: #a78bfa; font-size: 11.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 8px;
  }
  .vf-label svg { color: #FF8C00; }
  .vf-req { color: #f87171; }
  .vf-count {
    background: #FF8C00; color: white; font-size: 9.5px; font-weight: 800;
    min-width: 17px; height: 17px; border-radius: 999px; padding: 0 5px;
    display: inline-flex; align-items: center; justify-content: center;
  }

  .vf-textarea {
    width: 100%; box-sizing: border-box; resize: none;
    background: rgba(26,10,60,0.62); border: 1px solid rgba(124,58,237,0.24);
    border-radius: 12px; padding: 12px 14px;
    font-size: 13.5px; color: white; font-family: inherit; line-height: 1.6;
    outline: none; transition: border-color 0.2s ease;
  }
  .vf-textarea:focus { border-color: rgba(255,140,0,0.5); }
  .vf-textarea::placeholder { color: #5b21b6; }
  .vf-char {
    display: flex; justify-content: space-between;
    color: #6d28d9; font-size: 10.5px; margin-top: 6px;
  }
  .vf-char-low { color: #fbbf24; }

  .vf-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .vf-chip {
    background: rgba(124,58,237,0.09); border: 1px solid rgba(124,58,237,0.2);
    color: #a78bfa; padding: 8px 14px; border-radius: 10px;
    font-size: 12.5px; font-weight: 600; cursor: pointer;
    transition: all 0.2s cubic-bezier(0.34,1.4,0.64,1);
  }
  .vf-chip:hover { border-color: rgba(168,85,247,0.4); transform: translateY(-1px); }
  .vf-chip-on {
    background: rgba(255,140,0,0.16); border-color: rgba(255,140,0,0.45);
    color: #FF8C00; font-weight: 700;
  }

  .vf-divider {
    color: #8b7bb8; font-size: 11.5px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.7px;
    margin: 26px 0 18px; padding-top: 20px;
    border-top: 1px solid rgba(124,58,237,0.14);
  }

  .vf-drop {
    border: 2px dashed rgba(124,58,237,0.3); border-radius: 15px;
    padding: 22px 18px; text-align: center; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; gap: 7px;
    background: rgba(10,0,20,0.3);
    transition: all 0.24s ease;
  }
  .vf-drop:hover { border-color: rgba(168,85,247,0.5); background: rgba(124,58,237,0.05); }
  .vf-drop-done { border-color: rgba(34,197,94,0.45); background: rgba(34,197,94,0.05); }
  .vf-drop-error { border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.04); }
  .vf-drop-uploading { border-color: rgba(255,140,0,0.4); cursor: wait; }
  .vf-drop-label { color: #a78bfa; font-size: 13px; font-weight: 600; margin: 0; }
  .vf-drop-hint { color: #5b21b6; font-size: 11px; margin: 0; }
  .vf-drop-name { color: #6d28d9; font-size: 11px; margin: 0; word-break: break-all; max-width: 100%; }
  .vf-drop-change {
    color: #FF8C00; font-size: 10.5px; font-weight: 700;
    text-decoration: underline; margin-top: 2px;
  }

  .vf-field-error {
    display: flex; align-items: flex-start; gap: 6px; margin-top: 7px;
  }
  .vf-field-error svg { color: #f87171; flex-shrink: 0; margin-top: 1px; }
  .vf-field-error span { color: #fca5a5; font-size: 11.5px; line-height: 1.45; }

  .vf-privacy {
    display: flex; align-items: flex-start; gap: 10px;
    background: rgba(124,58,237,0.07); border: 1px solid rgba(124,58,237,0.16);
    border-radius: 12px; padding: 12px 14px; margin: 22px 0 18px;
  }
  .vf-privacy svg { color: #a78bfa; flex-shrink: 0; margin-top: 1px; }
  .vf-privacy p { color: #a78bfa; font-size: 11.5px; margin: 0; line-height: 1.55; }

  .vf-submit {
    width: 100%; display: flex; align-items: center; justify-content: center; gap: 9px;
    background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white;
    font-weight: 800; padding: 15px; border-radius: 14px;
    border: none; cursor: pointer; font-size: 14.5px; font-family: inherit;
    box-shadow: 0 7px 22px rgba(255,140,0,0.28);
    transition: transform 0.25s cubic-bezier(0.34,1.4,0.64,1);
  }
  .vf-submit:hover:not(:disabled) { transform: translateY(-2px); }
  .vf-submit:disabled { opacity: 0.42; cursor: not-allowed; transform: none; }
  .vf-missing {
    color: #6d28d9; font-size: 11px; text-align: center; margin: 10px 0 0;
  }

  .vf-status-icon {
    position: relative; width: 78px; height: 78px; border-radius: 26px;
    margin: 0 auto 22px;
    background: linear-gradient(140deg, rgba(251,191,36,0.18), rgba(124,58,237,0.14));
    border: 1px solid rgba(251,191,36,0.3);
    display: flex; align-items: center; justify-content: center; color: #fbbf24;
  }
  .vf-status-icon-ok {
    background: linear-gradient(140deg, rgba(34,197,94,0.2), rgba(124,58,237,0.14));
    border-color: rgba(34,197,94,0.32); color: #22C55E;
  }
  .vf-ping {
    position: absolute; inset: -6px; border-radius: 30px;
    border: 2px solid rgba(251,191,36,0.35);
    animation: vfPing 2.2s cubic-bezier(0,0,0.2,1) infinite;
  }
  .vf-ping-ok { border-color: rgba(34,197,94,0.35); }
  @keyframes vfPing {
    0% { transform: scale(0.92); opacity: 0.85; }
    75%, 100% { transform: scale(1.22); opacity: 0; }
  }
  .vf-status-title { color: white; font-weight: 900; font-size: 20px; margin: 0 0 12px; }
  .vf-status-text {
    color: #a78bfa; font-size: 13.5px; line-height: 1.7;
    max-width: 400px; margin: 0 auto 26px;
  }
  .vf-btn {
    display: inline-block;
    background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white;
    font-weight: 700; padding: 13px 28px; border-radius: 13px;
    text-decoration: none; font-size: 14px;
    box-shadow: 0 7px 22px rgba(255,140,0,0.28);
  }

  .vf-spin { animation: vfspin 0.8s linear infinite; }
  @keyframes vfspin { to { transform: rotate(360deg); } }
`;
