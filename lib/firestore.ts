import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, setDoc, deleteDoc, writeBatch, limit,
  increment,
} from "firebase/firestore";
import { db } from "./firebase";
import { Classe, Enrollment, UserProfile, Rating } from "./types";

// ─── User Profiles ──────────────────────────────────────────────────
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function createUserProfile(uid: string, data: Omit<UserProfile, "uid">) {
  await setDoc(doc(db, "users", uid), { uid, ...data });
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  await updateDoc(doc(db, "users", uid), data);
}

// ─── Classes ────────────────────────────────────────────────────────
export async function getClasses(filters?: {
  subject?: string;
  level?: string;
  wilaya?: string;
  teacherId?: string;
}): Promise<Classe[]> {
  let q = query(collection(db, "classes"), orderBy("teacherRating", "desc"));

  if (filters?.teacherId) {
    q = query(collection(db, "classes"),
      where("teacherId", "==", filters.teacherId),
      orderBy("dateTime", "asc"));
  } else if (filters?.subject && filters?.level) {
    q = query(collection(db, "classes"),
      where("subject", "==", filters.subject),
      where("level", "==", filters.level),
      orderBy("teacherRating", "desc"));
  } else if (filters?.subject) {
    q = query(collection(db, "classes"),
      where("subject", "==", filters.subject),
      orderBy("teacherRating", "desc"));
  } else if (filters?.level) {
    q = query(collection(db, "classes"),
      where("level", "==", filters.level),
      orderBy("teacherRating", "desc"));
  } else if (filters?.wilaya) {
    q = query(collection(db, "classes"),
      where("wilaya", "==", filters.wilaya),
      orderBy("teacherRating", "desc"));
  }

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Classe));
}

export async function createClasse(data: Omit<Classe, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "classes"), {
    ...data,
    createdAt: new Date().toISOString(),
    enrolledCount: 0,
    attendanceCount: 0,
    status: "scheduled",
  });
  return ref.id;
}

export async function updateClasse(id: string, data: Partial<Classe>) {
  await updateDoc(doc(db, "classes", id), data);
}

export async function getClasseById(id: string): Promise<Classe | null> {
  const snap = await getDoc(doc(db, "classes", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Classe) : null;
}

// ─── Enrollments ────────────────────────────────────────────────────
export async function getEnrollmentsByClasse(classeId: string): Promise<Enrollment[]> {
  const q = query(collection(db, "enrollments"), where("classeId", "==", classeId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Enrollment));
}

export async function getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]> {
  const q = query(collection(db, "enrollments"), where("studentId", "==", studentId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Enrollment));
}

export async function enrollStudent(data: Omit<Enrollment, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "enrollments"), {
    ...data,
    attended: false,
    enrolledAt: new Date().toISOString(),
  });
  const classeRef = doc(db, "classes", data.classeId);
  const classeSnap = await getDoc(classeRef);
  if (classeSnap.exists()) {
    await updateDoc(classeRef, { enrolledCount: (classeSnap.data().enrolledCount || 0) + 1 });
  }
  return ref.id;
}

export async function markAttendance(enrollmentId: string, classeId: string) {
  await updateDoc(doc(db, "enrollments", enrollmentId), { attended: true });
  const classeRef = doc(db, "classes", classeId);
  const snap = await getDoc(classeRef);
  if (snap.exists()) {
    await updateDoc(classeRef, { attendanceCount: (snap.data().attendanceCount || 0) + 1 });
  }
}

// ─── Ratings ────────────────────────────────────────────────────────
export async function getRatingsByTeacher(teacherId: string): Promise<Rating[]> {
  const q = query(
    collection(db, "ratings"),
    where("teacherId", "==", teacherId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Rating));
}

