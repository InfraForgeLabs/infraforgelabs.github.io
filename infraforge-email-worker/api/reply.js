import { sendBrevoMail } from "../brevo/client";
import { requireAdmin } from "../auth/admin";
import { getAdminEmailFromAccess } from "../auth/access";

export async function handleReply(request, env) {
  requireAdmin(request);

  const adminEmail = getAdminEmailFromAccess(request);

  const { ticketId, message } = await request.json();
  if (!ticketId || !message) {
    return new Response("Missing fields", { status: 400 });
  }

  const ticket = await env.DB.prepare(
    "SELECT * FROM tickets WHERE ticket_id = ?"
  ).bind(ticketId).first();

  if (!ticket) {
    return new Response("Ticket not found", { status: 404 });
  }

  // Send reply
  const messageId = await sendBrevoMail(env, {
    to: ticket.from_email,
    subject: `Re: [${ticketId}] ${ticket.subject}`,
    body: message
  });

  // Store reply
  await env.DB.prepare(`
    INSERT INTO replies
    (ticket_id, direction, from_email, body, message_id)
    VALUES (?, 'outbound', ?, ?, ?)
  `).bind(
    ticketId,
    env.SMTP_FROM,
    message,
    messageId
  ).run();

  // Auto-close
  await env.DB.prepare(`
    UPDATE tickets
    SET status = 'closed'
    WHERE ticket_id = ?
  `).bind(ticketId).run();

  // Audit log
  await env.DB.prepare(`
    INSERT INTO audit_log
    (ticket_id, action, actor)
    VALUES (?, 'reply', ?)
  `).bind(ticketId, adminEmail).run();

  return Response.json({ ok: true, autoClosed: true });
}
