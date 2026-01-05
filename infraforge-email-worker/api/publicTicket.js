import { generateTicketId } from "../util/ticket";
import { sendBrevoMail } from "../brevo/client";

export async function handlePublicTicket(request, env) {
  const { email, subject, message } = await request.json();

  const ticketId = generateTicketId();
  const messageId = `<${crypto.randomUUID()}@infraforgelabs.in>`;
  const slaDue = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  await env.DB.prepare(`
    INSERT INTO tickets
    (ticket_id, from_email, subject, body, message_id, status, sla_due_at)
    VALUES (?, ?, ?, ?, ?, 'open', ?)
  `).bind(
    ticketId,
    email,
    subject,
    message,
    messageId,
    slaDue
  ).run();

  await env.DB.prepare(`
    INSERT INTO replies
    (ticket_id, direction, from_email, body, message_id)
    VALUES (?, 'inbound', ?, ?, ?)
  `).bind(
    ticketId,
    email,
    message,
    messageId
  ).run();

  await sendBrevoMail(env, {
    to: email,
    subject: `[${ticketId}] ${subject}`,
    body: `Ticket received.\n\nTicket ID: ${ticketId}`
  });

  return Response.json({ ok: true, ticketId });
}
