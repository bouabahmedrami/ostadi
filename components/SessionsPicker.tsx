"use client";
import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import { Calendar, Clock, X, Sparkles, AlertCircle } from "lucide-react";

export const MAX_SESSIONS = 8;

/* Semaine algérienne : dimanche → jeudi = école, vendredi/samedi = week-end */
const WEEKDAYS = [
  { idx: 0, fr: "Dim", ar: "أحد", full: { fr: "Dimanche", ar: "الأحد" } },
  { idx: 1, fr: "Lun", ar: "إثن", full: { fr: "Lundi", ar: "الإثنين" } },
  { idx: 2, fr: "Mar", ar: "ثلا", full: { fr: "Mardi", ar: "الثلاثاء" } },
  { idx: 3, fr: "Mer", ar: "أرب", full: { fr: "Mercredi", ar: "الأربعاء" } },
  { idx: 4, fr: "Jeu", ar: "خمي", full: { fr: "Jeudi", ar: "الخميس" } },
  { idx: 5, fr: "Ven", ar: "جمع", full: { fr: "Vendredi", ar: "الجمعة" }, we: true },
  { idx: 6, fr: "Sam", ar: "سبت", full: { fr: "Samedi", ar: "السبت" }, we: true },
];

interface Props {
  /** Dates ISO des séances */
  value: string[];
  onChange: (dates: string[]) => void;
}

