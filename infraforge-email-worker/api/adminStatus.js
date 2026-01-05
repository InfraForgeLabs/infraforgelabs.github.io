import { requireAdmin } from "../auth/admin.js";
import { getAdminEmailFromAccess } from "../auth/access.js";

const ALLOWED_TRANSITIONS = {
  open: ["pending", "resolved"],
  pending: ["open", "resolved"],
  resolved: ["closed"],
  closed: []
};

export async function handleAdminStatus(request, env) {
  try {
    const admin = requireAdmin(request);
    if (admin instanceof Response) return admin;

    const adminEmail = getAdminEmailFromAccess(request);

    const { ticketCode, status } = await request.json();
    if (!ticketCode || !status) {
      return Response.json(
        { error: "Missing ticketCode or status" },
        { status: 400 }
      );
    }

    // Fetch ticket
    const ticket = await env.DB.prepare(
      `SELECT id, status FROM tickets WHERE ticket_code = ?`
    ).bind(ticketCode).first();

    if (!ticket) {
      return Response.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Validate transition
    const allowed = ALLOWED_TRANSITIONS[ticket.status] || [];
    if (!allowed.includes(status)) {
      return Response.json(
        {
          error: "Invalid status transition",
          from: ticket.status,
          to: status
        },
        { status: 400 }
      );
    }

    // Update status
    await env.DB.prepare(
      `UPDATE tickets
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(status, ticket.id).run();

    // Audit log
    await env.DB.prepare(
      `INSERT INTO audit_log
       (ticket_id, actor_type, actor_identifier, action, metadata)
       VALUES (?, 'admin', ?, 'status_changed', ?)`
    ).bind(
      ticket.id,
      adminEmail,
      JSON.stringify({ from: ticket.status, to: status })
    ).run();

    return Response.json({
      ok: true,
      ticketCode,
      status
    });

  } catch (err) {
    console.error("Admin status error:", err);

    if (err instanceof Response) return err;

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
