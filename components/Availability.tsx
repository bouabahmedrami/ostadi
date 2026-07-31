"use client";
import { useLang } from "@/lib/lang-context";
import { Sun, Sunset, Moon, CalendarDays } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   Semaine algérienne : dimanche → jeudi = jours d'école,
   vendredi et samedi = week-end.
   L'ordre suit celui d'un calendrier local, pas européen.
   ═══════════════════════════════════════════════════════════ */
interface Day {
  id: string;
  fr: string;
  ar: string;
  short: { fr: string; ar: string };
  weekend?: boolean;
}

interface Slot {
  id: string;
  fr: string;
  ar: string;
  hours: string;
  icon: LucideIcon;
}

export const DAYS: Day[] = [
  { id: "sun", fr: "Dimanche", ar: "الأحد", short: { fr: "Dim", ar: "أحد" } },
  { id: "mon", fr: "Lundi", ar: "الإثنين", short: { fr: "Lun", ar: "إثن" } },
  { id: "tue", fr: "Mardi", ar: "الثلاثاء", short: { fr: "Mar", ar: "ثلا" } },
  { id: "wed", fr: "Mercredi", ar: "الأربعاء", short: { fr: "Mer", ar: "أرب" } },
  { id: "thu", fr: "Jeudi", ar: "الخميس", short: { fr: "Jeu", ar: "خمي" } },
  { id: "fri", fr: "Vendredi", ar: "الجمعة", short: { fr: "Ven", ar: "جمع" }, weekend: true },
  { id: "sat", fr: "Samedi", ar: "السبت", short: { fr: "Sam", ar: "سبت" }, weekend: true },
];

export const SLOTS: Slot[] = [
  { id: "morning", fr: "Matin", ar: "صباحاً", hours: "08h–12h", icon: Sun },
  { id: "afternoon", fr: "Après-midi", ar: "بعد الظهر", hours: "12h–17h", icon: Sunset },
  { id: "evening", fr: "Soir", ar: "مساءً", hours: "17h–21h", icon: Moon },
];

/** Format stocké : ["sun-evening", "fri-morning", ...] */
export type Availability = string[];

/* ═══════════════════════════════════════════════════════════
   SÉLECTEUR — pour l'édition du profil
   ═══════════════════════════════════════════════════════════ */
