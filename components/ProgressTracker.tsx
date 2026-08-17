"use client";
import { useState, useEffect } from "react";
import { useLang } from "@/lib/lang-context";
import {
  getClasseProgress, getProgressNotes, addProgressNote,
  deleteProgressNote, ProgressLevel, ProgressNote,
} from "@/lib/firestore";
import {
  TrendingUp, Plus, X, Check, Loader2, Trash2, Eye, EyeOff,
  AlertCircle, Calendar, MessageSquare,
} from "lucide-react";

const LEVELS: { id: ProgressLevel; fr: string; ar: string; color: string; emoji: string }[] = [
  { id: "struggling", fr: "En difficulté", ar: "يواجه صعوبة", color: "#EF4444", emoji: "🔴" },
  { id: "progressing", fr: "Progresse", ar: "يتقدّم", color: "#FBBF24", emoji: "🟡" },
  { id: "good", fr: "Bon niveau", ar: "مستوى جيد", color: "#3B82F6", emoji: "🔵" },
  { id: "excellent", fr: "Excellent", ar: "ممتاز", color: "#22C55E", emoji: "🟢" },
];

/**
 * Suivi de progression.
 *
 * Sans trace écrite, un parent ne sait pas ce que son enfant a appris —
 * et n'a aucune raison objective de renouveler le mois suivant.
 *
 * Le professeur choisit ce qu'il partage : certaines observations
 * ("manque de concentration", "arrive systématiquement en retard")
 * sont utiles à noter sans être adressées telles quelles à l'élève.
 */
