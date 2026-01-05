import { validateEmailAttachment } from "../utils/emailAttachments.js";
import { verifyReplyToken } from "../utils/emailReplyToken.js";

/* ---------- ATTACHMENT LIMITS (✅ ADD) ---------- */
const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function processEmail(message, env, ctx) {
  try {
    const to = message.to || "";
    const from = message.from || "";

    if (/mailer-daemon|postmaster/i.test(from)) return;

    /* ---------- TOKEN REPLY (USER) ---------- */
    const tokenMatch = to.match(/reply\+([^@]+)/);
    if (tokenMatch) {
      const payload = await verifyReplyToken(
        tokenMatch[1],
        env.EMAIL_REPLY_SECRET
      );
      if (!payload) return;

      const body = (await message.text()) || "(no content)";

      /* ---------- INSERT REPLY ---------- */
      const replyRes = await env.DB.prepare(
        `INSERT INTO replies
         (ticket_id, author_type, author_identifier, body)
         VALUES (?, 'user', ?, ?)`
      ).bind(
        payload.ticket_id,
        payload.email_hash,
        body
      ).run();

      const replyId = replyRes.lastRowId;

      await env.DB.prepare(
        `UPDATE tickets SET has_unread_admin = 1 WHERE id = ?`
      ).bind(payload.ticket_id).run();

      /* ---------- EMAIL ATTACHMENTS (✅ ADD) ---------- */
      const attachments = message.attachments || [];
      let processed = 0;

      for (const file of attachments) {
        if (processed >= MAX_ATTACHMENTS) break;
        if (!file || !file.filename) continue;
        if (file.size > MAX_FILE_SIZE) continue;

        const validation = validateEmailAttachment(file);
        if (!validation.ok) continue;

        try {
          const buffer = await file.arrayBuffer();
          const key = `tickets/${payload.ticket_id}/email-${crypto.randomUUID()}-${file.filename}`;

          await env.ATTACHMENTS_BUCKET.put(
            key,
            buffer,
            { httpMetadata: { contentType: file.contentType } }
          );

          await env.DB.prepare(
            `
            INSERT INTO attachments
            (ticket_id, reply_id, filename, mime_type, size_bytes,
             r2_key, public_url, source, uploaded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'email', ?)
            `
          ).bind(
            payload.ticket_id,
            replyId,
            file.filename,
            file.contentType,
            file.size,
            key,
            `https://attachments.infraforgelabs.in/${key}`,
            payload.email_hash
          ).run();

          processed++;

        } catch (err) {
          console.error("Email attachment error:", err);
          // 🔒 Never fail reply on attachment errors
        }
      }

      return;
    }

    /* ---------- LEGACY SUBJECT FLOW ---------- */
    const subject = message.headers.get("subject") || "";
    const match = subject.match(/\[(INF-\w+)\]/);
    if (!match) return;

    const ticketCode = match[1];
    const ticket = await env.DB.prepare(
      `SELECT id FROM tickets WHERE ticket_code = ?`
    ).bind(ticketCode).first();
    if (!ticket) return;

    const body = (await message.text()) || "(no content)";

    const replyRes = await env.DB.prepare(
      `INSERT INTO replies
       (ticket_id, author_type, author_identifier, body)
       VALUES (?, 'email', ?, ?)`
    ).bind(ticket.id, from, body).run();

    const replyId = replyRes.lastRowId;

    await env.DB.prepare(
      `UPDATE tickets SET has_unread_admin = 1 WHERE id = ?`
    ).bind(ticket.id).run();

    /* ---------- LEGACY EMAIL ATTACHMENTS (✅ ADD) ---------- */
    const attachments = message.attachments || [];
    let processed = 0;

    for (const file of attachments) {
      if (processed >= MAX_ATTACHMENTS) break;
      if (!file || !file.filename) continue;
      if (file.size > MAX_FILE_SIZE) continue;

      const validation = validateEmailAttachment(file);
      if (!validation.ok) continue;

      try {
        const buffer = await file.arrayBuffer();
        const key = `tickets/${ticket.id}/email-${crypto.randomUUID()}-${file.filename}`;

        await env.ATTACHMENTS_BUCKET.put(
          key,
          buffer,
          { httpMetadata: { contentType: file.contentType } }
        );

        await env.DB.prepare(
          `
          INSERT INTO attachments
          (ticket_id, reply_id, filename, mime_type, size_bytes,
           r2_key, public_url, source, uploaded_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'email', ?)
          `
        ).bind(
          ticket.id,
          replyId,
          file.filename,
          file.contentType,
          file.size,
          key,
          `https://attachments.infraforgelabs.in/${key}`,
          from
        ).run();

        processed++;

      } catch (err) {
        console.error("Legacy email attachment error:", err);
      }
    }

  } catch (err) {
    console.error("Inbound email error:", err);
  }
}