export async function getRatingByStudentAndClasse(
  studentId: string,
  classeId: string
): Promise<Rating | null> {
  const q = query(
    collection(db, "ratings"),
    where("studentId", "==", studentId),
    where("classeId", "==", classeId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Rating;
}

export async function submitRating(data: Omit<Rating, "id">): Promise<void> {
  const batch = writeBatch(db);

  // Add rating doc
  const ratingRef = doc(collection(db, "ratings"));
  batch.set(ratingRef, { ...data, createdAt: new Date().toISOString() });

  // Recalculate teacher average
  const existingRatings = await getRatingsByTeacher(data.teacherId);
  const allStars = [...existingRatings.map(r => r.stars), data.stars];
  const avg = allStars.reduce((a, b) => a + b, 0) / allStars.length;
  const rounded = Math.round(avg * 10) / 10;

  // Update teacher profile
  batch.update(doc(db, "users", data.teacherId), {
    rating: rounded,
    ratingCount: allStars.length,
    featured: rounded >= 4.5 && allStars.length >= 3,
  });

  // Update all teacher's classes with new rating (for sorting)
  const classesSnap = await getDocs(
    query(collection(db, "classes"), where("teacherId", "==", data.teacherId))
  );
  classesSnap.docs.forEach(d => {
    batch.update(d.ref, { teacherRating: rounded });
  });

  await batch.commit();

  // Notify teacher of new rating
  await createNotification({
    userId: data.teacherId,
    type: "rating",
    title: "⭐ Nouvelle évaluation",
    body: `Vous avez reçu ${data.stars} étoile(s)${data.comment ? ` : "${data.comment.slice(0, 40)}"` : ""}`,
    link: `/professeur/${data.teacherId}`,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

// ─── Teacher Stats ────────────────────────────────────────────────────
export async function getTeacherStats(teacherId: string) {
  const [classes, ratings] = await Promise.all([
    getClasses({ teacherId }),
    getRatingsByTeacher(teacherId),
  ]);
  const totalStudents = classes.reduce((s, c) => s + (c.enrolledCount || 0), 0);
  const totalAttendance = classes.reduce((s, c) => s + (c.attendanceCount || 0), 0);
  const avgRating = ratings.length
    ? Math.round((ratings.reduce((s, r) => s + r.stars, 0) / ratings.length) * 10) / 10
    : 0;
  return {
    totalClasses: classes.length,
    totalStudents,
    totalAttendance,
    attendanceRate: totalStudents > 0 ? Math.round((totalAttendance / totalStudents) * 100) : 0,
    avgRating,
    ratingCount: ratings.length,
  };
}

// ─── Top Teachers ─────────────────────────────────────────────────────
export async function getTopTeachers(limitN = 10): Promise<UserProfile[]> {
  const q = query(
    collection(db, "users"),
    where("role", "==", "teacher"),
    orderBy("rating", "desc"),
    orderBy("ratingCount", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.slice(0, limitN).map(d => d.data() as UserProfile);
}

// ─── Helpers ────────────────────────────────────────────────────────
export function generateJitsiRoom(teacherName: string, title: string): string {
  const slug = `${teacherName}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
  const rand = Math.random().toString(36).slice(2, 7);
  return `ostadi-${slug}-${rand}`;
}

// ─── Verification ────────────────────────────────────────────────────
import { VerificationRequest } from "./types";

export async function submitVerification(data: Omit<VerificationRequest, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "verifications"), {
    ...data,
    status: "pending",
    submittedAt: new Date().toISOString(),
  });
  await updateDoc(doc(db, "users", data.teacherId), {
    verificationStatus: "pending",
  });
  return ref.id;
}

export async function getVerificationByTeacher(teacherId: string): Promise<VerificationRequest | null> {
  const q = query(
    collection(db, "verifications"),
    where("teacherId", "==", teacherId),
    orderBy("submittedAt", "desc")
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as VerificationRequest;
}

export async function getPublicTeacherProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists() || snap.data().role !== "teacher") return null;
  return snap.data() as UserProfile;
}

export async function getTeacherClasses(teacherId: string): Promise<Classe[]> {
  const q = query(
    collection(db, "classes"),
    where("teacherId", "==", teacherId),
    orderBy("dateTime", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Classe));
}

// ─── Subscriptions ───────────────────────────────────────────────────
import { Subscription } from "./types";

export async function getTeacherSubscription(teacherId: string): Promise<Subscription | null> {
  const q = query(
    collection(db, "subscriptions"),
    where("teacherId", "==", teacherId),
    where("status", "==", "active"),
    orderBy("endDate", "desc")
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Subscription;
}

export async function createSubscriptionRequest(data: Omit<Subscription, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "subscriptions"), {
    ...data,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function activateSubscription(subId: string, teacherId: string, endDate: string) {
  const batch = writeBatch(db);
  batch.update(doc(db, "subscriptions", subId), { status: "active" });
  batch.update(doc(db, "users", teacherId), {
    subscriptionActive: true,
    subscriptionExpiry: endDate,
    featured: true,
  });
  const classesSnap = await getDocs(
    query(collection(db, "classes"), where("teacherId", "==", teacherId))
  );
  classesSnap.docs.forEach(d => {
    batch.update(d.ref, { featured: true });
  });
  await batch.commit();

  // Notify teacher
  await createNotification({
    userId: teacherId,
    type: "subscription",
    title: "👑 Abonnement activé !",
    body: "Vous êtes maintenant Professeur Premium.",
    link: "/dashboard",
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export async function rejectSubscription(subId: string) {
  await updateDoc(doc(db, "subscriptions", subId), { status: "expired" });
}

// ─── Admin ───────────────────────────────────────────────────────────
export async function getAllVerifications() {
  const q = query(collection(db, "verifications"), orderBy("submittedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAllPendingSubscriptions() {
  const q = query(
    collection(db, "subscriptions"),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Subscription));
}

export async function approveVerification(verificationId: string, teacherId: string) {
  const batch = writeBatch(db);
  batch.update(doc(db, "verifications", verificationId), {
    status: "approved",
    reviewedAt: new Date().toISOString(),
  });
  batch.update(doc(db, "users", teacherId), {
    diplomaVerified: true,
    verificationStatus: "approved",
  });
  await batch.commit();

  // Notify teacher
  await createNotification({
    userId: teacherId,
    type: "verification",
    title: "✅ Profil vérifié !",
    body: "Votre compte est maintenant vérifié. Le badge apparaît sur votre profil.",
    link: "/dashboard",
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export async function rejectVerification(verificationId: string, teacherId: string, reason: string) {
  const batch = writeBatch(db);
  batch.update(doc(db, "verifications", verificationId), {
    status: "rejected",
    rejectionReason: reason,
    reviewedAt: new Date().toISOString(),
  });
  batch.update(doc(db, "users", teacherId), {
    verificationStatus: "rejected",
  });
  await batch.commit();
}

export async function getAllTeachers(): Promise<any[]> {
  const q = query(
    collection(db, "users"),
    where("role", "==", "teacher"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function getPlatformStats() {
  const [teachersSnap, studentsSnap, classesSnap, verificationsSnap, subsSnap] = await Promise.all([
    getDocs(query(collection(db, "users"), where("role", "==", "teacher"))),
    getDocs(query(collection(db, "users"), where("role", "==", "student"))),
    getDocs(collection(db, "classes")),
    getDocs(query(collection(db, "verifications"), where("status", "==", "pending"))),
    getDocs(query(collection(db, "subscriptions"), where("status", "==", "active"))),
  ]);
  return {
    totalTeachers: teachersSnap.size,
    totalStudents: studentsSnap.size,
    totalClasses: classesSnap.size,
    pendingVerifications: verificationsSnap.size,
    activeSubscriptions: subsSnap.size,
    monthlyRevenue: subsSnap.size * 2000,
  };
}

// ─── Chat / Messages ─────────────────────────────────────────────────
import { Message } from "./types";
import { onSnapshot } from "firebase/firestore";

export async function getUserChatRooms(userId: string, role: string): Promise<any[]> {
  let enrolledClasseIds: string[] = [];

  if (role === "student") {
    const enrSnap = await getDocs(
      query(collection(db, "enrollments"), where("studentId", "==", userId))
    );
    enrolledClasseIds = enrSnap.docs.map(d => d.data().classeId);
  } else {
    const classSnap = await getDocs(
      query(collection(db, "classes"), where("teacherId", "==", userId))
    );
    enrolledClasseIds = classSnap.docs.map(d => d.id);
  }

  if (enrolledClasseIds.length === 0) return [];

  const results = await Promise.all(
    enrolledClasseIds.map(async (id) => {
      const classeSnap = await getDoc(doc(db, "classes", id));
      if (!classeSnap.exists()) return null;
      const unread = await getUnreadCount(id, userId);
      return {
        classeId: id,
        ...classeSnap.data(),
        unreadCount: unread,
      };
    })
  );

  return results.filter(Boolean);
}

// ─── Recordings ──────────────────────────────────────────────────────
import { Recording } from "./types";

export async function addRecording(data: Omit<Recording, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "recordings"), {
    ...data,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function getRecordingsByClasse(classeId: string): Promise<Recording[]> {
  const q = query(
    collection(db, "recordings"),
    where("classeId", "==", classeId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Recording));
}

export async function getRecordingsByTeacher(teacherId: string): Promise<Recording[]> {
  const q = query(
    collection(db, "recordings"),
    where("teacherId", "==", teacherId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Recording));
}

export async function deleteRecording(id: string): Promise<void> {
  await deleteDoc(doc(db, "recordings", id));
}

// ─── Teacher Earnings ──────────────────────────────────────────────────
import { TeacherEarnings } from "./types";

export async function getTeacherEarnings(teacherId: string): Promise<TeacherEarnings> {
  const COMMISSION_RATE = 0.10; // 10% — modifiable

  const classesSnap = await getDocs(
    query(collection(db, "classes"), where("teacherId", "==", teacherId))
  );
  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let monthlyStudents = 0, monthlyRevenue = 0;
  let yearlyStudents = 0, yearlyRevenue = 0;
  let totalStudents = 0, totalRevenue = 0;

  for (const classe of classes) {
    const enrollSnap = await getDocs(
      query(collection(db, "enrollments"), where("classeId", "==", classe.id))
    );
    const enrollments = enrollSnap.docs.map(d => d.data()) as any[];

    for (const enr of enrollments) {
      const enrollDate = new Date(enr.enrolledAt);
      const price = classe.price || 0;

      totalStudents++;
      totalRevenue += price;

      if (enrollDate.getFullYear() === currentYear) {
        yearlyStudents++;
        yearlyRevenue += price;

        if (enrollDate.getMonth() === currentMonth) {
          monthlyStudents++;
          monthlyRevenue += price;
        }
      }
    }
  }

  return {
    monthlyStudents,
    monthlyRevenue,
    yearlyStudents,
    yearlyRevenue,
    totalStudents,
    totalRevenue,
    platformCommissionRate: COMMISSION_RATE,
    monthlyCommissionDue: Math.round(monthlyRevenue * COMMISSION_RATE),
    yearlyCommissionDue: Math.round(yearlyRevenue * COMMISSION_RATE),
  };
}

// ─── Notifications ───────────────────────────────────────────────────
import { Notification } from "./types";

export async function createNotification(data: Omit<Notification, "id">): Promise<void> {
  await addDoc(collection(db, "notifications"), {
    ...data,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export function subscribeToNotifications(
  userId: string,
  callback: (notifs: Notification[]) => void
) {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(30)
  );
  return onSnapshot(q, (snap) => {
    const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
    callback(notifs);
  });
}

export async function markNotificationRead(notifId: string): Promise<void> {
  await updateDoc(doc(db, "notifications", notifId), { read: true });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("read", "==", false)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { read: true }));
  await batch.commit();
}
import { EnrollmentRequest } from "./types";

// ── L'élève envoie une demande ───────────────────────────────
export async function createEnrollmentRequest(
  data: Omit<EnrollmentRequest, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "enrollmentRequests"), {
    ...data,
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  // Notifie le professeur
  await createNotification({
    userId: data.teacherId,
    type: "message",
    title: "📩 Nouvelle demande d'inscription",
    body: `${data.studentName} souhaite rejoindre "${data.classeTitle}"`,
    link: `/dashboard`,
    read: false,
    createdAt: new Date().toISOString(),
  });

  return ref.id;
}

// ── Vérifie si l'élève a déjà une demande en cours ───────────
export async function getMyRequestForClasse(
  studentId: string,
  classeId: string
): Promise<EnrollmentRequest | null> {
  const q = query(
    collection(db, "enrollmentRequests"),
    where("studentId", "==", studentId),
    where("classeId", "==", classeId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as EnrollmentRequest;
}

// ── Le prof récupère toutes ses demandes en attente ──────────
export async function getPendingRequestsForTeacher(
  teacherId: string
): Promise<EnrollmentRequest[]> {
  const q = query(
    collection(db, "enrollmentRequests"),
    where("teacherId", "==", teacherId),
    where("status", "==", "pending"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as EnrollmentRequest));
}

// ── Le prof ACCEPTE la demande → crée l'inscription ──────────
export async function acceptEnrollmentRequest(
  request: EnrollmentRequest
): Promise<void> {
  // 1. Marque la demande comme acceptée
  await updateDoc(doc(db, "enrollmentRequests", request.id), {
    status: "accepted",
    reviewedAt: new Date().toISOString(),
  });

  // 2. Crée l'inscription réelle (donne accès au cours)
  await addDoc(collection(db, "enrollments"), {
    classeId: request.classeId,
    studentId: request.studentId,     // UID réel → accès vidéo garanti
    studentName: request.studentName,
    studentPhone: request.studentPhone,
    addedByTeacher: true,
    attended: false,
    enrolledAt: new Date().toISOString(),
  });

  // 3. Incrémente le compteur du cours
  const classeRef = doc(db, "classes", request.classeId);
  const classeSnap = await getDoc(classeRef);
  if (classeSnap.exists()) {
    await updateDoc(classeRef, {
      enrolledCount: (classeSnap.data().enrolledCount || 0) + 1,
    });
  }

  // 3ter. Valide le parrainage — le bonus n'est versé qu'ici,
  // à la première inscription réelle du filleul.
  try {
    await completeReferral(request.studentId);
  } catch (err) {
    console.warn("Validation du parrainage échouée :", err);
  }

  // 3bis. Donne accès aux messages déjà échangés dans ce cours.
  // Sans ça, l'élève accepté ne verrait aucun message antérieur.
  try {
    await addParticipantToClasseMessages(request.classeId, request.studentId);
  } catch (err) {
    console.warn("Ajout aux messages existants échoué :", err);
  }

  // 4. Notifie l'élève
  await createNotification({
    userId: request.studentId,
    type: "message",
    title: "✅ Demande acceptée !",
    body: `Vous avez maintenant accès à "${request.classeTitle}"`,
    link: `/classe/${request.classeId}`,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

// ── Le prof REFUSE la demande ────────────────────────────────
export async function rejectEnrollmentRequest(
  request: EnrollmentRequest
): Promise<void> {
  await updateDoc(doc(db, "enrollmentRequests", request.id), {
    status: "rejected",
    reviewedAt: new Date().toISOString(),
  });

  await createNotification({
    userId: request.studentId,
    type: "message",
    title: "Demande non acceptée",
    body: `Votre demande pour "${request.classeTitle}" n'a pas été acceptée. Contactez le professeur pour plus d'informations.`,
    link: `/classe/${request.classeId}`,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════════
// GESTION DES COURS — modification, suppression, archivage
// ═══════════════════════════════════════════════════════════

// ── Le prof MODIFIE son cours → notifie tous les inscrits ────
export async function updateClasseWithNotification(
  classeId: string,
  updates: Partial<Classe>,
  originalClasse: Classe
): Promise<void> {
  await updateDoc(doc(db, "classes", classeId), updates);

  // Détecte précisément ce qui a changé
  const changes: string[] = [];
  if (updates.title && updates.title !== originalClasse.title) changes.push("le titre");
  if (updates.dateTime && updates.dateTime !== originalClasse.dateTime) changes.push("la date/heure");
  if (updates.price !== undefined && updates.price !== originalClasse.price) changes.push("le prix");
  if (updates.durationMinutes !== undefined && updates.durationMinutes !== originalClasse.durationMinutes) changes.push("la durée");
  if (updates.subject && updates.subject !== originalClasse.subject) changes.push("la matière");
  if (updates.level && updates.level !== originalClasse.level) changes.push("le niveau");
  if (updates.description && updates.description !== originalClasse.description) changes.push("la description");

  if (changes.length === 0) return;

  const changeText = changes.length === 1
    ? changes[0]
    : changes.slice(0, -1).join(", ") + " et " + changes[changes.length - 1];

  // Notifie tous les élèves inscrits
  const enrollments = await getEnrollmentsByClasse(classeId);
  for (const enr of enrollments) {
    await createNotification({
      userId: enr.studentId,
      type: "message",
      title: "📝 Cours modifié",
      body: `Le professeur a modifié ${changeText} du cours "${updates.title || originalClasse.title}"`,
      link: `/classe/${classeId}`,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
}

// ── Le prof SUPPRIME son cours → notifie puis nettoie ────────
export async function deleteClasseWithNotification(classe: Classe): Promise<void> {
  // 1. Notifie tous les inscrits AVANT suppression
  const enrollments = await getEnrollmentsByClasse(classe.id);
  for (const enr of enrollments) {
    await createNotification({
      userId: enr.studentId,
      type: "message",
      title: "❌ Cours annulé",
      body: `Le cours "${classe.title}" a été annulé par le professeur. Contactez-le pour plus d'informations.`,
      link: `/mes-cours`,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  const batch = writeBatch(db);

  // 2. Supprime les inscriptions liées
  for (const enr of enrollments) {
    batch.delete(doc(db, "enrollments", enr.id));
  }

  // 3. Supprime les demandes d'inscription liées
  const reqSnap = await getDocs(
    query(collection(db, "enrollmentRequests"), where("classeId", "==", classe.id))
  );
  reqSnap.docs.forEach(d => batch.delete(d.ref));

  // 4. Supprime le cours
  batch.delete(doc(db, "classes", classe.id));

  await batch.commit();
}

// ── AUTO-ARCHIVAGE : cours terminé depuis +1h ────────────────
export async function autoArchiveFinishedClasses(): Promise<number> {
  const now = new Date();
  const snap = await getDocs(collection(db, "classes"));
  const batch = writeBatch(db);
  let archived = 0;

  snap.docs.forEach(d => {
    const c = d.data() as Classe;
    if (c.status === "ended") return; // déjà terminé

    /**
     * ⚠️ Pour un cours MENSUEL, la fin est celle de la DERNIÈRE séance.
     *
     * L'ancienne version se basait toujours sur `dateTime`, c'est-à-dire
     * la première séance. Un abonnement de 8 séances étalées sur un mois
     * était donc archivé une heure après la première — l'élève payait
     * le mois complet et perdait l'accès dès la première semaine.
     */
    const sessions = (c as any).sessions as string[] | undefined;
    const lastDate =
      sessions && sessions.length > 0
        ? sessions[sessions.length - 1]
        : c.dateTime;

    const start = new Date(lastDate);
    const endTime = new Date(start.getTime() + (c.durationMinutes || 60) * 60000);
    const oneHourAfterEnd = new Date(endTime.getTime() + 60 * 60000);

    if (now > oneHourAfterEnd) {
      batch.update(d.ref, {
        status: "ended",
        archivedAt: now.toISOString(),
      });
      archived++;
    }
  });

  if (archived > 0) await batch.commit();
  return archived;
}

// ── HISTORIQUE de l'élève : cours passés + à venir ───────────
export async function getStudentCourseHistory(studentId: string) {
  const enrollments = await getEnrollmentsByStudent(studentId);
  const now = new Date();

  const results = await Promise.all(
    enrollments.map(async (enr) => {
      const classeSnap = await getDoc(doc(db, "classes", enr.classeId));
      if (!classeSnap.exists()) return null;
      const classe = { id: classeSnap.id, ...classeSnap.data() } as Classe;

      // A-t-il noté ce cours ?
      const ratingSnap = await getDocs(
        query(
          collection(db, "ratings"),
          where("classeId", "==", enr.classeId),
          where("studentId", "==", studentId)
        )
      );

      const start = new Date(classe.dateTime);
      const end = new Date(start.getTime() + (classe.durationMinutes || 60) * 60000);
      const isPast = now > end || classe.status === "ended";

      return {
        ...classe,
        enrollmentId: enr.id,
        attended: enr.attended,
        enrolledAt: enr.enrolledAt,
        hasRated: !ratingSnap.empty,
        myRating: ratingSnap.empty ? null : ratingSnap.docs[0].data().stars,
        isPast,
      };
    })
  );

  const all = results.filter(Boolean) as any[];
  return {
    upcoming: all.filter(c => !c.isPast).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()),
    past: all.filter(c => c.isPast).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()),
    totalSpent: all.reduce((sum, c) => sum + (c.price || 0), 0),
    totalAttended: all.filter(c => c.attended).length,
  };
}
// ═══════════════════════════════════════════════════════════
// AJOUTE ces fonctions à la fin de lib/firestore.ts
// ═══════════════════════════════════════════════════════════

// 🔐 Ton UID admin — doit correspondre à celui des firestore.rules
export const ADMIN_UID = "4bnssIV8FlS80SzaX6ylwc9Fbg92";

export function isAdminUser(uid?: string | null): boolean {
  return uid === ADMIN_UID;
}

// ── STATISTIQUES GLOBALES DE LA PLATEFORME ──────────────────
export async function getFullPlatformStats() {
  const [
    usersSnap, classesSnap, enrollmentsSnap,
    ratingsSnap, subsSnap, verifSnap, requestsSnap,
  ] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "classes")),
    getDocs(collection(db, "enrollments")),
    getDocs(collection(db, "ratings")),
    getDocs(collection(db, "subscriptions")),
    getDocs(collection(db, "verifications")),
    getDocs(collection(db, "enrollmentRequests")),
  ]);

  const users = usersSnap.docs.map(d => d.data());
  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
  const enrollments = enrollmentsSnap.docs.map(d => d.data()) as any[];
  const ratings = ratingsSnap.docs.map(d => d.data()) as any[];
  const subs = subsSnap.docs.map(d => d.data()) as any[];
  const verifs = verifSnap.docs.map(d => d.data()) as any[];
  const requests = requestsSnap.docs.map(d => d.data()) as any[];

  const teachers = users.filter(u => u.role === "teacher");
  const students = users.filter(u => u.role === "student");

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const COMMISSION_RATE = 0.10;

  // ── Revenus ────────────────────────────────────────
  // Map cours → prix pour calculer le CA généré
  const classPriceMap = new Map(classes.map(c => [c.id, c.price || 0]));

  let gmvTotal = 0, gmvMonth = 0, gmvYear = 0;
  let enrollMonth = 0, enrollYear = 0;

  enrollments.forEach(e => {
    const price = classPriceMap.get(e.classeId) || 0;
    gmvTotal += price;
    const d = new Date(e.enrolledAt);
    if (d.getFullYear() === thisYear) {
      gmvYear += price;
      enrollYear++;
      if (d.getMonth() === thisMonth) {
        gmvMonth += price;
        enrollMonth++;
      }
    }
  });

  // Abonnements actifs
  const activeSubs = subs.filter(s => s.status === "active");
  const pendingSubs = subs.filter(s => s.status === "pending");
  const subRevenueTotal = activeSubs.reduce((sum, s) => sum + (s.amount || 0), 0);
  const subRevenueMonth = activeSubs
    .filter(s => {
      const d = new Date(s.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  // Commission plateforme
  const commissionTotal = Math.round(gmvTotal * COMMISSION_RATE);
  const commissionMonth = Math.round(gmvMonth * COMMISSION_RATE);
  const commissionYear = Math.round(gmvYear * COMMISSION_RATE);

  // Revenu total Ostadi = abonnements + commissions
  const revenueTotal = subRevenueTotal + commissionTotal;
  const revenueMonth = subRevenueMonth + commissionMonth;

  // ── Croissance mensuelle (6 derniers mois) ──────────
  const monthlyGrowth: { month: string; teachers: number; students: number; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth(), y = d.getFullYear();
    const label = d.toLocaleDateString("fr-DZ", { month: "short" });

    const tCount = teachers.filter(u => {
      const c = new Date(u.createdAt);
      return c.getFullYear() < y || (c.getFullYear() === y && c.getMonth() <= m);
    }).length;

    const sCount = students.filter(u => {
      const c = new Date(u.createdAt);
      return c.getFullYear() < y || (c.getFullYear() === y && c.getMonth() <= m);
    }).length;

    const monthEnrollRevenue = enrollments
      .filter(e => {
        const ed = new Date(e.enrolledAt);
        return ed.getMonth() === m && ed.getFullYear() === y;
      })
      .reduce((sum, e) => sum + (classPriceMap.get(e.classeId) || 0), 0);

    monthlyGrowth.push({
      month: label,
      teachers: tCount,
      students: sCount,
      revenue: Math.round(monthEnrollRevenue * COMMISSION_RATE),
    });
  }

  // ── Top professeurs par revenu généré ───────────────
  const teacherRevenue = new Map<string, { name: string; revenue: number; students: number; rating: number }>();
  classes.forEach(c => {
    const enrolls = enrollments.filter(e => e.classeId === c.id);
    const rev = enrolls.length * (c.price || 0);
    const existing = teacherRevenue.get(c.teacherId);
    if (existing) {
      existing.revenue += rev;
      existing.students += enrolls.length;
    } else {
      teacherRevenue.set(c.teacherId, {
        name: c.teacherName || "—",
        revenue: rev,
        students: enrolls.length,
        rating: c.teacherRating || 0,
      });
    }
  });
  const topTeachers = Array.from(teacherRevenue.entries())
    .map(([uid, data]) => ({ uid, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // ── Répartition par wilaya ──────────────────────────
  const wilayaMap = new Map<string, number>();
  classes.forEach(c => {
    wilayaMap.set(c.wilaya, (wilayaMap.get(c.wilaya) || 0) + 1);
  });
  const byWilaya = Array.from(wilayaMap.entries())
    .map(([wilaya, count]) => ({ wilaya, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ── Répartition par matière ─────────────────────────
  const subjectMap = new Map<string, number>();
  classes.forEach(c => {
    subjectMap.set(c.subject, (subjectMap.get(c.subject) || 0) + 1);
  });
  const bySubject = Array.from(subjectMap.entries())
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count);

  const avgRating = ratings.length
    ? Math.round((ratings.reduce((s, r) => s + (r.stars || 0), 0) / ratings.length) * 10) / 10
    : 0;

  const attendanceCount = enrollments.filter(e => e.attended).length;

  return {
    // Utilisateurs
    totalUsers: users.length,
    totalTeachers: teachers.length,
    totalStudents: students.length,
    verifiedTeachers: teachers.filter(t => t.diplomaVerified).length,
    subscribedTeachers: teachers.filter(t => t.subscriptionActive).length,

    // Cours
    totalClasses: classes.length,
    liveClasses: classes.filter(c => c.status === "live").length,
    scheduledClasses: classes.filter(c => c.status === "scheduled").length,
    endedClasses: classes.filter(c => c.status === "ended").length,

    // Inscriptions
    totalEnrollments: enrollments.length,
    enrollMonth,
    enrollYear,
    attendanceCount,
    attendanceRate: enrollments.length ? Math.round((attendanceCount / enrollments.length) * 100) : 0,

    // Demandes
    pendingRequests: requests.filter(r => r.status === "pending").length,
    acceptedRequests: requests.filter(r => r.status === "accepted").length,

    // Revenus
    gmvTotal, gmvMonth, gmvYear,
    commissionTotal, commissionMonth, commissionYear,
    subRevenueTotal, subRevenueMonth,
    revenueTotal, revenueMonth,

    // Modération
    pendingVerifications: verifs.filter(v => v.status === "pending").length,
    approvedVerifications: verifs.filter(v => v.status === "approved").length,
    pendingSubscriptions: pendingSubs.length,
    activeSubscriptions: activeSubs.length,

    // Qualité
    totalRatings: ratings.length,
    avgRating,

    // Analyses
    monthlyGrowth,
    topTeachers,
    byWilaya,
    bySubject,
  };
}

// ── Liste complète des utilisateurs (admin only) ────────────
export async function getAllUsersForAdmin() {
  const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
  return snap.docs.map(d => ({ uid: d.id, ...d.data() })) as any[];
}


// ═══════════════════════════════════════════════════════════
// SYNCHRONISATION DES INFOS PROFESSEUR
// ═══════════════════════════════════════════════════════════

/**
 * Propage la photo et le nom du professeur sur tous ses cours.
 *
 * Le champ `teacherPhoto` est dupliqué dans chaque document `classes`
 * pour éviter une lecture Firestore supplémentaire à chaque affichage
 * de carte. Sans cette synchronisation, un professeur qui change sa
 * photo garde l'ancienne sur tous ses cours déjà créés.
 */
export async function syncTeacherInfoToClasses(
  teacherId: string,
  info: { photoURL?: string; displayName?: string }
): Promise<number> {
  const snap = await getDocs(
    query(collection(db, "classes"), where("teacherId", "==", teacherId))
  );
  if (snap.empty) return 0;

  const updates: Record<string, any> = {};
  if (info.photoURL !== undefined) updates.teacherPhoto = info.photoURL;
  if (info.displayName !== undefined) updates.teacherName = info.displayName;
  if (Object.keys(updates).length === 0) return 0;

  // Firestore limite un batch à 500 opérations
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(db);
    docs.slice(i, i + 450).forEach(d => batch.update(d.ref, updates));
    await batch.commit();
  }

  return docs.length;
}

/**
 * Met à jour le profil d'un professeur et propage aux cours si besoin.
 * À utiliser à la place de updateUserProfile pour les comptes enseignants.
 */
export async function updateTeacherProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  await updateUserProfile(uid, data);

  if (data.photoURL !== undefined || data.displayName !== undefined) {
    try {
      await syncTeacherInfoToClasses(uid, {
        photoURL: data.photoURL,
        displayName: data.displayName,
      });
    } catch (err) {
      // Non bloquant : le profil est enregistré même si la propagation échoue
      console.warn("Propagation aux cours échouée :", err);
    }
  }
}


// ═══════════════════════════════════════════════════════════
// SUIVI DES COMMISSIONS PROFESSEURS
// ═══════════════════════════════════════════════════════════

/** Taux de commission de la plateforme */
export const PLATFORM_COMMISSION_RATE = 0.10;

/** Seuils d'alerte, en jours depuis le dernier règlement */
export const OVERDUE_DAYS = 33;   // rouge
export const WARNING_DAYS = 25;   // orange

export type PaymentStatus = "ok" | "warning" | "overdue" | "none";

export interface TeacherCommission {
  teacherId: string;
  teacherName: string;
  phone: string;
  wilaya: string;
  /** Chiffre d'affaires généré sur la plateforme */
  totalRevenue: number;
  /** Commission totale due depuis le début */
  totalCommission: number;
  /** Somme déjà réglée */
  totalPaid: number;
  /** Reste à payer */
  balance: number;
  /** CA du mois en cours */
  monthRevenue: number;
  /** Commission du mois en cours */
  monthCommission: number;
  /** Date du dernier règlement (ISO), null si jamais payé */
  lastPaymentAt: string | null;
  lastPaymentAmount: number;
  /** Jours écoulés depuis le dernier règlement */
  daysSincePayment: number | null;
  status: PaymentStatus;
  studentsCount: number;
  classesCount: number;
}

/**
 * Calcule la situation de commission de chaque professeur.
 *
 * Le solde est la différence entre ce qui est dû (10 % du CA généré)
 * et ce qui a été réglé. Le statut dépend du temps écoulé depuis le
 * dernier versement — pas du montant : un professeur qui doit peu mais
 * n'a rien payé depuis 40 jours reste en retard.
 */
export async function getTeachersCommissionStatus(): Promise<TeacherCommission[]> {
  const [usersSnap, classesSnap, enrollSnap, paymentsSnap] = await Promise.all([
    getDocs(query(collection(db, "users"), where("role", "==", "teacher"))),
    getDocs(collection(db, "classes")),
    getDocs(collection(db, "enrollments")),
    getDocs(collection(db, "commissionPayments")),
  ]);

  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const enrollments = enrollSnap.docs.map(d => d.data() as any);
  const payments = paymentsSnap.docs.map(d => d.data() as any);

  // Cours → prix et professeur
  const classMap = new Map<string, { price: number; teacherId: string }>();
  classes.forEach(c =>
    classMap.set(c.id, { price: c.price || 0, teacherId: c.teacherId })
  );

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  // CA par professeur
  const revenueByTeacher = new Map<string, number>();
  const monthRevenueByTeacher = new Map<string, number>();
  const studentsByTeacher = new Map<string, Set<string>>();

  enrollments.forEach(e => {
    const info = classMap.get(e.classeId);
    if (!info) return;

    revenueByTeacher.set(
      info.teacherId,
      (revenueByTeacher.get(info.teacherId) || 0) + info.price
    );

    const d = new Date(e.enrolledAt);
    if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
      monthRevenueByTeacher.set(
        info.teacherId,
        (monthRevenueByTeacher.get(info.teacherId) || 0) + info.price
      );
    }

    if (!studentsByTeacher.has(info.teacherId)) {
      studentsByTeacher.set(info.teacherId, new Set());
    }
    studentsByTeacher.get(info.teacherId)!.add(e.studentId);
  });

  // Règlements par professeur
  const paidByTeacher = new Map<string, number>();
  const lastPaymentByTeacher = new Map<string, { at: string; amount: number }>();

  payments.forEach(p => {
    paidByTeacher.set(p.teacherId, (paidByTeacher.get(p.teacherId) || 0) + (p.amount || 0));

    const prev = lastPaymentByTeacher.get(p.teacherId);
    if (!prev || new Date(p.paidAt) > new Date(prev.at)) {
      lastPaymentByTeacher.set(p.teacherId, { at: p.paidAt, amount: p.amount || 0 });
    }
  });

  const classCountByTeacher = new Map<string, number>();
  classes.forEach(c =>
    classCountByTeacher.set(c.teacherId, (classCountByTeacher.get(c.teacherId) || 0) + 1)
  );

  return usersSnap.docs.map(doc => {
    const u = doc.data() as any;
    const id = doc.id;

    const totalRevenue = revenueByTeacher.get(id) || 0;
    const totalCommission = Math.round(totalRevenue * PLATFORM_COMMISSION_RATE);
    const totalPaid = paidByTeacher.get(id) || 0;
    const balance = totalCommission - totalPaid;

    const monthRevenue = monthRevenueByTeacher.get(id) || 0;
    const last = lastPaymentByTeacher.get(id) || null;

    let daysSince: number | null = null;
    if (last) {
      daysSince = Math.floor(
        (now.getTime() - new Date(last.at).getTime()) / 86_400_000
      );
    } else if (totalCommission > 0) {
      // Jamais payé : on compte depuis la création du compte
      daysSince = Math.floor(
        (now.getTime() - new Date(u.createdAt || now).getTime()) / 86_400_000
      );
    }

    let status: PaymentStatus = "none";
    if (balance <= 0) {
      status = "ok";
    } else if (daysSince === null) {
      status = "none";
    } else if (daysSince >= OVERDUE_DAYS) {
      status = "overdue";
    } else if (daysSince >= WARNING_DAYS) {
      status = "warning";
    } else {
      status = "ok";
    }

    return {
      teacherId: id,
      teacherName: u.displayName || "—",
      phone: u.phone || "—",
      wilaya: u.wilaya || "—",
      totalRevenue,
      totalCommission,
      totalPaid,
      balance,
      monthRevenue,
      monthCommission: Math.round(monthRevenue * PLATFORM_COMMISSION_RATE),
      lastPaymentAt: last?.at || null,
      lastPaymentAmount: last?.amount || 0,
      daysSincePayment: daysSince,
      status,
      studentsCount: studentsByTeacher.get(id)?.size || 0,
      classesCount: classCountByTeacher.get(id) || 0,
    };
  }).sort((a, b) => {
    // Les retards d'abord, puis par solde décroissant
    const order: Record<PaymentStatus, number> = { overdue: 0, warning: 1, none: 2, ok: 3 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return b.balance - a.balance;
  });
}

/** Enregistre un règlement de commission */
export async function recordCommissionPayment(data: {
  teacherId: string;
  teacherName: string;
  amount: number;
  method: string;
  reference?: string;
  note?: string;
  recordedBy: string;
}): Promise<string> {
  const now = new Date();
  const ref = await addDoc(collection(db, "commissionPayments"), {
    ...data,
    reference: data.reference || "",
    note: data.note || "",
    period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    paidAt: now.toISOString(),
    createdAt: now.toISOString(),
  });

  // Notifie le professeur pour qu'il ait une trace de son côté
  try {
    await addDoc(collection(db, "notifications"), {
      userId: data.teacherId,
      type: "subscription",
      title: "💰 Paiement enregistré",
      body: `Votre règlement de ${data.amount.toLocaleString()} DA a bien été enregistré.`,
      link: "/revenus",
      read: false,
      createdAt: now.toISOString(),
    });
  } catch {
    // Non bloquant
  }

  return ref.id;
}

/** Historique des règlements d'un professeur */
export async function getTeacherPayments(teacherId: string) {
  const snap = await getDocs(
    query(
      collection(db, "commissionPayments"),
      where("teacherId", "==", teacherId),
      orderBy("paidAt", "desc")
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
}

/**
 * Bilan détaillé d'un professeur sur une période.
 * `period` : "month" pour le mois en cours, "year" pour l'année, "all" pour tout.
 */
export async function getTeacherBilan(
  teacherId: string,
  period: "month" | "year" | "all" = "month"
) {
  const [classesSnap, enrollSnap, paymentsSnap] = await Promise.all([
    getDocs(query(collection(db, "classes"), where("teacherId", "==", teacherId))),
    getDocs(collection(db, "enrollments")),
    getDocs(query(collection(db, "commissionPayments"), where("teacherId", "==", teacherId))),
  ]);

  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const classIds = new Set(classes.map(c => c.id));
  const classMap = new Map(classes.map(c => [c.id, c]));

  const now = new Date();
  const inPeriod = (iso: string) => {
    if (period === "all") return true;
    const d = new Date(iso);
    if (period === "year") return d.getFullYear() === now.getFullYear();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };

  const enrollments = enrollSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as any))
    .filter(e => classIds.has(e.classeId) && inPeriod(e.enrolledAt));

  const lines = enrollments.map(e => {
    const c = classMap.get(e.classeId);
    return {
      date: e.enrolledAt,
      classeTitle: c?.title || "—",
      subject: c?.subject || "—",
      level: c?.level || "—",
      studentName: e.studentName || "—",
      studentPhone: e.studentPhone || "—",
      price: c?.price || 0,
      attended: !!e.attended,
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const grossRevenue = lines.reduce((s, l) => s + l.price, 0);
  const commission = Math.round(grossRevenue * PLATFORM_COMMISSION_RATE);

  const payments = paymentsSnap.docs
    .map(d => d.data() as any)
    .filter(p => inPeriod(p.paidAt))
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

  const paid = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return {
    period,
    lines,
    payments,
    grossRevenue,
    commission,
    netRevenue: grossRevenue - commission,
    paid,
    balance: commission - paid,
    studentsCount: new Set(enrollments.map(e => e.studentId)).size,
    classesCount: classes.length,
    attendedCount: lines.filter(l => l.attended).length,
  };
}


// ═══════════════════════════════════════════════════════════
// RAPPELS DE PAIEMENT
// ═══════════════════════════════════════════════════════════

/**
 * Envoie un rappel de paiement à un professeur.
 *
 * Volontairement déclenché par l'admin plutôt qu'automatiquement :
 * un rappel envoyé par erreur à un professeur qui vient de payer
 * abîme la relation. Tu gardes la main sur qui reçoit quoi.
 */
export async function sendPaymentReminder(data: {
  teacherId: string;
  teacherName: string;
  balance: number;
  daysSince: number | null;
  isOverdue: boolean;
}): Promise<void> {
  const now = new Date().toISOString();

  const title = data.isOverdue
    ? "⚠️ Commission en retard"
    : "💰 Rappel de commission";

  const body = data.isOverdue
    ? `Votre commission de ${data.balance.toLocaleString()} DA est en attente depuis ${data.daysSince} jours. Merci de régulariser rapidement.`
    : `Vous avez ${data.balance.toLocaleString()} DA de commission à régler. Consultez votre bilan dans l'onglet Revenus.`;

  await addDoc(collection(db, "notifications"), {
    userId: data.teacherId,
    type: "subscription",
    title,
    body,
    link: "/dashboard",
    read: false,
    createdAt: now,
  });

  // Trace du rappel : évite d'en envoyer plusieurs le même jour
  await addDoc(collection(db, "paymentReminders"), {
    teacherId: data.teacherId,
    teacherName: data.teacherName,
    balance: data.balance,
    daysSince: data.daysSince,
    isOverdue: data.isOverdue,
    sentAt: now,
  });
}

/**
 * Envoie un rappel à tous les professeurs concernés.
 * Ignore ceux déjà relancés dans les 7 derniers jours.
 */
export async function sendBulkReminders(
  teachers: { teacherId: string; teacherName: string; balance: number; daysSincePayment: number | null; status: string }[]
): Promise<{ sent: number; skipped: number }> {
  // Rappels récents, pour ne pas harceler
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const recentSnap = await getDocs(collection(db, "paymentReminders"));
  const recentIds = new Set(
    recentSnap.docs
      .map(d => d.data())
      .filter((r: any) => r.sentAt > weekAgo)
      .map((r: any) => r.teacherId)
  );

  let sent = 0;
  let skipped = 0;

  for (const t of teachers) {
    if (t.balance <= 0) { skipped++; continue; }
    if (recentIds.has(t.teacherId)) { skipped++; continue; }

    try {
      await sendPaymentReminder({
        teacherId: t.teacherId,
        teacherName: t.teacherName,
        balance: t.balance,
        daysSince: t.daysSincePayment,
        isOverdue: t.status === "overdue",
      });
      sent++;
    } catch (err) {
      console.error(`Rappel échoué pour ${t.teacherName} :`, err);
      skipped++;
    }
  }

  return { sent, skipped };
}

/** Date du dernier rappel envoyé à un professeur */
export async function getLastReminder(teacherId: string): Promise<string | null> {
  const snap = await getDocs(
    query(
      collection(db, "paymentReminders"),
      where("teacherId", "==", teacherId),
      orderBy("sentAt", "desc"),
      limit(1)
    )
  );
  return snap.empty ? null : (snap.docs[0].data() as any).sentAt;
}


// ═══════════════════════════════════════════════════════════
// RAPPELS · PAIEMENTS ÉLÈVES · SUPPORTS DE COURS
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// 1. RAPPELS AVANT LE COURS
// ═══════════════════════════════════════════════════════════

/**
 * Crée les rappels pour les cours à venir d'un utilisateur.
 *
 * Appelé au chargement de l'application. Sans Cloud Function planifiée
 * (qui exigerait le plan Blaze), c'est le passage de l'utilisateur qui
 * déclenche la vérification. Un élève qui ouvre l'app le matin reçoit
 * son rappel pour le cours du soir.
 *
 * Deux fenêtres : 24 h avant, puis 1 h avant.
 * Le champ `remindersSent` sur l'inscription évite les doublons.
 */
export async function checkAndCreateReminders(userId: string, role: string): Promise<number> {
  const now = Date.now();
  const in24h = now + 24 * 3600_000;
  const in1h = now + 3600_000;

  // Cours concernés selon le rôle
  let classeIds: string[] = [];
  let enrollDocs: { id: string; data: any }[] = [];

  if (role === "teacher") {
    const snap = await getDocs(
      query(collection(db, "classes"), where("teacherId", "==", userId))
    );
    classeIds = snap.docs.map(d => d.id);
  } else {
    const snap = await getDocs(
      query(collection(db, "enrollments"), where("studentId", "==", userId))
    );
    enrollDocs = snap.docs.map(d => ({ id: d.id, data: d.data() }));
    classeIds = [...new Set(enrollDocs.map(e => e.data.classeId as string))];
  }

  if (classeIds.length === 0) return 0;

  let created = 0;

  for (const classeId of classeIds) {
    const cSnap = await getDoc(doc(db, "classes", classeId));
    if (!cSnap.exists()) continue;

    const c = cSnap.data() as any;
    if (c.status === "ended") continue;

    // Cours mensuel : chaque séance a son rappel
    const dates: string[] =
      Array.isArray(c.sessions) && c.sessions.length > 0
        ? c.sessions
        : [c.dateTime];

    for (const iso of dates) {
      const startMs = new Date(iso).getTime();
      if (Number.isNaN(startMs) || startMs < now) continue;

      // Quelle fenêtre ?
      let kind: "24h" | "1h" | null = null;
      if (startMs <= in1h) kind = "1h";
      else if (startMs <= in24h) kind = "24h";
      if (!kind) continue;

      // Déjà envoyé ?
      const markerId = `${userId}_${classeId}_${iso}_${kind}`;
      const marker = await getDoc(doc(db, "reminderMarkers", markerId));
      if (marker.exists()) continue;

      const when = new Date(iso).toLocaleString("fr-DZ", {
        weekday: "long", day: "2-digit", month: "long",
        hour: "2-digit", minute: "2-digit",
      });

      await addDoc(collection(db, "notifications"), {
        userId,
        type: "live",
        title: kind === "1h" ? "⏰ Votre cours commence bientôt" : "📅 Cours demain",
        body: kind === "1h"
          ? `« ${c.title} » démarre dans moins d'une heure. La salle ouvre 15 min avant.`
          : `« ${c.title} » aura lieu ${when}.`,
        link: `/classe/${classeId}`,
        read: false,
        createdAt: new Date().toISOString(),
      });

      // Marqueur anti-doublon
      await setDoc(doc(db, "reminderMarkers", markerId), {
        userId, classeId, sessionDate: iso, kind,
        createdAt: new Date().toISOString(),
      });

      created++;
    }
  }

  return created;
}


// ═══════════════════════════════════════════════════════════
// 2. SUIVI DES PAIEMENTS ÉLÈVE PAR ÉLÈVE
// ═══════════════════════════════════════════════════════════

/**
 * Marque une inscription comme payée ou non.
 *
 * Le professeur encaisse directement de l'élève, hors plateforme.
 * Sans ce suivi, il tient son tableau sur papier — et ta commission
 * se calcule sur des inscriptions parfois jamais réglées.
 */
export async function setEnrollmentPaid(
  enrollmentId: string,
  paid: boolean,
  amount?: number
): Promise<void> {
  const data: any = {
    paid,
    paidAt: paid ? new Date().toISOString() : null,
  };
  if (paid && amount !== undefined) data.paidAmount = amount;

  await updateDoc(doc(db, "enrollments", enrollmentId), data);
}

/** Inscriptions d'un cours, avec l'état de paiement */
export async function getClasseEnrollmentsWithPayment(classeId: string) {
  const snap = await getDocs(
    query(collection(db, "enrollments"), where("classeId", "==", classeId))
  );
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as any))
    .sort((a, b) => (a.studentName || "").localeCompare(b.studentName || ""));
}

/** Récapitulatif des encaissements d'un professeur */
export async function getTeacherPaymentSummary(teacherId: string) {
  const [classesSnap, enrollSnap] = await Promise.all([
    getDocs(query(collection(db, "classes"), where("teacherId", "==", teacherId))),
    getDocs(collection(db, "enrollments")),
  ]);

  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const classIds = new Set(classes.map(c => c.id));
  const priceMap = new Map(classes.map(c => [c.id, c.price || 0]));

  const enrollments = enrollSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as any))
    .filter(e => classIds.has(e.classeId));

  const paid = enrollments.filter(e => e.paid);
  const unpaid = enrollments.filter(e => !e.paid);

  const collected = paid.reduce(
    (s, e) => s + (e.paidAmount ?? priceMap.get(e.classeId) ?? 0),
    0
  );
  const pending = unpaid.reduce((s, e) => s + (priceMap.get(e.classeId) || 0), 0);

  return {
    totalEnrollments: enrollments.length,
    paidCount: paid.length,
    unpaidCount: unpaid.length,
    collected,
    pending,
    // La commission ne porte que sur les sommes réellement encaissées
    commissionDue: Math.round(collected * 0.10),
  };
}


// ═══════════════════════════════════════════════════════════
// 3. SUPPORTS DE COURS
// ═══════════════════════════════════════════════════════════

export interface CourseMaterial {
  id: string;
  classeId: string;
  teacherId: string;
  title: string;
  description?: string;
  fileURL: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  /** Numéro de séance concernée, pour les cours mensuels */
  sessionIndex?: number;
  createdAt: string;
}

/** Ajoute un support à un cours et prévient les élèves inscrits */
export async function addCourseMaterial(
  data: Omit<CourseMaterial, "id" | "createdAt">
): Promise<string> {
  const now = new Date().toISOString();

  const ref = await addDoc(collection(db, "materials"), {
    ...data,
    createdAt: now,
  });

  // Notification aux inscrits
  try {
    const [classeSnap, enrollSnap] = await Promise.all([
      getDoc(doc(db, "classes", data.classeId)),
      getDocs(query(collection(db, "enrollments"), where("classeId", "==", data.classeId))),
    ]);

    const title = classeSnap.exists() ? (classeSnap.data() as any).title : "votre cours";

    const batch = writeBatch(db);
    enrollSnap.docs.forEach(e => {
      const studentId = (e.data() as any).studentId;
      if (!studentId) return;
      batch.set(doc(collection(db, "notifications")), {
        userId: studentId,
        type: "recording",
        title: "📎 Nouveau support disponible",
        body: `« ${data.title} » a été ajouté au cours « ${title} ».`,
        link: `/classe/${data.classeId}`,
        read: false,
        createdAt: now,
      });
    });
    await batch.commit();
  } catch (err) {
    console.warn("Notification des supports échouée :", err);
  }

  return ref.id;
}

/** Supports d'un cours, du plus récent au plus ancien */
export async function getCourseMaterials(classeId: string): Promise<CourseMaterial[]> {
  const snap = await getDocs(
    query(
      collection(db, "materials"),
      where("classeId", "==", classeId),
      orderBy("createdAt", "desc")
    )
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CourseMaterial));
}

/** Supprime un support */
export async function deleteCourseMaterial(materialId: string): Promise<void> {
  await deleteDoc(doc(db, "materials", materialId));
}

/** Tous les supports accessibles à un élève */
export async function getStudentMaterials(studentId: string) {
  const enrollSnap = await getDocs(
    query(collection(db, "enrollments"), where("studentId", "==", studentId))
  );
  const classeIds = [...new Set(enrollSnap.docs.map(d => (d.data() as any).classeId))];
  if (classeIds.length === 0) return [];

  const out: CourseMaterial[] = [];
  // L'opérateur `in` de Firestore est limité à 10 valeurs
  for (let i = 0; i < classeIds.length; i += 10) {
    const chunk = classeIds.slice(i, i + 10);
    const snap = await getDocs(
      query(collection(db, "materials"), where("classeId", "in", chunk))
    );
    out.push(...snap.docs.map(d => ({ id: d.id, ...d.data() } as CourseMaterial)));
  }

  return out.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}


// ═══════════════════════════════════════════════════════════
// DUPLICATION DE COURS · STATISTIQUES DE VUE
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// 1. DUPLICATION DE COURS
// ═══════════════════════════════════════════════════════════

/**
 * Duplique un cours existant avec de nouvelles dates.
 *
 * Un professeur qui donne le même cours chaque mois ressaisissait tout :
 * titre, matière, niveau, prix, description, WhatsApp. Cette fonction
 * ne reprend que ce qui est stable et remet à zéro ce qui ne l'est pas.
 *
 * Ce qui n'est PAS copié : les inscriptions, les présences, la salle
 * vidéo, le statut. Un cours dupliqué démarre vierge.
 */
export async function duplicateClasse(
  sourceClasseId: string,
  newDates: { dateTime: string; sessions?: string[] }
): Promise<string> {
  const snap = await getDoc(doc(db, "classes", sourceClasseId));
  if (!snap.exists()) throw new Error("classe-not-found");

  const src = snap.data() as any;
  const now = new Date().toISOString();

  // Nouvelle salle : réutiliser l'ancienne laisserait les anciens
  // élèves rejoindre le nouveau cours sans s'y être inscrits
  const jitsiRoom = `ostadi-${Math.random().toString(36).slice(2, 10)}`;

  const data: any = {
    // Repris tel quel
    teacherId: src.teacherId,
    teacherName: src.teacherName,
    teacherPhoto: src.teacherPhoto || "",
    teacherRating: src.teacherRating ?? 0,
    title: src.title,
    subject: src.subject,
    level: src.level,
    wilaya: src.wilaya,
    price: src.price,
    priceType: src.priceType,
    durationMinutes: src.durationMinutes,
    description: src.description || "",
    whatsapp: src.whatsapp || "",

    // Nouvelles dates
    dateTime: newDates.dateTime,
    ...(newDates.sessions ? { sessions: newDates.sessions } : {}),

    // Remis à zéro
    jitsiRoom,
    enrolledCount: 0,
    attendanceCount: 0,
    viewCount: 0,
    status: "scheduled",
    createdAt: now,
    duplicatedFrom: sourceClasseId,
  };

  const ref = await addDoc(collection(db, "classes"), data);
  return ref.id;
}


// ═══════════════════════════════════════════════════════════
// 2. STATISTIQUES DE VUE
// ═══════════════════════════════════════════════════════════

/**
 * Enregistre une vue sur un cours.
 *
 * Deux garde-fous :
 *  • le professeur ne gonfle pas ses propres chiffres
 *  • un même visiteur n'est compté qu'une fois par jour
 *
 * Sans le second, un élève qui recharge la page dix fois ferait croire
 * au professeur que son cours intéresse — et fausserait sa décision
 * de le reconduire ou non.
 */
export async function trackClasseView(
  classeId: string,
  viewerId: string | null,
  teacherId: string
): Promise<void> {
  // Le professeur consultant son propre cours ne compte pas
  if (viewerId && viewerId === teacherId) return;

  const today = new Date().toISOString().slice(0, 10);
  const key = viewerId
    ? `${classeId}_${viewerId}_${today}`
    : `${classeId}_anon_${today}_${Math.random().toString(36).slice(2, 8)}`;

  // Visiteur connecté : une vue par jour maximum
  if (viewerId) {
    const marker = await getDoc(doc(db, "classeViews", key));
    if (marker.exists()) return;
  }

  try {
    await setDoc(doc(db, "classeViews", key), {
      classeId,
      viewerId: viewerId || null,
      date: today,
      createdAt: new Date().toISOString(),
    });

    await updateDoc(doc(db, "classes", classeId), {
      viewCount: increment(1),
    });
  } catch (err) {
    // Non bloquant : un compteur de vues ne doit jamais casser une page
    console.warn("Enregistrement de la vue échoué :", err);
  }
}

export interface ClasseStats {
  views: number;
  requests: number;
  enrollments: number;
  /** Part des visiteurs ayant envoyé une demande */
  requestRate: number;
  /** Part des demandes acceptées */
  acceptRate: number;
  /** Part des visiteurs devenus élèves */
  conversionRate: number;
  viewsLast7Days: number;
}

/**
 * Statistiques d'un cours — de la vue à l'inscription.
 *
 * Le professeur voit où ça bloque : personne ne regarde (problème de
 * visibilité), on regarde mais on ne demande pas (prix ou description),
 * on demande mais il n'accepte pas (son propre délai de réponse).
 */
export async function getClasseStats(classeId: string): Promise<ClasseStats> {
  const [classeSnap, viewsSnap, requestsSnap, enrollSnap] = await Promise.all([
    getDoc(doc(db, "classes", classeId)),
    getDocs(query(collection(db, "classeViews"), where("classeId", "==", classeId))),
    getDocs(query(collection(db, "enrollmentRequests"), where("classeId", "==", classeId))),
    getDocs(query(collection(db, "enrollments"), where("classeId", "==", classeId))),
  ]);

  const views = classeSnap.exists()
    ? ((classeSnap.data() as any).viewCount || viewsSnap.size)
    : viewsSnap.size;

  const requests = requestsSnap.size;
  const accepted = requestsSnap.docs.filter(
    d => (d.data() as any).status === "accepted"
  ).length;
  const enrollments = enrollSnap.size;

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const viewsLast7Days = viewsSnap.docs.filter(
    d => (d.data() as any).date >= weekAgo
  ).length;

  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

  return {
    views,
    requests,
    enrollments,
    requestRate: pct(requests, views),
    acceptRate: pct(accepted, requests),
    conversionRate: pct(enrollments, views),
    viewsLast7Days,
  };
}

/** Statistiques de tous les cours d'un professeur */
export async function getTeacherClassesStats(teacherId: string) {
  const classesSnap = await getDocs(
    query(collection(db, "classes"), where("teacherId", "==", teacherId))
  );
  if (classesSnap.empty) return [];

  const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  const ids = classes.map(c => c.id);

  // L'opérateur `in` est limité à 10 valeurs
  const allViews: any[] = [];
  const allRequests: any[] = [];

  for (let i = 0; i < ids.length; i += 10) {
    const chunk = ids.slice(i, i + 10);
    const [v, r] = await Promise.all([
      getDocs(query(collection(db, "classeViews"), where("classeId", "in", chunk))),
      getDocs(query(collection(db, "enrollmentRequests"), where("classeId", "in", chunk))),
    ]);
    allViews.push(...v.docs.map(d => d.data()));
    allRequests.push(...r.docs.map(d => d.data()));
  }

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

  return classes.map(c => {
    const views = c.viewCount || allViews.filter(v => v.classeId === c.id).length;
    const reqs = allRequests.filter(r => r.classeId === c.id);
    const enrolled = c.enrolledCount || 0;

    return {
      classeId: c.id,
      title: c.title,
      subject: c.subject,
      status: c.status,
      dateTime: c.dateTime,
      price: c.price,
      views,
      viewsLast7Days: allViews.filter(v => v.classeId === c.id && v.date >= weekAgo).length,
      requests: reqs.length,
      pendingRequests: reqs.filter(r => r.status === "pending").length,
      enrollments: enrolled,
      conversionRate: views > 0 ? Math.round((enrolled / views) * 100) : 0,
    };
  }).sort((a, b) => b.views - a.views);
}


// ═══════════════════════════════════════════════════════════
// PARTIE 1 — SIGNALEMENTS  (ajout simple, rien à supprimer)
// ═══════════════════════════════════════════════════════════

export type ReportCategory =
  | "inappropriate"    // comportement déplacé
  | "safety"           // sécurité d'un mineur — priorité absolue
  | "fake"             // faux profil, diplôme suspect
  | "payment"          // litige de paiement
  | "quality"          // cours ne correspondant pas à l'annonce
  | "other";

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface Report {
  id: string;
  category: ReportCategory;
  targetType: "teacher" | "classe" | "message";
  targetId: string;
  targetName: string;
  reporterId: string;
  reporterName: string;
  reporterRole: string;
  description: string;
  status: ReportStatus;
  adminNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

/** Les signalements de sécurité passent devant tout le reste */
export const URGENT_CATEGORIES: ReportCategory[] = ["safety", "inappropriate"];

/**
 * Enregistre un signalement.
 *
 * Volontairement simple à envoyer : un élève qui hésite à signaler
 * ne le fera pas si le formulaire est long.
 */
export async function createReport(data: {
  category: ReportCategory;
  targetType: "teacher" | "classe" | "message";
  targetId: string;
  targetName: string;
  reporterId: string;
  reporterName: string;
  reporterRole: string;
  description: string;
}): Promise<string> {
  const now = new Date().toISOString();

  const ref = await addDoc(collection(db, "reports"), {
    ...data,
    description: data.description.trim().slice(0, 1000),
    status: "open" as ReportStatus,
    createdAt: now,
  });

  // Alerte immédiate pour les cas sensibles
  if (URGENT_CATEGORIES.includes(data.category)) {
    try {
      await addDoc(collection(db, "notifications"), {
        userId: ADMIN_UID,
        type: "message",
        title: data.category === "safety"
          ? "🚨 Signalement de sécurité"
          : "⚠️ Comportement signalé",
        body: `${data.reporterName} a signalé ${data.targetName}. À traiter en priorité.`,
        link: "/admin",
        read: false,
        createdAt: now,
      });
    } catch (err) {
      console.warn("Notification admin échouée :", err);
    }
  }

  return ref.id;
}

/** Tous les signalements — urgents et ouverts en tête */
export async function getAllReports(): Promise<Report[]> {
  const snap = await getDocs(
    query(collection(db, "reports"), orderBy("createdAt", "desc"))
  );

  const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Report));

  const statusOrder: Record<ReportStatus, number> = {
    open: 0, reviewing: 1, resolved: 2, dismissed: 3,
  };

  return list.sort((a, b) => {
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    const aUrgent = URGENT_CATEGORIES.includes(a.category) ? 0 : 1;
    const bUrgent = URGENT_CATEGORIES.includes(b.category) ? 0 : 1;
    if (aUrgent !== bUrgent) return aUrgent - bUrgent;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  adminNote?: string
): Promise<void> {
  const data: any = { status };
  if (adminNote !== undefined) data.adminNote = adminNote.trim();
  if (status === "resolved" || status === "dismissed") {
    data.resolvedAt = new Date().toISOString();
  }
  await updateDoc(doc(db, "reports", reportId), data);
}

export async function hasReported(
  reporterId: string,
  targetId: string
): Promise<boolean> {
  const snap = await getDocs(
    query(
      collection(db, "reports"),
      where("reporterId", "==", reporterId),
      where("targetId", "==", targetId),
      limit(1)
    )
  );
  return !snap.empty;
}

export async function getOpenReportsCount(): Promise<number> {
  const snap = await getDocs(
    query(collection(db, "reports"), where("status", "==", "open"))
  );
  return snap.size;
}

/**
 * Suspend un compte.
 *
 * Ne supprime rien : le compte reste en base et les preuves avec.
 * Les cours sont fermés pour retirer le professeur de la circulation.
 */
export async function suspendAccount(
  userId: string,
  reason: string
): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    suspended: true,
    suspendedAt: new Date().toISOString(),
    suspensionReason: reason,
  });

  const classesSnap = await getDocs(
    query(collection(db, "classes"), where("teacherId", "==", userId))
  );
  if (!classesSnap.empty) {
    const batch = writeBatch(db);
    classesSnap.docs.forEach(d => batch.update(d.ref, { status: "ended" }));
    await batch.commit();
  }
}

export async function unsuspendAccount(userId: string): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    suspended: false,
    suspendedAt: null,
    suspensionReason: null,
  });
}


