export async function sendBrevoMail(env, opts) {
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": env.BREVO_API_KEY
    },
    body: JSON.stringify({
      sender: { email: env.SMTP_FROM, name: "InfraForge Labs Support" },
      replyTo: { email: env.SMTP_FROM },
      to: [{ email: opts.to }],
      subject: opts.subject,
      textContent: opts.body
    })
  });

  const j = await r.json();
  return j.messageId || null;
}
