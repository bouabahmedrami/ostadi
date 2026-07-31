// ═══════════════════════════════════════════════════════════
// NOUVEAU FICHIER : lib/i18n/translate.ts
// Traduit matières, niveaux, wilayas et statuts en arabe
// ═══════════════════════════════════════════════════════════

// ── MATIÈRES ────────────────────────────────────────────────
const SUBJECTS_AR: Record<string, string> = {
  "Mathématiques": "الرياضيات",
  "Physique-Chimie": "الفيزياء والكيمياء",
  "Sciences Naturelles": "علوم الطبيعة والحياة",
  "Français": "اللغة الفرنسية",
  "Arabe": "اللغة العربية",
  "Anglais": "اللغة الإنجليزية",
  "Histoire-Géographie": "التاريخ والجغرافيا",
  "Philosophie": "الفلسفة",
  "Informatique": "الإعلام الآلي",
  "Économie": "الاقتصاد",
};

// ── NIVEAUX ─────────────────────────────────────────────────
const LEVELS_AR: Record<string, string> = {
  "1ère AP": "السنة الأولى ابتدائي",
  "2ème AP": "السنة الثانية ابتدائي",
  "3ème AP": "السنة الثالثة ابتدائي",
  "4ème AP": "السنة الرابعة ابتدائي",
  "5ème AP": "السنة الخامسة ابتدائي",
  "1ère Moyenne": "السنة الأولى متوسط",
  "2ème Moyenne": "السنة الثانية متوسط",
  "3ème Moyenne": "السنة الثالثة متوسط",
  "4ème Moyenne": "السنة الرابعة متوسط",
  "1ère Secondaire": "السنة الأولى ثانوي",
  "2ème Secondaire": "السنة الثانية ثانوي",
  "Terminale": "السنة الثالثة ثانوي",
};

// ── WILAYAS ─────────────────────────────────────────────────
const WILAYAS_AR: Record<string, string> = {
  "Adrar": "أدرار", "Chlef": "الشلف", "Laghouat": "الأغواط",
  "Oum El Bouaghi": "أم البواقي", "Batna": "باتنة", "Béjaïa": "بجاية",
  "Biskra": "بسكرة", "Béchar": "بشار", "Blida": "البليدة",
  "Bouira": "البويرة", "Tamanrasset": "تمنراست", "Tébessa": "تبسة",
  "Tlemcen": "تلمسان", "Tiaret": "تيارت", "Tizi Ouzou": "تيزي وزو",
  "Alger": "الجزائر", "Djelfa": "الجلفة", "Jijel": "جيجل",
  "Sétif": "سطيف", "Saïda": "سعيدة", "Skikda": "سكيكدة",
  "Sidi Bel Abbès": "سيدي بلعباس", "Annaba": "عنابة", "Guelma": "قالمة",
  "Constantine": "قسنطينة", "Médéa": "المدية", "Mostaganem": "مستغانم",
  "M'Sila": "المسيلة", "Mascara": "معسكر", "Ouargla": "ورقلة",
  "Oran": "وهران", "El Bayadh": "البيض", "Illizi": "إليزي",
  "Bordj Bou Arréridj": "برج بوعريريج", "Boumerdès": "بومرداس",
  "El Tarf": "الطارف", "Tindouf": "تندوف", "Tissemsilt": "تيسمسيلت",
  "El Oued": "الوادي", "Khenchela": "خنشلة", "Souk Ahras": "سوق أهراس",
  "Tipaza": "تيبازة", "Mila": "ميلة", "Aïn Defla": "عين الدفلى",
  "Naâma": "النعامة", "Aïn Témouchent": "عين تموشنت", "Ghardaïa": "غرداية",
  "Relizane": "غليزان", "Timimoun": "تيميمون",
  "Bordj Badji Mokhtar": "برج باجي مختار", "Ouled Djellal": "أولاد جلال",
  "Béni Abbès": "بني عباس", "In Salah": "عين صالح", "In Guezzam": "عين قزام",
  "Touggourt": "تقرت", "Djanet": "جانت", "El M'Ghair": "المغير",
  "El Meniaa": "المنيعة", "Autres": "أخرى",
};

// ── FONCTIONS DE TRADUCTION ─────────────────────────────────
export function trSubject(subject: string, isRTL: boolean): string {
  if (!isRTL) return subject;
  return SUBJECTS_AR[subject] || subject;
}

export function trLevel(level: string, isRTL: boolean): string {
  if (!isRTL) return level;
  return LEVELS_AR[level] || level;
}

export function trWilaya(wilaya: string, isRTL: boolean): string {
  if (!isRTL) return wilaya;
  return WILAYAS_AR[wilaya] || wilaya;
}

export function trStatus(status: string, isRTL: boolean): string {
  const map: Record<string, [string, string]> = {
    scheduled: ["Programmé", "مبرمج"],
    live: ["En direct", "مباشر"],
    ended: ["Terminé", "منتهي"],
  };
  const pair = map[status];
  if (!pair) return status;
  return isRTL ? pair[1] : pair[0];
}

export function trPriceType(type: string, isRTL: boolean): string {
  if (type === "session") return isRTL ? "حصة" : "séance";
  return isRTL ? "شهر" : "mois";
}

// ── Formatage date localisé ─────────────────────────────────
export function formatDateLocal(iso: string, isRTL: boolean, withTime = true): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short", day: "2-digit", month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  };
  return new Date(iso).toLocaleDateString(isRTL ? "ar-DZ" : "fr-DZ", opts);
}

// ── Formatage nombre (chiffres arabes optionnels) ────────────
export function formatNumber(n: number, isRTL: boolean): string {
  return n.toLocaleString(isRTL ? "ar-DZ" : "fr-DZ");
}