// ═══════════════════════════════════════════════════════════
// PARTIE 2 — SÉCURITÉ DES MESSAGES
// ═══════════════════════════════════════════════════════════
//
// ⚠️ SUPPRIME d'abord ces 4 fonctions existantes dans ton fichier :
//    • sendMessage
//    • subscribeToMessages
//    • markMessagesAsRead
//    • getUnreadCount
//
//    Elles sont remplacées ci-dessous.
//
// ═══════════════════════════════════════════════════════════

/**
 * Calcule les participants d'une conversation.
 * Le professeur, plus tous les élèves inscrits au cours.
 */
async function getClasseParticipants(classeId: string): Promise<string[]> {
  const [classeSnap, enrollSnap] = await Promise.all([
    getDoc(doc(db, "classes", classeId)),
    getDocs(query(collection(db, "enrollments"), where("classeId", "==", classeId))),
  ]);

  if (!classeSnap.exists()) return [];

  const teacherId = (classeSnap.data() as any).teacherId as string;
  const studentIds = enrollSnap.docs
    .map(d => (d.data() as any).studentId)
    .filter(Boolean);

  return [...new Set([teacherId, ...studentIds])];
}

/**
 * Envoie un message.
 *
 * Le champ `participants` est ce qui permet à la règle Firestore de
 * n'autoriser la lecture qu'aux personnes concernées. Sans lui,
 * n'importe quel utilisateur connecté peut lire toutes les
 * conversations de la plateforme via l'API.
 */
