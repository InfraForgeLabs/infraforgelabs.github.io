import { requireAdmin } from "../auth/admin";
import { getAdminEmailFromAccess } from "../auth/access";

export async function handleAdminStatus(request, env) {
  requireAdmin(request);

  const adminEmail = getAdminEmailFromAccess(request);
  const { ticketId, status } = await request.json();

  if (!["open", "closed"].includes(status)) {
    return new Response("Invalid status", { status: 400 });
  }

  await env.DB.prepare(`
    UPDATE tickets SET status = ?
    WHERE ticket_id = ?
  `).bind(status, ticketId).run();

  await env.DB.prepare(`
    INSERT INTO audit_log
    (ticket_id, action, actor)
    VALUES (?, ?, ?)
  `).bind(
    ticketId,
    status === "closed" ? "close" : "open",
    adminEmail
  ).run();

  return Response.json({ ok: true });
}
