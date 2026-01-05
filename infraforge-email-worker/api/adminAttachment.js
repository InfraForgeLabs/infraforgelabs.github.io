import { requireAdmin } from "../auth/admin.js";
import { getAdminEmailFromAccess } from "../auth/access.js";
import { validateAttachment } from "../utils/attachments.js";

export async function handleAdminAttachment(request, env) {
  try {
    const admin = requireAdmin(request);
    if (admin instanceof Response) return admin;

    const adminEmail = getAdminEmailFromAccess(request);

    const formData = await request.formData();
    const file = formData.get("file");
    const ticketCode = formData.get("ticketCode");
    const replyId = formData.get("replyId") || null;

    if (!file || !ticketCode) {
      return Response.json(
        { error: "Missing file or ticketCode" },
        { status: 400 }
      );
    }

    // ✅ Validate attachment (size + type)
    const validation = validateAttachment(file);
    if (!validation.ok) {
      return Response.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Resolve ticket
    const ticket = await env.DB.prepare(
      `SELECT id FROM tickets WHERE ticket_code = ?`
    ).bind(ticketCode).first();

    if (!ticket) {
      return Response.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // R2 object key
    const r2Key = `tickets/${ticketCode}/${crypto.randomUUID()}-${file.name}`;

    // Upload to R2
    await env.ATTACHMENTS_BUCKET.put(r2Key, file.stream(), {
      httpMetadata: {
        contentType: file.type
      }
    });

    const publicUrl = `https://attachments.infraforgelabs.in/${r2Key}`;

    // Insert attachment record
    const result = await env.DB.prepare(
      `INSERT INTO attachments
       (ticket_id, reply_id, filename, mime_type, size_bytes,
        r2_key, public_url, source, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'admin_ui', ?)`
    ).bind(
      ticket.id,
      replyId,
      file.name,
      file.type,
      file.size,
      r2Key,
      publicUrl,
      adminEmail
    ).run();

    // Audit log
    await env.DB.prepare(
      `INSERT INTO audit_log
       (ticket_id, actor_type, actor_identifier, action, metadata)
       VALUES (?, 'admin', ?, 'attachment_added', ?)`
    ).bind(
      ticket.id,
      adminEmail,
      JSON.stringify({
        filename: file.name,
        mime_type: file.type,
        size: file.size
      })
    ).run();

    return Response.json({
      ok: true,
      attachmentId: result.lastRowId,
      url: publicUrl
    });

  } catch (err) {
    console.error("Admin attachment error:", err);

    if (err instanceof Response) return err;

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