export function AvailabilityPicker({
  value = [],
  onChange,
}: {
  value?: Availability;
  onChange: (v: Availability) => void;
}) {
  const { isRTL } = useLang();

  function toggle(key: string) {
    onChange(value.includes(key) ? value.filter(k => k !== key) : [...value, key]);
  }

  function toggleRow(slotId: string) {
    const keys = DAYS.map(d => `${d.id}-${slotId}`);
    const allOn = keys.every(k => value.includes(k));
    onChange(allOn ? value.filter(k => !keys.includes(k)) : [...new Set([...value, ...keys])]);
  }

  function toggleCol(dayId: string) {
    const keys = SLOTS.map(s => `${dayId}-${s.id}`);
    const allOn = keys.every(k => value.includes(k));
    onChange(allOn ? value.filter(k => !keys.includes(k)) : [...new Set([...value, ...keys])]);
  }

  return (
    <div className="ap" dir={isRTL ? "rtl" : "ltr"}>
      <div className="ap-scroll">
        <table className="ap-table">
          <thead>
            <tr>
              <th className="ap-corner" />
              {DAYS.map(d => (
                <th key={d.id} className={d.weekend ? "ap-th ap-th-we" : "ap-th"}>
                  <button
                    type="button"
                    onClick={() => toggleCol(d.id)}
                    title={isRTL ? `تبديل ${d.ar}` : `Tout ${d.fr}`}
                  >
                    {isRTL ? d.short.ar : d.short.fr}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map(s => {
              const Icon = s.icon;
              return (
                <tr key={s.id}>
                  <th className="ap-rowhead">
                    <button
                      type="button"
                      onClick={() => toggleRow(s.id)}
                      title={isRTL ? `تبديل ${s.ar}` : `Tout ${s.fr}`}
                    >
                      <Icon size={13} />
                      <span>
                        <span className="ap-slot-name">{isRTL ? s.ar : s.fr}</span>
                        <span className="ap-slot-hours">{s.hours}</span>
                      </span>
                    </button>
                  </th>
                  {DAYS.map(d => {
                    const key = `${d.id}-${s.id}`;
                    const on = value.includes(key);
                    return (
                      <td key={key} className={d.weekend ? "ap-td-we" : ""}>
                        <button
                          type="button"
                          onClick={() => toggle(key)}
                          className={`ap-cell ${on ? "ap-cell-on" : ""}`}
                          aria-pressed={on}
                          aria-label={`${isRTL ? d.ar : d.fr} ${isRTL ? s.ar : s.fr}`}
                        >
                          {on && <span className="ap-check">✓</span>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="ap-footer">
        <span className="ap-count">
          {value.length === 0
            ? (isRTL ? "لم تحدد أي وقت" : "Aucun créneau sélectionné")
            : (isRTL
                ? `${value.length} فترة محددة`
                : `${value.length} créneau${value.length > 1 ? "x" : ""} sélectionné${value.length > 1 ? "s" : ""}`)}
        </span>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="ap-clear">
            {isRTL ? "مسح الكل" : "Tout effacer"}
          </button>
        )}
      </div>

      <p className="ap-hint">
        {isRTL
          ? "اضغط على اسم اليوم أو الفترة لتحديد الصف كاملاً."
          : "Cliquez sur un jour ou un créneau pour sélectionner toute la ligne."}
      </p>

      <style jsx>{AP_STYLES}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AFFICHAGE — pour le profil public
   ═══════════════════════════════════════════════════════════ */
export function AvailabilityDisplay({ value = [] }: { value?: Availability }) {
  const { isRTL } = useLang();

  if (!value || value.length === 0) return null;

  // Regroupe par jour pour un affichage compact
  const byDay = DAYS.map(d => ({
    ...d,
    slots: SLOTS.filter(s => value.includes(`${d.id}-${s.id}`)),
  })).filter(d => d.slots.length > 0);

  if (byDay.length === 0) return null;

  return (
    <div className="ad-avail" dir={isRTL ? "rtl" : "ltr"}>
      <h4 className="ad-avail-title">
        <CalendarDays size={14} />
        {isRTL ? "الأوقات المتاحة" : "Disponibilités"}
      </h4>

      <div className="ad-avail-list">
        {byDay.map(d => (
          <div key={d.id} className={`ad-avail-row ${d.weekend ? "ad-avail-row-we" : ""}`}>
            <span className="ad-avail-day">{isRTL ? d.ar : d.fr}</span>
            <span className="ad-avail-slots">
              {d.slots.map(s => {
                const Icon = s.icon;
                return (
                  <span key={s.id} className="ad-avail-slot" title={s.hours}>
                    <Icon size={11} />
                    {isRTL ? s.ar : s.fr}
                  </span>
                );
              })}
            </span>
          </div>
        ))}
      </div>

      <style jsx>{`
        .ad-avail {
          background: rgba(124, 58, 237, 0.06);
          border: 1px solid rgba(124, 58, 237, 0.16);
          border-radius: 14px;
          padding: 14px 16px;
        }
        .ad-avail-title {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #a78bfa;
          font-size: 11.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          margin: 0 0 12px;
        }
        .ad-avail-title :global(svg) { color: #FF8C00; }

        .ad-avail-list { display: flex; flex-direction: column; gap: 8px; }
        .ad-avail-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .ad-avail-day {
          color: #c4b5fd;
          font-size: 12.5px;
          font-weight: 600;
          min-width: 74px;
        }
        .ad-avail-row-we .ad-avail-day { color: #FF8C00; }

        .ad-avail-slots { display: flex; gap: 6px; flex-wrap: wrap; }
        .ad-avail-slot {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(124, 58, 237, 0.14);
          border: 1px solid rgba(124, 58, 237, 0.2);
          color: #a78bfa;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 7px;
        }
        .ad-avail-slot :global(svg) { color: #FF8C00; }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
const AP_STYLES = `
  .ap {
    background: rgba(10, 0, 20, 0.35);
    border: 1px solid rgba(124, 58, 237, 0.18);
    border-radius: 14px;
    padding: 14px;
  }

  .ap-scroll { overflow-x: auto; }
  .ap-scroll::-webkit-scrollbar { height: 5px; }
  .ap-scroll::-webkit-scrollbar-thumb {
    background: rgba(124, 58, 237, 0.3);
    border-radius: 999px;
  }

  .ap-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 4px;
    min-width: 380px;
  }

  .ap-corner { width: 86px; }

  .ap-th, .ap-rowhead { padding: 0; }
  .ap-th button, .ap-rowhead button {
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    padding: 5px 2px;
    border-radius: 7px;
    transition: background 0.18s ease;
  }
  .ap-th button {
    color: #a78bfa;
    font-size: 10.5px;
    font-weight: 700;
  }
  .ap-th-we button { color: #FF8C00; }
  .ap-th button:hover, .ap-rowhead button:hover {
    background: rgba(124, 58, 237, 0.14);
  }

  .ap-rowhead button {
    display: flex;
    align-items: center;
    gap: 7px;
    text-align: start;
    padding: 5px 6px;
  }
  .ap-rowhead :global(svg) { color: #FF8C00; flex-shrink: 0; }
  .ap-rowhead span { display: flex; flex-direction: column; gap: 1px; }
  .ap-slot-name { color: #c4b5fd; font-size: 11.5px; font-weight: 600; }
  .ap-slot-hours { color: #5b21b6; font-size: 9.5px; }

  .ap-td-we { background: rgba(255, 140, 0, 0.03); border-radius: 8px; }

  .ap-cell {
    width: 100%;
    height: 34px;
    background: rgba(26, 10, 60, 0.55);
    border: 1px solid rgba(124, 58, 237, 0.18);
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.18s cubic-bezier(0.34, 1.4, 0.64, 1);
  }
  .ap-cell:hover {
    border-color: rgba(168, 85, 247, 0.45);
    transform: scale(1.04);
  }
  .ap-cell-on {
    background: rgba(255, 140, 0, 0.18);
    border-color: rgba(255, 140, 0, 0.5);
  }
  .ap-check { color: #FF8C00; font-size: 13px; font-weight: 900; line-height: 1; }
  .ap-cell:focus-visible {
    outline: 2px solid #FF8C00;
    outline-offset: 1px;
  }

  .ap-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 12px;
    padding-top: 11px;
    border-top: 1px solid rgba(124, 58, 237, 0.14);
  }
  .ap-count { color: #8b7bb8; font-size: 11.5px; }
  .ap-clear {
    background: none;
    border: none;
    color: #f87171;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    text-decoration: underline;
  }
  .ap-clear:hover { color: #fca5a5; }

  .ap-hint {
    color: #5b21b6;
    font-size: 10.5px;
    margin: 9px 0 0;
    line-height: 1.5;
  }
`;
