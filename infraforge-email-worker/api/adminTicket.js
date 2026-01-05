import { requireAdmin } from "../auth/admin.js";

export async function handleAdminTicket(request, env, ctx, params) {
  try {
    const admin = requireAdmin(request);
    if (admin instanceof Response) return admin;

    const ticketCode = params.id;

    const ticket = await env.DB.prepare(
      `SELECT * FROM tickets WHERE ticket_code = ?`
    ).bind(ticketCode).first();

    if (!ticket) {
      return Response.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    const replies = await env.DB.prepare(
      `SELECT * FROM replies
       WHERE ticket_id = ?
       ORDER BY created_at ASC`
    ).bind(ticket.id).all();

    const attachments = await env.DB.prepare(
      `SELECT * FROM attachments
       WHERE ticket_id = ?
       ORDER BY created_at ASC`
    ).bind(ticket.id).all();

    const auditLog = await env.DB.prepare(
      `SELECT * FROM audit_log
       WHERE ticket_id = ?
       ORDER BY created_at ASC`
    ).bind(ticket.id).all();

    return Response.json({
      ticket,
      replies: replies.results ?? [],
      attachments: attachments.results ?? [],
      auditLog: auditLog.results ?? []
    });

  } catch (err) {
    console.error("Admin ticket error:", err);

    if (err instanceof Response) return err;

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
