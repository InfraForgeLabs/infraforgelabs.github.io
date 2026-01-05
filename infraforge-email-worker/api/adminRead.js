import { requireAdmin } from "../auth/admin";
import { sendBrevoMail } from "../brevo/client";

export async function handleAdminRead(request, env, url) {
  requireAdmin(request);

  const now = new Date();

  /* ─────────────────────────────
     LIST TICKETS + SLA CHECK
     ───────────────────────────── */

  if (url.pathname === "/support/api/admin/tickets") {
    const r = await env.DB.prepare(`
      SELECT
        ticket_id,
        from_email,
        subject,
        status,
        sla_due_at,
        sla_breached,
        created_at
      FROM tickets
      ORDER BY created_at DESC
    `).all();

    for (const t of r.results) {
      if (
        t.status === "open" &&
        t.sla_due_at &&
        new Date(t.sla_due_at) < now &&
        t.sla_breached === 0
      ) {
        await sendBrevoMail(env, {
          to: "support@infraforgelabs.in",
          subject: `⚠ SLA BREACH: ${t.ticket_id}`,
          body: `
SLA BREACHED

Ticket: ${t.ticket_id}
From: ${t.from_email}
Subject: ${t.subject}
`
        });

        await env.DB.prepare(`
          UPDATE tickets
          SET sla_breached = 1
          WHERE ticket_id = ?
        `).bind(t.ticket_id).run();

        t.sla_breached = 1;
      }
    }

    return Response.json(r.results);
  }

  /* ─────────────────────────────
     SINGLE TICKET + THREAD + AUDIT
     ───────────────────────────── */

  if (url.pathname.startsWith("/support/api/admin/ticket/")) {
    const ticketId = url.pathname.split("/").pop();

    const ticket = await env.DB.prepare(
      "SELECT * FROM tickets WHERE ticket_id = ?"
    ).bind(ticketId).first();

    const replies = await env.DB.prepare(
      "SELECT * FROM replies WHERE ticket_id = ? ORDER BY created_at"
    ).bind(ticketId).all();

    const audit = await env.DB.prepare(
      "SELECT * FROM audit_log WHERE ticket_id = ? ORDER BY created_at"
    ).bind(ticketId).all();

    return Response.json({
      ticket,
      replies: replies.results,
      audit: audit.results
    });
  }

  return new Response("Not found", { status: 404 });
}
