import {
  extractEmail,
  normalizeMessageId,
  extractTicketIdFromSubject
} from "./helpers";
import { generateTicketId } from "../util/ticket";
import { sendBrevoMail } from "../brevo/client";

const SLA_HOURS = 48;
const ADMIN_NOTIFY = "support@infraforgelabs.in";

export async function processEmail(message, env) {
  const fromEmail = extractEmail(message.from);
  const subject = message.headers.get("subject") || "(no subject)";
  const rawBody = await new Response(message.raw).text();

  const messageId =
    normalizeMessageId(message.headers.get("message-id")) ||
    `<${crypto.randomUUID()}@infraforgelabs.in>`;

  const ticketId = extractTicketIdFromSubject(subject);

  /* ─────────────────────────────
     INBOUND REPLY
     ───────────────────────────── */

  if (ticketId) {
    const ticket = await env.DB.prepare(
      "SELECT * FROM tickets WHERE ticket_id = ?"
    ).bind(ticketId).first();

    if (!ticket) return;

    // Store inbound reply
    await env.DB.prepare(`
      INSERT INTO replies
      (ticket_id, direction, from_email, body, message_id)
      VALUES (?, 'inbound', ?, ?, ?)
    `).bind(
      ticketId,
      fromEmail,
      rawBody.slice(0, 50000),
      messageId
    ).run();

    // Reopen if closed
    if (ticket.status === "closed") {
      const newSlaDue = new Date(
        Date.now() + SLA_HOURS * 60 * 60 * 1000
      ).toISOString();

      await env.DB.prepare(`
        UPDATE tickets
        SET status = 'open',
            sla_due_at = ?,
            sla_breached = 0
        WHERE ticket_id = ?
      `).bind(newSlaDue, ticketId).run();

      // Audit log
      await env.DB.prepare(`
        INSERT INTO audit_log
        (ticket_id, action, actor)
        VALUES (?, 'reopen', ?)
      `).bind(ticketId, fromEmail).run();

      // Notify admin
      await sendBrevoMail(env, {
        to: ADMIN_NOTIFY,
        subject: `🔁 Ticket Reopened: ${ticketId}`,
        body: `
Ticket ${ticketId} has been reopened by the user.

From: ${fromEmail}
Subject: ${ticket.subject}

Please review and respond.
`
      });
    }

    return;
  }

  /* ─────────────────────────────
     NEW TICKET
     ───────────────────────────── */

  const newTicketId = generateTicketId();
  const slaDue = new Date(
    Date.now() + SLA_HOURS * 60 * 60 * 1000
  ).toISOString();

  await env.DB.prepare(`
    INSERT INTO tickets
    (ticket_id, from_email, subject, body, message_id, status, sla_due_at, sla_breached)
    VALUES (?, ?, ?, ?, ?, 'open', ?, 0)
  `).bind(
    newTicketId,
    fromEmail,
    subject,
    rawBody.slice(0, 50000),
    messageId,
    slaDue
  ).run();

  await env.DB.prepare(`
    INSERT INTO replies
    (ticket_id, direction, from_email, body, message_id)
    VALUES (?, 'inbound', ?, ?, ?)
  `).bind(
    newTicketId,
    fromEmail,
    rawBody.slice(0, 50000),
    messageId
  ).run();

  await sendBrevoMail(env, {
    to: fromEmail,
    subject: `[${newTicketId}] ${subject}`,
    body: `
Hello,

We’ve received your support request.

Ticket ID: ${newTicketId}

— InfraForge Labs Support
`
  });
}