export async function sendMessage(data: Omit<Message, "id">): Promise<string> {
  const now = new Date().toISOString();

  const participants = await getClasseParticipants(data.classeId);

  // L'expéditeur doit faire partie de la conversation
  if (participants.length > 0 && !participants.includes(data.senderId)) {
    throw new Error("not-a-participant");
  }

  const ref = await addDoc(collection(db, "messages"), {
    ...data,
    participants,
    read: false,
    createdAt: now,
  });

  // Aperçu de la conversation — conservé de la version précédente
  await setDoc(doc(db, "chatRooms", data.classeId), {
    classeId: data.classeId,
    lastMessage: data.text,
    lastMessageAt: now,
    lastSenderId: data.senderId,
  }, { merge: true });

  return ref.id;
}

/**
 * Écoute les messages d'une conversation.
 *
 * ⚠️ La requête filtre sur `participants`, pas seulement sur `classeId`.
 *
 * Firestore évalue les règles document par document : si une requête
 * renvoie un seul document que l'utilisateur n'a pas le droit de lire,
 * TOUTE la requête échoue. Un élève inscrit tardivement n'apparaît pas
 * dans les participants des messages antérieurs — filtrer par classeId
 * seul ferait donc échouer son chargement.
 */
export function subscribeToMessages(
  classeId: string,
  userId: string,
  callback: (messages: Message[]) => void,
  onError?: (err: any) => void
) {
  const q = query(
    collection(db, "messages"),
    where("classeId", "==", classeId),
    where("participants", "array-contains", userId),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(
    q,
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message))),
    err => {
      console.error("Écoute des messages échouée :", err);
      onError?.(err);
    }
  );
}