export default function ProgressTracker({
  classeId,
  teacherId,
  isTeacher,
  studentId,
  studentName,
}: {
  classeId: string;
  teacherId: string;
  isTeacher: boolean;
  /** Renseigné côté élève, absent côté professeur */
  studentId?: string;
  studentName?: string;
}) {
  const { isRTL } = useLang();

  const [groups, setGroups] = useState<any[]>([]);
  const [myNotes, setMyNotes] = useState<ProgressNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFor, setOpenFor] = useState<{ id: string; name: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Formulaire
  const [level, setLevel] = useState<ProgressLevel>("progressing");
  const [topics, setTopics] = useState("");
  const [toWork, setToWork] = useState("");
  const [shared, setShared] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { load(); }, [classeId, studentId]);

  async function load() {
    setLoading(true);
    try {
      if (isTeacher) {
        setGroups(await getClasseProgress(classeId));
      } else if (studentId) {
        const notes = await getProgressNotes(classeId, studentId);
        setMyNotes(notes.filter(n => n.sharedWithStudent));
      }
    } catch (err) {
      console.error("Chargement de la progression échoué :", err);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!openFor || topics.trim().length < 5) return;
    setSaving(true);
    setError(null);
    try {
      await addProgressNote({
        classeId,
        teacherId,
        studentId: openFor.id,
        studentName: openFor.name,
        level,
        topics,
        toWork,
        sharedWithStudent: shared,
        sessionDate: new Date().toISOString(),
      });
      setOpenFor(null);
      setTopics(""); setToWork(""); setLevel("progressing"); setShared(true);
      await load();
    } catch (err) {
      console.error("Enregistrement échoué :", err);
      setError(isRTL ? "فشل الحفظ" : "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  async function remove(noteId: string) {
    if (!window.confirm(isRTL ? "حذف هذه الملاحظة؟" : "Supprimer cette note ?")) return;
    setBusy(noteId);
    try {
      await deleteProgressNote(noteId);
      await load();
    } catch (err) {
      console.error("Suppression échouée :", err);
    } finally {
      setBusy(null);
    }
  }

  function meta(l: ProgressLevel) {
    return LEVELS.find(x => x.id === l) || LEVELS[1];
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
      day: "2-digit", month: "short", year: "numeric",
    });
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 26 }}>
        <Loader2 size={20} style={{ color: "#FF8C00", animation: "prspin 0.8s linear infinite" }} />
        <style>{`@keyframes prspin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ═══════════ VUE ÉLÈVE ═══════════ */
  if (!isTeacher) {
    if (myNotes.length === 0) return null;

    return (
      <div style={card}>
        <h3 style={cardTitle}>
          <TrendingUp size={16} style={{ color: "#FF8C00" }} />
          {isRTL ? "تقدّمي" : "Ma progression"}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {myNotes.map(n => {
            const m = meta(n.level);
            return (
              <div key={n.id} style={{
                background: "rgba(10,0,20,0.4)",
                border: `1px solid ${m.color}28`,
                borderRadius: 12, padding: "12px 14px",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 9,
                  marginBottom: 8, flexWrap: "wrap",
                }}>
                  <span style={{
                    background: `${m.color}1F`, color: m.color,
                    fontSize: 11, fontWeight: 700,
                    padding: "4px 11px", borderRadius: 999,
                  }}>
                    {m.emoji} {isRTL ? m.ar : m.fr}
                  </span>
                  <span style={{ flex: 1 }} />
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    color: "#6d28d9", fontSize: 11,
                  }}>
                    <Calendar size={10} /> {fmt(n.sessionDate)}
                  </span>
                </div>

                <p style={{
                  color: "#c4b5fd", fontSize: 12.5, margin: 0,
                  lineHeight: 1.6, whiteSpace: "pre-wrap",
                }}>
                  {n.topics}
                </p>

                {n.toWork && (
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 8,
                    background: "rgba(255,140,0,0.07)",
                    borderRadius: 9, padding: "9px 11px", marginTop: 9,
                  }}>
                    <span style={{ fontSize: 12, flexShrink: 0, lineHeight: 1.3 }}>📌</span>
                    <span style={{ color: "#fdba74", fontSize: 11.5, lineHeight: 1.6 }}>
                      {n.toWork}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ═══════════ VUE PROFESSEUR ═══════════ */
  return (
    <div style={card}>
      <h3 style={cardTitle}>
        <TrendingUp size={16} style={{ color: "#FF8C00" }} />
        {isRTL ? "متابعة الطلاب" : "Suivi des élèves"}
      </h3>

      <p style={{ color: "#6d28d9", fontSize: 11.5, margin: "-8px 0 16px", lineHeight: 1.6 }}>
        {isRTL
          ? "ملاحظاتك تعطي الأولياء سبباً ملموساً لتجديد الاشتراك."
          : "Vos notes donnent aux parents une raison concrète de renouveler."}
      </p>

      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.28)",
          borderRadius: 10, padding: "10px 12px", marginBottom: 12,
        }}>
          <AlertCircle size={14} style={{ color: "#f87171", flexShrink: 0 }} />
          <span style={{ color: "#fca5a5", fontSize: 12 }}>{error}</span>
        </div>
      )}

      {groups.length === 0 ? (
        <p style={{ color: "#6d28d9", fontSize: 12.5, textAlign: "center", padding: "18px 0", margin: 0 }}>
          {isRTL
            ? "لا توجد ملاحظات بعد. أضف أول متابعة بعد الحصة."
            : "Aucune note pour l'instant. Ajoutez votre premier suivi après une séance."}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {groups.map(g => {
            const m = g.lastLevel ? meta(g.lastLevel) : null;
            const open = expanded === g.studentId;

            return (
              <div key={g.studentId} style={{
                background: "rgba(10,0,20,0.4)",
                border: "1px solid rgba(124,58,237,0.16)",
                borderRadius: 12, overflow: "hidden",
              }}>
                <button
                  onClick={() => setExpanded(open ? null : g.studentId)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 11,
                    background: "none", border: "none", padding: "12px 14px",
                    cursor: "pointer", fontFamily: "inherit",
                    textAlign: isRTL ? "right" : "left",
                  }}
                >
                  <span style={{
                    width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                    background: m ? `${m.color}1F` : "rgba(124,58,237,0.18)",
                    color: m ? m.color : "#c4b5fd",
                    fontWeight: 800, fontSize: 12,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {g.studentName.charAt(0).toUpperCase()}
                  </span>

                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", color: "white", fontSize: 13, fontWeight: 650 }}>
                      {g.studentName}
                    </span>
                    <span style={{ display: "block", color: "#6d28d9", fontSize: 10.5, marginTop: 1 }}>
                      {g.count} {isRTL ? "ملاحظة" : g.count > 1 ? "notes" : "note"}
                    </span>
                  </span>

                  {m && (
                    <span style={{
                      background: `${m.color}1F`, color: m.color,
                      fontSize: 10.5, fontWeight: 700,
                      padding: "4px 10px", borderRadius: 999, flexShrink: 0,
                    }}>
                      {m.emoji} {isRTL ? m.ar : m.fr}
                    </span>
                  )}
                </button>

                {open && (
                  <div style={{
                    padding: "0 14px 13px",
                    display: "flex", flexDirection: "column", gap: 8,
                  }}>
                    {g.notes.map((n: ProgressNote) => {
                      const nm = meta(n.level);
                      return (
                        <div key={n.id} style={{
                          background: "rgba(20,8,45,0.5)",
                          borderRadius: 10, padding: "10px 12px",
                        }}>
                          <div style={{
                            display: "flex", alignItems: "center", gap: 8,
                            marginBottom: 6, flexWrap: "wrap",
                          }}>
                            <span style={{ color: nm.color, fontSize: 11, fontWeight: 700 }}>
                              {nm.emoji} {isRTL ? nm.ar : nm.fr}
                            </span>
                            <span style={{ color: "#6d28d9", fontSize: 10.5 }}>
                              {fmt(n.sessionDate)}
                            </span>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              color: n.sharedWithStudent ? "#4ade80" : "#8b7bb8",
                              fontSize: 10,
                            }}>
                              {n.sharedWithStudent ? <Eye size={10} /> : <EyeOff size={10} />}
                              {n.sharedWithStudent
                                ? (isRTL ? "مرئية" : "partagée")
                                : (isRTL ? "خاصة" : "privée")}
                            </span>
                            <span style={{ flex: 1 }} />
                            <button
                              onClick={() => remove(n.id)}
                              disabled={busy === n.id}
                              style={{
                                background: "none", border: "none", color: "#6d28d9",
                                cursor: "pointer", padding: 0, display: "flex",
                              }}
                            >
                              {busy === n.id
                                ? <Loader2 size={12} style={{ animation: "prspin 0.8s linear infinite" }} />
                                : <Trash2 size={12} />}
                            </button>
                          </div>

                          <p style={{
                            color: "#c4b5fd", fontSize: 12, margin: 0,
                            lineHeight: 1.6, whiteSpace: "pre-wrap",
                          }}>
                            {n.topics}
                          </p>

                          {n.toWork && (
                            <p style={{
                              color: "#fdba74", fontSize: 11, margin: "7px 0 0",
                              lineHeight: 1.6,
                            }}>
                              📌 {n.toWork}
                            </p>
                          )}
                        </div>
                      );
                    })}

                    <button
                      onClick={() => setOpenFor({ id: g.studentId, name: g.studentName })}
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
                        background: "rgba(255,140,0,0.12)", color: "#FF8C00",
                        border: "1px solid rgba(255,140,0,0.28)",
                        fontSize: 12, fontWeight: 700, padding: "9px",
                        borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      <Plus size={13} /> {isRTL ? "إضافة ملاحظة" : "Ajouter une note"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ MODAL ═══ */}
      {openFor && (
        <div
          onClick={() => !saving && setOpenFor(null)}
          dir={isRTL ? "rtl" : "ltr"}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.76)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: "linear-gradient(160deg, #1a0d38, #0d0520)",
            border: "1px solid rgba(124,58,237,0.35)",
            borderRadius: 20, padding: 24,
            width: "100%", maxWidth: 460, maxHeight: "92vh", overflowY: "auto",
          }}>
            <div style={{
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
              gap: 12, marginBottom: 18,
            }}>
              <div>
                <h3 style={{ color: "white", fontWeight: 800, fontSize: 16, margin: 0 }}>
                  {isRTL ? "ملاحظة متابعة" : "Note de suivi"}
                </h3>
                <p style={{ color: "#a78bfa", fontSize: 12.5, margin: "3px 0 0" }}>
                  {openFor.name}
                </p>
              </div>
              <button onClick={() => setOpenFor(null)} disabled={saving} style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: "rgba(124,58,237,0.18)", border: "none", color: "#a78bfa",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}>
                <X size={16} />
              </button>
            </div>

            {/* Niveau */}
            <label style={label}>{isRTL ? "المستوى" : "Niveau"}</label>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
              gap: 7, marginBottom: 16,
            }}>
              {LEVELS.map(l => {
                const on = level === l.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => setLevel(l.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      background: on ? `${l.color}18` : "rgba(20,8,45,0.5)",
                      border: `1px solid ${on ? `${l.color}55` : "rgba(124,58,237,0.16)"}`,
                      color: on ? l.color : "#8b7bb8",
                      fontSize: 12, fontWeight: on ? 700 : 500,
                      padding: "10px 12px", borderRadius: 10,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    <span>{l.emoji}</span>
                    {isRTL ? l.ar : l.fr}
                  </button>
                );
              })}
            </div>

            {/* Ce qui a été vu */}
            <label style={label}>
              {isRTL ? "ما تمّت دراسته" : "Ce qui a été vu"} <span style={{ color: "#f87171" }}>*</span>
            </label>
            <textarea
              value={topics}
              onChange={e => setTopics(e.target.value)}
              rows={3}
              maxLength={500}
              disabled={saving}
              placeholder={isRTL
                ? "مثال: المعادلات من الدرجة الثانية، تمارين التطبيق."
                : "Ex : Équations du second degré, exercices d'application."}
              style={input}
            />

            {/* À travailler */}
            <label style={{ ...label, marginTop: 14 }}>
              {isRTL ? "نقاط للعمل عليها" : "À travailler"}
            </label>
            <textarea
              value={toWork}
              onChange={e => setToWork(e.target.value)}
              rows={2}
              maxLength={500}
              disabled={saving}
              placeholder={isRTL
                ? "مثال: مراجعة المتطابقات الشهيرة قبل الحصة القادمة."
                : "Ex : Revoir les identités remarquables avant la prochaine séance."}
              style={input}
            />

            {/* Partage */}
            <button
              onClick={() => setShared(!shared)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                background: shared ? "rgba(34,197,94,0.08)" : "rgba(124,58,237,0.07)",
                border: `1px solid ${shared ? "rgba(34,197,94,0.26)" : "rgba(124,58,237,0.2)"}`,
                borderRadius: 11, padding: "11px 13px", marginTop: 16,
                cursor: "pointer", fontFamily: "inherit",
                textAlign: isRTL ? "right" : "left",
              }}
            >
              <span style={{ color: shared ? "#4ade80" : "#8b7bb8", flexShrink: 0 }}>
                {shared ? <Eye size={15} /> : <EyeOff size={15} />}
              </span>
              <span style={{ flex: 1 }}>
                <span style={{
                  display: "block",
                  color: shared ? "#6ee7b7" : "#c4b5fd",
                  fontSize: 12.5, fontWeight: 650,
                }}>
                  {shared
                    ? (isRTL ? "مرئية للطالب" : "Visible par l'élève")
                    : (isRTL ? "ملاحظة خاصة" : "Note privée")}
                </span>
                <span style={{ display: "block", color: "#6d28d9", fontSize: 10.5, marginTop: 2, lineHeight: 1.5 }}>
                  {shared
                    ? (isRTL ? "سيتلقّى إشعاراً" : "Il recevra une notification")
                    : (isRTL ? "لك وحدك — للملاحظات الحساسة" : "Pour vous seul — observations sensibles")}
                </span>
              </span>
            </button>

            <button
              onClick={save}
              disabled={topics.trim().length < 5 || saving}
              style={{
                width: "100%", marginTop: 18,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: "linear-gradient(135deg, #FF8C00, #FF6B00)",
                color: "white", fontWeight: 800, padding: 14,
                borderRadius: 13, border: "none",
                cursor: topics.trim().length >= 5 && !saving ? "pointer" : "not-allowed",
                fontSize: 14, fontFamily: "inherit",
                opacity: topics.trim().length >= 5 && !saving ? 1 : 0.45,
              }}
            >
              {saving
                ? <><Loader2 size={15} style={{ animation: "prspin 0.8s linear infinite" }} /> {isRTL ? "جارٍ..." : "Enregistrement..."}</>
                : <><Check size={15} /> {isRTL ? "حفظ" : "Enregistrer"}</>}
            </button>

            <style>{`@keyframes prspin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "linear-gradient(145deg, rgba(20,8,45,0.9), rgba(15,5,30,0.9))",
  border: "1px solid rgba(124,58,237,0.2)",
  borderRadius: 16, padding: 18,
};

const cardTitle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 9,
  color: "white", fontWeight: 750, fontSize: 14.5, margin: "0 0 14px",
};

const label: React.CSSProperties = {
  display: "block", color: "#a78bfa", fontSize: 11.5, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 7,
};

const input: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", resize: "none",
  background: "rgba(26,10,60,0.65)", border: "1px solid rgba(124,58,237,0.25)",
  borderRadius: 11, padding: "11px 13px", fontSize: 13,
  color: "white", outline: "none", fontFamily: "inherit", lineHeight: 1.6,
};