export default function SessionsPicker({ value = [], onChange }: Props) {
  const { isRTL } = useLang();

  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [time, setTime] = useState("17:00");
  const [days, setDays] = useState<number[]>([]);
  const [count, setCount] = useState(4);

  function toggleDay(idx: number) {
    setDays(prev =>
      prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
    );
  }

  /**
   * Génère les dates de séances à partir du jour de départ,
   * en ne retenant que les jours de la semaine sélectionnés.
   */
  function generate() {
    if (days.length === 0) return;

    const [h, m] = time.split(":").map(Number);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const out: string[] = [];
    const cursor = new Date(start);
    let guard = 0;

    // 90 jours de marge : suffisant pour 8 séances même à raison d'une par semaine
    while (out.length < count && guard < 90) {
      if (days.includes(cursor.getDay())) {
        const d = new Date(cursor);
        d.setHours(h, m, 0, 0);
        out.push(d.toISOString());
      }
      cursor.setDate(cursor.getDate() + 1);
      guard++;
    }

    onChange(out.slice(0, MAX_SESSIONS));
  }

  function removeAt(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const canGenerate = days.length > 0;

  return (
    <div className="sp" dir={isRTL ? "rtl" : "ltr"}>

      {/* ── Générateur ── */}
      <div className="sp-gen">
        <div className="sp-row">
          <div className="sp-field">
            <label>{isRTL ? "تاريخ البداية" : "Début"}</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="sp-field">
            <label>{isRTL ? "الساعة" : "Heure"}</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
            />
          </div>
        </div>

        <div className="sp-field">
          <label>{isRTL ? "أيام الحصص" : "Jours des séances"}</label>
          <div className="sp-days">
            {WEEKDAYS.map(d => (
              <button
                key={d.idx}
                type="button"
                onClick={() => toggleDay(d.idx)}
                className={`sp-day ${days.includes(d.idx) ? "sp-day-on" : ""} ${d.we ? "sp-day-we" : ""}`}
                title={isRTL ? d.full.ar : d.full.fr}
              >
                {isRTL ? d.ar : d.fr}
              </button>
            ))}
          </div>
        </div>

        <div className="sp-field">
          <label>
            {isRTL ? "عدد الحصص" : "Nombre de séances"}
            <span className="sp-max"> ({isRTL ? "8 كحد أقصى" : "8 max"})</span>
          </label>
          <div className="sp-counter">
            <button type="button" onClick={() => setCount(Math.max(1, count - 1))}>−</button>
            <span>{count}</span>
            <button type="button" onClick={() => setCount(Math.min(MAX_SESSIONS, count + 1))}>+</button>
          </div>
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={!canGenerate}
          className="sp-generate"
        >
          <Sparkles size={15} />
          {isRTL ? "توليد المواعيد" : "Générer les dates"}
        </button>

        {!canGenerate && (
          <p className="sp-hint">
            {isRTL
              ? "اختر يوماً واحداً على الأقل."
              : "Sélectionnez au moins un jour."}
          </p>
        )}
      </div>

      {/* ── Liste des séances ── */}
      {value.length > 0 && (
        <div className="sp-list">
          <div className="sp-list-head">
            <span>
              <Calendar size={13} />
              {value.length} {isRTL ? "حصة" : value.length > 1 ? "séances" : "séance"}
            </span>
            <button type="button" onClick={() => onChange([])}>
              {isRTL ? "مسح الكل" : "Tout effacer"}
            </button>
          </div>

          {value.map((d, i) => (
            <div key={d + i} className="sp-item">
              <span className="sp-num">{i + 1}</span>
              <span className="sp-date">{fmt(d)}</span>
              <button type="button" onClick={() => removeAt(i)} aria-label="Retirer">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length === 0 && (
        <div className="sp-empty">
          <AlertCircle size={14} />
          <span>
            {isRTL
              ? "لم يتم تحديد أي حصة بعد."
              : "Aucune séance définie pour l'instant."}
          </span>
        </div>
      )}

      <style jsx>{`
        .sp {
          background: rgba(10, 0, 20, 0.35);
          border: 1px solid rgba(124, 58, 237, 0.18);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .sp-gen { display: flex; flex-direction: column; gap: 12px; }
        .sp-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .sp-field { display: flex; flex-direction: column; gap: 6px; }
        .sp-field label {
          color: #a78bfa;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .sp-max { color: #5b21b6; font-weight: 500; text-transform: none; }
        .sp-field input {
          background: rgba(26, 10, 60, 0.7);
          border: 1px solid rgba(124, 58, 237, 0.25);
          border-radius: 10px;
          padding: 9px 11px;
          font-size: 13px;
          color: white;
          font-family: inherit;
          outline: none;
          box-sizing: border-box;
          width: 100%;
        }
        .sp-field input:focus { border-color: rgba(255, 140, 0, 0.5); }

        /* ── Jours ── */
        .sp-days { display: flex; gap: 5px; flex-wrap: wrap; }
        .sp-day {
          flex: 1;
          min-width: 40px;
          padding: 8px 4px;
          background: rgba(26, 10, 60, 0.6);
          border: 1px solid rgba(124, 58, 237, 0.22);
          border-radius: 9px;
          color: #a78bfa;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s cubic-bezier(0.34, 1.4, 0.64, 1);
        }
        .sp-day:hover { border-color: rgba(168, 85, 247, 0.45); }
        .sp-day-we { color: #fdba74; }
        .sp-day-on {
          background: rgba(255, 140, 0, 0.16);
          border-color: rgba(255, 140, 0, 0.5);
          color: #FF8C00;
        }

        /* ── Compteur ── */
        .sp-counter {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(26, 10, 60, 0.7);
          border: 1px solid rgba(124, 58, 237, 0.25);
          border-radius: 10px;
          padding: 5px 8px;
          width: fit-content;
        }
        .sp-counter button {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: rgba(124, 58, 237, 0.18);
          border: none;
          color: #c4b5fd;
          font-size: 17px;
          font-weight: 700;
          cursor: pointer;
          line-height: 1;
        }
        .sp-counter button:hover { background: rgba(124, 58, 237, 0.32); color: white; }
        .sp-counter span {
          color: white;
          font-weight: 800;
          font-size: 15px;
          min-width: 24px;
          text-align: center;
        }

        /* ── Bouton générer ── */
        .sp-generate {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: linear-gradient(135deg, #7C3AED, #6D28D9);
          color: white;
          font-weight: 700;
          padding: 11px;
          border-radius: 11px;
          border: none;
          cursor: pointer;
          font-size: 13px;
          font-family: inherit;
          transition: transform 0.2s ease, filter 0.2s ease;
        }
        .sp-generate:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
        .sp-generate:disabled { opacity: 0.45; cursor: not-allowed; }
        .sp-hint { color: #5b21b6; font-size: 10.5px; margin: 0; text-align: center; }

        /* ── Liste ── */
        .sp-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-top: 12px;
          border-top: 1px solid rgba(124, 58, 237, 0.16);
        }
        .sp-list-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .sp-list-head span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #FF8C00;
          font-size: 12px;
          font-weight: 700;
        }
        .sp-list-head button {
          background: none;
          border: none;
          color: #f87171;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          text-decoration: underline;
        }

        .sp-item {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(124, 58, 237, 0.08);
          border-radius: 9px;
          padding: 8px 10px;
        }
        .sp-num {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          background: rgba(255, 140, 0, 0.18);
          color: #FF8C00;
          font-size: 10.5px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .sp-date { flex: 1; color: #c4b5fd; font-size: 12px; }
        .sp-item button {
          background: none;
          border: none;
          color: #6d28d9;
          cursor: pointer;
          display: flex;
          padding: 0;
          flex-shrink: 0;
        }
        .sp-item button:hover { color: #f87171; }

        /* ── Vide ── */
        .sp-empty {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid rgba(124, 58, 237, 0.16);
        }
        .sp-empty :global(svg) { color: #6d28d9; flex-shrink: 0; }
        .sp-empty span { color: #6d28d9; font-size: 11.5px; }
      `}</style>
    </div>
  );
}