export async function markMessagesAsRead(classeId: string, userId: string) {
  const snap = await getDocs(
    query(
      collection(db, "messages"),
      where("classeId", "==", classeId),
      where("participants", "array-contains", userId),
      where("read", "==", false)
    )
  );

  if (snap.empty) return;

  const batch = writeBatch(db);
  let count = 0;
  snap.docs.forEach(d => {
    if ((d.data() as any).senderId !== userId) {
      batch.update(d.ref, { read: true });
      count++;
    }
  });
  if (count > 0) await batch.commit();
}

export async function getUnreadCount(classeId: string, userId: string): Promise<number> {
  const snap = await getDocs(
    query(
      collection(db, "messages"),
      where("classeId", "==", classeId),
      where("participants", "array-contains", userId),
      where("read", "==", false)
    )
  );
  return snap.docs.filter(d => (d.data() as any).senderId !== userId).length;
}

/**
 * Ajoute un élève aux participants des messages existants d'un cours.
 *
 * Sans ça, un élève inscrit après le début de la conversation ne verrait
 * aucun message antérieur. À appeler depuis acceptEnrollmentRequest.
 */
export async function addParticipantToClasseMessages(
  classeId: string,
  userId: string
): Promise<void> {
  const snap = await getDocs(
    query(collection(db, "messages"), where("classeId", "==", classeId))
  );
  if (snap.empty) return;

  const docs = snap.docs.filter(d => {
    const p = (d.data() as any).participants;
    return Array.isArray(p) && !p.includes(userId);
  });

  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(db);
    docs.slice(i, i + 400).forEach(d => {
      const p = (d.data() as any).participants || [];
      batch.update(d.ref, { participants: [...p, userId] });
    });
    await batch.commit();
  }
}

