import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, setDoc, deleteDoc, writeBatch, limit,
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

export async function sendMessage(data: Omit<Message, "id">): Promise<string> {
  const ref = await addDoc(collection(db, "messages"), {
    ...data,
    read: false,
    createdAt: new Date().toISOString(),
  });
  await setDoc(doc(db, "chatRooms", data.classeId), {
    classeId: data.classeId,
    lastMessage: data.text,
    lastMessageAt: new Date().toISOString(),
    lastSenderId: data.senderId,
  }, { merge: true });
  return ref.id;
}

export function subscribeToMessages(
  classeId: string,
  callback: (messages: Message[]) => void
) {
  const q = query(
    collection(db, "messages"),
    where("classeId", "==", classeId),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
    callback(msgs);
  });
}

export async function markMessagesAsRead(classeId: string, userId: string) {
  const q = query(
    collection(db, "messages"),
    where("classeId", "==", classeId),
    where("read", "==", false)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => {
    if (d.data().senderId !== userId) {
      batch.update(d.ref, { read: true });
    }
  });
  await batch.commit();
}

export async function getUnreadCount(classeId: string, userId: string): Promise<number> {
  const q = query(
    collection(db, "messages"),
    where("classeId", "==", classeId),
    where("read", "==", false)
  );
  const snap = await getDocs(q);
  return snap.docs.filter(d => d.data().senderId !== userId).length;
}

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
