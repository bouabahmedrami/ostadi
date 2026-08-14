"use client";
import { useState, useEffect, useRef } from "react";
import { useLang } from "@/lib/lang-context";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import {
  addCourseMaterial, getCourseMaterials, deleteCourseMaterial,
  CourseMaterial,
} from "@/lib/firestore";
import {
  Paperclip, Upload, Download, Trash2, FileText, Image as ImageIcon,
  Film, File, X, Loader2, AlertCircle, Plus,
} from "lucide-react";

const MAX_SIZE = 25 * 1024 * 1024; // 25 Mo

/**
 * Supports de cours — dépôt et consultation.
 *
 * Sans support, il ne reste rien d'un cours une fois la visio terminée.
 * Un exercice, une fiche de révision, un corrigé : c'est ce qui
 * transforme une séance en formation, et ce qui justifie qu'un parent
 * renouvelle le mois suivant.
 */
export default function CourseMaterials({
  classeId,
  teacherId,
  isTeacher,
  canAccess,
}: {
  classeId: string;
  teacherId: string;
  isTeacher: boolean;
  /** L'élève doit être inscrit pour télécharger */
  canAccess: boolean;
}) {
  const { isRTL } = useLang();
  const [items, setItems] = useState<CourseMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, [classeId]);

  async function load() {
    setLoading(true);
    try {
      setItems(await getCourseMaterials(classeId));
    } catch (err: any) {
      console.error("Chargement des supports échoué :", err);
      if (err?.code === "failed-precondition") {
        setError(isRTL
          ? "الفهرس مفقود — افتح الرابط في الطرفية."
          : "Index Firestore manquant — voir le terminal.");
      }
    } finally {
      setLoading(false);
    }
  }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);

    if (f.size > MAX_SIZE) {
      const mb = (f.size / 1024 / 1024).toFixed(1);
      setError(isRTL
        ? `الملف كبير جداً (${mb} ميغا). الحد الأقصى 25 ميغا.`
        : `Fichier trop lourd (${mb} Mo). Maximum 25 Mo.`);
      e.target.value = "";
      return;
    }

    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  async function handleUpload() {
    if (!file || !title.trim()) return;
    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      const safe = file.name.replace(/[^\w.-]/g, "_");
      const path = `materials/${classeId}/${Date.now()}_${safe}`;
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        task.on(
          "state_changed",
          s => setProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
          reject,
          () => resolve()
        );
      });

      const url = await getDownloadURL(storageRef);

      await addCourseMaterial({
        classeId,
        teacherId,
        title: title.trim(),
        fileURL: url,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || "application/octet-stream",
      });

      setTitle("");
      setFile(null);
      setShowForm(false);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err: any) {
      console.error("Upload échoué :", err);
      setError(
        err?.code === "storage/unauthorized"
          ? (isRTL ? "غير مصرح. تحقق من قواعد Storage." : "Non autorisé. Vérifiez les règles Storage.")
          : (isRTL ? "فشل الرفع." : "Échec du téléversement.")
      );
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function handleDelete(m: CourseMaterial) {
    if (!window.confirm(
      isRTL ? `حذف « ${m.title} » ؟` : `Supprimer « ${m.title} » ?`
    )) return;

    setDeleting(m.id);
    try {
      await deleteCourseMaterial(m.id);
      try {
        await deleteObject(ref(storage, m.fileURL));
      } catch { /* le fichier peut déjà être absent */ }
      await load();
    } catch (err) {
      console.error("Suppression échouée :", err);
      setError(isRTL ? "فشل الحذف" : "Échec de la suppression");
    } finally {
      setDeleting(null);
    }
  }

  function iconFor(type: string) {
    if (type.startsWith("image/")) return <ImageIcon size={17} />;
    if (type.startsWith("video/")) return <Film size={17} />;
    if (type.includes("pdf")) return <FileText size={17} />;
    return <File size={17} />;
  }

  function sizeOf(b: number) {
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div style={{
      background: "linear-gradient(145deg, rgba(20,8,45,0.9), rgba(15,5,30,0.9))",
      border: "1px solid rgba(124,58,237,0.2)",
      borderRadius: 16, padding: 18,
    }}>
      {/* ═══ EN-TÊTE ═══ */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, marginBottom: 14, flexWrap: "wrap",
      }}>
        <h3 style={{
          display: "flex", alignItems: "center", gap: 9,
          color: "white", fontWeight: 750, fontSize: 14.5, margin: 0,
        }}>
          <Paperclip size={16} style={{ color: "#FF8C00" }} />
          {isRTL ? "الوثائق والتمارين" : "Supports & exercices"}
          {items.length > 0 && (
            <span style={{
              background: "rgba(255,140,0,0.18)", color: "#FF8C00",
              fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999,
            }}>{items.length}</span>
          )}
        </h3>

        {isTeacher && !showForm && (
          <button onClick={() => setShowForm(true)} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "linear-gradient(135deg, #FF8C00, #FF6B00)",
            color: "white", border: "none", fontSize: 12, fontWeight: 700,
            padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
          }}>
            <Plus size={13} /> {isRTL ? "إضافة" : "Ajouter"}
          </button>
        )}
      </div>

      {/* ═══ ERREUR ═══ */}
      {error && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 9,
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.28)",
          borderRadius: 11, padding: "10px 12px", marginBottom: 12,
        }}>
          <AlertCircle size={14} style={{ color: "#f87171", flexShrink: 0, marginTop: 1 }} />
          <span style={{ color: "#fca5a5", fontSize: 12, flex: 1, lineHeight: 1.5 }}>{error}</span>
          <button onClick={() => setError(null)} style={{
            background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: 0,
          }}><X size={13} /></button>
        </div>
      )}

      {/* ═══ FORMULAIRE ═══ */}
      {isTeacher && showForm && (
        <div style={{
          background: "rgba(10,0,20,0.4)", border: "1px solid rgba(124,58,237,0.2)",
          borderRadius: 13, padding: 14, marginBottom: 14,
        }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={isRTL ? "عنوان الوثيقة (مثال: تمارين الدرس 3)" : "Titre (ex : Exercices séance 3)"}
            disabled={uploading}
            style={{
              width: "100%", boxSizing: "border-box", marginBottom: 10,
              background: "rgba(26,10,60,0.7)", border: "1px solid rgba(124,58,237,0.28)",
              borderRadius: 10, padding: "10px 12px", fontSize: 13,
              color: "white", outline: "none", fontFamily: "inherit",
            }}
          />

          <div
            onClick={() => !uploading && fileRef.current?.click()}
            style={{
              border: `2px dashed ${file ? "rgba(34,197,94,0.45)" : "rgba(124,58,237,0.32)"}`,
              background: file ? "rgba(34,197,94,0.05)" : "transparent",
              borderRadius: 12, padding: "18px 14px", textAlign: "center",
              cursor: uploading ? "not-allowed" : "pointer", marginBottom: 10,
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*,video/*,.zip"
              style={{ display: "none" }}
              onChange={pickFile}
            />
            {file ? (
              <>
                <FileText size={24} style={{ color: "#4ade80" }} />
                <p style={{ color: "#4ade80", fontSize: 12.5, margin: "8px 0 2px", wordBreak: "break-all" }}>
                  {file.name}
                </p>
                <p style={{ color: "#6d28d9", fontSize: 11, margin: 0 }}>{sizeOf(file.size)}</p>
              </>
            ) : (
              <>
                <Upload size={24} style={{ color: "#7c3aed" }} />
                <p style={{ color: "#a78bfa", fontSize: 12.5, margin: "8px 0 2px" }}>
                  {isRTL ? "اضغط لاختيار ملف" : "Cliquez pour choisir un fichier"}
                </p>
                <p style={{ color: "#5b21b6", fontSize: 10.5, margin: 0 }}>
                  PDF · Word · Images · Vidéo — 25 Mo max
                </p>
              </>
            )}
          </div>

          {uploading && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ color: "#a78bfa", fontSize: 11.5 }}>
                  {isRTL ? "جارٍ الرفع..." : "Téléversement..."}
                </span>
                <b style={{ color: "#FF8C00", fontSize: 12 }}>{progress}%</b>
              </div>
              <div style={{ height: 6, background: "rgba(124,58,237,0.15)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${progress}%`,
                  background: "linear-gradient(90deg, #FF8C00, #FFB347)",
                  borderRadius: 999, transition: "width 0.3s ease",
                }} />
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleUpload}
              disabled={!file || !title.trim() || uploading}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                background: "linear-gradient(135deg, #FF8C00, #FF6B00)", color: "white",
                border: "none", fontSize: 13, fontWeight: 700, padding: "11px",
                borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                opacity: !file || !title.trim() || uploading ? 0.45 : 1,
              }}
            >
              {uploading
                ? <Loader2 size={14} style={{ animation: "sp 0.8s linear infinite" }} />
                : <Upload size={14} />}
              {isRTL ? "رفع" : "Téléverser"}
            </button>
            <button
              onClick={() => { setShowForm(false); setFile(null); setTitle(""); }}
              disabled={uploading}
              style={{
                background: "transparent", color: "#a78bfa",
                border: "1px solid rgba(124,58,237,0.3)",
                fontSize: 13, fontWeight: 600, padding: "11px 18px",
                borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {isRTL ? "إلغاء" : "Annuler"}
            </button>
          </div>
        </div>
      )}

      {/* ═══ LISTE ═══ */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 20 }}>
          <Loader2 size={20} style={{ color: "#FF8C00", animation: "sp 0.8s linear infinite" }} />
        </div>
      ) : items.length === 0 ? (
        <p style={{ color: "#6d28d9", fontSize: 12, textAlign: "center", padding: "18px 0", margin: 0, lineHeight: 1.6 }}>
          {isTeacher
            ? (isRTL
                ? "لم تضف أي وثيقة بعد. شارك التمارين والملخصات مع طلابك."
                : "Aucun support pour l'instant. Partagez exercices et fiches avec vos élèves.")
            : (isRTL
                ? "لم يشارك الأستاذ أي وثيقة بعد."
                : "Le professeur n'a pas encore partagé de support.")}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {items.map(m => (
            <div key={m.id} style={{
              display: "flex", alignItems: "center", gap: 11,
              background: "rgba(20,8,45,0.5)", border: "1px solid rgba(124,58,237,0.14)",
              borderRadius: 11, padding: "11px 13px",
            }}>
              <span style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: "rgba(124,58,237,0.16)", color: "#a78bfa",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {iconFor(m.fileType)}
              </span>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: "white", fontWeight: 650, fontSize: 13,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{m.title}</div>
                <div style={{ color: "#6d28d9", fontSize: 10.5, marginTop: 2 }}>
                  {sizeOf(m.fileSize)} ·{" "}
                  {new Date(m.createdAt).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
                    day: "2-digit", month: "short",
                  })}
                </div>
              </div>

              {canAccess ? (
                <a
                  href={m.fileURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={m.fileName}
                  title={isRTL ? "تحميل" : "Télécharger"}
                  style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: "rgba(255,140,0,0.14)", color: "#FF8C00",
                    border: "1px solid rgba(255,140,0,0.28)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Download size={15} />
                </a>
              ) : (
                <span style={{ color: "#5b21b6", fontSize: 10.5, flexShrink: 0 }}>
                  {isRTL ? "للمسجّلين" : "Réservé"}
                </span>
              )}

              {isTeacher && (
                <button
                  onClick={() => handleDelete(m)}
                  disabled={deleting === m.id}
                  title={isRTL ? "حذف" : "Supprimer"}
                  style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: "transparent", color: "#f87171",
                    border: "1px solid rgba(239,68,68,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  {deleting === m.id
                    ? <Loader2 size={14} style={{ animation: "sp 0.8s linear infinite" }} />
                    : <Trash2 size={14} />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes sp { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
