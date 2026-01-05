export async function handlePublicTicket(request, env) {
  try {
    const form = await request.formData();

    const email = form.get("email");
    const subject = form.get("subject");
    const message = form.get("message");
    const file = form.get("file");

    if (!email || !subject || !message) {
      return Response.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    const ticketCode = `INF-${Date.now().toString().slice(-6)}`;

    const ticket = await env.DB.prepare(
      `INSERT INTO tickets
       (ticket_code, subject, requester_email, source)
       VALUES (?, ?, ?, 'web')`
    ).bind(ticketCode, subject, email).run();

    const reply = await env.DB.prepare(
      `INSERT INTO replies
       (ticket_id, author_type, author_email, body)
       VALUES (?, 'user', ?, ?)`
    ).bind(ticket.lastRowId, email, message).run();

    if (file && file.size > 0) {
      const r2Key = `tickets/${ticketCode}/${crypto.randomUUID()}-${file.name}`;

      await env.ATTACHMENTS_BUCKET.put(
        r2Key,
        file.stream(),
        { httpMetadata: { contentType: file.type } }
      );

      await env.DB.prepare(
        `INSERT INTO attachments
         (ticket_id, reply_id, filename, mime_type, size_bytes,
          r2_key, public_url, source, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'web', ?)`
      ).bind(
        ticket.lastRowId,
        reply.lastRowId,
        file.name,
        file.type,
        file.size,
        r2Key,
        `https://attachments.infraforgelabs.in/${r2Key}`,
        email
      ).run();
    }

    return Response.json({ ok: true, ticketCode });

  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}
