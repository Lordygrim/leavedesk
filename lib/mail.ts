// Sends email through Resend when RESEND_API_KEY is set. Without a key it only logs, so development works offline.
export async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.log(`[email not sent, no RESEND_API_KEY] to ${to}: ${subject}`); return; }
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM ?? "LeaveDesk <onboarding@resend.dev>", to, subject, text }),
    });
  } catch (e) { console.error("Email failed", e); }
}
