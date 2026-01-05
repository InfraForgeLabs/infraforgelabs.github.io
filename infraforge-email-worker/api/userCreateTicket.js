import { verifyJWT } from "../utils/jwt.js";

/* ================== TICKET CODE ================== */
function generateTicketCode() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `INF-${ts}-${rand}`;
}

/* ================== CREATE AUTHENTICATED TICKET ================== */
export async function handleUserCreateTicket(request, env) {
  try {
    if (request.method !== "POST") {
      return Response.json(
        { ok: false, error: "Method not allowed" },
        { status: 405 }
      );
    }

    /* ---------- AUTH ---------- */
    const auth = request.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");

    if (!token) {
      return Response.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token, env.JWT_SECRET);

    // 🔒 FIX: only rely on email (matches rest of system)
    if (!payload || !payload.email) {
      return Response.json(
        { ok: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    /* ---------- USER ---------- */
    const user = await env.DB.prepare(
      `
      SELECT id, full_name, email_hash
      FROM users
      WHERE email = ?
      `
    ).bind(payload.email).first();

    if (!user) {
      return Response.json(
        { ok: false, error: "User not found" },
        { status: 401 }
      );
    }

    /* ---------- FORM DATA ---------- */
    const form = await request.formData();
    const subject = form.get("subject");
    const message = form.get("message");
    const file = form.get("file");

    if (!subject || !message) {
      return Response.json(
        { ok: false, error: "Subject and message are required" },
        { status: 400 }
      );
    }

    /* ---------- TICKET ---------- */
    const ticketCode = generateTicketCode();

    const ticketRes = await env.DB.prepare(
      `
      INSERT INTO tickets
      (ticket_code, subject, status, priority, requester_email_hash, source, has_unread_admin)
      VALUES (?, ?, 'open', 'normal', ?, 'web', 1)
      `
    ).bind(
      ticketCode,
      subject,
      user.email_hash
    ).run();

    const ticketId = ticketRes.lastRowId;

    /* ---------- FIRST MESSAGE ---------- */
    const replyRes = await env.DB.prepare(
      `
      INSERT INTO replies
      (ticket_id, author_type, author_identifier, body)
      VALUES (?, 'user', ?, ?)
      `
    ).bind(
      ticketId,
      user.email_hash,
      message
    ).run();

    /* ---------- ATTACHMENT (OPTIONAL) ---------- */
    if (file && file.size > 0 && env.ATTACHMENTS_BUCKET) {
      const key = `tickets/${ticketCode}/${crypto.randomUUID()}-${file.name}`;

      await env.ATTACHMENTS_BUCKET.put(
        key,
        file.stream(),
        { httpMetadata: { contentType: file.type } }
      );

      await env.DB.prepare(
        `
        INSERT INTO attachments
        (ticket_id, reply_id, filename, mime_type, size_bytes,
         r2_key, public_url, source, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'web', ?)
        `
      ).bind(
        ticketId,
        replyRes.lastRowId,
        file.name,
        file.type,
        file.size,
        key,
        `https://attachments.infraforgelabs.in/${key}`,
        user.email_hash
      ).run();
    }

    /* ---------- AUDIT ---------- */
    await env.DB.prepare(
      `
      INSERT INTO audit_log
      (ticket_id, actor_type, actor_identifier, action)
      VALUES (?, 'user', ?, 'ticket_created')
      `
    ).bind(
      ticketId,
      user.email_hash
    ).run();

    return Response.json({
      ok: true,
      ticketCode
    });

  } catch (err) {
    console.error("User create ticket error:", err);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
