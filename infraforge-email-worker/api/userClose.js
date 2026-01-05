import { verifyJWT } from "../utils/jwt.js";

export async function handleUserClose(request, env, { code }) {
  try {
    if (request.method !== "POST") {
      return Response.json(
        { ok: false, error: "Method not allowed" },
        { status: 405 }
      );
    }

    const auth = request.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");
    const payload = await verifyJWT(token, env.JWT_SECRET);

    const ticket = await env.DB.prepare(
      `
      SELECT id
      FROM tickets
      WHERE ticket_code = ?
        AND requester_email_hash = ?
      `
    ).bind(code, payload.email_hash).first();

    if (!ticket) {
      return Response.json(
        { ok: false, error: "Ticket not found" },
        { status: 404 }
      );
    }

    await env.DB.prepare(
      `UPDATE tickets SET status = 'closed' WHERE id = ?`
    ).bind(ticket.id).run();

    await env.DB.prepare(
      `
      INSERT INTO audit_log
      (ticket_id, actor_type, actor_identifier, action, source)
      VALUES (?, 'user', ?, 'ticket_closed', 'web')
      `
    ).bind(ticket.id, payload.email_hash).run();

    return Response.json({ ok: true });

  } catch (err) {
    console.error("User close error:", err);
    return Response.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
}