/**
 * MIGRATION — ajoute `participants` aux messages qui n'en ont pas.
 *
 * À lancer UNE FOIS depuis le panneau admin, AVANT de déployer la
 * nouvelle règle Firestore. Sans ça, les anciens messages deviennent
 * illisibles pour tout le monde sauf l'administrateur.
 */
export async function migrateMessagesParticipants(): Promise<{
  total: number;
  migrated: number;
  skipped: number;
}> {
  const messagesSnap = await getDocs(collection(db, "messages"));
  const total = messagesSnap.size;
  if (total === 0) return { total: 0, migrated: 0, skipped: 0 };

  const [classesSnap, enrollSnap] = await Promise.all([
    getDocs(collection(db, "classes")),
    getDocs(collection(db, "enrollments")),
  ]);

  const teacherByClasse = new Map<string, string>();
  classesSnap.docs.forEach(d => {
    teacherByClasse.set(d.id, (d.data() as any).teacherId);
  });

  const studentsByClasse = new Map<string, string[]>();
  enrollSnap.docs.forEach(d => {
    const e = d.data() as any;
    if (!e.classeId || !e.studentId) return;
    const arr = studentsByClasse.get(e.classeId) || [];
    arr.push(e.studentId);
    studentsByClasse.set(e.classeId, arr);
  });

  const participantsByClasse = new Map<string, string[]>();
  for (const [classeId, teacherId] of teacherByClasse) {
    participantsByClasse.set(classeId, [
      ...new Set([teacherId, ...(studentsByClasse.get(classeId) || [])]),
    ]);
  }

  let migrated = 0;
  let skipped = 0;

  const docs = messagesSnap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(db);
    let inBatch = 0;

    docs.slice(i, i + 400).forEach(d => {
      const m = d.data() as any;

      if (Array.isArray(m.participants) && m.participants.length > 0) {
        skipped++;
        return;
      }

      const participants = participantsByClasse.get(m.classeId);

      if (!participants || participants.length === 0) {
        // Cours supprimé : on garde au moins l'expéditeur, sinon
        // le message devient inaccessible même à son auteur
        if (m.senderId) {
          batch.update(d.ref, { participants: [m.senderId] });
          inBatch++;
          migrated++;
        } else {
          skipped++;
        }
        return;
      }

      batch.update(d.ref, { participants });
      inBatch++;
      migrated++;
    });

    if (inBatch > 0) await batch.commit();
  }

  return { total, migrated, skipped };
}


