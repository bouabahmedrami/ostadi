"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { trSubject } from "@/lib/i18n/translate";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import {
  addRecording, getRecordingsByTeacher, getClasses,
  getEnrollmentsByStudent, getRecordingsByClasse, deleteRecording,
} from "@/lib/firestore";
import { Recording, Classe } from "@/lib/types";
import {
  Video, Upload, Play, Trash2, Clock, Download, Plus, X,
  AlertCircle, ChevronDown, HardDrive, ArrowLeft,
} from "lucide-react";
import Link from "next/link";

const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 Mo

export default function EnregistrementsPage() {
  const { user, profile, loading } = useAuth();
  const { isRTL } = useLang();
  const router = useRouter();

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [myClasses, setMyClasses] = useState<Classe[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedClasse, setSelectedClasse] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const isTeacher = profile?.role === "teacher";

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (user && profile) loadData();
  }, [user, profile]);

  async function loadData() {
    setLoadingData(true);
    try {
      if (profile?.role === "teacher") {
        const [recs, cls] = await Promise.all([
          getRecordingsByTeacher(user!.uid),
          getClasses({ teacherId: user!.uid }),
        ]);
        setRecordings(recs);
        setMyClasses(cls);
      } else {
        const enrollments = await getEnrollmentsByStudent(user!.uid);
        const all: Recording[] = [];
        for (const e of enrollments) {
          const recs = await getRecordingsByClasse(e.classeId);
          all.push(...recs);
        }
        setRecordings(all.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      }
    } finally {
      setLoadingData(false);
    }
  }

  /* ── Upload avec progression réelle ───────────────────── */
  async function handleUpload() {
    if (!videoFile || !selectedClasse) return;

    const classe = myClasses.find(c => c.id === selectedClasse);
    if (!classe) return;

    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      const path = `recordings/${selectedClasse}/${Date.now()}_${videoFile.name.replace(/[^\w.-]/g, "_")}`;
      const storageRef = ref(storage, path);

      // ⚠️ uploadBytesResumable donne la VRAIE progression
      const task = uploadBytesResumable(storageRef, videoFile);

      await new Promise<void>((resolve, reject) => {
        task.on(
          "state_changed",
          snap => {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            setProgress(pct);
          },
          err => reject(err),
          () => resolve()
        );
      });

      const url = await getDownloadURL(storageRef);

      await addRecording({
        classeId: selectedClasse,
        classeTitle: classe.title,
        teacherId: user!.uid,
        url,
        duration: 0,
        size: videoFile.size,
        createdAt: new Date().toISOString(),
      });

      setShowUpload(false);
      setVideoFile(null);
      setSelectedClasse("");
      await loadData();
    } catch (err: any) {
      // ⚠️ AVANT : aucune gestion d'erreur, échec silencieux
      console.error("Upload échoué:", err);
      const code = err?.code || "";
      let msg: string;

      if (code === "storage/unauthorized") {
        msg = isRTL
          ? "غير مصرح. تحقق من قواعد Firebase Storage."
          : "Non autorisé. Vérifiez les règles Firebase Storage.";
      } else if (code === "storage/canceled") {
        msg = isRTL ? "تم إلغاء الرفع." : "Téléversement annulé.";
      } else if (code === "storage/quota-exceeded") {
        msg = isRTL ? "مساحة التخزين ممتلئة." : "Quota de stockage dépassé.";
      } else if (code === "storage/retry-limit-exceeded") {
        msg = isRTL
          ? "فشل الرفع — الاتصال ضعيف جداً."
          : "Échec — connexion trop instable pour ce fichier.";
      } else {
        msg = isRTL
          ? `خطأ: ${code || err?.message || "غير معروف"}`
          : `Erreur : ${code || err?.message || "inconnue"}`;
      }
      setError(msg);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);

    if (!f.type.startsWith("video/")) {
      setError(isRTL ? "الملف يجب أن يكون فيديو" : "Le fichier doit être une vidéo");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (f.size > MAX_VIDEO_SIZE) {
      const mb = (f.size / 1024 / 1024).toFixed(0);
      setError(isRTL
        ? `الفيديو كبير جداً (${mb} ميغا). الحد الأقصى 500 ميغا.`
        : `Vidéo trop lourde (${mb} Mo). Maximum 500 Mo.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setVideoFile(f);
  }

  /* ── Suppression ──────────────────────────────────────── */
  async function handleDelete(rec: Recording) {
    setDeletingId(rec.id);
    try {
      await deleteRecording(rec.id);
      // Tente aussi de supprimer le fichier du stockage
      try {
        const fileRef2 = ref(storage, rec.url);
        await deleteObject(fileRef2);
      } catch { /* le fichier peut déjà être absent */ }
      await loadData();
    } catch (err: any) {
      setError(isRTL ? "فشل الحذف" : "Échec de la suppression");
    } finally {
      setDeletingId(null);
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
      day: "2-digit", month: "short", year: "numeric",
    });
  }

  if (loading || loadingData) return (
    <div className="rc-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '46px', height: '46px' }}>
        <div style={{ position: 'absolute', inset: 0, border: '3px solid rgba(124,58,237,0.15)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', inset: 0, border: '3px solid transparent', borderTopColor: '#FF8C00', borderRadius: '50%', animation: 'rcspin 0.8s linear infinite' }} />
      </div>
      <style jsx global>{`
        @keyframes rcspin { to { transform: rotate(360deg); } }
        .rc-page { background: #0A0014; min-height: 100vh; }
      `}</style>
    </div>
  );

  const totalSize = recordings.reduce((s, r) => s + (r.size || 0), 0);

  return (
    <div className="rc-page" dir={isRTL ? "rtl" : "ltr"}>
      <div className="rc-container">

        <Link href={isTeacher ? "/dashboard" : "/mes-cours"} className="rc-back">
          <ArrowLeft size={15} style={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
          {isTeacher ? (isRTL ? "لوحة التحكم" : "Dashboard") : (isRTL ? "دروسي" : "Mes cours")}
        </Link>

        {/* ═══ HEADER ═══ */}
        <div className="rc-header">
          <div className="rc-header-icon"><Video size={20} /></div>
          <div style={{ flex: 1 }}>
            <h1 className="rc-title">{isRTL ? "تسجيلات الدروس" : "Enregistrements"}</h1>
            <p className="rc-sub">
              {recordings.length > 0 ? (
                <>
                  {recordings.length} {isRTL ? "تسجيل" : recordings.length > 1 ? "vidéos" : "vidéo"}
                  {" · "}
                  <HardDrive size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> {formatSize(totalSize)}
                </>
              ) : (
                isTeacher
                  ? (isRTL ? "دروسك المسجلة" : "Vos cours enregistrés")
                  : (isRTL ? "تسجيلات دروسك" : "Les replays de vos cours")
              )}
            </p>
          </div>
          {isTeacher && (
            <button onClick={() => setShowUpload(true)} className="rc-add-btn">
              <Plus size={15} />
              <span>{isRTL ? "إضافة" : "Ajouter"}</span>
            </button>
          )}
        </div>

        {/* ═══ ERREUR ═══ */}
        {error && !showUpload && (
          <div className="rc-error">
            <AlertCircle size={16} />
            <p>{error}</p>
            <button onClick={() => setError(null)}><X size={14} /></button>
          </div>
        )}

        {/* ═══ LISTE ═══ */}
        {recordings.length === 0 ? (
          <div className="rc-empty">
            <div className="rc-empty-icon"><Video size={30} /></div>
            <h3>{isRTL ? "لا توجد تسجيلات" : "Aucun enregistrement"}</h3>
            <p>
              {isTeacher
                ? (isRTL
                    ? "ارفع تسجيلات دروسك ليتمكن طلابك من مراجعتها"
                    : "Ajoutez des enregistrements pour que vos élèves puissent réviser")
                : (isRTL
                    ? "ستظهر هنا تسجيلات الدروس التي سجّلت فيها"
                    : "Les replays de vos cours apparaîtront ici")}
            </p>
            {isTeacher && myClasses.length > 0 && (
              <button onClick={() => setShowUpload(true)} className="rc-empty-cta">
                <Upload size={15} /> {isRTL ? "رفع أول تسجيل" : "Ajouter un enregistrement"}
              </button>
            )}
          </div>
        ) : (
          <div className="rc-list">
            {recordings.map(rec => (
              <div key={rec.id} className="rc-card">
                <div className="rc-card-main">
                  <div className="rc-thumb">
                    <Video size={20} />
                  </div>

                  <div className="rc-info">
                    <h3 className="rc-card-title">{rec.classeTitle}</h3>
                    <div className="rc-meta">
                      <span><Clock size={11} /> {formatDate(rec.createdAt)}</span>
                      <span className="rc-dot" />
                      <span>{formatSize(rec.size)}</span>
                    </div>
                  </div>

                  <div className="rc-actions">
                    <button
                      onClick={() => setPlayingId(playingId === rec.id ? null : rec.id)}
                      className={`rc-icon-btn ${playingId === rec.id ? "rc-icon-btn-on" : "rc-icon-btn-main"}`}
                      title={isRTL ? "تشغيل" : "Lire"}
                    >
                      {playingId === rec.id ? <X size={15} /> : <Play size={15} />}
                    </button>
                    <a
                      href={rec.url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rc-icon-btn"
                      title={isRTL ? "تنزيل" : "Télécharger"}
                    >
                      <Download size={15} />
                    </a>
                    {isTeacher && (
                      <button
                        onClick={() => handleDelete(rec)}
                        disabled={deletingId === rec.id}
                        className="rc-icon-btn rc-icon-btn-del"
                        title={isRTL ? "حذف" : "Supprimer"}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {playingId === rec.id && (
                  <div className="rc-player">
                    <video controls autoPlay src={rec.url} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ MODAL UPLOAD ═══ */}
      {showUpload && (
        <div className="rc-modal-bg" onClick={() => !uploading && setShowUpload(false)}>
          <div className="rc-modal" onClick={e => e.stopPropagation()}>
            <div className="rc-modal-head">
              <h2>{isRTL ? "رفع تسجيل" : "Ajouter un enregistrement"}</h2>
              <button onClick={() => !uploading && setShowUpload(false)} disabled={uploading}>
                <X size={17} />
              </button>
            </div>

            {error && (
              <div className="rc-error" style={{ marginBottom: '16px' }}>
                <AlertCircle size={16} />
                <p>{error}</p>
                <button onClick={() => setError(null)}><X size={14} /></button>
              </div>
            )}

            {myClasses.length === 0 ? (
              <div className="rc-no-classes">
                <p>{isRTL ? "أنشئ درساً أولاً لرفع تسجيل." : "Créez d'abord un cours pour pouvoir ajouter un enregistrement."}</p>
                <Link href="/dashboard" className="rc-empty-cta">
                  {isRTL ? "إنشاء درس" : "Créer un cours"}
                </Link>
              </div>
            ) : (
              <>
                {/* Sélection du cours — remplace la saisie manuelle de l'ID */}
                <div className="rc-field">
                  <label>{isRTL ? "الدرس" : "Cours concerné"}</label>
                  <div className="rc-select-wrap">
                    <select
                      value={selectedClasse}
                      onChange={e => setSelectedClasse(e.target.value)}
                      disabled={uploading}
                    >
                      <option value="">{isRTL ? "اختر درساً..." : "Sélectionnez un cours..."}</option>
                      {myClasses.map(c => (
                        <option key={c.id} value={c.id} style={{ background: '#1A0A3C' }}>
                          {c.title} — {trSubject(c.subject, isRTL)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={15} />
                  </div>
                </div>

                {/* Sélecteur de fichier */}
                <div
                  onClick={() => !uploading && fileRef.current?.click()}
                  className={`rc-dropzone ${videoFile ? "rc-dropzone-ok" : ""} ${uploading ? "rc-dropzone-off" : ""}`}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                    style={{ display: 'none' }}
                    onChange={pickFile}
                  />
                  {videoFile ? (
                    <>
                      <Video size={30} style={{ color: '#4ade80' }} />
                      <p className="rc-file-name">{videoFile.name}</p>
                      <p className="rc-file-size">{formatSize(videoFile.size)}</p>
                    </>
                  ) : (
                    <>
                      <Upload size={30} style={{ color: '#7c3aed' }} />
                      <p className="rc-drop-label">
                        {isRTL ? "اضغط لاختيار الفيديو" : "Cliquez pour choisir la vidéo"}
                      </p>
                      <p className="rc-drop-hint">MP4 · MOV · WEBM — max 500 Mo</p>
                    </>
                  )}
                </div>

                {/* Progression réelle */}
                {uploading && (
                  <div className="rc-progress">
                    <div className="rc-progress-head">
                      <span>{isRTL ? "جارٍ الرفع..." : "Téléversement en cours..."}</span>
                      <b>{progress}%</b>
                    </div>
                    <div className="rc-progress-track">
                      <div className="rc-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="rc-progress-hint">
                      {isRTL ? "لا تغلق هذه النافذة" : "Ne fermez pas cette fenêtre"}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!videoFile || !selectedClasse || uploading}
                  className="rc-submit"
                >
                  {uploading ? (
                    <><div className="rc-btn-spinner" /> {progress}%</>
                  ) : (
                    <><Upload size={16} /> {isRTL ? "رفع التسجيل" : "Téléverser"}</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .rc-page {
          background: #0A0014; min-height: 100vh;
          background-image:
            radial-gradient(circle at 18% 8%, rgba(124,58,237,0.09) 0%, transparent 45%),
            linear-gradient(rgba(168,85,247,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168,85,247,0.022) 1px, transparent 1px);
          background-size: auto, 44px 44px, 44px 44px;
          padding: 28px 16px 60px;
        }
        .rc-container { max-width: 820px; margin: 0 auto; }

        .rc-back {
          display: inline-flex; align-items: center; gap: 7px;
          color: #a78bfa; text-decoration: none; font-size: 13px; font-weight: 600;
          margin-bottom: 20px; padding: 7px 13px; border-radius: 10px; transition: all 0.2s ease;
        }
        .rc-back:hover { background: rgba(124,58,237,0.12); color: white; gap: 9px; }

        .rc-header { display: flex; align-items: center; gap: 13px; margin-bottom: 22px; flex-wrap: wrap; }
        .rc-header-icon {
          width: 48px; height: 48px; border-radius: 15px; flex-shrink: 0;
          background: linear-gradient(140deg, rgba(255,140,0,0.2), rgba(124,58,237,0.18));
          border: 1px solid rgba(255,140,0,0.28);
          display: flex; align-items: center; justify-content: center; color: #FF8C00;
        }
        .rc-title { color: white; font-weight: 900; font-size: 22px; margin: 0; letter-spacing: -0.4px; }
        .rc-sub { color: #8b7bb8; font-size: 12.5px; margin: 3px 0 0; }
        .rc-add-btn {
          display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0;
          background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white;
          border: none; padding: 11px 18px; border-radius: 12px;
          font-size: 13px; font-weight: 700; cursor: pointer;
          box-shadow: 0 5px 18px rgba(255,140,0,0.28);
          transition: transform 0.25s cubic-bezier(0.34,1.4,0.64,1);
        }
        .rc-add-btn:hover { transform: translateY(-2px); }

        /* ── Erreur ── */
        .rc-error {
          display: flex; align-items: flex-start; gap: 10px;
          background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
          border-radius: 12px; padding: 12px 14px; margin-bottom: 16px;
        }
        .rc-error > svg { color: #f87171; flex-shrink: 0; margin-top: 1px; }
        .rc-error p { color: #fca5a5; font-size: 12.5px; margin: 0; flex: 1; line-height: 1.5; }
        .rc-error button {
          background: none; border: none; color: #f87171;
          cursor: pointer; display: flex; padding: 0; flex-shrink: 0; opacity: 0.7;
        }
        .rc-error button:hover { opacity: 1; }

        /* ── Cartes ── */
        .rc-list { display: flex; flex-direction: column; gap: 11px; }
        .rc-card {
          background: linear-gradient(145deg, rgba(20,8,45,0.88), rgba(15,5,30,0.88));
          border: 1px solid rgba(124,58,237,0.16);
          border-radius: 16px; padding: 15px 16px;
          transition: border-color 0.25s ease;
        }
        .rc-card:hover { border-color: rgba(168,85,247,0.32); }
        .rc-card-main { display: flex; align-items: center; gap: 13px; }
        .rc-thumb {
          width: 62px; height: 44px; border-radius: 11px; flex-shrink: 0;
          background: linear-gradient(140deg, rgba(124,58,237,0.28), rgba(124,58,237,0.1));
          border: 1px solid rgba(124,58,237,0.22);
          display: flex; align-items: center; justify-content: center; color: #a78bfa;
        }
        .rc-info { flex: 1; min-width: 0; }
        .rc-card-title {
          color: white; font-weight: 700; font-size: 14px; margin: 0 0 4px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .rc-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .rc-meta span {
          display: inline-flex; align-items: center; gap: 5px;
          color: #8b7bb8; font-size: 11.5px;
        }
        .rc-meta svg { color: #FF8C00; }
        .rc-dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(124,58,237,0.4); }

        .rc-actions { display: flex; gap: 7px; flex-shrink: 0; }
        .rc-icon-btn {
          width: 38px; height: 38px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(124,58,237,0.12); color: #c4b5fd;
          border: 1px solid rgba(124,58,237,0.22);
          cursor: pointer; text-decoration: none;
          transition: all 0.2s ease;
        }
        .rc-icon-btn:hover { background: rgba(124,58,237,0.24); color: white; transform: translateY(-1px); }
        .rc-icon-btn-main {
          background: rgba(255,140,0,0.16); color: #FF8C00; border-color: rgba(255,140,0,0.3);
        }
        .rc-icon-btn-main:hover { background: rgba(255,140,0,0.28); color: white; }
        .rc-icon-btn-on { background: rgba(124,58,237,0.3); color: white; }
        .rc-icon-btn-del { color: #f87171; border-color: rgba(239,68,68,0.25); }
        .rc-icon-btn-del:hover { background: rgba(239,68,68,0.15); color: #fca5a5; }
        .rc-icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .rc-player { margin-top: 14px; }
        .rc-player video {
          width: 100%; border-radius: 13px; display: block;
          border: 1px solid rgba(124,58,237,0.25);
          background: #000;
        }

        /* ── Vide ── */
        .rc-empty { text-align: center; padding: 70px 20px; }
        .rc-empty-icon {
          width: 70px; height: 70px; border-radius: 21px; margin: 0 auto 16px;
          background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.16);
          display: flex; align-items: center; justify-content: center; color: #7c3aed;
        }
        .rc-empty h3 { color: #d8b4fe; font-weight: 700; font-size: 16px; margin: 0 0 8px; }
        .rc-empty p {
          color: #8b7bb8; font-size: 13px; line-height: 1.6;
          max-width: 350px; margin: 0 auto 22px;
        }
        .rc-empty-cta {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white;
          font-weight: 700; padding: 12px 24px; border-radius: 12px;
          text-decoration: none; font-size: 13.5px; border: none; cursor: pointer;
          box-shadow: 0 6px 20px rgba(255,140,0,0.26);
        }

        /* ── Modal ── */
        .rc-modal-bg {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.75); backdrop-filter: blur(5px);
          display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        .rc-modal {
          background: linear-gradient(160deg, #1a0d38, #0d0520);
          border: 1px solid rgba(124,58,237,0.32);
          border-radius: 20px; padding: 24px;
          width: 100%; max-width: 480px; max-height: 92vh; overflow-y: auto;
        }
        .rc-modal-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 20px;
        }
        .rc-modal-head h2 { color: white; font-weight: 800; font-size: 17px; margin: 0; }
        .rc-modal-head button {
          background: rgba(124,58,237,0.18); border: none; color: #a78bfa;
          width: 34px; height: 34px; border-radius: 11px;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
        }
        .rc-modal-head button:hover:not(:disabled) { background: rgba(124,58,237,0.3); color: white; }
        .rc-modal-head button:disabled { opacity: 0.4; cursor: not-allowed; }

        .rc-field { margin-bottom: 16px; }
        .rc-field label {
          display: block; color: #a78bfa; font-size: 11.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 7px;
        }
        .rc-select-wrap { position: relative; }
        .rc-select-wrap select {
          width: 100%; appearance: none;
          background: rgba(26,10,60,0.7); border: 1px solid rgba(124,58,237,0.25);
          border-radius: 12px; padding: 12px 38px 12px 13px;
          font-size: 13.5px; color: white; font-family: inherit;
          outline: none; cursor: pointer; box-sizing: border-box;
        }
        .rc-select-wrap select:focus { border-color: rgba(255,140,0,0.5); }
        .rc-select-wrap select:disabled { opacity: 0.5; }
        .rc-select-wrap > svg {
          position: absolute; top: 50%; inset-inline-end: 13px;
          transform: translateY(-50%); color: #6d28d9; pointer-events: none;
        }

        .rc-dropzone {
          border: 2px dashed rgba(124,58,237,0.32); border-radius: 15px;
          padding: 26px 20px; text-align: center; cursor: pointer;
          transition: all 0.25s ease; margin-bottom: 16px;
        }
        .rc-dropzone:hover { border-color: rgba(168,85,247,0.5); background: rgba(124,58,237,0.04); }
        .rc-dropzone-ok {
          border-color: rgba(34,197,94,0.45); background: rgba(34,197,94,0.05);
        }
        .rc-dropzone-off { opacity: 0.6; cursor: not-allowed; }
        .rc-file-name { color: #4ade80; font-size: 13px; font-weight: 600; margin: 10px 0 3px; word-break: break-all; }
        .rc-file-size { color: #6d28d9; font-size: 11.5px; margin: 0; }
        .rc-drop-label { color: #a78bfa; font-size: 13px; margin: 10px 0 4px; }
        .rc-drop-hint { color: #5b21b6; font-size: 11px; margin: 0; }

        /* ── Progression ── */
        .rc-progress { margin-bottom: 16px; }
        .rc-progress-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 7px;
        }
        .rc-progress-head span { color: #a78bfa; font-size: 12px; }
        .rc-progress-head b { color: #FF8C00; font-size: 13px; font-weight: 800; }
        .rc-progress-track {
          height: 7px; background: rgba(124,58,237,0.15);
          border-radius: 999px; overflow: hidden;
        }
        .rc-progress-fill {
          height: 100%; border-radius: 999px;
          background: linear-gradient(90deg, #FF8C00, #FFB347);
          transition: width 0.3s ease;
        }
        .rc-progress-hint { color: #5b21b6; font-size: 10.5px; margin: 7px 0 0; text-align: center; }

        .rc-submit {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 9px;
          background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white;
          font-weight: 800; padding: 14px; border-radius: 13px;
          border: none; cursor: pointer; font-size: 14px;
          box-shadow: 0 6px 20px rgba(255,140,0,0.28);
          transition: transform 0.25s ease;
        }
        .rc-submit:hover:not(:disabled) { transform: translateY(-2px); }
        .rc-submit:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
        .rc-btn-spinner {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.35); border-top-color: white;
          animation: rcspin 0.7s linear infinite;
        }

        .rc-no-classes { text-align: center; padding: 20px 0; }
        .rc-no-classes p { color: #8b7bb8; font-size: 13px; margin: 0 0 18px; line-height: 1.6; }
      `}</style>
    </div>
  );
}
