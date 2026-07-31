"use client";
import { useState, useRef } from "react";
import { updateUserProfile } from "@/lib/firestore";
import { useLang } from "@/lib/lang-context";
import { trWilaya } from "@/lib/i18n/translate";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { WILAYAS } from "@/lib/types";
import { Camera, GraduationCap, Briefcase, MapPin, Save, CheckCircle } from "lucide-react";
interface TeacherProfileFormProps {
  uid: string;
  currentData: {
    photoURL?: string;
    wilaya?: string;
    diploma?: string;
    university?: string;
    yearsExperience?: number;
    bio?: string;
  };
  onSaved?: () => void;
}

export default function TeacherProfileForm({ uid, currentData, onSaved }: TeacherProfileFormProps) {
  const { isRTL } = useLang();
  const [photoURL, setPhotoURL] = useState(currentData.photoURL || "");
  const [wilaya, setWilaya] = useState(currentData.wilaya || "Alger");
  const [diploma, setDiploma] = useState(currentData.diploma || "");
  const [university, setUniversity] = useState(currentData.university || "");
  const [yearsExperience, setYearsExperience] = useState(currentData.yearsExperience || 0);
  const [bio, setBio] = useState(currentData.bio || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    // Validations absentes auparavant : type et taille
    if (!file.type.startsWith("image/")) {
      setError(isRTL ? "الملف يجب أن يكون صورة" : "Le fichier doit être une image");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      setError(isRTL
        ? `الصورة كبيرة جداً (${mb} ميغا). الحد الأقصى 5 ميغا.`
        : `Image trop lourde (${mb} Mo). Maximum 5 Mo.`);
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const storageRef = ref(storage, `profile-photos/${uid}_${Date.now()}.${ext}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPhotoURL(url);
    } catch (err: any) {
      // ⚠️ AVANT : try/finally sans catch — échec totalement silencieux
      console.error("Upload photo échoué :", err);
      setError(
        err?.code === "storage/unauthorized"
          ? (isRTL ? "غير مصرح. تحقق من قواعد Storage." : "Non autorisé. Vérifiez les règles Storage.")
          : (isRTL ? "فشل رفع الصورة." : "Échec du téléversement.")
      );
      e.target.value = "";
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      await updateUserProfile(uid, {
        photoURL, wilaya, diploma, university,
        yearsExperience: Number(yearsExperience), bio,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved?.();
    } catch (err: any) {
      console.error("Sauvegarde du profil échouée :", err);
      setError(isRTL
        ? "فشل الحفظ. تحقق من اتصالك."
        : "Échec de l'enregistrement. Vérifiez votre connexion.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ostadi-profile-card">
      <h2 className="ostadi-profile-title">
        {isRTL ? "ملفي المهني" : "Mon profil professionnel"}
      </h2>
      <p className="ostadi-profile-subtitle">
        {isRTL
          ? "هذه المعلومات مرئية للطلاب والأولياء"
          : "Ces informations sont visibles par les élèves et parents"}
      </p>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '9px',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '12px', padding: '11px 13px', margin: '14px 0',
        }}>
          <span style={{ color: '#f87171', flexShrink: 0 }}>⚠</span>
          <span style={{ color: '#fca5a5', fontSize: '12.5px', flex: 1, lineHeight: 1.5 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}
          >✕</button>
        </div>
      )}

      {/* Photo upload */}
      <div className="ostadi-photo-section">
        <div className="ostadi-photo-wrap" onClick={() => fileRef.current?.click()}>
          {photoURL ? (
            <img src={photoURL} alt="Photo profil" className="ostadi-photo-img" />
          ) : (
            <div className="ostadi-photo-placeholder">
              <Camera size={22} />
            </div>
          )}
          {uploading && <div className="ostadi-photo-overlay">...</div>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="ostadi-hidden-input" onChange={handlePhotoUpload} />
        <div>
          <button onClick={() => fileRef.current?.click()} className="ostadi-photo-btn">
            <Camera size={14} /> {photoURL ? "Changer la photo" : "Ajouter une photo"}
          </button>
          <p className="ostadi-photo-hint">Format carré recommandé, max 5MB</p>
        </div>
      </div>

      {/* Form fields */}
      <div className="ostadi-form-grid">
        <div>
          <label className="ostadi-label"><MapPin size={13} /> Wilaya</label>
          <select value={wilaya} onChange={e => setWilaya(e.target.value)} className="ostadi-input">
            {WILAYAS.map(w => <option key={w} value={w}>{trWilaya(w, isRTL)}</option>)}
          </select>
        </div>

        <div>
          <label className="ostadi-label"><Briefcase size={13} /> Années d'expérience</label>
          <input
            type="number" min={0} max={50}
            value={yearsExperience}
            onChange={e => setYearsExperience(Number(e.target.value))}
            className="ostadi-input"
            placeholder="Ex: 5"
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label className="ostadi-label"><GraduationCap size={13} /> Diplôme</label>
          <input
            value={diploma}
            onChange={e => setDiploma(e.target.value)}
            className="ostadi-input"
            placeholder="Ex: Licence en Mathématiques"
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label className="ostadi-label">Université / Établissement</label>
          <input
            value={university}
            onChange={e => setUniversity(e.target.value)}
            className="ostadi-input"
            placeholder="Ex: USTHB Alger"
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label className="ostadi-label">Biographie</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            className="ostadi-input"
            rows={3}
            placeholder="Présentez votre parcours et votre méthode d'enseignement..."
            style={{ resize: 'none' }}
          />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="ostadi-save-btn">
        {saved ? (
          <><CheckCircle size={16} /> Enregistré !</>
        ) : saving ? (
          "Enregistrement..."
        ) : (
          <><Save size={16} /> Enregistrer mon profil</>
        )}
      </button>

      <style jsx global>{`
        .ostadi-profile-card {
          background: linear-gradient(145deg, rgba(20,8,45,0.9), rgba(15,5,30,0.9));
          border: 1px solid rgba(124,58,237,0.2); border-radius: 18px; padding: 24px;
        }
        .ostadi-profile-title { color: white; font-weight: 800; font-size: 17px; margin: 0 0 4px; }
        .ostadi-profile-subtitle { color: #8b7bb8; font-size: 12.5px; margin: 0 0 22px; }

        .ostadi-photo-section { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 22px; border-bottom: 1px solid rgba(124,58,237,0.15); }
        .ostadi-photo-wrap {
          width: 76px; height: 76px; border-radius: 18px; cursor: pointer; position: relative;
          background: linear-gradient(135deg, rgba(124,58,237,0.3), rgba(124,58,237,0.1));
          border: 2px dashed rgba(168,85,247,0.4); display: flex; align-items: center; justify-content: center;
          overflow: hidden; flex-shrink: 0; transition: border-color 0.2s ease;
        }
        .ostadi-photo-wrap:hover { border-color: rgba(255,140,0,0.6); }
        .ostadi-photo-img { width: 100%; height: 100%; object-fit: cover; }
        .ostadi-photo-placeholder { color: #a78bfa; }
        .ostadi-photo-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; }
        .ostadi-hidden-input { display: none; }
        .ostadi-photo-btn {
          display: flex; align-items: center; gap: 7px; background: rgba(124,58,237,0.15);
          color: #d8b4fe; border: 1px solid rgba(168,85,247,0.3); padding: 9px 16px; border-radius: 10px;
          font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
        }
        .ostadi-photo-btn:hover { background: rgba(124,58,237,0.25); }
        .ostadi-photo-hint { color: #6d28d9; font-size: 11px; margin: 8px 0 0; }

        .ostadi-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        @media (max-width: 480px) { .ostadi-form-grid { grid-template-columns: 1fr; } }

        .ostadi-label { display: flex; align-items: center; gap: 6px; color: #a78bfa; font-size: 12.5px; font-weight: 600; margin-bottom: 7px; }
        .ostadi-input {
          width: 100%; background: rgba(26,10,60,0.6); border: 1px solid rgba(124,58,237,0.25);
          border-radius: 12px; padding: 11px 13px; font-size: 13.5px; color: white; outline: none;
          transition: border-color 0.2s ease; font-family: inherit; box-sizing: border-box;
        }
        .ostadi-input:focus { border-color: rgba(255,140,0,0.5); }
        .ostadi-input::placeholder { color: #6d28d9; }

        .ostadi-save-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white; font-weight: 800;
          padding: 13px; border-radius: 13px; border: none; cursor: pointer; font-size: 14px;
          box-shadow: 0 6px 20px rgba(255,140,0,0.3); transition: all 0.25s ease;
        }
        .ostadi-save-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(255,140,0,0.4); }
        .ostadi-save-btn:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