// ═══════════════════════════════════════════════════════════
// DÉLAI DE RÉPONSE · LISTE D'ATTENTE
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// 1. DÉLAI DE RÉPONSE DU PROFESSEUR
// ═══════════════════════════════════════════════════════════

export interface ResponseStats {
  /** Délai médian en minutes, null si aucune donnée */
  medianMinutes: number | null;
  /** Nombre de demandes prises en compte */
  sampleSize: number;
  /** Part des demandes traitées (acceptées ou refusées) */
  responseRate: number;
  /** Libellé prêt à afficher */
  label: { fr: string; ar: string } | null;
}

/**
 * Calcule le délai de réponse d'un professeur.
 *
 * On prend la MÉDIANE, pas la moyenne : un professeur qui répond
 * habituellement en 20 minutes mais a laissé traîner une demande
 * trois semaines afficherait une moyenne absurde. La médiane
 * reflète son comportement réel.
 *
 * Les demandes encore en attente comptent dans le taux de réponse
 * mais pas dans le délai — sinon un professeur qui ignore tout
 * aurait un excellent score.
 */
export async function getTeacherResponseStats(
  teacherId: string
): Promise<ResponseStats> {
  const snap = await getDocs(
    query(collection(db, "enrollmentRequests"), where("teacherId", "==", teacherId))
  );

  if (snap.empty) {
    return { medianMinutes: null, sampleSize: 0, responseRate: 0, label: null };
  }

  const all = snap.docs.map(d => d.data() as any);
  const answered = all.filter(r => r.reviewedAt && r.createdAt);

  const responseRate = Math.round((answered.length / all.length) * 100);

  if (answered.length === 0) {
    return { medianMinutes: null, sampleSize: 0, responseRate, label: null };
  }

  const delays = answered
    .map(r => {
      const ms = new Date(r.reviewedAt).getTime() - new Date(r.createdAt).getTime();
      return ms / 60_000;
    })
    .filter(m => m >= 0)
    .sort((a, b) => a - b);

  if (delays.length === 0) {
    return { medianMinutes: null, sampleSize: 0, responseRate, label: null };
  }

  const mid = Math.floor(delays.length / 2);
  const median = delays.length % 2 === 0
    ? (delays[mid - 1] + delays[mid]) / 2
    : delays[mid];

  return {
    medianMinutes: Math.round(median),
    sampleSize: delays.length,
    responseRate,
    label: formatResponseDelay(median),
  };
}

/** Transforme un délai en minutes en libellé lisible */
export function formatResponseDelay(minutes: number): { fr: string; ar: string } {
  if (minutes < 60) {
    return {
      fr: `Répond en moins d'une heure`,
      ar: `يردّ في أقل من ساعة`,
    };
  }
  if (minutes < 60 * 6) {
    const h = Math.round(minutes / 60);
    return {
      fr: `Répond en ${h} h environ`,
      ar: `يردّ خلال ${h} ساعات تقريباً`,
    };
  }
  if (minutes < 60 * 24) {
    return {
      fr: `Répond dans la journée`,
      ar: `يردّ في نفس اليوم`,
    };
  }
  const days = Math.round(minutes / (60 * 24));
  if (days <= 3) {
    return {
      fr: `Répond en ${days} jour${days > 1 ? "s" : ""}`,
      ar: `يردّ خلال ${days} ${days > 1 ? "أيام" : "يوم"}`,
    };
  }
  return {
    fr: `Répond sous quelques jours`,
    ar: `يردّ خلال بضعة أيام`,
  };
}


// ═══════════════════════════════════════════════════════════
// 2. LISTE D'ATTENTE
// ═══════════════════════════════════════════════════════════

export interface WaitlistEntry {
  id: string;
  classeId: string;
  classeTitle: string;
  teacherId: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  /** Position dans la file, calculée à l'affichage */
  position?: number;
  notified: boolean;
  createdAt: string;
}

/** Le cours est-il complet ? */
export function isClasseFull(classe: { maxStudents?: number; enrolledCount: number }): boolean {
  if (!classe.maxStudents || classe.maxStudents <= 0) return false;
  return classe.enrolledCount >= classe.maxStudents;
}

/**
 * Inscrit un élève sur la liste d'attente.
 *
 * Sans ça, un élève qui trouve un cours complet repart et ne revient
 * jamais. Avec, il reste dans la boucle — et le professeur sait qu'il
 * y a de la demande pour reconduire son cours.
 */
export async function joinWaitlist(data: {
  classeId: string;
  classeTitle: string;
  teacherId: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
}): Promise<string> {
  // Déjà inscrit ?
  const existing = await getDocs(
    query(
      collection(db, "waitlist"),
      where("classeId", "==", data.classeId),
      where("studentId", "==", data.studentId),
      limit(1)
    )
  );
  if (!existing.empty) return existing.docs[0].id;

  const now = new Date().toISOString();

  const ref = await addDoc(collection(db, "waitlist"), {
    ...data,
    notified: false,
    createdAt: now,
  });

  // Le professeur voit la demande latente — utile pour décider
  // de reconduire le cours ou d'augmenter la capacité
  try {
    await addDoc(collection(db, "notifications"), {
      userId: data.teacherId,
      type: "message",
      title: "📋 Nouvelle inscription en attente",
      body: `${data.studentName} s'est inscrit sur la liste d'attente de « ${data.classeTitle} ».`,
      link: "/dashboard",
      read: false,
      createdAt: now,
    });
  } catch (err) {
    console.warn("Notification liste d'attente échouée :", err);
  }

  return ref.id;
}

/** Retire un élève de la liste d'attente */
export async function leaveWaitlist(classeId: string, studentId: string): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, "waitlist"),
      where("classeId", "==", classeId),
      where("studentId", "==", studentId)
    )
  );
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  if (!snap.empty) await batch.commit();
}

/** L'élève est-il sur la liste d'attente ? Avec sa position */
export async function getMyWaitlistEntry(
  classeId: string,
  studentId: string
): Promise<WaitlistEntry | null> {
  const snap = await getDocs(
    query(collection(db, "waitlist"), where("classeId", "==", classeId))
  );
  if (snap.empty) return null;

  const list = snap.docs
    .map(d => ({ id: d.id, ...d.data() } as WaitlistEntry))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const idx = list.findIndex(e => e.studentId === studentId);
  if (idx === -1) return null;

  return { ...list[idx], position: idx + 1 };
}

/** Liste d'attente complète d'un cours, dans l'ordre d'arrivée */
export async function getClasseWaitlist(classeId: string): Promise<WaitlistEntry[]> {
  const snap = await getDocs(
    query(collection(db, "waitlist"), where("classeId", "==", classeId))
  );
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as WaitlistEntry))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((e, i) => ({ ...e, position: i + 1 }));
}

/**
 * Prévient les personnes en attente qu'une place s'est libérée.
 *
 * Appelé quand un cours passe sous sa capacité maximale.
 * Ne prévient que les premiers de la file, pas tout le monde :
 * inutile d'alerter dix personnes pour une seule place.
 */
export async function notifyWaitlist(
  classeId: string,
  spotsAvailable: number = 1
): Promise<number> {
  const list = await getClasseWaitlist(classeId);
  const toNotify = list.filter(e => !e.notified).slice(0, spotsAvailable);

  if (toNotify.length === 0) return 0;

  const now = new Date().toISOString();
  const batch = writeBatch(db);

  toNotify.forEach(e => {
    batch.set(doc(collection(db, "notifications")), {
      userId: e.studentId,
      type: "message",
      title: "🎉 Une place s'est libérée !",
      body: `Une place vient de se libérer dans « ${e.classeTitle} ». Envoyez vite votre demande.`,
      link: `/classe/${classeId}`,
      read: false,
      createdAt: now,
    });
    batch.update(doc(db, "waitlist", e.id), { notified: true });
  });

  await batch.commit();
  return toNotify.length;
}

/** Nombre de personnes en attente sur les cours d'un professeur */
export async function getTeacherWaitlistCount(teacherId: string): Promise<number> {
  const snap = await getDocs(
    query(collection(db, "waitlist"), where("teacherId", "==", teacherId))
  );
  return snap.size;
}


// ═══════════════════════════════════════════════════════════
// PARRAINAGE · SUIVI DE PROGRESSION · ATTESTATIONS
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// 1. PARRAINAGE
// ═══════════════════════════════════════════════════════════

/** Récompense accordée au parrain et au filleul, en dinars */
export const REFERRAL_BONUS = 500;

export interface Referral {
  id: string;
  /** Celui qui a partagé son code */
  sponsorId: string;
  sponsorName: string;
  /** Celui qui s'est inscrit avec le code */
  refereeId: string;
  refereeName: string;
  code: string;
  /** Le filleul s'est-il inscrit à un cours ? */
  completed: boolean;
  completedAt?: string;
  /** Le bonus a-t-il été versé ? */
  rewarded: boolean;
  createdAt: string;
}

