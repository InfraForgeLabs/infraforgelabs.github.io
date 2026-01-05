import { validateEmailAttachment } from "../utils/emailAttachments.js";

export async function processEmail(message, env, ctx) {
  try {
    const subject = message.headers.get("subject") || "";
    const from = message.from || "";

    // Ignore system/bounce
    if (/mailer-daemon|postmaster/i.test(from)) return;

    // Extract ticket code
    const match = subject.match(/\[(INF-\w+)\]/);
    if (!match) return;

    const ticketCode = match[1];

    const ticket = await env.DB.prepare(
      `SELECT id FROM tickets WHERE ticket_code = ?`
    ).bind(ticketCode).first();

    if (!ticket) return;

    const body = await message.text();

    // Insert reply
    const reply = await env.DB.prepare(
      `INSERT INTO replies
       (ticket_id, author_type, author_identifier, body)
       VALUES (?, 'email', ?, ?)`
    ).bind(ticket.id, from, body).run();

    // Attachments
    for (const att of message.attachments || []) {
      if (!validateEmailAttachment(att).ok) continue;

      const key =
        `tickets/${ticketCode}/${crypto.randomUUID()}-${att.filename}`;

      await env.ATTACHMENTS_BUCKET.put(
        key,
        att.stream(),
        { httpMetadata: { contentType: att.contentType } }
      );

      await env.DB.prepare(
        `INSERT INTO attachments
         (ticket_id, reply_id, filename, mime_type, size_bytes,
          r2_key, public_url, source, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'email', ?)`
      ).bind(
        ticket.id,
        reply.lastRowId,
        att.filename,
        att.contentType,
        att.size,
        key,
        `https://attachments.infraforgelabs.in/${key}`,
        from
      ).run();
    }

    // Audit
    await env.DB.prepare(
      `INSERT INTO audit_log
       (ticket_id, actor_type, actor_identifier, action)
       VALUES (?, 'email', ?, 'email_reply_received')`
    ).bind(ticket.id, from).run();

  } catch (err) {
    console.error("Inbound email error:", err);
  }
}

