import { requireAdmin } from "../auth/admin.js";
import { sendBrevoMail } from "../brevo/client.js";
import { generateToken, expiresIn } from "../utils/ticketToken.js";

export async function handleAdminReply(request, env) {
  try {
    const auth = requireAdmin(request);
    if (auth) return auth;

    const { ticketCode, message } = await request.json();
    if (!ticketCode || !message) {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }

    const ticket = await env.DB.prepare(
      `SELECT id, requester_email_hash
       FROM tickets
       WHERE ticket_code = ?`
    ).bind(ticketCode).first();

    if (!ticket) {
      return Response.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Save reply
    await env.DB.prepare(
      `INSERT INTO replies
       (ticket_id, author_type, author_identifier, body)
       VALUES (?, 'admin', 'support', ?)`
    ).bind(ticket.id, message).run();

    // Create one-time token
    const token = generateToken();
    await env.DB.prepare(
      `INSERT INTO ticket_tokens
       (ticket_id, token, expires_at)
       VALUES (?, ?, ?)`
    ).bind(ticket.id, token, expiresIn(30)).run();

    const link =
      `https://infraforgelabs.in/support/?ticket=${ticketCode}&token=${token}`;

    // Send email
    await sendBrevoMail(env, {
      toHash: ticket.requester_email_hash,
      subject: `Reply to your ticket ${ticketCode}`,
      body: `
Hello,

We’ve replied to your support ticket (${ticketCode}).

Message:
${message}

View & reply securely:
${link}

This link expires in 30 minutes.

— InfraForge Labs Support
`
    });

    return Response.json({ ok: true });

  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
