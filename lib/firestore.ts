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
