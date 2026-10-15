import { config } from "./config";

const { resendApiKey, from } = config.email;

export const emailConfigured = Boolean(resendApiKey && from);

interface Email {
  to: string;
  subject: string;
  text: string;
}

/**
 * Sends through Resend (https://resend.com/docs/api-reference/emails/send-email).
 * Without RESEND_API_KEY / EMAIL_FROM the email is printed to the server log
 * instead, so flows like password reset can be tested locally.
 */
/** Returns false when the provider rejects the message. A missing key logs the letter locally and returns true so local checkout can continue. */
export async function sendEmail({ to, subject, text }: Email): Promise<boolean> {
  if (!emailConfigured) {
    console.log(`\n----- Email not sent (RESEND_API_KEY not set) -----\nTo: ${to}\nSubject: ${subject}\n\n${text}\n---------------------------------------------------\n`);
    return true;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) {
      console.error("Email failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Email failed:", err);
    return false;
  }
}
