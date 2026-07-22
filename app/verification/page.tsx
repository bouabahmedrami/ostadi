"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { submitVerification, getVerificationByTeacher } from "@/lib/firestore";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { SUBJECTS } from "@/lib/types";
import {
  ShieldCheck, Upload, CheckCircle, Clock,
  XCircle, FileText, Video, ArrowLeft
} from "lucide-react";
import Link from "next/link";

type UploadStatus = "idle" | "uploading" | "done" | "error";

function UploadBox({
  label, hint, accept, onUploaded, isRTL
}: {
  label: string;
  hint: string;
  accept: string;
  onUploaded: (url: string) => void;
  isRTL: boolean;
}) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("uploading");
    setFileName(file.name);
    try {
      const storageRef = ref(storage, `verifications/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      onUploaded(url);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <label className={`label ${isRTL ? "text-right block" : ""}`}>{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
          status === "done"
            ? "border-emerald-500/50 bg-emerald-900/10"
            : status === "error"
            ? "border-red-500/50 bg-red-900/10"
            : "border-purple-700/40 hover:border-purple-500/60 bg-[#0D0118]"
        }`}
      >
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
        {status === "idle" && (
          <>
            <Upload className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <p className="text-sm text-purple-400">{isRTL ? "اضغط للرفع" : "Cliquez pour téléverser"}</p>
            <p className="text-xs text-purple-600 mt-1">{hint}</p>
          </>
        )}
        {status === "uploading" && (
          <>
            <div className="w-8 h-8 mx-auto mb-2 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-purple-400">{isRTL ? "جارٍ الرفع..." : "Téléversement..."}</p>
          </>
        )}
        {status === "done" && (
          <>
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
            <p className="text-sm text-emerald-400 font-medium">{isRTL ? "تم الرفع ✓" : "Téléversé ✓"}</p>
            <p className="text-xs text-purple-500 mt-1 truncate max-w-xs mx-auto">{fileName}</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
            <p className="text-sm text-red-400">{isRTL ? "فشل الرفع، حاول مجدداً" : "Erreur, réessayez"}</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerificationPage() {
  const { user, profile, loading } = useAuth();
  const { isRTL } = useLang();
  const router = useRouter();

  const [existing, setExisting] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form
  const [bio, setBio] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [diplomaURL, setDiplomaURL] = useState("");
  const [cinURL, setCinURL] = useState("");
  const [demoVideoURL, setDemoVideoURL] = useState("");

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "teacher")) {
      router.push("/auth");
    }
  }, [user, profile, loading]);

  useEffect(() => {
    if (user) {
      getVerificationByTeacher(user.uid)
        .then(setExisting)
        .finally(() => setLoadingData(false));
    }
  }, [user]);

  function toggleSubject(s: string) {
    setSelectedSubjects(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

  async function handleSubmit() {
    if (!diplomaURL || !cinURL || !bio || selectedSubjects.length === 0) return;
    setSubmitting(true);
    try {
      await submitVerification({
        teacherId: user!.uid,
        teacherName: profile!.displayName,
        diplomaURL,
        cinURL,
        demoVideoURL,
        subjects: selectedSubjects,
        bio,
        status: "pending",
        submittedAt: new Date().toISOString(),
      });
      setSuccess(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || loadingData) return (
    <div className="flex items-center justify-center min-h-screen text-purple-400 grid-bg">
      {isRTL ? "جارٍ التحميل..." : "Chargement..."}
    </div>
  );

  // Status views
  const statusConfig = {
    pending: {
      icon: <Clock className="w-14 h-14 text-amber-400 mx-auto" />,
      title: isRTL ? "طلبك قيد المراجعة" : "Dossier en cours d'examen",
      desc: isRTL
        ? "سيراجع فريقنا طلبك خلال 48 ساعة. سنعلمك بالنتيجة."
        : "Notre équipe examinera votre dossier sous 48h. Nous vous informerons du résultat.",
      color: "border-amber-500/30 bg-amber-900/10",
    },
    approved: {
      icon: <ShieldCheck className="w-14 h-14 text-emerald-400 mx-auto" />,
      title: isRTL ? "تهانينا! تم توثيق حسابك ✅" : "Félicitations ! Profil vérifié ✅",
      desc: isRTL
        ? "حسابك موثق الآن. سيرى الطلاب والأولياء شارة التوثيق على ملفك."
        : "Votre profil est vérifié. Les élèves et parents verront le badge de vérification.",
      color: "border-emerald-500/30 bg-emerald-900/10",
    },
    rejected: {
      icon: <XCircle className="w-14 h-14 text-red-400 mx-auto" />,
      title: isRTL ? "تم رفض الطلب" : "Dossier refusé",
      desc: existing?.rejectionReason || (isRTL ? "يرجى مراجعة المستندات وإعادة التقديم." : "Veuillez vérifier vos documents et soumettre à nouveau."),
      color: "border-red-500/30 bg-red-900/10",
    },
  };

  if (success || (existing && existing.status === "pending")) {
    const cfg = statusConfig.pending;
    return (
      <div className="grid-bg min-h-screen flex items-center justify-center px-4" dir={isRTL ? "rtl" : "ltr"}>
        <div className={`card max-w-md w-full text-center py-10 border ${cfg.color}`}>
          {cfg.icon}
          <h2 className="text-xl font-bold text-white mt-4 mb-2">{cfg.title}</h2>
          <p className="text-purple-400 text-sm leading-relaxed">{cfg.desc}</p>
          <Link href="/dashboard" className="btn-primary inline-block mt-6">
            {isRTL ? "العودة للوحة التحكم" : "Retour au dashboard"}
          </Link>
        </div>
      </div>
    );
  }

  if (existing && existing.status === "approved") {
    const cfg = statusConfig.approved;
    return (
      <div className="grid-bg min-h-screen flex items-center justify-center px-4" dir={isRTL ? "rtl" : "ltr"}>
        <div className={`card max-w-md w-full text-center py-10 border ${cfg.color}`}>
          {cfg.icon}
          <h2 className="text-xl font-bold text-white mt-4 mb-2">{cfg.title}</h2>
          <p className="text-purple-400 text-sm leading-relaxed">{cfg.desc}</p>
          <Link href="/dashboard" className="btn-primary inline-block mt-6">
            {isRTL ? "العودة للوحة التحكم" : "Retour au dashboard"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid-bg min-h-screen" dir={isRTL ? "rtl" : "ltr"}>
      {/* Ambient */}
      <div className="fixed top-0 left-1/3 w-96 h-96 bg-purple-700/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-2xl mx-auto px-4 py-10">
        <Link href="/dashboard" className={`inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-200 mb-8 transition-colors ${isRTL ? "flex-row-reverse" : ""}`}>
          <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          {isRTL ? "رجوع" : "Retour"}
        </Link>

        {/* Header */}
        <div className={`flex items-center gap-4 mb-8 ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className="w-14 h-14 rounded-2xl bg-orange-900/30 border border-[#FF8C00]/40 flex items-center justify-center neon-orange">
            <ShieldCheck className="w-7 h-7 text-[#FF8C00]" />
          </div>
          <div className={isRTL ? "text-right" : ""}>
            <h1 className="text-2xl font-black text-white">
              {isRTL ? "توثيق حساب الأستاذ" : "Vérification Professeur"}
            </h1>
            <p className="text-purple-400 text-sm mt-0.5">
              {isRTL
                ? "أكمل ملفك لكسب ثقة الطلاب وأولياء الأمور"
                : "Complétez votre profil pour gagner la confiance des élèves et parents"}
            </p>
          </div>
        </div>

        {/* Rejected banner */}
        {existing?.status === "rejected" && (
          <div className="card border-red-500/30 bg-red-900/10 mb-6">
            <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
              <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-red-300 font-semibold text-sm">
                  {isRTL ? "تم رفض طلبك السابق" : "Votre dossier précédent a été refusé"}
                </p>
                {existing.rejectionReason && (
                  <p className="text-red-400/80 text-xs mt-1">{existing.rejectionReason}</p>
                )}
                <p className="text-red-400/60 text-xs mt-1">
                  {isRTL ? "يمكنك إعادة التقديم أدناه" : "Vous pouvez soumettre à nouveau ci-dessous"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Why verify banner */}
        <div className="card bg-purple-900/20 border-purple-700/30 mb-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { icon: "🎖️", title: isRTL ? "شارة موثق" : "Badge Vérifié", desc: isRTL ? "تظهر على ملفك" : "Sur votre profil" },
              { icon: "🔝", title: isRTL ? "أولوية البحث" : "Priorité recherche", desc: isRTL ? "تظهر أولاً" : "Apparaissez en tête" },
              { icon: "👨‍👩‍👧", title: isRTL ? "ثقة الأولياء" : "Confiance parents", desc: isRTL ? "أمان ومصداقية" : "Sécurité & crédibilité" },
            ].map((b) => (
              <div key={b.title}>
                <div className="text-2xl mb-1">{b.icon}</div>
                <div className="text-xs font-bold text-white">{b.title}</div>
                <div className="text-xs text-purple-500 mt-0.5">{b.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-6">

          {/* Bio */}
          <div className="card">
            <h2 className={`font-bold text-white mb-4 flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <FileText className="w-5 h-5 text-[#FF8C00]" />
              {isRTL ? "نبذة عنك" : "Biographie"}
            </h2>
            <textarea
              className={`input-field resize-none ${isRTL ? "text-right" : ""}`}
              rows={4}
              placeholder={isRTL
                ? "قدّم نفسك: شهاداتك، خبرتك، أسلوبك في التدريس..."
                : "Présentez-vous : diplômes, expérience, méthode d'enseignement..."}
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={500}
            />
            <div className={`text-xs text-purple-500 mt-1 ${isRTL ? "text-left" : "text-right"}`}>
              {bio.length}/500
            </div>
          </div>

          {/* Subjects */}
          <div className="card">
            <h2 className={`font-bold text-white mb-4 ${isRTL ? "text-right" : ""}`}>
              {isRTL ? "المواد التي تدرّسها" : "Matières enseignées"}
            </h2>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSubject(s)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                    selectedSubjects.includes(s)
                      ? "bg-[#FF8C00] border-[#FF8C00] text-white"
                      : "border-purple-700/40 text-purple-400 hover:border-purple-500"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {selectedSubjects.length > 0 && (
              <p className="text-xs text-emerald-400 mt-2">
                ✓ {selectedSubjects.length} {isRTL ? "مادة مختارة" : "matière(s) sélectionnée(s)"}
              </p>
            )}
          </div>

          {/* Documents */}
          <div className="card">
            <h2 className={`font-bold text-white mb-4 flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <Upload className="w-5 h-5 text-[#FF8C00]" />
              {isRTL ? "الوثائق المطلوبة" : "Documents requis"}
            </h2>
            <div className="flex flex-col gap-5">
              <UploadBox
                label={isRTL ? "الشهادة العلمية *" : "Diplôme *"}
                hint={isRTL ? "صورة أو PDF — شهادة الليسانس، الماستر..." : "Photo ou PDF — Licence, Master, Doctorat..."}
                accept="image/*,.pdf"
                onUploaded={setDiplomaURL}
                isRTL={isRTL}
              />
              <UploadBox
                label={isRTL ? "بطاقة الهوية الوطنية (CIN) *" : "Carte d'identité (CIN) *"}
                hint={isRTL ? "الوجه الأمامي للبطاقة" : "Recto de la carte nationale d'identité"}
                accept="image/*"
                onUploaded={setCinURL}
                isRTL={isRTL}
              />
            </div>
          </div>

          {/* Demo video (optional) */}
          <div className="card border-purple-800/30">
            <h2 className={`font-bold text-white mb-1 flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
              <Video className="w-5 h-5 text-purple-400" />
              {isRTL ? "فيديو تعريفي (اختياري)" : "Vidéo de démonstration (optionnel)"}
            </h2>
            <p className="text-purple-500 text-xs mb-4">
              {isRTL
                ? "فيديو قصير من 1-2 دقيقة يعرض أسلوبك في التدريس — يزيد من فرص قبول طلبك"
                : "Courte vidéo de 1-2 min présentant votre style d'enseignement — augmente vos chances d'approbation"}
            </p>
            <UploadBox
              label={isRTL ? "فيديو تعريفي" : "Vidéo démo"}
              hint={isRTL ? "MP4، حد أقصى 50MB" : "MP4, max 50MB"}
              accept="video/*"
              onUploaded={setDemoVideoURL}
              isRTL={isRTL}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !diplomaURL || !cinURL || !bio || selectedSubjects.length === 0}
            className="btn-primary w-full py-4 text-base font-bold flex items-center justify-center gap-2 neon-orange disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isRTL ? "جارٍ الإرسال..." : "Envoi en cours..."}
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                {isRTL ? "إرسال طلب التوثيق" : "Soumettre pour vérification"}
              </>
            )}
          </button>

          <p className={`text-xs text-purple-600 text-center`}>
            {isRTL
              ? "سيتم مراجعة طلبك خلال 48 ساعة. جميع المعلومات سرية."
              : "Votre dossier sera examiné sous 48h. Toutes les informations sont confidentielles."}
          </p>
        </div>
      </div>
    </div>
  );
}
