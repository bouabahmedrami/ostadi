"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLang } from "@/lib/lang-context";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  addRecording, getRecordingsByTeacher,
  getEnrollmentsByStudent, getClasseById, getRecordingsByClasse,
} from "@/lib/firestore";
import { Recording } from "@/lib/types";
import {
  Video, Upload, Play, Trash2, Clock,
  BookOpen, Download, Plus, X
} from "lucide-react";

export default function EnregistrementsPage() {
  const { user, profile, loading } = useAuth();
  const { isRTL } = useLang();
  const router = useRouter();

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Upload form
  const [classeId, setClasseId] = useState("");
  const [classeTitle, setClasseTitle] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading]);

  useEffect(() => {
    if (user && profile) loadRecordings();
  }, [user, profile]);

  async function loadRecordings() {
    setLoadingData(true);
    try {
      if (profile?.role === "teacher") {
        const recs = await getRecordingsByTeacher(user!.uid);
        setRecordings(recs);
      } else {
        // Student: get recordings for enrolled classes
        const enrollments = await getEnrollmentsByStudent(user!.uid);
        const allRecs: Recording[] = [];
        for (const e of enrollments) {
          const recs = await getRecordingsByClasse(e.classeId);
          allRecs.push(...recs);
        }
        setRecordings(allRecs.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      }
    } finally {
      setLoadingData(false);
    }
  }

  async function handleUpload() {
    if (!videoFile || !classeId || !classeTitle) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const storageRef = ref(storage, `recordings/${classeId}/${Date.now()}_${videoFile.name}`);
      await uploadBytes(storageRef, videoFile);
      setUploadProgress(60);
      const url = await getDownloadURL(storageRef);
      setUploadProgress(80);
      await addRecording({
        classeId,
        classeTitle,
        teacherId: user!.uid,
        url,
        duration: 0,
        size: videoFile.size,
        createdAt: new Date().toISOString(),
      });
      setUploadProgress(100);
      setShowUpload(false);
      setVideoFile(null);
      setClasseId("");
      setClasseTitle("");
      await loadRecordings();
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
      day: "2-digit", month: "short", year: "numeric",
    });
  }

  if (loading || loadingData) return (
    <div className="flex items-center justify-center min-h-screen text-purple-400 grid-bg">
      {isRTL ? "جارٍ التحميل..." : "Chargement..."}
    </div>
  );

  return (
    <div className="grid-bg min-h-screen" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className={`flex items-center justify-between mb-8 ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className="w-12 h-12 rounded-2xl bg-purple-900/60 border border-purple-700/40 flex items-center justify-center">
              <Video className="w-6 h-6 text-[#FF8C00]" />
            </div>
            <div className={isRTL ? "text-right" : ""}>
              <h1 className="text-2xl font-black text-white">
                {isRTL ? "تسجيلات الدروس" : "Enregistrements"}
              </h1>
              <p className="text-purple-400 text-sm">
                {isRTL ? "دروسك المسجلة" : "Vos cours enregistrés"}
              </p>
            </div>
          </div>
          {profile?.role === "teacher" && (
            <button
              onClick={() => setShowUpload(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {isRTL ? "رفع تسجيل" : "Ajouter"}
            </button>
          )}
        </div>

        {/* Upload modal */}
        {showUpload && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-[#110225] border border-purple-800/50 rounded-2xl w-full max-w-md p-6">
              <div className={`flex items-center justify-between mb-5 ${isRTL ? "flex-row-reverse" : ""}`}>
                <h2 className="font-bold text-white text-lg">
                  {isRTL ? "رفع تسجيل" : "Ajouter un enregistrement"}
                </h2>
                <button onClick={() => setShowUpload(false)} className="text-purple-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className={`label ${isRTL ? "text-right block" : ""}`}>
                    {isRTL ? "معرف الدرس" : "ID du cours"}
                  </label>
                  <input
                    className={`input-field ${isRTL ? "text-right" : ""}`}
                    placeholder={isRTL ? "مثال: abc123" : "Ex: abc123"}
                    value={classeId}
                    onChange={e => setClasseId(e.target.value)}
                  />
                </div>
                <div>
                  <label className={`label ${isRTL ? "text-right block" : ""}`}>
                    {isRTL ? "عنوان الدرس" : "Titre du cours"}
                  </label>
                  <input
                    className={`input-field ${isRTL ? "text-right" : ""}`}
                    placeholder={isRTL ? "مثال: مراجعة رياضيات" : "Ex: Révision Maths"}
                    value={classeTitle}
                    onChange={e => setClasseTitle(e.target.value)}
                  />
                </div>

                {/* File picker */}
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed border-purple-700/40 rounded-xl p-5 text-center cursor-pointer hover:border-purple-500/60 transition-colors ${
                    videoFile ? "border-emerald-500/50 bg-emerald-900/10" : ""
                  }`}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={e => setVideoFile(e.target.files?.[0] || null)}
                  />
                  {videoFile ? (
                    <>
                      <Video className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                      <p className="text-emerald-400 text-sm font-medium">{videoFile.name}</p>
                      <p className="text-purple-500 text-xs mt-1">{formatSize(videoFile.size)}</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                      <p className="text-purple-400 text-sm">
                        {isRTL ? "اضغط لاختيار الفيديو" : "Cliquez pour choisir la vidéo"}
                      </p>
                      <p className="text-purple-600 text-xs mt-1">MP4, MOV, AVI</p>
                    </>
                  )}
                </div>

                {/* Progress */}
                {uploading && (
                  <div>
                    <div className="flex justify-between text-xs text-purple-400 mb-1">
                      <span>{isRTL ? "جارٍ الرفع..." : "Téléversement..."}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-purple-900/40 rounded-full h-2">
                      <div
                        className="bg-[#FF8C00] h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!videoFile || !classeId || !classeTitle || uploading}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {isRTL ? "رفع التسجيل" : "Téléverser"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recordings list */}
        {recordings.length === 0 ? (
          <div className="card text-center py-16">
            <Video className="w-12 h-12 mx-auto mb-4 text-purple-700 opacity-50" />
            <p className="text-purple-300 font-medium">
              {isRTL ? "لا توجد تسجيلات بعد" : "Aucun enregistrement pour le moment"}
            </p>
            <p className="text-purple-500 text-sm mt-1">
              {profile?.role === "teacher"
                ? isRTL ? "ارفع تسجيلات دروسك لإتاحتها للطلاب" : "Ajoutez des enregistrements pour vos élèves"
                : isRTL ? "ستظهر هنا تسجيلات دروسك" : "Les enregistrements de vos cours apparaîtront ici"
              }
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {recordings.map((rec) => (
              <div key={rec.id} className="card border border-purple-800/30">
                <div className={`flex items-start gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                  {/* Thumbnail */}
                  <div className="w-20 h-14 rounded-xl bg-purple-900/60 border border-purple-700/30 flex items-center justify-center shrink-0">
                    <Video className="w-6 h-6 text-purple-500" />
                  </div>

                  {/* Info */}
                  <div className={`flex-1 min-w-0 ${isRTL ? "text-right" : ""}`}>
                    <h3 className="font-bold text-white text-sm truncate">{rec.classeTitle}</h3>
                    <div className={`flex items-center gap-3 mt-1 text-xs text-purple-400 flex-wrap ${isRTL ? "flex-row-reverse" : ""}`}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(rec.createdAt)}
                      </span>
                      <span>{formatSize(rec.size)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className={`flex items-center gap-2 shrink-0 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <a
                      href={rec.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-xl bg-[#FF8C00]/20 border border-[#FF8C00]/40 flex items-center justify-center text-[#FF8C00] hover:bg-[#FF8C00]/30 transition-colors"
                      title={isRTL ? "تشغيل" : "Lire"}
                    >
                      <Play className="w-4 h-4" />
                    </a>
                    <a
                      href={rec.url}
                      download
                      className="w-9 h-9 rounded-xl bg-purple-900/60 border border-purple-700/40 flex items-center justify-center text-purple-400 hover:text-white transition-colors"
                      title={isRTL ? "تنزيل" : "Télécharger"}
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Video player inline */}
                {playingId === rec.id && (
                  <div className="mt-4">
                    <video
                      controls
                      autoPlay
                      className="w-full rounded-xl border border-purple-800/40"
                      src={rec.url}
                    />
                  </div>
                )}

                <button
                  onClick={() => setPlayingId(playingId === rec.id ? null : rec.id)}
                  className={`mt-3 text-xs text-purple-400 hover:text-purple-200 transition-colors ${isRTL ? "text-right" : ""}`}
                >
                  {playingId === rec.id
                    ? isRTL ? "إخفاء المشغل" : "Masquer le lecteur"
                    : isRTL ? "▶ تشغيل هنا" : "▶ Lire ici"
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
