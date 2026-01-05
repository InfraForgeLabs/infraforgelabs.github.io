import { verifyJWT } from "../utils/jwt.js";
import { hashEmail } from "../utils/crypto.js";

export async function handleUserTickets(request, env) {
  try {
    const auth = request.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");

    if (!token) {
      return Response.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await verifyJWT(token, env.JWT_SECRET);
    if (!payload || !payload.email) {
      return Response.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    /* ---------- EMAIL HASH (SOURCE OF TRUTH) ---------- */
    const emailHash = await hashEmail(payload.email, env.EMAIL_PEPPER);

    /* ---------- FETCH TICKETS ---------- */
    const tickets = await env.DB.prepare(
      `
      SELECT
        ticket_code,
        subject,
        status,
        priority,
        has_unread_user,
        created_at
      FROM tickets
      WHERE requester_email_hash = ?
      ORDER BY created_at DESC
      `
    ).bind(emailHash).all();

    return Response.json({
      ok: true,
      tickets: tickets.results || []
    });

  } catch (err) {
    console.error("User tickets error:", err);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