/**
 * Génère le code de parrainage d'un utilisateur.
 *
 * Dérivé de l'UID, donc stable : le même utilisateur obtient toujours
 * le même code, sans avoir à le stocker. Six caractères, sans les
 * lettres et chiffres qui se confondent à l'oral (I, O, 0, 1) — un
 * code se transmet souvent de vive voix ou par téléphone.
 */
export function generateReferralCode(uid: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  }
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[hash % alphabet.length];
    hash = Math.floor(hash / alphabet.length) + uid.charCodeAt(i % uid.length);
  }
  return code;
}

/** Retrouve l'utilisateur derrière un code */
export async function findUserByReferralCode(code: string): Promise<string | null> {
  const clean = code.trim().toUpperCase();
  if (clean.length !== 6) return null;

  // Le code n'étant pas stocké, on le recalcule pour chaque utilisateur.
  // Acceptable tant que la base reste modeste ; au-delà de quelques
  // milliers d'inscrits, il faudra stocker le code à la création du compte.
  const snap = await getDocs(collection(db, "users"));
  const match = snap.docs.find(d => generateReferralCode(d.id) === clean);
  return match ? match.id : null;
}

/**
 * Enregistre un parrainage à l'inscription.
 *
 * Le bonus n'est PAS versé tout de suite : il attend que le filleul
 * s'inscrive réellement à un cours. Sinon il suffirait de créer dix
 * comptes fictifs pour récupérer 5 000 DA.
 */
export async function recordReferral(data: {
  code: string;
  refereeId: string;
  refereeName: string;
}): Promise<boolean> {
  const sponsorId = await findUserByReferralCode(data.code);

  // Code inconnu, ou tentative de s'auto-parrainer
  if (!sponsorId || sponsorId === data.refereeId) return false;

  // Déjà parrainé ?
  const existing = await getDocs(
    query(
      collection(db, "referrals"),
      where("refereeId", "==", data.refereeId),
      limit(1)
    )
  );
  if (!existing.empty) return false;

  const sponsorSnap = await getDoc(doc(db, "users", sponsorId));
  const sponsorName = sponsorSnap.exists()
    ? (sponsorSnap.data() as any).displayName || "—"
    : "—";

  const now = new Date().toISOString();

  await addDoc(collection(db, "referrals"), {
    sponsorId,
    sponsorName,
    refereeId: data.refereeId,
    refereeName: data.refereeName,
    code: data.code.trim().toUpperCase(),
    completed: false,
    rewarded: false,
    createdAt: now,
  });

  await addDoc(collection(db, "notifications"), {
    userId: sponsorId,
    type: "message",
    title: "🎁 Quelqu'un a utilisé votre code",
    body: `${data.refereeName} s'est inscrit grâce à vous. Votre bonus arrive dès sa première inscription à un cours.`,
    link: "/parrainage",
    read: false,
    createdAt: now,
  });

  return true;
}

/**
 * Valide un parrainage quand le filleul s'inscrit à son premier cours.
 * À appeler depuis acceptEnrollmentRequest.
 */
export async function completeReferral(refereeId: string): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, "referrals"),
      where("refereeId", "==", refereeId),
      where("completed", "==", false),
      limit(1)
    )
  );
  if (snap.empty) return;

  const ref = snap.docs[0];
  const r = ref.data() as any;
  const now = new Date().toISOString();

  await updateDoc(ref.ref, {
    completed: true,
    completedAt: now,
    rewarded: true,
  });

  // Crédite les deux comptes
  const batch = writeBatch(db);
  batch.update(doc(db, "users", r.sponsorId), {
    referralCredit: increment(REFERRAL_BONUS),
  });
  batch.update(doc(db, "users", refereeId), {
    referralCredit: increment(REFERRAL_BONUS),
  });
  await batch.commit();

  // Prévient les deux
  await Promise.all([
    addDoc(collection(db, "notifications"), {
      userId: r.sponsorId,
      type: "message",
      title: `🎉 ${REFERRAL_BONUS} DA de crédit`,
      body: `${r.refereeName} s'est inscrit à son premier cours. Votre bonus de parrainage est crédité.`,
      link: "/parrainage",
      read: false,
      createdAt: now,
    }),
    addDoc(collection(db, "notifications"), {
      userId: refereeId,
      type: "message",
      title: `🎉 ${REFERRAL_BONUS} DA de bienvenue`,
      body: `Votre bonus de parrainage est crédité. Il sera déduit de votre prochain cours.`,
      link: "/parrainage",
      read: false,
      createdAt: now,
    }),
  ]);
}

/** Tableau de bord du parrainage */
export async function getReferralStats(userId: string) {
  const [asSponsor, userSnap] = await Promise.all([
    getDocs(query(collection(db, "referrals"), where("sponsorId", "==", userId))),
    getDoc(doc(db, "users", userId)),
  ]);

  const list = asSponsor.docs
    .map(d => ({ id: d.id, ...d.data() } as Referral))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    code: generateReferralCode(userId),
    invited: list.length,
    completed: list.filter(r => r.completed).length,
    pending: list.filter(r => !r.completed).length,
    earned: list.filter(r => r.rewarded).length * REFERRAL_BONUS,
    credit: userSnap.exists() ? ((userSnap.data() as any).referralCredit || 0) : 0,
    list,
  };
}


// ═══════════════════════════════════════════════════════════
// 2. SUIVI DE PROGRESSION
// ═══════════════════════════════════════════════════════════

export type ProgressLevel = "struggling" | "progressing" | "good" | "excellent";

export interface ProgressNote {
  id: string;
  classeId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  level: ProgressLevel;
  /** Ce qui a été vu pendant la séance */
  topics: string;
  /** Points à travailler */
  toWork?: string;
  /** Visible par l'élève ? Certaines notes sont internes au professeur */
  sharedWithStudent: boolean;
  sessionDate: string;
  createdAt: string;
}

/**
 * Enregistre une note de progression.
 *
 * C'est ce qui justifie qu'un parent renouvelle le mois suivant :
 * sans trace écrite, il ne sait pas ce que son enfant a appris.
 */
export async function addProgressNote(
  data: Omit<ProgressNote, "id" | "createdAt">
): Promise<string> {
  const now = new Date().toISOString();

  const ref = await addDoc(collection(db, "progress"), {
    ...data,
    topics: data.topics.trim().slice(0, 500),
    toWork: (data.toWork || "").trim().slice(0, 500),
    createdAt: now,
  });

  if (data.sharedWithStudent) {
    try {
      await addDoc(collection(db, "notifications"), {
        userId: data.studentId,
        type: "message",
        title: "📈 Nouveau retour de votre professeur",
        body: data.topics.slice(0, 90),
        link: `/classe/${data.classeId}`,
        read: false,
        createdAt: now,
      });
    } catch (err) {
      console.warn("Notification de progression échouée :", err);
    }
  }

  return ref.id;
}

/** Notes d'un élève sur un cours */
export async function getProgressNotes(
  classeId: string,
  studentId: string
): Promise<ProgressNote[]> {
  const snap = await getDocs(
    query(
      collection(db, "progress"),
      where("classeId", "==", classeId),
      where("studentId", "==", studentId)
    )
  );
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as ProgressNote))
    .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
}

/** Toutes les notes d'un cours, groupées par élève */
export async function getClasseProgress(classeId: string) {
  const snap = await getDocs(
    query(collection(db, "progress"), where("classeId", "==", classeId))
  );

  const byStudent = new Map<string, ProgressNote[]>();
  snap.docs.forEach(d => {
    const n = { id: d.id, ...d.data() } as ProgressNote;
    const arr = byStudent.get(n.studentId) || [];
    arr.push(n);
    byStudent.set(n.studentId, arr);
  });

  return [...byStudent.entries()].map(([studentId, notes]) => {
    const sorted = notes.sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
    return {
      studentId,
      studentName: sorted[0]?.studentName || "—",
      notes: sorted,
      lastLevel: sorted[0]?.level || null,
      count: sorted.length,
    };
  });
}

export async function deleteProgressNote(noteId: string): Promise<void> {
  await deleteDoc(doc(db, "progress", noteId));
}


// ═══════════════════════════════════════════════════════════
// 3. ATTESTATION DE FIN DE COURS
// ═══════════════════════════════════════════════════════════

export interface CertificateData {
  studentName: string;
  teacherName: string;
  classeTitle: string;
  subject: string;
  level: string;
  sessionsTotal: number;
  sessionsAttended: number;
  attendanceRate: number;
  startDate: string;
  endDate: string;
  wilaya: string;
  progressLevel?: ProgressLevel;
  certificateId: string;
}

/**
 * Rassemble les données d'une attestation.
 *
 * Les parents algériens attachent de la valeur à un document écrit.
 * C'est aussi ce qui donne une fin propre à un cours — et une raison
 * d'en reprendre un autre.
 */
export async function getCertificateData(
  classeId: string,
  studentId: string
): Promise<CertificateData | null> {
  const [classeSnap, enrollSnap, progressSnap] = await Promise.all([
    getDoc(doc(db, "classes", classeId)),
    getDocs(query(
      collection(db, "enrollments"),
      where("classeId", "==", classeId),
      where("studentId", "==", studentId),
      limit(1)
    )),
    getDocs(query(
      collection(db, "progress"),
      where("classeId", "==", classeId),
      where("studentId", "==", studentId)
    )),
  ]);

  if (!classeSnap.exists() || enrollSnap.empty) return null;

  const c = classeSnap.data() as any;
  const e = enrollSnap.docs[0].data() as any;

  const sessions: string[] = Array.isArray(c.sessions) && c.sessions.length > 0
    ? [...c.sessions].sort()
    : [c.dateTime];

  const notes = progressSnap.docs.map(d => d.data() as any);
  const lastNote = notes.sort((a, b) =>
    b.sessionDate.localeCompare(a.sessionDate)
  )[0];

  // Nombre de séances suivies : les notes de progression font foi
  // si elles existent, sinon on se rabat sur le champ `attended`
  const attended = notes.length > 0
    ? notes.length
    : (e.attended ? sessions.length : 0);

  // Identifiant vérifiable — permet de contrôler l'authenticité
  const certId = `${classeId.slice(0, 6)}-${studentId.slice(0, 6)}`.toUpperCase();

  return {
    studentName: e.studentName || "—",
    teacherName: c.teacherName || "—",
    classeTitle: c.title || "—",
    subject: c.subject || "—",
    level: c.level || "—",
    sessionsTotal: sessions.length,
    sessionsAttended: attended,
    attendanceRate: sessions.length > 0
      ? Math.round((attended / sessions.length) * 100)
      : 0,
    startDate: sessions[0],
    endDate: sessions[sessions.length - 1],
    wilaya: c.wilaya || "—",
    progressLevel: lastNote?.level,
    certificateId: certId,
  };
}

/** Cours terminés pour lesquels un élève peut obtenir une attestation */
export async function getCertifiableClasses(studentId: string) {
  const enrollSnap = await getDocs(
    query(collection(db, "enrollments"), where("studentId", "==", studentId))
  );
  if (enrollSnap.empty) return [];

  const out: any[] = [];

  for (const e of enrollSnap.docs) {
    const enr = e.data() as any;
    const cSnap = await getDoc(doc(db, "classes", enr.classeId));
    if (!cSnap.exists()) continue;

    const c = cSnap.data() as any;

    // Seuls les cours terminés donnent lieu à une attestation
    const sessions: string[] = Array.isArray(c.sessions) && c.sessions.length > 0
      ? [...c.sessions].sort()
      : [c.dateTime];
    const lastMs = new Date(sessions[sessions.length - 1]).getTime();
    const isOver = c.status === "ended" || lastMs < Date.now();

    if (!isOver) continue;

    out.push({
      classeId: enr.classeId,
      title: c.title,
      subject: c.subject,
      teacherName: c.teacherName,
      endDate: sessions[sessions.length - 1],
      attended: enr.attended,
    });
  }

  return out.sort((a, b) => b.endDate.localeCompare(a.endDate));
}
