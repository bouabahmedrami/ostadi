export type UserRole = "teacher" | "student";

export interface UserProfile {
  uid: string;
  role: UserRole;
  displayName: string;
  phone: string;
  wilaya: string;
  photoURL?: string;
  bio?: string;
  subjects?: string[];
  createdAt: string;
  // Teacher-specific
  diploma?: string;              // Ex: "Licence en Mathématiques"
  university?: string;           // Ex: "USTHB Alger"
  yearsExperience?: number;      // Ex: 5
  diplomaVerified?: boolean;
  verificationStatus?: "none" | "pending" | "approved" | "rejected";
  subscriptionActive?: boolean;
  subscriptionExpiry?: string;
  rating?: number;
  ratingCount?: number;
  featured?: boolean;
  // Acceptation des CGU
  cguAccepted?: boolean;         // conditions acceptées à l'inscription
  cguAcceptedAt?: string;        // date ISO de l'acceptation
  cguVersion?: string;           // version acceptée, ex: "1.0"
  // Disponibilités — format ["sun-evening", "fri-morning", ...]
  availability?: string[];
  /** Compte suspendu suite à un signalement — réversible */
  suspended?: boolean;
  suspendedAt?: string | null;
  suspensionReason?: string | null;
  /** Nombre d'abonnés — dupliqué pour éviter un comptage à chaque visite */
  followerCount?: number;
}

export interface Classe {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherPhoto?: string;
  teacherRating?: number;
  title: string;
  subject: string;
  level: string;          // e.g. "3ème Moyenne", "Terminale S"
  dateTime: string;       // ISO string
  durationMinutes: number;
  price: number;          // DA
  priceType: "session" | "monthly";
  description: string;
  jitsiRoom: string;      // auto-generated room name
  /** Places disponibles — au-delà, la liste d'attente s'active */
  maxStudents?: number;
  enrolledCount: number;
  attendanceCount: number;
  wilaya: string;
  status: "scheduled" | "live" | "ended";
  whatsapp?: string;
  createdAt: string;
  archivedAt?: string;    // date d'archivage automatique (1h après fin du cours)
  /**
   * Cours mensuels uniquement — dates ISO des séances (8 max).
   * `dateTime` reste la PREMIÈRE séance, pour garder le tri
   * et l'affichage existants compatibles.
   */
  sessions?: string[];
  /** Nombre de vues — une par visiteur et par jour */
  viewCount?: number;
  /** Identifiant du cours d'origine, si celui-ci a été reconduit */
  duplicatedFrom?: string;
}

export interface Enrollment {
  id: string;
  classeId: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  addedByTeacher: boolean;
  attended: boolean;
  enrolledAt: string;
  /** Le professeur a-t-il encaissé cet élève ? */
  paid?: boolean;
  paidAt?: string | null;
  paidAmount?: number;
}

export interface Rating {
  id: string;
  classeId: string;
  teacherId: string;
  studentId: string;
  stars: number; // 1-5
  comment?: string;
  createdAt: string;
}

export const SUBJECTS = [
  "Mathématiques",
  "Physique-Chimie",
  "Sciences Naturelles",
  "Français",
  "Arabe",
  "Anglais",
  "Histoire-Géographie",
  "Philosophie",
  "Informatique",
  "Économie",
];

export const LEVELS = [
  // Primaire
  "1ère AP", "2ème AP", "3ème AP", "4ème AP", "5ème AP",
  // Collège
  "1ère Moyenne", "2ème Moyenne", "3ème Moyenne", "4ème Moyenne",
  // Lycée
  "1ère Secondaire", "2ème Secondaire", "Terminale",
];

export const WILAYAS = [
   "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna",
  "Béjaïa", "Biskra", "Béchar", "Blida", "Bouira",
  "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret", "Tizi Ouzou",
  "Alger", "Djelfa", "Jijel", "Sétif", "Saïda",
  "Skikda", "Sidi Bel Abbès", "Annaba", "Guelma", "Constantine",
  "Médéa", "Mostaganem", "M'Sila", "Mascara", "Ouargla",
  "Oran", "El Bayadh", "Illizi", "Bordj Bou Arréridj", "Boumerdès",
  "El Tarf", "Tindouf", "Tissemsilt", "El Oued", "Khenchela",
  "Souk Ahras", "Tipaza", "Mila", "Aïn Defla", "Naâma",
  "Aïn Témouchent", "Ghardaïa", "Relizane", "Timimoun", "Bordj Badji Mokhtar",
  "Ouled Djellal", "Béni Abbès", "In Salah", "In Guezzam", "Touggourt",
  "Djanet", "El M'Ghair", "El Meniaa",
];

export interface VerificationRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  diplomaURL: string;
  cinURL: string;
  demoVideoURL?: string;
  subjects: string[];
  bio: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface Subscription {
  id: string;
  teacherId: string;
  teacherName: string;
  plan: "monthly" | "yearly";
  amount: number; // DA
  status: "active" | "expired" | "pending";
  startDate: string;
  endDate: string;
  paymentMethod: "baridimob" | "cib" | "cash" | "chargily";
  paymentRef?: string;
  createdAt: string;
}

export interface AdminUser {
  uid: string;
  role: "admin";
  displayName: string;
  email: string;
}

export interface Message {
  id: string;
  classeId: string;
  /** UID du professeur et des élèves inscrits — base de la règle de lecture */
  participants?: string[];
  senderId: string;
  senderName: string;
  senderRole: "teacher" | "student";
  text: string;
  createdAt: string;
  read: boolean;
}

export interface ChatRoom {
  id: string; // = classeId
  classeTitle: string;
  teacherId: string;
  teacherName: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

export interface Recording {
  id: string;
  classeId: string;
  classeTitle: string;
  teacherId: string;
  url: string;
  duration: number; // seconds
  size: number; // bytes
  createdAt: string;
}

export interface LowBandwidthSettings {
  enabled: boolean;
  videoQuality: "off" | "low" | "medium";
  audioOnly: boolean;
}
export interface TeacherEarnings {
  monthlyStudents: number;
  monthlyRevenue: number;
  yearlyStudents: number;
  yearlyRevenue: number;
  totalStudents: number;
  totalRevenue: number;
  platformCommissionRate: number; // ex: 0.10 = 10%
  monthlyCommissionDue: number;
  yearlyCommissionDue: number;
}
export interface Notification {
  id: string;
  userId: string;           // destinataire
  /**
   * Catégorie — pilote l'icône et la couleur dans la cloche.
   *
   * "live" et "recording" ont été ajoutés après coup : les rappels de
   * cours et les dépôts de supports les utilisaient déjà sans qu'ils
   * figurent ici, ce que TypeScript signalait à juste titre.
   */
  type:
    | "message"
    | "course_starting"
    | "course_live"
    | "live"
    | "recording"
    | "rating"
    | "verification"
    | "subscription";
  title: string;
  body: string;
  /**
   * Versions arabes.
   *
   * Optionnelles : les notifications créées avant cette évolution
   * n'en ont pas. L'affichage se rabat alors sur le français plutôt
   * que de laisser un blanc.
   */
  titleAr?: string;
  bodyAr?: string;
  link?: string;             // ex: /classe/xxx ou /chat/xxx
  read: boolean;
  createdAt: string;
}
export interface EnrollmentRequest {
  id: string;
  classeId: string;
  classeTitle: string;
  teacherId: string;
  studentId: string;        // UID Firebase réel de l'élève
  studentName: string;
  studentPhone: string;
  message?: string;         // message optionnel de l'élève
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  reviewedAt?: string;
}