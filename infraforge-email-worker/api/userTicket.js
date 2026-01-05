export async function handleUserTicket(request, env, ctx, { code }) {
  try {
    const ticket = await env.DB.prepare(
      "SELECT id FROM tickets WHERE ticket_code = ?"
    ).bind(code).first();

    if (!ticket) {
      return Response.json(
        { ok: false, error: "Ticket not found" },
        { status: 404 }
      );
    }

    /* ================= CLEAR USER UNREAD ================= */
    await env.DB.prepare(
      `UPDATE tickets SET has_unread_user = 0 WHERE id = ?`
    ).bind(ticket.id).run(); // ✅ ADD

    const replies = await env.DB.prepare(
      `
      SELECT
        r.id,
        r.body,
        r.created_at,
        r.author_type,
        COALESCE(u.full_name, 'InfraForge Support') AS author_name
      FROM replies r
      LEFT JOIN users u
        ON r.author_type = 'user'
       AND r.author_identifier = u.email_hash
      WHERE r.ticket_id = ?
      ORDER BY r.created_at ASC
      `
    ).bind(ticket.id).all();

    const attachments = await env.DB.prepare(
      `
      SELECT *
      FROM attachments
      WHERE ticket_id = ?
      ORDER BY created_at ASC
      `
    ).bind(ticket.id).all();

    return Response.json({
      ok: true,
      replies: replies.results || [],
      attachments: attachments.results || []
    });

  } catch (err) {
    console.error("User ticket read error:", err);
    return Response.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
