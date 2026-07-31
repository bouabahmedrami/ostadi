"use client";
import { useState } from "react";
import { updateClasseWithNotification, deleteClasseWithNotification } from "@/lib/firestore";
import { useLang } from "@/lib/lang-context";
import { trSubject, trLevel, trWilaya } from "@/lib/i18n/translate";
import { Classe, SUBJECTS, LEVELS, WILAYAS } from "@/lib/types";
import { X, Save, Trash2, AlertTriangle, Users, Loader2 } from "lucide-react";

interface Props {
  classe: Classe;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export default function EditClasseModal({ classe, onClose, onSaved, onDeleted }: Props) {
  const { isRTL } = useLang();

  const [form, setForm] = useState({
    title: classe.title,
    subject: classe.subject,
    level: classe.level,
    dateTime: classe.dateTime.slice(0, 16),
    durationMinutes: classe.durationMinutes,
    price: classe.price,
    priceType: classe.priceType,
    description: classe.description || "",
    whatsapp: classe.whatsapp || "",
    wilaya: classe.wilaya,
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasStudents = (classe.enrolledCount || 0) > 0;

  /* ── Validation ───────────────────────────────────────── */
  function validate(): string | null {
    if (!form.title.trim()) {
      return isRTL ? "العنوان مطلوب" : "Le titre est obligatoire";
    }
    if (!form.dateTime) {
      return isRTL ? "التاريخ مطلوب" : "La date est obligatoire";
    }
    if (Number(form.durationMinutes) < 15) {
      return isRTL ? "المدة: 15 دقيقة على الأقل" : "Durée : 15 minutes minimum";
    }
    if (Number(form.price) < 0) {
      return isRTL ? "السعر غير صالح" : "Prix invalide";
    }
    return null;
  }

  async function handleSave() {
    const v = validate();
    if (v) { setError(v); return; }

    setError(null);
    setSaving(true);
    try {
      await updateClasseWithNotification(
        classe.id,
        {
          ...form,
          title: form.title.trim(),
          description: form.description.trim(),
          whatsapp: form.whatsapp.trim(),
          dateTime: new Date(form.dateTime).toISOString(),
          durationMinutes: Number(form.durationMinutes),
          price: Number(form.price),
        },
        classe
      );
      onSaved();
      onClose();
    } catch (err: any) {
      // ⚠️ AVANT : pas de catch — le modal se fermait comme si tout allait bien
      console.error("Modification échouée :", err);
      setError(
        err?.code === "permission-denied"
          ? (isRTL ? "ليست لديك صلاحية تعديل هذا الدرس." : "Vous n'avez pas le droit de modifier ce cours.")
          : (isRTL ? "فشل الحفظ. تحقق من اتصالك." : "Échec de l'enregistrement. Vérifiez votre connexion.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      await deleteClasseWithNotification(classe);
      onDeleted();
      onClose();
    } catch (err: any) {
      console.error("Suppression échouée :", err);
      // ⚠️ Message important : les notifications partent AVANT la suppression.
      // Si le commit échoue, les élèves ont déjà été prévenus à tort.
      setError(
        isRTL
          ? "فشل الحذف. قد يكون بعض الطلاب تلقّوا إشعار الإلغاء — تواصل معهم إن لزم الأمر."
          : "Échec de la suppression. Certains élèves ont peut-être déjà reçu la notification d'annulation — prévenez-les si nécessaire."
      );
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="em-overlay"
      onClick={() => !saving && !deleting && onClose()}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="em-modal" onClick={e => e.stopPropagation()}>

        {/* ═══ EN-TÊTE ═══ */}
        <div className="em-head">
          <div>
            <h2 className="em-title">
              {isRTL ? "تعديل الدرس" : "Modifier le cours"}
            </h2>
            <p className="em-sub">
              {hasStudents
                ? (isRTL
                    ? `سيتم إشعار ${classe.enrolledCount} ${classe.enrolledCount > 1 ? "طلاب" : "طالب"} بالتغييرات`
                    : `${classe.enrolledCount} élève${classe.enrolledCount > 1 ? "s" : ""} seront notifié${classe.enrolledCount > 1 ? "s" : ""} des changements`)
                : (isRTL ? "لا يوجد طلاب مسجّلون بعد" : "Aucun élève inscrit pour l'instant")}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving || deleting}
            className="em-close"
            aria-label={isRTL ? "إغلاق" : "Fermer"}
          >
            <X size={17} />
          </button>
        </div>

        {/* ═══ AVERTISSEMENT ═══ */}
        {hasStudents && (
          <div className="em-notice">
            <Users size={15} />
            <p>
              {isRTL
                ? "سيتلقّى كل الطلاب المسجّلين إشعاراً تلقائياً بالتعديلات."
                : "Une notification automatique sera envoyée à tous les élèves inscrits."}
            </p>
          </div>
        )}

        {/* ═══ ERREUR ═══ */}
        {error && (
          <div className="em-error">
            <AlertTriangle size={15} />
            <p>{error}</p>
            <button onClick={() => setError(null)}><X size={14} /></button>
          </div>
        )}

        {/* ═══ FORMULAIRE ═══ */}
        <div className="em-form">

          <div className="em-field">
            <label className="em-label">
              {isRTL ? "عنوان الدرس" : "Titre du cours"} <span className="em-req">*</span>
            </label>
            <input
              className="em-input"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="em-grid">
            <div className="em-field">
              <label className="em-label">{isRTL ? "المادة" : "Matière"}</label>
              <select
                className="em-input"
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              >
                {SUBJECTS.map(s => (
                  <option key={s} value={s} style={{ background: "#1A0A3C" }}>
                    {trSubject(s, isRTL)}
                  </option>
                ))}
              </select>
            </div>

            <div className="em-field">
              <label className="em-label">{isRTL ? "المستوى" : "Niveau"}</label>
              <select
                className="em-input"
                value={form.level}
                onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
              >
                {LEVELS.map(l => (
                  <option key={l} value={l} style={{ background: "#1A0A3C" }}>
                    {trLevel(l, isRTL)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="em-field">
            <label className="em-label">
              {isRTL ? "التاريخ والوقت" : "Date et heure"} <span className="em-req">*</span>
            </label>
            <input
              className="em-input"
              type="datetime-local"
              value={form.dateTime}
              onChange={e => setForm(f => ({ ...f, dateTime: e.target.value }))}
            />
          </div>

          <div className="em-grid">
            <div className="em-field">
              <label className="em-label">{isRTL ? "المدة (دقيقة)" : "Durée (min)"}</label>
              <input
                className="em-input"
                type="number"
                min={15}
                step={15}
                value={form.durationMinutes}
                onChange={e => setForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))}
              />
            </div>

            <div className="em-field">
              <label className="em-label">{isRTL ? "السعر (دج)" : "Prix (DA)"}</label>
              <input
                className="em-input"
                type="number"
                min={0}
                step={100}
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="em-grid">
            <div className="em-field">
              <label className="em-label">{isRTL ? "نوع السعر" : "Type de prix"}</label>
              <select
                className="em-input"
                value={form.priceType}
                onChange={e => setForm(f => ({ ...f, priceType: e.target.value as "session" | "monthly" }))}
              >
                <option value="session" style={{ background: "#1A0A3C" }}>
                  {isRTL ? "بالحصة" : "Par séance"}
                </option>
                <option value="monthly" style={{ background: "#1A0A3C" }}>
                  {isRTL ? "بالشهر" : "Par mois"}
                </option>
              </select>
            </div>

            <div className="em-field">
              <label className="em-label">{isRTL ? "الولاية" : "Wilaya"}</label>
              <select
                className="em-input"
                value={form.wilaya}
                onChange={e => setForm(f => ({ ...f, wilaya: e.target.value }))}
              >
                {WILAYAS.map(w => (
                  <option key={w} value={w} style={{ background: "#1A0A3C" }}>
                    {trWilaya(w, isRTL)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="em-field">
            <label className="em-label">WhatsApp</label>
            <input
              className="em-input"
              placeholder="0555 XX XX XX"
              value={form.whatsapp}
              onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
            />
          </div>

          <div className="em-field">
            <label className="em-label">{isRTL ? "الوصف" : "Description"}</label>
            <textarea
              className="em-input em-textarea"
              rows={3}
              maxLength={500}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <span className="em-count">{form.description.length}/500</span>
          </div>

          {/* ═══ ENREGISTRER ═══ */}
          <button
            onClick={handleSave}
            disabled={saving || deleting}
            className="em-save"
          >
            {saving ? (
              <><Loader2 size={16} className="em-spin" /> {isRTL ? "جارٍ الحفظ..." : "Enregistrement..."}</>
            ) : (
              <><Save size={16} /> {isRTL ? "حفظ التعديلات" : "Enregistrer les modifications"}</>
            )}
          </button>

          {/* ═══ ZONE DANGEREUSE ═══ */}
          <div className="em-danger">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={saving || deleting}
                className="em-delete-btn"
              >
                <Trash2 size={15} />
                {isRTL ? "حذف هذا الدرس" : "Supprimer ce cours"}
              </button>
            ) : (
              <div className="em-confirm">
                <div className="em-confirm-head">
                  <AlertTriangle size={16} />
                  <div>
                    <strong>
                      {isRTL ? "تأكيد الحذف؟" : "Confirmer la suppression ?"}
                    </strong>
                    <p>
                      {hasStudents
                        ? (isRTL
                            ? `سيتلقّى ${classe.enrolledCount} ${classe.enrolledCount > 1 ? "طلاب" : "طالب"} إشعار إلغاء. لا يمكن التراجع.`
                            : `${classe.enrolledCount} élève${classe.enrolledCount > 1 ? "s" : ""} recevront une notification d'annulation. Action irréversible.`)
                        : (isRTL ? "لا يمكن التراجع عن هذا الإجراء." : "Cette action est irréversible.")}
                    </p>
                  </div>
                </div>
                <div className="em-confirm-actions">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="em-confirm-yes"
                  >
                    {deleting ? (
                      <><Loader2 size={14} className="em-spin" /> {isRTL ? "جارٍ..." : "Suppression..."}</>
                    ) : (
                      isRTL ? "نعم، احذف" : "Oui, supprimer"
                    )}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                    className="em-confirm-no"
                  >
                    {isRTL ? "إلغاء" : "Annuler"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .em-overlay {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: emFade 0.2s ease;
        }
        @keyframes emFade { from { opacity: 0; } to { opacity: 1; } }

        .em-modal {
          background: linear-gradient(160deg, #150A2E, #0A0014);
          border: 1px solid rgba(124,58,237,0.35);
          border-radius: 20px;
          width: 100%; max-width: 560px;
          max-height: 92vh; overflow-y: auto;
          padding: 24px;
          animation: emSlide 0.28s cubic-bezier(0.22,1,0.36,1);
        }
        @keyframes emSlide {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .em-modal::-webkit-scrollbar { width: 6px; }
        .em-modal::-webkit-scrollbar-thumb {
          background: rgba(124,58,237,0.3); border-radius: 999px;
        }

        /* ── En-tête ── */
        .em-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; margin-bottom: 20px;
        }
        .em-title { color: white; font-weight: 800; font-size: 18px; margin: 0; }
        .em-sub { color: #a78bfa; font-size: 12.5px; margin: 4px 0 0; }
        .em-close {
          width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
          background: rgba(124,58,237,0.2); border: none; color: #a78bfa;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.2s ease;
        }
        .em-close:hover:not(:disabled) { background: rgba(124,58,237,0.32); color: white; }
        .em-close:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── Bandeaux ── */
        .em-notice, .em-error {
          display: flex; align-items: flex-start; gap: 9px;
          border-radius: 11px; padding: 11px 13px; margin-bottom: 16px;
        }
        .em-notice {
          background: rgba(255,140,0,0.08);
          border: 1px solid rgba(255,140,0,0.25);
        }
        .em-notice :global(svg) { color: #FF8C00; flex-shrink: 0; margin-top: 1px; }
        .em-notice p { color: #fdba74; font-size: 12px; margin: 0; line-height: 1.5; }

        .em-error {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
        }
        .em-error :global(svg) { color: #f87171; flex-shrink: 0; margin-top: 1px; }
        .em-error p { color: #fca5a5; font-size: 12.5px; margin: 0; flex: 1; line-height: 1.55; }
        .em-error button {
          background: none; border: none; color: #f87171;
          cursor: pointer; display: flex; padding: 0; flex-shrink: 0; opacity: 0.7;
        }
        .em-error button:hover { opacity: 1; }

        /* ── Formulaire ── */
        .em-form { display: flex; flex-direction: column; gap: 14px; }
        .em-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .em-field { display: flex; flex-direction: column; gap: 6px; position: relative; }
        .em-label {
          color: #a78bfa; font-size: 12px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .em-req { color: #f87171; }
        .em-input {
          width: 100%; box-sizing: border-box;
          background: rgba(26,10,60,0.7);
          border: 1px solid rgba(124,58,237,0.3);
          border-radius: 11px; padding: 11px 13px;
          font-size: 13.5px; color: white; font-family: inherit;
          outline: none; transition: border-color 0.2s ease;
        }
        .em-input:focus { border-color: rgba(255,140,0,0.5); }
        .em-input::placeholder { color: #5b21b6; }
        .em-textarea { resize: none; line-height: 1.55; }
        .em-count {
          position: absolute; bottom: 8px; inset-inline-end: 11px;
          color: #5b21b6; font-size: 10px; pointer-events: none;
        }

        /* ── Enregistrer ── */
        .em-save {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          background: linear-gradient(135deg, #FF8C00, #FF6B00);
          color: white; font-weight: 800; padding: 14px;
          border-radius: 13px; border: none; cursor: pointer;
          font-size: 14.5px; font-family: inherit;
          box-shadow: 0 6px 20px rgba(255,140,0,0.3);
          transition: transform 0.24s cubic-bezier(0.34,1.4,0.64,1);
        }
        .em-save:hover:not(:disabled) { transform: translateY(-2px); }
        .em-save:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        /* ── Zone dangereuse ── */
        .em-danger {
          border-top: 1px solid rgba(124,58,237,0.2);
          padding-top: 16px; margin-top: 4px;
        }
        .em-delete-btn {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
          background: transparent; color: #f87171; font-weight: 700;
          padding: 12px; border-radius: 12px;
          border: 1px solid rgba(239,68,68,0.35);
          cursor: pointer; font-size: 13.5px; font-family: inherit;
          transition: background 0.2s ease;
        }
        .em-delete-btn:hover:not(:disabled) { background: rgba(239,68,68,0.08); }
        .em-delete-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .em-confirm {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 13px; padding: 14px;
        }
        .em-confirm-head {
          display: flex; align-items: flex-start; gap: 9px; margin-bottom: 12px;
        }
        .em-confirm-head :global(svg) { color: #f87171; flex-shrink: 0; margin-top: 1px; }
        .em-confirm-head strong {
          color: #f87171; font-weight: 700; font-size: 13px; display: block;
        }
        .em-confirm-head p {
          color: #a78bfa; font-size: 12px; margin: 4px 0 0; line-height: 1.55;
        }
        .em-confirm-actions { display: flex; gap: 8px; }
        .em-confirm-yes {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
          background: #dc2626; color: white; font-weight: 700;
          padding: 11px; border-radius: 10px; border: none;
          cursor: pointer; font-size: 13px; font-family: inherit;
        }
        .em-confirm-yes:disabled { opacity: 0.6; cursor: not-allowed; }
        .em-confirm-no {
          flex: 1; background: transparent; color: #a78bfa; font-weight: 600;
          padding: 11px; border-radius: 10px;
          border: 1px solid rgba(124,58,237,0.3);
          cursor: pointer; font-size: 13px; font-family: inherit;
        }
        .em-confirm-no:disabled { opacity: 0.5; cursor: not-allowed; }

        .em-spin { animation: emSpin 0.8s linear infinite; }
        @keyframes emSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
