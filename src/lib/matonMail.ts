export async function sendEmail(subject: string, body: string) {
  const key = process.env.MATON_API_KEY;
  const to = process.env.MC_NOTIFY_EMAIL_TO;
  const from = process.env.MC_NOTIFY_EMAIL_FROM;
  const fromName = process.env.MC_NOTIFY_EMAIL_FROM_NAME ?? "Arc";

  if (!key || !to || !from) {
    throw new Error("Missing MATON_API_KEY or MC_NOTIFY_EMAIL_TO or MC_NOTIFY_EMAIL_FROM");
  }

  const raw =
    `To: ${to}\r\n` +
    `From: ${fromName} <${from}>\r\n` +
    `Subject: ${subject}\r\n` +
    `Content-Type: text/plain; charset=utf-8\r\n` +
    `\r\n` +
    `${body}\r\n`;

  const payload = { raw: Buffer.from(raw).toString("base64url") };

  const res = await fetch("https://gateway.maton.ai/google-mail/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Maton gmail send failed: ${res.status} ${text}`);
  }
}
