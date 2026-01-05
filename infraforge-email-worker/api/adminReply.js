import { requireAdmin } from "../auth/admin.js";
import { sendBrevoMail } from "../brevo/client.js";
import { generateTicketToken } from "../utils/ticketToken.js";
import { signReplyToken } from "../utils/emailReplyToken.js"; // ✅ ADD

export async function handleAdminReply(request, env) {
  try {
    requireAdmin(request);

    const { ticketCode, message } = await request.json();
    if (!ticketCode || !message) {
      return Response.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    /* ---------------- FETCH TICKET ---------------- */
    const ticket = await env.DB.prepare(
      `SELECT id, ticket_code, subject, requester_email, requester_email_hash
       FROM tickets
       WHERE ticket_code = ?`
    ).bind(ticketCode).first();

    if (!ticket) {
      return Response.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    /* ---------------- SAVE REPLY ---------------- */
    await env.DB.prepare(
      `INSERT INTO replies
       (ticket_id, author_type, author_identifier, body)
       VALUES (?, 'admin', 'support', ?)`
    ).bind(ticket.id, message).run();

    /* ---------------- UNREAD (USER) ---------------- */
    await env.DB.prepare(
      `UPDATE tickets SET has_unread_user = 1 WHERE id = ?`
    ).bind(ticket.id).run(); // ✅ ADD

    /* ---------------- AUDIT ---------------- */
    await env.DB.prepare(
      `INSERT INTO audit_log
       (ticket_id, actor_type, actor_identifier, action)
       VALUES (?, 'admin', 'support', 'reply_sent')`
    ).bind(ticket.id).run();

    /* ---------------- EMAIL TOKEN ---------------- */
    const replyToken = await signReplyToken({   // ✅ ADD
      ticket_id: ticket.id,
      email_hash: ticket.requester_email_hash,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
    }, env.EMAIL_REPLY_SECRET);

    const token = await generateTicketToken(
      { ticket_code: ticket.ticket_code, scope: "user" },
      env.JWT_SECRET,
      60 * 60 * 24 * 3
    );

    const ticketUrl =
      `https://infraforgelabs.in/support/?ticket=${ticket.ticket_code}&token=${token}`;

    /* ---------------- EMAIL USER ---------------- */
    await sendBrevoMail(env, {
      to: ticket.requester_email,
      subject: `Reply to your support ticket ${ticket.ticket_code}`,
      replyTo: { // ✅ ADD
        email: `reply+${replyToken}@support.infraforgelabs.in`
      },
      html: `
        <p>Hello,</p>
        <p>Our support team has replied:</p>
        <blockquote>${message.replace(/\n/g, "<br>")}</blockquote>
        <p><a href="${ticketUrl}">View & reply</a></p>
      `
    });

    return Response.json({ ok: true });

  } catch (err) {
    console.error("Admin reply error:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
