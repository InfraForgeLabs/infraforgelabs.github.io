import { hashEmail, hashPassword } from "../utils/crypto.js";
import { signJWT } from "../utils/jwt.js";

/* ================== TICKET CODE ================== */
function generateTicketCode() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `INF-${ts}-${rand}`;
}

/* ================== CREATE PUBLIC TICKET ================== */
export async function handlePublicTicket(request, env) {
  try {
    if (request.method !== "POST") {
      return Response.json(
        { ok: false, error: "Method not allowed" },
        { status: 405 }
      );
    }

    /* ---------- FORM DATA ---------- */
    const form = await request.formData();

    const fullName = form.get("fullName");
    const email = form.get("email");
    const password = form.get("password");
    const subject = form.get("subject");
    const message = form.get("message");
    const file = form.get("file");

    if (!fullName || !email || !password || !subject || !message) {
      return Response.json(
        { ok: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    /* ---------- USER ---------- */
    const emailHash = await hashEmail(email, env.EMAIL_PEPPER);

    let user = await env.DB.prepare(
      "SELECT id FROM users WHERE email_hash = ?"
    ).bind(emailHash).first();

    let userId;

    if (!user) {
      const passwordHash = await hashPassword(password);

      const res = await env.DB.prepare(
        `INSERT INTO users (email_hash, password_hash, full_name)
         VALUES (?, ?, ?)`
      ).bind(emailHash, passwordHash, fullName).run();

      userId = res.lastRowId;
    } else {
      userId = user.id;
    }

    /* ---------- TICKET ---------- */
    const ticketCode = generateTicketCode();

    const ticketRes = await env.DB.prepare(
      `INSERT INTO tickets
       (ticket_code, subject, status, priority, requester_email_hash, source)
       VALUES (?, ?, 'open', 'normal', ?, 'web')`
    ).bind(ticketCode, subject, emailHash).run();

    const ticketId = ticketRes.lastRowId;

    /* ---------- FIRST MESSAGE ---------- */
    const replyRes = await env.DB.prepare(
      `INSERT INTO replies
       (ticket_id, author_type, author_identifier, body)
       VALUES (?, 'user', ?, ?)`
    ).bind(ticketId, emailHash, message).run();

    /* ---------- ATTACHMENT ---------- */
    if (file && file.size > 0 && env.ATTACHMENTS_BUCKET) {
      const key = `tickets/${ticketCode}/${crypto.randomUUID()}-${file.name}`;

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
        ticketId,
        replyRes.lastRowId,
        file.name,
        file.type,
        file.size,
        key,
        `https://attachments.infraforgelabs.in/${key}`,
        emailHash
      ).run();
    }

    /* ---------- AUDIT ---------- */
    await env.DB.prepare(
      `INSERT INTO audit_log
       (ticket_id, actor_type, actor_identifier, action)
       VALUES (?, 'user', ?, 'ticket_created')`
    ).bind(ticketId, emailHash).run();

    /* ---------- LOGIN TOKEN ---------- */
    const token = await signJWT(
      { uid: userId, email_hash: emailHash },
      env.JWT_SECRET
    );

    return Response.json({
      ok: true,
      ticketCode,
      token
    });

  } catch (err) {
    console.error("Public ticket error:", err);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
