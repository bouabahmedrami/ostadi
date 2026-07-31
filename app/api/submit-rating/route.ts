import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Soumission d'un avis — traitée côté serveur.
 *
 * Pourquoi une route API plutôt que directement depuis le client :
 *
 * Noter un professeur implique trois écritures :
 *   1. créer le document d'avis
 *   2. recalculer la moyenne sur le profil du professeur
 *   3. propager cette moyenne sur tous ses cours (pour le tri)
 *
 * Les étapes 2 et 3 modifient des documents qui n'appartiennent pas
 * à l'élève. Les règles Firestore les refusent — à juste titre : si
 * un élève pouvait écrire dans le profil d'un professeur, il pourrait
 * gonfler sa propre note ou saboter celle d'un concurrent.
 *
 * Le serveur, lui, vérifie d'abord que l'élève a le droit de noter,
 * puis effectue le calcul lui-même. La moyenne devient incontestable.
 */
export async function POST(req: NextRequest) {
  try {
    /* ── 1. Authentification ───────────────────────────── */
    const uid = await verifyIdToken(req.headers.get("authorization"));
    if (!uid) {
      return NextResponse.json(
        { error: "unauthenticated", message: "Connexion requise." },
        { status: 401 }
      );
    }

    /* ── 2. Paramètres ─────────────────────────────────── */
    const body = await req.json().catch(() => null);
    const classeId: string | undefined = body?.classeId;
    const stars: number | undefined = body?.stars;
    const comment: string = (body?.comment || "").toString().slice(0, 300);

    if (!classeId || typeof stars !== "number" || stars < 1 || stars > 5) {
      return NextResponse.json(
        { error: "invalid-input", message: "Note invalide." },
        { status: 400 }
      );
    }

    const db = adminDb();

    /* ── 3. Le cours existe-t-il ? ─────────────────────── */
    const classeSnap = await db.collection("classes").doc(classeId).get();
    if (!classeSnap.exists) {
      return NextResponse.json(
        { error: "classe-not-found", message: "Ce cours n'existe pas." },
        { status: 404 }
      );
    }
    const classe = classeSnap.data()!;
    const teacherId: string = classe.teacherId;

    /* ── 4. L'élève est-il inscrit ? ───────────────────── */
    const enrollSnap = await db
      .collection("enrollments")
      .where("classeId", "==", classeId)
      .where("studentId", "==", uid)
      .limit(1)
      .get();

    if (enrollSnap.empty) {
      return NextResponse.json(
        { error: "not-enrolled", message: "Vous n'êtes pas inscrit à ce cours." },
        { status: 403 }
      );
    }

    /* ── 5. A-t-il assisté ? ───────────────────────────── */
    const enrollment = enrollSnap.docs[0].data();
    if (!enrollment.attended) {
      return NextResponse.json(
        {
          error: "not-attended",
          message: "Vous devez avoir assisté au cours pour l'évaluer.",
        },
        { status: 403 }
      );
    }

    /* ── 6. A-t-il déjà noté ? ─────────────────────────── */
    const existing = await db
      .collection("ratings")
      .where("classeId", "==", classeId)
      .where("studentId", "==", uid)
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json(
        { error: "already-rated", message: "Vous avez déjà évalué ce cours." },
        { status: 409 }
      );
    }

    /* ── 7. Un professeur ne peut pas se noter lui-même ── */
    if (teacherId === uid) {
      return NextResponse.json(
        { error: "self-rating", message: "Vous ne pouvez pas vous évaluer." },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    /* ── 8. Création de l'avis ─────────────────────────── */
    await db.collection("ratings").add({
      classeId,
      teacherId,
      studentId: uid,
      stars,
      comment: comment.trim(),
      createdAt: now,
    });

    /* ── 9. Recalcul de la moyenne ─────────────────────── */
    const allRatings = await db
      .collection("ratings")
      .where("teacherId", "==", teacherId)
      .get();

    const total = allRatings.docs.reduce(
      (sum, d) => sum + (Number(d.data().stars) || 0),
      0
    );
    const count = allRatings.size;
    const average = count > 0 ? Math.round((total / count) * 10) / 10 : 0;

    /* ── 10. Mise à jour du profil professeur ──────────── */
    await db.collection("users").doc(teacherId).update({
      rating: average,
      ratingCount: count,
      // Mis en avant à partir de 4.5 étoiles et 3 avis
      featured: average >= 4.5 && count >= 3,
    });

    /* ── 11. Propagation sur ses cours (pour le tri) ───── */
    const teacherClasses = await db
      .collection("classes")
      .where("teacherId", "==", teacherId)
      .get();

    if (!teacherClasses.empty) {
      const docs = teacherClasses.docs;
      for (let i = 0; i < docs.length; i += 450) {
        const batch = db.batch();
        docs.slice(i, i + 450).forEach(d =>
          batch.update(d.ref, { teacherRating: average })
        );
        await batch.commit();
      }
    }

    /* ── 12. Notification au professeur ────────────────── */
    const studentSnap = await db.collection("users").doc(uid).get();
    const studentName = studentSnap.exists
      ? studentSnap.data()?.displayName || "Un élève"
      : "Un élève";

    await db.collection("notifications").add({
      userId: teacherId,
      type: "rating",
      title: "⭐ Nouvelle évaluation",
      body: `${studentName} vous a donné ${stars} étoile${stars > 1 ? "s" : ""}${
        comment.trim() ? ` : "${comment.trim().slice(0, 50)}"` : ""
      }`,
      link: `/professeur/${teacherId}`,
      read: false,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      newAverage: average,
      totalRatings: count,
    });
  } catch (err: any) {
    console.error("Soumission d'avis échouée :", err);
    return NextResponse.json(
      { error: "internal", message: "Erreur serveur. Réessayez." },
      { status: 500 }
    );
  }
}
