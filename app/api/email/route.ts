import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Envoi d'emails de notification.
 *
 * Pourquoi c'est nécessaire : tes notifications vivent uniquement dans
 * l'application. Un professeur qui ne l'ouvre pas de la journée ne sait
 * jamais qu'un élève attend sa réponse — et l'élève va voir ailleurs.
 *
 * Service utilisé : Resend. Gratuit jusqu'à 3 000 emails par mois,
 * ce qui couvre largement les premiers mois. Configuration :
 *
 *   1. Créer un compte sur resend.com
 *   2. Ajouter et vérifier votre domaine (ou utiliser onboarding@resend.dev
 *      pour les tests)
 *   3. Générer une clé API
 *   4. Ajouter RESEND_API_KEY et EMAIL_FROM dans les variables Vercel
 *
 * Sans ces variables, la route répond proprement sans planter :
 * l'absence d'email ne doit jamais bloquer une action.
 */

type EmailType =
  | "enrollment-request"   // → professeur : nouvelle demande
  | "request-accepted"     // → élève : demande acceptée
  | "course-reminder"      // → élève : cours demain
  | "new-material"         // → élève : support déposé
  | "commission-due";      // → professeur : commission à régler

interface EmailPayload {
  type: EmailType;
  to: string;
  data: Record<string, any>;
}

