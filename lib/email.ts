import { auth } from "./firebase";

/**
 * Envoi d'emails depuis le client.
 *
 * Volontairement silencieux en cas d'échec : un email qui ne part pas
 * ne doit jamais empêcher une inscription d'aboutir ou un cours d'être
 * créé. On journalise, on continue.
 */

type EmailType =
  | "enrollment-request"
  | "request-accepted"
  | "course-reminder"
  | "new-material"
  | "commission-due";

export async function sendEmail(
  type: EmailType,
  to: string,
  data: Record<string, any>
): Promise<boolean> {
  // Pas d'adresse, rien à faire
  if (!to || !to.includes("@")) return false;

  try {
    const user = auth.currentUser;
    if (!user) return false;

    const token = await user.getIdToken();

    const res = await fetch("/api/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type, to, data }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // « not-configured » est normal tant que Resend n'est pas branché
      if (err?.reason !== "not-configured") {
        console.warn("Email non envoyé :", err?.error || res.status);
      }
      return false;
    }

    return true;
  } catch (err) {
    console.warn("Envoi d'email échoué :", err);
    return false;
  }
}
