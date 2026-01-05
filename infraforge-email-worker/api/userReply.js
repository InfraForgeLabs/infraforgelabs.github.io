import { verifyJWT } from "../utils/jwt.js";
import { validateAttachment } from "../utils/attachments.js";
import { sendBrevoMail } from "../brevo/client.js";

export async function handleUserReply(request, env, ctx, { code }) {
  try {
    const auth = request.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyJWT(auth.slice(7), env.JWT_SECRET);
    if (!payload) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const message = form.get("message");
    const file = form.get("file");

    if (!message) {
      return Response.json({ error: "Message required" }, { status: 400 });
    }

    const ticket = await env.DB.prepare(
      `SELECT id, subject, status, requester_email_hash
       FROM tickets
       WHERE ticket_code = ?`
    ).bind(code).first();

    if (!ticket) {
      return Response.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.requester_email_hash !== payload.email_hash) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    /* ================= REOPEN + EMAIL ================= */

    if (ticket.status === "closed") {
      await env.DB.prepare(
        `UPDATE tickets SET status = 'open' WHERE id = ?`
      ).bind(ticket.id).run();

      await env.DB.prepare(
        `INSERT INTO audit_log
         (ticket_id, actor_type, actor_identifier, action, source)
         VALUES (?, 'user', ?, 'ticket_reopened', 'web')`
      ).bind(ticket.id, payload.email_hash).run();

      await sendBrevoMail(env, {
        to: env.SUPPORT_ADMIN_EMAIL,
        subject: `🔔 Ticket Reopened: ${code}`,
        body: `
Ticket ${code} has been reopened by the user.

Subject: ${ticket.subject}

Admin link:
https://infraforgelabs.in/support/admin#${code}
        `.trim()
      });
    }

    /* ================= INSERT REPLY ================= */

    const replyRes = await env.DB.prepare(
      `INSERT INTO replies
       (ticket_id, author_type, author_identifier, body)
       VALUES (?, 'user', ?, ?)`
    ).bind(ticket.id, payload.email_hash, message).run();

    const replyId = replyRes.meta.last_row_id;

    /* ================= UNREAD (ADMIN) ================= */
    await env.DB.prepare(
      `UPDATE tickets SET has_unread_admin = 1 WHERE id = ?`
    ).bind(ticket.id).run(); // ✅ ADD

    /* ================= ATTACHMENT ================= */

    if (file && validateAttachment(file).ok && env.ATTACHMENTS_BUCKET) {
      const key = `tickets/${code}/${crypto.randomUUID()}-${file.name}`;

      await env.ATTACHMENTS_BUCKET.put(
        key,
        file.stream(),
        { httpMetadata: { contentType: file.type } }
      );

      await env.DB.prepare(
        `INSERT INTO attachments
         (ticket_id, reply_id, filename, mime_type, size_bytes,
          r2_key, public_url, source, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'web', ?)`
      ).bind(
        ticket.id,
        replyId,
        file.name,
        file.type,
        file.size || 0,
        key,
        `https://attachments.infraforgelabs.in/${key}`,
        payload.email_hash
      ).run();
    }

    await env.DB.prepare(
      `INSERT INTO audit_log
       (ticket_id, actor_type, actor_identifier, action, source)
       VALUES (?, 'user', ?, 'reply_added', 'web')`
    ).bind(ticket.id, payload.email_hash).run();

    return Response.json({ ok: true });

  } catch (err) {
    console.error("User reply error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