export async function POST(req: NextRequest) {
  try {
    /* ── Authentification ──────────────────────────────── */
    const uid = await verifyIdToken(req.headers.get("authorization"));
    if (!uid) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || "Ostadi <onboarding@resend.dev>";

    // Service non configuré : on répond sans erreur.
    // Un email manquant ne doit pas casser une inscription.
    if (!apiKey) {
      console.info("RESEND_API_KEY absente — email ignoré");
      return NextResponse.json({ skipped: true, reason: "not-configured" });
    }

    const body = (await req.json().catch(() => null)) as EmailPayload | null;
    if (!body?.type || !body?.to) {
      return NextResponse.json({ error: "invalid-payload" }, { status: 400 });
    }

    /* ── Anti-abus : limite par utilisateur et par heure ── */
    const db = adminDb();
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const recent = await db
      .collection("emailLog")
      .where("senderId", "==", uid)
      .where("sentAt", ">", hourAgo)
      .get();

    if (recent.size >= 20) {
      return NextResponse.json(
        { error: "rate-limited", message: "Trop d'emails envoyés." },
        { status: 429 }
      );
    }

    /* ── Composition ───────────────────────────────────── */
    const tpl = buildEmail(body.type, body.data);
    if (!tpl) {
      return NextResponse.json({ error: "unknown-type" }, { status: 400 });
    }

    /* ── Envoi ─────────────────────────────────────────── */
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [body.to],
        subject: tpl.subject,
        html: tpl.html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Envoi Resend échoué :", detail);
      return NextResponse.json(
        { error: "send-failed" },
        { status: 502 }
      );
    }

    // Trace pour la limite de débit
    await db.collection("emailLog").add({
      senderId: uid,
      to: body.to,
      type: body.type,
      sentAt: new Date().toISOString(),
    });

    return NextResponse.json({ sent: true });
  } catch (err: any) {
    console.error("Route email :", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}


/* ═══════════════════════════════════════════════════════════
   Modèles d'emails
   ═══════════════════════════════════════════════════════════ */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://ostadi-eta.vercel.app";

function buildEmail(
  type: EmailType,
  d: Record<string, any>
): { subject: string; html: string } | null {
  switch (type) {
    case "enrollment-request":
      return {
        subject: `📩 ${d.studentName} souhaite rejoindre votre cours`,
        html: shell({
          title: "Nouvelle demande d'inscription",
          body: `
            <p><strong>${esc(d.studentName)}</strong> souhaite rejoindre votre cours
            « ${esc(d.classeTitle)} ».</p>
            ${d.message ? `<blockquote>${esc(d.message)}</blockquote>` : ""}
            <p class="muted">Répondre rapidement augmente vos inscriptions —
            un élève qui attend va souvent voir ailleurs.</p>
          `,
          cta: { label: "Voir la demande", url: `${SITE}/dashboard` },
        }),
      };

    case "request-accepted":
      return {
        subject: `✅ Votre demande pour « ${d.classeTitle} » est acceptée`,
        html: shell({
          title: "Demande acceptée",
          body: `
            <p>Bonne nouvelle — <strong>${esc(d.teacherName)}</strong> a accepté
            votre demande pour le cours « ${esc(d.classeTitle)} ».</p>
            <p>Vous avez désormais accès à la salle de cours et aux supports.</p>
          `,
          cta: { label: "Accéder au cours", url: `${SITE}/classe/${d.classeId}` },
        }),
      };

    case "course-reminder":
      return {
        subject: `📅 Votre cours « ${d.classeTitle} » ${d.when}`,
        html: shell({
          title: "Rappel de cours",
          body: `
            <p>Votre cours <strong>« ${esc(d.classeTitle)} »</strong>
            avec ${esc(d.teacherName)} a lieu ${esc(d.when)}.</p>
            <p class="muted">La salle vidéo ouvre 15 minutes avant le début.</p>
          `,
          cta: { label: "Voir le cours", url: `${SITE}/classe/${d.classeId}` },
        }),
      };

    case "new-material":
      return {
        subject: `📎 Nouveau support pour « ${d.classeTitle} »`,
        html: shell({
          title: "Nouveau support disponible",
          body: `
            <p><strong>${esc(d.teacherName)}</strong> a déposé
            « ${esc(d.materialTitle)} » dans le cours « ${esc(d.classeTitle)} ».</p>
          `,
          cta: { label: "Télécharger", url: `${SITE}/classe/${d.classeId}` },
        }),
      };

    case "commission-due":
      return {
        subject: `💰 Commission Ostadi — ${d.amount} DA`,
        html: shell({
          title: "Commission à régler",
          body: `
            <p>Votre commission s'élève à <strong>${esc(String(d.amount))} DA</strong>.</p>
            ${d.days ? `<p class="muted">Dernier règlement il y a ${esc(String(d.days))} jours.</p>` : ""}
            <p>Vous pouvez consulter le détail dans l'onglet Revenus de votre tableau de bord.</p>
          `,
          cta: { label: "Voir mon bilan", url: `${SITE}/dashboard` },
        }),
      };

    default:
      return null;
  }
}

/**
 * Gabarit commun.
 *
 * Styles en ligne uniquement : les clients de messagerie —
 * Gmail en tête — ignorent les feuilles de style externes.
 * Tableaux plutôt que flexbox, pour Outlook.
 */
function shell({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { label: string; url: string };
}): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f2f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2f9;padding:28px 12px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

        <!-- En-tête -->
        <tr><td style="background:linear-gradient(135deg,#1a0d38,#2a1050);padding:26px 28px;text-align:center;">
          <div style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
            Ostadi <span style="color:#FF8C00;">أستاذي</span>
          </div>
          <div style="font-size:10px;color:#a78bfa;margin-top:4px;letter-spacing:1px;text-transform:uppercase;">
            Cours de soutien en ligne
          </div>
        </td></tr>

        <!-- Contenu -->
        <tr><td style="padding:30px 28px;">
          <h1 style="margin:0 0 18px;font-size:19px;font-weight:800;color:#1a1a1a;">
            ${esc(title)}
          </h1>
          <div style="font-size:14.5px;line-height:1.7;color:#444;">
            ${body}
          </div>

          ${cta ? `
          <table cellpadding="0" cellspacing="0" style="margin:26px 0 8px;">
            <tr><td style="background:#FF8C00;border-radius:10px;">
              <a href="${cta.url}"
                 style="display:inline-block;padding:13px 28px;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">
                ${esc(cta.label)}
              </a>
            </td></tr>
          </table>` : ""}
        </td></tr>

        <!-- Pied -->
        <tr><td style="padding:18px 28px;background:#faf9fc;border-top:1px solid #eee;text-align:center;">
          <p style="margin:0;font-size:11px;color:#999;line-height:1.6;">
            Ostadi — Plateforme de cours de soutien en Algérie<br>
            <a href="${SITE}" style="color:#7C3AED;text-decoration:none;">${SITE.replace(/^https?:\/\//, "")}</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>

  <style>
    blockquote {
      margin: 14px 0; padding: 12px 16px;
      background: #f7f4fe; border-left: 3px solid #7C3AED;
      border-radius: 6px; font-style: italic; color: #555;
    }
    .muted { color: #888; font-size: 13px; }
  </style>
</body>
</html>`;
}

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
