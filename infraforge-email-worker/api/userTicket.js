import { verifyJWT } from "../utils/jwt.js";

export async function handleUserTicket(request, env, ctx, params) {
  try {
    const auth = request.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return Response.json({ ok: false }, { status: 401 });
    }

    const payload = await verifyJWT(
      auth.slice(7),
      env.JWT_SECRET
    );
    if (!payload) {
      return Response.json({ ok: false }, { status: 401 });
    }

    const ticket = await env.DB.prepare(
      `SELECT * FROM tickets
       WHERE ticket_code = ?`
    ).bind(params.code).first();

    if (!ticket) {
      return Response.json({ ok: false }, { status: 404 });
    }

    // Ownership check via hashed email
    if (ticket.requester_email_hash !== payload.email_hash) {
      return Response.json({ ok: false }, { status: 403 });
    }

    const replies = await env.DB.prepare(
      `SELECT * FROM replies
       WHERE ticket_id = ?
       ORDER BY created_at ASC`
    ).bind(ticket.id).all();

    const attachments = await env.DB.prepare(
      `SELECT * FROM attachments
       WHERE ticket_id = ?`
    ).bind(ticket.id).all();

    return Response.json({
      ok: true,
      replies: replies.results,
      attachments: attachments.results
    });

  } catch (err) {
    console.error(err);
    return Response.json(
      { ok: false },
      { status: 500 }
    );
  }
}
