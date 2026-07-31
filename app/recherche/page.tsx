"use client";
import { useState, useEffect } from "react";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Classe, SUBJECTS, LEVELS, WILAYAS } from "@/lib/types";
import { useLang } from "@/lib/lang-context";
import { trSubject, trLevel, trWilaya } from "@/lib/i18n/translate";
import ClasseCard from "@/components/ClasseCard";
import { Search, X, SlidersHorizontal, MapPin, BookOpen, GraduationCap, User } from "lucide-react";

export default function RecherchePage() {
  const { isRTL } = useLang();
  const [teacherName, setTeacherName] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [results, setResults] = useState<Classe[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  async function handleSearch() {
    setLoading(true);
    setSearched(true);
    try {
      const q = query(collection(db, "classes"), orderBy("teacherRating", "desc"));
      const snap = await getDocs(q);
      let all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Classe));

      // Filtrage côté client (Firestore limite les requêtes composées)
      if (teacherName.trim()) {
        const search = teacherName.trim().toLowerCase();
        all = all.filter(c => c.teacherName.toLowerCase().includes(search));
      }
      if (wilaya) all = all.filter(c => c.wilaya === wilaya);
      if (subject) all = all.filter(c => c.subject === subject);
      if (level) all = all.filter(c => c.level === level);

      setResults(all);
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setTeacherName(""); setWilaya(""); setSubject(""); setLevel("");
    setResults([]); setSearched(false);
  }

  const activeFiltersCount = [teacherName, wilaya, subject, level].filter(Boolean).length;

  return (
    <div className="ostadi-search-page" dir={isRTL ? "rtl" : "ltr"}>
      <div className="ostadi-search-container">

        {/* Header */}
        <div className="ostadi-search-header">
          <div className="ostadi-search-header-icon"><Search size={20} /></div>
          <div>
            <h1 className="ostadi-search-title">{isRTL ? "بحث متقدم" : "Recherche avancée"}</h1>
            <p className="ostadi-search-subtitle">{isRTL ? "ابحث بالاسم أو الولاية أو المادة" : "Cherchez par nom, wilaya ou matière"}</p>
          </div>
        </div>

        {/* Filters card */}
        <div className="ostadi-filters-card">
          <button onClick={() => setShowFilters(!showFilters)} className="ostadi-filters-toggle">
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SlidersHorizontal size={15} />
              {isRTL ? "المرشحات" : "Filtres"}
              {activeFiltersCount > 0 && <span className="ostadi-filter-count">{activeFiltersCount}</span>}
            </span>
            <span style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
          </button>

          {showFilters && (
            <div className="ostadi-filters-body">
              <div className="ostadi-filter-field">
                <label className="ostadi-filter-label"><User size={13} /> {isRTL ? "اسم الأستاذ" : "Nom du professeur"}</label>
                <div className="ostadi-input-wrap">
                  <input
                    value={teacherName}
                    onChange={e => setTeacherName(e.target.value)}
                    placeholder={isRTL ? "مثال: أحمد" : "Ex: Ahmed"}
                    className="ostadi-search-input"
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                  />
                  {teacherName && (
                    <button onClick={() => setTeacherName("")} className="ostadi-clear-btn"><X size={14} /></button>
                  )}
                </div>
              </div>

              <div className="ostadi-filter-grid">
                <div className="ostadi-filter-field">
                  <label className="ostadi-filter-label"><MapPin size={13} /> {isRTL ? "الولاية" : "Wilaya"}</label>
                  <select value={wilaya} onChange={e => setWilaya(e.target.value)} className="ostadi-search-input">
                    <option value="">{isRTL ? "كل الولايات" : "Toutes les wilayas"}</option>
                    {WILAYAS.map(w => <option key={w} value={w}>{trWilaya(w, isRTL)}</option>)}
                  </select>
                </div>

                <div className="ostadi-filter-field">
                  <label className="ostadi-filter-label"><BookOpen size={13} /> {isRTL ? "المادة" : "Matière"}</label>
                  <select value={subject} onChange={e => setSubject(e.target.value)} className="ostadi-search-input">
                    <option value="">{isRTL ? "كل المواد" : "Toutes les matières"}</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{trSubject(s, isRTL)}</option>)}
                  </select>
                </div>
              </div>

              <div className="ostadi-filter-field">
                <label className="ostadi-filter-label"><GraduationCap size={13} /> {isRTL ? "المستوى" : "Niveau"}</label>
                <select value={level} onChange={e => setLevel(e.target.value)} className="ostadi-search-input">
                  <option value="">{isRTL ? "كل المستويات" : "Tous les niveaux"}</option>
                  {LEVELS.map(l => <option key={l} value={l}>{trLevel(l, isRTL)}</option>)}
                </select>
              </div>

              <div className="ostadi-filter-actions">
                <button onClick={handleSearch} className="ostadi-search-btn">
                  <Search size={15} /> {isRTL ? "بحث" : "Rechercher"}
                </button>
                {activeFiltersCount > 0 && (
                  <button onClick={resetFilters} className="ostadi-reset-filters-btn">
                    {isRTL ? "إعادة تعيين" : "Réinitialiser"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        {searched && (
          <div className="ostadi-results-section">
            <div className="ostadi-results-header">
              <h2 className="ostadi-results-title">
                {loading ? (isRTL ? "جارٍ البحث..." : "Recherche...") : `${results.length} ${isRTL ? "نتيجة" : "résultat(s)"}`}
              </h2>
            </div>

            {loading ? (
              <div className="ostadi-results-grid">
                {[...Array(4)].map((_, i) => <div key={i} className="ostadi-skeleton-card" />)}
              </div>
            ) : results.length === 0 ? (
              <div className="ostadi-no-results">
                <Search size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p>{isRTL ? "لا توجد نتائج مطابقة" : "Aucun résultat trouvé"}</p>
                <p className="ostadi-no-results-hint">{isRTL ? "جرب معايير بحث مختلفة" : "Essayez d'autres critères"}</p>
              </div>
            ) : (
              <div className="ostadi-results-grid">
                {results.map(c => <ClasseCard key={c.id} classe={c} />)}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        .ostadi-search-page {
          background: #0A0014; min-height: 100vh;
          background-image: radial-gradient(circle at 20% 10%, rgba(124,58,237,0.1) 0%, transparent 50%),
            linear-gradient(rgba(168,85,247,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.03) 1px, transparent 1px);
          background-size: auto, 44px 44px, 44px 44px;
          padding: 32px 16px 60px;
        }
        .ostadi-search-container { max-width: 800px; margin: 0 auto; }

        .ostadi-search-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
        .ostadi-search-header-icon {
          width: 46px; height: 46px; border-radius: 14px;
          background: linear-gradient(135deg, rgba(255,140,0,0.2), rgba(124,58,237,0.15));
          border: 1px solid rgba(255,140,0,0.3);
          display: flex; align-items: center; justify-content: center; color: #FF8C00;
        }
        .ostadi-search-title { color: white; font-weight: 900; font-size: 21px; margin: 0; letter-spacing: -0.3px; }
        .ostadi-search-subtitle { color: #a78bfa; font-size: 13px; margin: 2px 0 0; }

        .ostadi-filters-card {
          background: linear-gradient(145deg, rgba(20,8,45,0.9), rgba(15,5,30,0.9));
          border: 1px solid rgba(124,58,237,0.2); border-radius: 18px; overflow: hidden; margin-bottom: 24px;
        }
        .ostadi-filters-toggle {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; background: none; border: none; color: white; font-weight: 700;
          font-size: 14px; cursor: pointer;
        }
        .ostadi-filter-count {
          background: #FF8C00; color: white; font-size: 10px; font-weight: 800;
          width: 18px; height: 18px; border-radius: 50%; display: inline-flex;
          align-items: center; justify-content: center; margin-left: 6px;
        }
        .ostadi-filters-body { padding: 0 20px 20px; display: flex; flex-direction: column; gap: 16px; }

        .ostadi-filter-field { display: flex; flex-direction: column; gap: 7px; }
        .ostadi-filter-label { display: flex; align-items: center; gap: 6px; color: #a78bfa; font-size: 12.5px; font-weight: 600; }
        .ostadi-filter-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 480px) { .ostadi-filter-grid { grid-template-columns: 1fr; } }

        .ostadi-input-wrap { position: relative; }
        .ostadi-search-input {
          width: 100%; background: rgba(26,10,60,0.6); border: 1px solid rgba(124,58,237,0.25);
          border-radius: 12px; padding: 11px 13px; font-size: 13.5px; color: white; outline: none;
          transition: border-color 0.2s ease; font-family: inherit; box-sizing: border-box;
        }
        .ostadi-search-input:focus { border-color: rgba(255,140,0,0.5); }
        .ostadi-search-input::placeholder { color: #6d28d9; }
        .ostadi-clear-btn {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: #6d28d9; cursor: pointer; display: flex;
        }
        [dir="rtl"] .ostadi-clear-btn { right: auto; left: 10px; }

        .ostadi-filter-actions { display: flex; gap: 10px; padding-top: 6px; }
        .ostadi-search-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
          background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white; font-weight: 800;
          padding: 13px; border-radius: 13px; border: none; cursor: pointer; font-size: 14px;
          box-shadow: 0 6px 20px rgba(255,140,0,0.3); transition: all 0.25s ease;
        }
        .ostadi-search-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(255,140,0,0.4); }
        .ostadi-reset-filters-btn {
          background: rgba(124,58,237,0.1); color: #c4b5fd; border: 1px solid rgba(124,58,237,0.25);
          padding: 13px 18px; border-radius: 13px; font-weight: 600; font-size: 13px; cursor: pointer;
        }

        .ostadi-results-section { margin-top: 8px; }
        .ostadi-results-header { margin-bottom: 16px; }
        .ostadi-results-title { color: white; font-weight: 800; font-size: 16px; margin: 0; }

        .ostadi-results-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 640px) { .ostadi-results-grid { grid-template-columns: 1fr 1fr; } }

        .ostadi-skeleton-card { height: 200px; background: linear-gradient(90deg, rgba(124,58,237,0.06) 25%, rgba(124,58,237,0.15) 50%, rgba(124,58,237,0.06) 75%); background-size: 200% 100%; border-radius: 16px; animation: shimmer 1.6s ease-in-out infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        .ostadi-no-results { text-align: center; padding: 60px 20px; color: #8b7bb8; }
        .ostadi-no-results-hint { font-size: 12.5px; color: #6d28d9; margin-top: 4px; }
      `}</style>
    </div>
  );
}
