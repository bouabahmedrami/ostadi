"use client";
import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { autoArchiveFinishedClasses } from "@/lib/firestore";
import { Classe, SUBJECTS, LEVELS, WILAYAS } from "@/lib/types";
import { useLang } from "@/lib/lang-context";
import ClasseCard from "@/components/ClasseCard";
import TopTeachers from "@/components/TopTeachers";
import Link from "next/link";
import {
  Search, X, SlidersHorizontal, Users, Zap, Star, BookOpen,
  TrendingUp, MapPin, Calendar, Banknote, ArrowUpDown, RotateCcw,
} from "lucide-react";
import { trSubject, trLevel, trWilaya } from "@/lib/i18n/translate";
import { Reveal, RevealGroup, Sequence, CountUp } from "@/components/Motion";
import { ClasseGridSkeleton, EmptyState } from "@/components/Skeletons";
import { ChalkUnderline } from "@/components/Chalk";
import { haptic } from "@/lib/haptics";
import { isSessionPast, parseSessionDate } from "@/lib/course-access";
type SortKey = "rating" | "followers" | "price_asc" | "price_desc" | "date_asc" | "date_desc" | "popular";

export default function HomePage() {
  const { t, isRTL } = useLang();
  const [allClasses, setAllClasses] = useState<Classe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // ── Filtres ──────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [teacher, setTeacher] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("rating");

  useEffect(() => { loadClasses(); }, []);

  async function loadClasses() {
    setLoading(true);
    setLoadError(false);
    try {
      await autoArchiveFinishedClasses();
      const snap = await getDocs(query(collection(db, "classes"), orderBy("dateTime", "asc")));
      setAllClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Classe)));
    } catch (err) {
      console.error("Chargement des cours échoué :", err);
      setAllClasses([]);
      setLoadError(true);
    }
    finally { setLoading(false); }
  }

  // ── Filtrage + tri côté client (instantané) ──────────
  const filtered = useMemo(() => {
    /**
     * ⚠️ Les cours passés sont écartés d'emblée.
     *
     * Un élève qui arrive sur la page d'accueil cherche un cours à
     * suivre, pas l'historique de la plateforme. Afficher des séances
     * terminées donne l'impression d'un catalogue vide de sens, et
     * fait perdre du temps avant d'arriver aux cours disponibles.
     *
     * Le filtre s'appuie sur la DERNIÈRE séance : un cours mensuel
     * reste visible tant qu'il en reste une à venir, même si les
     * premières sont passées — un élève peut encore le rejoindre.
     */
    let list = allClasses.filter(c => !isSessionPast(c as any));

    // Recherche globale : titre, matière, prof, description
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        (c.title || "").toLowerCase().includes(q) ||
        (c.subject || "").toLowerCase().includes(q) ||
        (c.teacherName || "").toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q) ||
        (c.level || "").toLowerCase().includes(q) ||
        (c.wilaya || "").toLowerCase().includes(q) ||
        // Recherche aussi sur les libellés traduits :
        // un élève arabophone qui tape « الرياضيات » doit trouver « Mathématiques »
        trSubject(c.subject || "", isRTL).toLowerCase().includes(q) ||
        trLevel(c.level || "", isRTL).toLowerCase().includes(q) ||
        trWilaya(c.wilaya || "", isRTL).toLowerCase().includes(q)
      );
    }
    if (subject) list = list.filter(c => c.subject === subject);
    if (level) list = list.filter(c => c.level === level);
    if (wilaya) list = list.filter(c => c.wilaya === wilaya);
    if (teacher.trim()) {
      const q = teacher.trim().toLowerCase();
      list = list.filter(c => (c.teacherName || "").toLowerCase().includes(q));
    }
    if (minPrice) list = list.filter(c => (c.price || 0) >= Number(minPrice));
    if (maxPrice) list = list.filter(c => (c.price || 0) <= Number(maxPrice));
    if (minRating > 0) list = list.filter(c => (c.teacherRating || 0) >= minRating);
    if (dateFrom) list = list.filter(c => parseSessionDate(c.dateTime) >= new Date(dateFrom).getTime());
    if (dateTo) {
      const end = new Date(dateTo); end.setHours(23, 59, 59);
      list = list.filter(c => parseSessionDate(c.dateTime) <= end.getTime());
    }

    // Tri
    switch (sortBy) {
      case "rating": list.sort((a, b) => (b.teacherRating || 0) - (a.teacherRating || 0)); break;
      /**
       * Tri par abonnés — dit autre chose que la note.
       *
       * Un professeur peut avoir cinq étoiles sur trois avis, ou
       * quatre virgule deux sur deux cents élèves qui reviennent.
       * Le second inspire davantage confiance à un parent.
       */
      case "followers": list.sort((a, b) =>
        ((b as any).teacherFollowers || 0) - ((a as any).teacherFollowers || 0)
      ); break;
      case "price_asc": list.sort((a, b) => (a.price || 0) - (b.price || 0)); break;
      case "price_desc": list.sort((a, b) => (b.price || 0) - (a.price || 0)); break;
      case "date_asc": list.sort((a, b) => parseSessionDate(a.dateTime) - parseSessionDate(b.dateTime)); break;
      case "date_desc": list.sort((a, b) => parseSessionDate(b.dateTime) - parseSessionDate(a.dateTime)); break;
      case "popular": list.sort((a, b) => (b.enrolledCount || 0) - (a.enrolledCount || 0)); break;
    }
    return list;
  }, [allClasses, search, subject, level, wilaya, teacher, minPrice, maxPrice, minRating, dateFrom, dateTo, sortBy, isRTL]);

  // Statistiques réelles calculées depuis les cours chargés
  const realStats = useMemo(() => {
    const teacherIds = new Set(allClasses.map(c => c.teacherId).filter(Boolean));
    const rated = allClasses.filter(c => (c.teacherRating || 0) > 0);
    const avg = rated.length
      ? Math.round((rated.reduce((s, c) => s + (c.teacherRating || 0), 0) / rated.length) * 10) / 10
      : 0;
    return { teachers: teacherIds.size, avgRating: avg };
  }, [allClasses]);

  const activeCount = [subject, level, wilaya, teacher, minPrice, maxPrice, dateFrom, dateTo].filter(Boolean).length + (minRating > 0 ? 1 : 0);

  function resetAll() {
    setSearch(""); setSubject(""); setLevel(""); setWilaya(""); setTeacher("");
    setMinPrice(""); setMaxPrice(""); setMinRating(0); setDateFrom(""); setDateTo("");
    setSortBy("rating");
  }

  const sortLabels: Record<SortKey, string> = {
    rating: isRTL ? "الأعلى تقييماً" : "Mieux notés",
    popular: isRTL ? "الأكثر شعبية" : "Plus populaires",
    followers: isRTL ? "الأكثر متابعة" : "Plus suivis",
    price_asc: isRTL ? "السعر ↑" : "Prix croissant",
    price_desc: isRTL ? "السعر ↓" : "Prix décroissant",
    date_asc: isRTL ? "الأقرب" : "Date proche",
    date_desc: isRTL ? "الأبعد" : "Date lointaine",
  };

  return (
    <div className="ostadi-page" dir={isRTL ? "rtl" : "ltr"}>

      {/* ═══ HERO ═══
          Les orbes locales ont disparu : l'Atmosphere du layout
          éclaire déjà toute la page. En superposer d'autres ici
          empilait deux couches de flou pour rien. */}
      <section className="ostadi-hero">
        <Sequence className="ostadi-hero-inner">
          <div className="ostadi-hero-badge">
            <Zap size={13} style={{ color: '#FF8C00' }} />
            {t.home.badge}
          </div>

          {/* ═══ LE TRAIT DE CRAIE ═══
              Une seule fois sur toute la page. Répété, il devient un
              motif décoratif et perd le sens qu'il porte : le geste
              de l'enseignant qui souligne un mot au tableau. */}
          <h1 className="ostadi-hero-title">
            <span className="ostadi-text-white">{t.home.title1} </span>
            <ChalkUnderline color="#FF8C00" delay={520}>
              <span className="os-gradient">أستاذي</span>
            </ChalkUnderline>
            <br />
            <span className="ostadi-text-white">{t.home.title2}</span>
          </h1>

          {/* ── BARRE DE RECHERCHE PRINCIPALE ── */}
          <div className="ostadi-search-main">
            <Search size={18} className="ostadi-search-icon" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isRTL ? "ابحث عن درس، مادة، أو أستاذ..." : "Rechercher un cours, une matière ou un professeur..."}
              className="ostadi-search-input-main"
            />
            {search && (
              <button onClick={() => setSearch("")} className="ostadi-search-clear">
                <X size={16} />
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`ostadi-filter-toggle ${activeCount > 0 ? 'ostadi-filter-toggle-active' : ''}`}
            >
              <SlidersHorizontal size={15} />
              <span className="ostadi-filter-toggle-label">{isRTL ? "فلاتر" : "Filtres"}</span>
              {activeCount > 0 && <span className="ostadi-filter-count">{activeCount}</span>}
            </button>
          </div>

          {/* ── PANNEAU DE FILTRES ── */}
          {showFilters && (
            <div className="ostadi-filters-panel">
              <div className="ostadi-filters-grid">
                {/* Matière */}
                <div className="ostadi-filter-field">
                  <label className="ostadi-filter-label"><BookOpen size={12} /> {isRTL ? "المادة" : "Matière"}</label>
                  <select value={subject} onChange={e => setSubject(e.target.value)} className="ostadi-filter-input">
                    <option value="">{isRTL ? "كل المواد" : "Toutes"}</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{trSubject(s, isRTL)}</option>)}
                  </select>
                </div>

                {/* Niveau */}
                <div className="ostadi-filter-field">
                  <label className="ostadi-filter-label"><TrendingUp size={12} /> {isRTL ? "المستوى" : "Niveau"}</label>
                  <select value={level} onChange={e => setLevel(e.target.value)} className="ostadi-filter-input">
                    <option value="">{isRTL ? "كل المستويات" : "Tous"}</option>
                    {LEVELS.map(l => <option key={l} value={l}>{trLevel(l, isRTL)}</option>)}
                  </select>
                </div>

                {/* Wilaya */}
                <div className="ostadi-filter-field">
                  <label className="ostadi-filter-label"><MapPin size={12} /> {isRTL ? "الولاية" : "Wilaya"}</label>
                  <select value={wilaya} onChange={e => setWilaya(e.target.value)} className="ostadi-filter-input">
                    <option value="">{isRTL ? "كل الولايات" : "Toutes"}</option>
                    {WILAYAS.map(w => <option key={w} value={w}>{trWilaya(w, isRTL)}</option>)}
                  </select>
                </div>

                {/* Professeur */}
                <div className="ostadi-filter-field">
                  <label className="ostadi-filter-label"><Users size={12} /> {isRTL ? "الأستاذ" : "Professeur"}</label>
                  <input
                    type="text" value={teacher} onChange={e => setTeacher(e.target.value)}
                    placeholder={isRTL ? "اسم الأستاذ" : "Nom du prof"}
                    className="ostadi-filter-input"
                  />
                </div>

                {/* Prix min/max */}
                <div className="ostadi-filter-field">
                  <label className="ostadi-filter-label"><Banknote size={12} /> {isRTL ? "السعر (دج)" : "Prix (DA)"}</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                      placeholder="Min" className="ostadi-filter-input" style={{ flex: 1 }}
                    />
                    <input
                      type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                      placeholder="Max" className="ostadi-filter-input" style={{ flex: 1 }}
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="ostadi-filter-field">
                  <label className="ostadi-filter-label"><Calendar size={12} /> {isRTL ? "التاريخ" : "Période"}</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="ostadi-filter-input" style={{ flex: 1 }} />
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="ostadi-filter-input" style={{ flex: 1 }} />
                  </div>
                </div>
              </div>

              {/* Étoiles minimum */}
              <div className="ostadi-filter-field" style={{ marginTop: '14px' }}>
                <label className="ostadi-filter-label"><Star size={12} /> {isRTL ? "التقييم الأدنى" : "Note minimum"}</label>
                <div className="ostadi-stars-row">
                  {[0, 3, 3.5, 4, 4.5].map(r => (
                    <button
                      key={r}
                      onClick={() => setMinRating(r)}
                      className={`ostadi-star-chip ${minRating === r ? 'ostadi-star-chip-active' : ''}`}
                    >
                      {r === 0 ? (isRTL ? "الكل" : "Toutes") : <>★ {r}+</>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset */}
              {activeCount > 0 && (
                <button onClick={resetAll} className="ostadi-reset-all">
                  <RotateCcw size={13} /> {isRTL ? "إعادة تعيين كل الفلاتر" : "Réinitialiser tous les filtres"}
                </button>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="ostadi-stats-row">
            {[
              { icon: <BookOpen size={15} />, value: `${allClasses.length}`, label: isRTL ? "درس متاح" : "Cours" },
              { icon: <Users size={15} />, value: `${realStats.teachers}`, label: t.home.stats.teachers },
              ...(realStats.avgRating > 0
                ? [{ icon: <Star size={15} />, value: `${realStats.avgRating}★`, label: t.home.stats.rating }]
                : []),
            ].map((s, i) => (
              <div key={i} className="ostadi-stat-pill">
                <span className="ostadi-stat-icon">{s.icon}</span>
                <span className="ostadi-stat-value">{s.value}</span>
                <span className="ostadi-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </Sequence>
      </section>

      {/* ═══ TOP TEACHERS ═══ */}
      <Reveal as="section" className="ostadi-section">
        <div className="ostadi-section-header">
          <div className="ostadi-section-icon-badge"><TrendingUp size={16} style={{ color: '#FF8C00' }} /></div>
          <h2 className="ostadi-section-title">{isRTL ? "أفضل الأساتذة" : "Meilleurs Professeurs"}</h2>
        </div>
        <TopTeachers />
      </Reveal>

      {/* ═══ RÉSULTATS ═══ */}
      <section className="ostadi-section">
        <div className="ostadi-results-header">
          <div>
            <h2 className="ostadi-section-title" style={{ margin: 0 }}>
              {filtered.length} {isRTL ? "درس" : filtered.length > 1 ? "cours trouvés" : "cours trouvé"}
            </h2>
            {(search || activeCount > 0) && (
              <p className="ostadi-results-sub">
                {isRTL ? "نتائج البحث المفلترة" : "Résultats filtrés"}
              </p>
            )}
          </div>

          {/* Tri */}
          <div className="ostadi-sort-wrap">
            <ArrowUpDown size={14} style={{ color: '#a78bfa' }} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} className="ostadi-sort-select">
              {(Object.keys(sortLabels) as SortKey[]).map(k => (
                <option key={k} value={k}>{sortLabels[k]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Chips des filtres actifs */}
        {activeCount > 0 && (
          <div className="ostadi-active-chips">
            {subject && <FilterChip label={trSubject(subject, isRTL)} onRemove={() => setSubject("")} />}
            {level && <FilterChip label={trLevel(level, isRTL)} onRemove={() => setLevel("")} />}
            {wilaya && <FilterChip label={trWilaya(wilaya, isRTL)} onRemove={() => setWilaya("")} />}
            {teacher && <FilterChip label={`👤 ${teacher}`} onRemove={() => setTeacher("")} />}
            {minPrice && <FilterChip label={`≥ ${minPrice} DA`} onRemove={() => setMinPrice("")} />}
            {maxPrice && <FilterChip label={`≤ ${maxPrice} DA`} onRemove={() => setMaxPrice("")} />}
            {minRating > 0 && <FilterChip label={`★ ${minRating}+`} onRemove={() => setMinRating(0)} />}
            {dateFrom && <FilterChip label={`Dès ${dateFrom}`} onRemove={() => setDateFrom("")} />}
            {dateTo && <FilterChip label={`Jusqu'au ${dateTo}`} onRemove={() => setDateTo("")} />}
          </div>
        )}

        {loading ? (
          /* Le squelette reprend la forme exacte d'une carte de cours :
             l'œil se prépare, et rien ne saute quand le vrai contenu
             arrive. */
          <ClasseGridSkeleton count={6} />
        ) : loadError ? (
          <EmptyState
            icon={<RotateCcw size={28} />}
            title={isRTL ? "تعذّر تحميل الدروس" : "Impossible de charger les cours"}
            hint={isRTL ? "تحقق من اتصالك بالإنترنت" : "Vérifiez votre connexion internet"}
            action={
              <button onClick={loadClasses} className="os-btn-chalk" style={{ padding: '11px 22px', display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13.5px' }}>
                <RotateCcw size={14} /> {isRTL ? "إعادة المحاولة" : "Réessayer"}
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search size={28} />}
            title={isRTL ? "لا توجد نتائج" : "Aucun cours ne correspond"}
            hint={isRTL ? "جرّب تعديل الفلاتر أو البحث" : "Essayez d'élargir vos critères de recherche"}
            action={
              (search || activeCount > 0) ? (
                <button onClick={resetAll} className="os-btn-ghost" style={{ padding: '11px 22px', display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13.5px' }}>
                  <RotateCcw size={14} /> {isRTL ? "إعادة تعيين" : "Réinitialiser"}
                </button>
              ) : undefined
            }
          />
        ) : (
          /* Cascade plafonnée à 8 : au-delà, l'utilisateur attend
             la fin de l'animation au lieu de lire. */
          <RevealGroup className="ostadi-classes-grid">
            {filtered.map(c => <ClasseCard key={c.id} classe={c} />)}
          </RevealGroup>
        )}
      </section>

      {/* ═══ CTA ═══ */}
      <Reveal as="section" direction="scale" className="ostadi-cta-section">
        <div className="ostadi-cta-glow" />
        <div className="ostadi-cta-inner">
          <h2 className="ostadi-cta-title">{t.home.ctaTitle}</h2>
          <p className="ostadi-cta-subtitle">
            {t.home.ctaSubtitle} <span className="ostadi-text-gradient" style={{ fontWeight: 800 }}>Ostadi</span>.
          </p>
          <Link href="/auth?mode=register&role=teacher" className="ostadi-cta-btn">{t.home.ctaBtn}</Link>
        </div>
      </Reveal>

      <style jsx global>{`
        .ostadi-page {
          background: #0A0014; min-height: 100vh;
          background-image:
            radial-gradient(circle at 15% 20%, rgba(124,58,237,0.1) 0%, transparent 45%),
            radial-gradient(circle at 85% 15%, rgba(255,140,0,0.06) 0%, transparent 45%),
            linear-gradient(rgba(168,85,247,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168,85,247,0.025) 1px, transparent 1px);
          background-size: auto, auto, 44px 44px, 44px 44px;
          overflow-x: hidden;
        }
        .ostadi-hero { position: relative; overflow: hidden; padding: 60px 16px 40px; }
        .ostadi-hero-inner { position: relative; max-width: 820px; margin: 0 auto; text-align: center; }
        .ostadi-hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(124,58,237,0.15); border: 1px solid rgba(168,85,247,0.3);
          border-radius: 999px; padding: 8px 18px; font-size: 13px; font-weight: 600;
          color: #d8b4fe; margin-bottom: 22px;
        }
        .ostadi-hero-title { font-size: 38px; font-weight: 900; line-height: 1.15; letter-spacing: -1.5px; margin: 0 0 26px; }
        @media (min-width: 640px) { .ostadi-hero-title { font-size: 48px; } }
        .ostadi-text-white { color: white; }
        .ostadi-text-gradient { background: linear-gradient(135deg, #FF8C00, #FFB347); -webkit-background-clip: text; background-clip: text; color: transparent; }

        /* ── Barre de recherche principale ── */
        .ostadi-search-main {
          display: flex; align-items: center; gap: 8px;
          background: linear-gradient(145deg, rgba(20,8,45,0.95), rgba(15,5,30,0.95));
          border: 1px solid rgba(124,58,237,0.35); border-radius: 16px;
          padding: 8px 8px 8px 16px; max-width: 700px; margin: 0 auto;
          box-shadow: 0 12px 40px rgba(124,58,237,0.15);
        }
        .ostadi-search-icon { color: #a78bfa; flex-shrink: 0; }
        .ostadi-search-input-main {
          flex: 1; background: transparent; border: none; outline: none;
          color: white; font-size: 14.5px; font-family: inherit; padding: 10px 0;
        }
        .ostadi-search-input-main::placeholder { color: #6d28d9; }
        .ostadi-search-clear {
          background: rgba(124,58,237,0.2); border: none; color: #a78bfa;
          width: 26px; height: 26px; border-radius: 8px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .ostadi-filter-toggle {
          display: flex; align-items: center; gap: 6px; flex-shrink: 0;
          background: rgba(124,58,237,0.2); border: 1px solid rgba(168,85,247,0.3);
          color: #c4b5fd; font-weight: 700; font-size: 13px;
          padding: 11px 16px; border-radius: 12px; cursor: pointer; transition: all 0.2s ease;
        }
        .ostadi-filter-toggle:hover { background: rgba(124,58,237,0.3); }
        .ostadi-filter-toggle-active { background: #FF8C00; border-color: #FF8C00; color: white; }
        .ostadi-filter-toggle-label { display: none; }
        @media (min-width: 560px) { .ostadi-filter-toggle-label { display: inline; } }
        .ostadi-filter-count {
          background: rgba(255,255,255,0.25); color: white; font-size: 10px; font-weight: 800;
          min-width: 18px; height: 18px; border-radius: 999px;
          display: flex; align-items: center; justify-content: center; padding: 0 5px;
        }

        /* ── Panneau filtres ── */
        .ostadi-filters-panel {
          background: linear-gradient(145deg, rgba(20,8,45,0.95), rgba(15,5,30,0.95));
          border: 1px solid rgba(124,58,237,0.3); border-radius: 16px;
          padding: 18px; max-width: 700px; margin: 12px auto 0; text-align: left;
          animation: slideDown 0.25s ease;
        }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .ostadi-filters-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
        @media (min-width: 560px) { .ostadi-filters-grid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 860px) { .ostadi-filters-grid { grid-template-columns: 1fr 1fr 1fr; } }
        .ostadi-filter-field { display: flex; flex-direction: column; gap: 6px; }
        .ostadi-filter-label {
          display: flex; align-items: center; gap: 5px;
          color: #a78bfa; font-size: 11.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.4px;
        }
        .ostadi-filter-input {
          width: 100%; background: rgba(26,10,60,0.7); border: 1px solid rgba(124,58,237,0.25);
          border-radius: 10px; padding: 9px 11px; font-size: 13px; color: white;
          outline: none; font-family: inherit; box-sizing: border-box; transition: border-color 0.2s ease;
        }
        .ostadi-filter-input:focus { border-color: rgba(255,140,0,0.5); }
        .ostadi-filter-input::placeholder { color: #6d28d9; }

        .ostadi-stars-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .ostadi-star-chip {
          background: rgba(26,10,60,0.7); border: 1px solid rgba(124,58,237,0.25);
          color: #a78bfa; font-size: 12px; font-weight: 600;
          padding: 7px 13px; border-radius: 9px; cursor: pointer; transition: all 0.2s ease;
        }
        .ostadi-star-chip-active { background: rgba(255,140,0,0.18); border-color: #FF8C00; color: #FF8C00; }

        .ostadi-reset-all {
          display: flex; align-items: center; gap: 6px; margin-top: 14px;
          background: transparent; border: 1px solid rgba(239,68,68,0.3);
          color: #f87171; font-size: 12px; font-weight: 600;
          padding: 8px 14px; border-radius: 9px; cursor: pointer; transition: all 0.2s ease;
        }
        .ostadi-reset-all:hover { background: rgba(239,68,68,0.1); }

        .ostadi-stats-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 28px; }
        .ostadi-stat-pill {
          display: flex; align-items: center; gap: 7px;
          background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.18);
          border-radius: 999px; padding: 8px 15px;
        }
        .ostadi-stat-icon { color: #FF8C00; display: flex; }
        .ostadi-stat-value { color: white; font-weight: 800; font-size: 13px; }
        .ostadi-stat-label { color: #a78bfa; font-size: 12px; }

        .ostadi-section { max-width: 1152px; margin: 0 auto; padding: 32px 16px; }
        .ostadi-section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .ostadi-section-icon-badge {
          width: 34px; height: 34px; border-radius: 10px;
          background: linear-gradient(135deg, rgba(255,140,0,0.2), rgba(255,140,0,0.05));
          display: flex; align-items: center; justify-content: center;
        }
        .ostadi-section-title { font-size: 20px; font-weight: 800; color: white; letter-spacing: -0.3px; }

        .ostadi-results-header {
          display: flex; align-items: flex-end; justify-content: space-between;
          gap: 16px; margin-bottom: 16px; flex-wrap: wrap;
        }
        .ostadi-results-sub { color: #8b7bb8; font-size: 12.5px; margin: 3px 0 0; }
        .ostadi-sort-wrap {
          display: flex; align-items: center; gap: 8px;
          background: rgba(20,8,45,0.8); border: 1px solid rgba(124,58,237,0.25);
          border-radius: 11px; padding: 8px 12px;
        }
        .ostadi-sort-select {
          background: transparent; border: none; outline: none;
          color: white; font-size: 12.5px; font-weight: 600; font-family: inherit; cursor: pointer;
        }
        .ostadi-sort-select option { background: #150A2E; }

        .ostadi-active-chips { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 18px; }
        .ostadi-chip {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,140,0,0.13); border: 1px solid rgba(255,140,0,0.3);
          color: #FF8C00; font-size: 12px; font-weight: 600;
          padding: 5px 10px; border-radius: 999px;
        }
        .ostadi-chip button {
          background: none; border: none; color: #FF8C00; cursor: pointer;
          display: flex; align-items: center; padding: 0;
        }

        .ostadi-classes-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 640px) { .ostadi-classes-grid { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1024px) { .ostadi-classes-grid { grid-template-columns: 1fr 1fr 1fr; } }

        .ostadi-skeleton-card {
          background: rgba(124,58,237,0.06); border: 1px solid rgba(124,58,237,0.12);
          border-radius: 16px; padding: 20px;
        }
        .ostadi-skeleton-line {
          background: linear-gradient(90deg, rgba(124,58,237,0.1) 25%, rgba(124,58,237,0.25) 50%, rgba(124,58,237,0.1) 75%);
          background-size: 200% 100%; border-radius: 6px; animation: shimmer 1.6s ease-in-out infinite;
        }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        .ostadi-empty-state { text-align: center; padding: 60px 20px; }
        .ostadi-empty-icon {
          width: 64px; height: 64px; border-radius: 18px; margin: 0 auto 16px;
          background: rgba(124,58,237,0.1); display: flex; align-items: center; justify-content: center; color: #7c3aed;
        }
        .ostadi-empty-title { color: #d8b4fe; font-weight: 700; font-size: 15.5px; margin-bottom: 6px; }
        .ostadi-empty-hint { color: #8b7bb8; font-size: 13.5px; }

        .ostadi-cta-section { position: relative; overflow: hidden; margin-top: 20px; border-top: 1px solid rgba(124,58,237,0.15); padding: 60px 16px; text-align: center; }
        .ostadi-cta-glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 500px; height: 300px; background: radial-gradient(ellipse, rgba(255,140,0,0.08), transparent 70%); pointer-events: none; }
        .ostadi-cta-inner { position: relative; max-width: 560px; margin: 0 auto; }
        .ostadi-cta-title { font-size: 28px; font-weight: 900; color: white; margin: 0 0 12px; }
        .ostadi-cta-subtitle { color: #a78bfa; font-size: 15px; margin-bottom: 28px; }
        .ostadi-cta-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #FF8C00, #FF6B00); color: white; font-weight: 800;
          padding: 15px 32px; border-radius: 14px; text-decoration: none; font-size: 15px;
          box-shadow: 0 10px 30px rgba(255,140,0,0.35); transition: all 0.25s ease;
        }
        .ostadi-cta-btn:hover { transform: translateY(-3px) scale(1.03); }
      `}</style>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="ostadi-chip">
      {label}
      <button onClick={onRemove}><X size={12} /></button>
    </span>
  );
}
