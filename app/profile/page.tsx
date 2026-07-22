"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { updateUserProfile } from "@/lib/firestore";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { WILAYAS, SUBJECTS } from "@/lib/types";
import { Camera, GraduationCap, Briefcase, MapPin, Save, CheckCircle, User, Phone, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState("Alger");
  const [photoURL, setPhotoURL] = useState("");
  const [bio, setBio] = useState("");
  // Teacher-only fields
  const [diploma, setDiploma] = useState("");
  const [university, setUniversity] = useState("");
  const [yearsExperience, setYearsExperience] = useState(0);
  const [subjects, setSubjects] = useState<string[]>([]);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading]);

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
    }
  }, [profile]);

  function toggleSubject(s: string) {
    setSubjects(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `profile-photos/${user.uid}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPhotoURL(url);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const data: any = { displayName, phone, wilaya, photoURL, bio };
      if (profile?.role === "teacher") {
        data.diploma = diploma;
        data.university = university;
        data.yearsExperience = Number(yearsExperience);
        data.subjects = subjects;
      }
      await updateUserProfile(user.uid, data);
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#a78bfa', background: '#0A0014' }}>
      Chargement...
    </div>
  );

  const isTeacher = profile.role === "teacher";

  return (
    <div className="ostadi-profile-page">
      <div className="ostadi-profile-container">
        <Link href="/" className="ostadi-back-link">
          <ArrowLeft size={15} /> Retour
        </Link>

        <div className="ostadi-profile-header">
          <div className="ostadi-header-icon"><User size={22} /></div>
          <div>
            <h1 className="ostadi-page-title">Mon profil</h1>
            <p className="ostadi-page-subtitle">Gérez vos informations personnelles</p>
          </div>
        </div>

        <div className="ostadi-profile-card">
          {/* Photo */}
          <div className="ostadi-photo-section">
            <div className="ostadi-photo-wrap" onClick={() => fileRef.current?.click()}>
              {photoURL ? (
                <img src={photoURL} alt="Photo profil" className="ostadi-photo-img" />
              ) : (
                <div className="ostadi-photo-placeholder">
                  {displayName ? displayName.charAt(0).toUpperCase() : <Camera size={22} />}
                </div>
              )}
              {uploading && <div className="ostadi-photo-overlay">...</div>}
              <div className="ostadi-photo-badge"><Camera size={12} /></div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="ostadi-hidden-input" onChange={handlePhotoUpload} />
            <div>
              <button onClick={() => fileRef.current?.click()} className="ostadi-photo-btn">
                <Camera size={14} /> {photoURL ? "Changer la photo" : "Ajouter une photo"}
              </button>
              <p className="ostadi-photo-hint">Format carré recommandé, max 5MB</p>
            </div>
          </div>

          {/* Basic info */}
          <div className="ostadi-form-grid">
            <div>
              <label className="ostadi-label"><User size={13} /> Nom complet</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="ostadi-input" placeholder="Votre nom" />
            </div>
            <div>
              <label className="ostadi-label"><Phone size={13} /> Téléphone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} className="ostadi-input" placeholder="0555 XX XX XX" />
            </div>
            <div>
              <label className="ostadi-label"><MapPin size={13} /> Wilaya</label>
              <select value={wilaya} onChange={e => setWilaya(e.target.value)} className="ostadi-input">
                {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            {isTeacher && (
              <div>
                <label className="ostadi-label"><Briefcase size={13} /> Années d'expérience</label>
                <input type="number" min={0} max={50} value={yearsExperience} onChange={e => setYearsExperience(Number(e.target.value))} className="ostadi-input" placeholder="Ex: 5" />
              </div>
            )}
          </div>

          {/* Teacher-only fields */}
          {isTeacher && (
            <>
              <div className="ostadi-section-divider">Informations professionnelles</div>
              <div className="ostadi-form-grid">
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="ostadi-label"><GraduationCap size={13} /> Diplôme</label>
                  <input value={diploma} onChange={e => setDiploma(e.target.value)} className="ostadi-input" placeholder="Ex: Licence en Mathématiques" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="ostadi-label">Université / Établissement</label>
                  <input value={university} onChange={e => setUniversity(e.target.value)} className="ostadi-input" placeholder="Ex: USTHB Alger" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="ostadi-label">Matières enseignées</label>
                  <div className="ostadi-subjects-grid">
                    {SUBJECTS.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSubject(s)}
                        className={`ostadi-subject-chip ${subjects.includes(s) ? 'ostadi-subject-chip-active' : ''}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="ostadi-section-divider">À propos</div>
          <div>
            <label className="ostadi-label">Biographie</label>
            <textarea
              value={bio} onChange={e => setBio(e.target.value)} className="ostadi-input"
              rows={3} placeholder={isTeacher ? "Présentez votre parcours et méthode d'enseignement..." : "Parlez un peu de vous..."}
              style={{ resize: 'none' }}
            />
          </div>

          <button onClick={handleSave} disabled={saving} className="ostadi-save-btn">
            {saved ? (
              <><CheckCircle size={16} /> Profil enregistré !</>
            ) : saving ? (
              "Enregistrement..."
            ) : (
              <><Save size={16} /> Enregistrer les modifications</>
            )}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .ostadi-profile-page {
          background: #0A0014; min-height: 100vh;
          background-image: radial-gradient(circle at 20% 10%, rgba(124,58,237,0.1) 0%, transparent 50%),
            linear-gradient(rgba(168,85,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.03) 1px, transparent 1px);
          background-size: auto, 44px 44px, 44px 44px;
          padding: 32px 16px 60px;
        }
        .ostadi-profile-container { max-width: 640px; margin: 0 auto; }
        .ostadi-back-link { display: inline-flex; align-items: center; gap: 8px; color: #a78bfa; text-decoration: none; font-size: 13.5px; font-weight: 600; margin-bottom: 20px; }
        .ostadi-back-link:hover { color: white; }

        .ostadi-profile-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
        .ostadi-header-icon {
          width: 48px; height: 48px; border-radius: 14px;
          background: linear-gradient(135deg, rgba(255,140,0,0.2), rgba(124,58,237,0.15));
          border: 1px solid rgba(255,140,0,0.3);
          display: flex; align-items: center; justify-content: center; color: #FF8C00;
        }
        .ostadi-page-title { color: white; font-weight: 900; font-size: 22px; margin: 0; letter-spacing: -0.3px; }
        .ostadi-page-subtitle { color: #a78bfa; font-size: 13px; margin: 2px 0 0; }

        .ostadi-profile-card {
          background: linear-gradient(145deg, rgba(20,8,45,0.9), rgba(15,5,30,0.9));
          border: 1px solid rgba(124,58,237,0.2); border-radius: 20px; padding: 26px;
        }

        .ostadi-photo-section { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 22px; border-bottom: 1px solid rgba(124,58,237,0.15); }
        .ostadi-photo-wrap {
          width: 80px; height: 80px; border-radius: 20px; cursor: pointer; position: relative;
          background: linear-gradient(135deg, rgba(124,58,237,0.35), rgba(124,58,237,0.1));
          border: 2px solid rgba(168,85,247,0.3); display: flex; align-items: center; justify-content: center;
          overflow: hidden; flex-shrink: 0; transition: border-color 0.2s ease;
          color: white; font-weight: 800; font-size: 26px;
        }
        .ostadi-photo-wrap:hover { border-color: rgba(255,140,0,0.6); }
        .ostadi-photo-img { width: 100%; height: 100%; object-fit: cover; }
        .ostadi-photo-placeholder { color: #d8b4fe; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
        .ostadi-photo-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); color: white; display: flex; align-items: center; justify-content: center; font-size: 11px; }
        .ostadi-photo-badge {
          position: absolute; bottom: -2px; right: -2px; width: 26px; height: 26px; border-radius: 8px;
          background: #FF8C00; display: flex; align-items: center; justify-content: center; color: white;
          border: 2px solid #150a2e;
        }
        .ostadi-hidden-input { display: none; }
        .ostadi-photo-btn {
          display: flex; align-items: center; gap: 7px; background: rgba(124,58,237,0.15);
          color: #d8b4fe; border: 1px solid rgba(168,85,247,0.3); padding: 9px 16px; border-radius: 10px;
          font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
        }
        .ostadi-photo-btn:hover { background: rgba(124,58,237,0.25); }
        .ostadi-photo-hint { color: #6d28d9; font-size: 11px; margin: 8px 0 0; }

        .ostadi-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 8px; }
        @media (max-width: 480px) { .ostadi-form-grid { grid-template-columns: 1fr; } }

        .ostadi-section-divider {
          color: #8b7bb8; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px;
          margin: 24px 0 16px; padding-top: 20px; border-top: 1px solid rgba(124,58,237,0.15);
        }

        .ostadi-label { display: flex; align-items: center; gap: 6px; color: #a78bfa; font-size: 12.5px; font-weight: 600; margin-bottom: 7px; }
        .ostadi-input {
          width: 100%; background: rgba(26,10,60,0.6); border: 1px solid rgba(124,58,237,0.25);
          border-radius: 12px; padding: 11px 13px; font-size: 13.5px; color: white; outline: none;
          transition: border-color 0.2s ease; font-family: inherit; box-sizing: border-box; margin-bottom: 16px;
        }
        .ostadi-input:focus { border-color: rgba(255,140,0,0.5); }
        .ostadi-input::placeholder { color: #6d28d9; }

        .ostadi-subjects-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
        .ostadi-subject-chip {
          background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.25); color: #a78bfa;
          padding: 7px 14px; border-radius: 10px; font-size: 12.5px; font-weight: 600; cursor: pointer;
          transition: all 0.2s ease;
        }
        .ostadi-subject-chip-active { background: rgba(255,140,0,0.2); border-color: rgba(255,140,0,0.5); color: #FF8C00; }

        .ostadi-save-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white; font-weight: 800;
          padding: 14px; border-radius: 14px; border: none; cursor: pointer; font-size: 14.5px;
          box-shadow: 0 6px 20px rgba(255,140,0,0.3); transition: all 0.25s ease; margin-top: 8px;
        }
        .ostadi-save-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(255,140,0,0.4); }
        .ostadi-save-btn:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
