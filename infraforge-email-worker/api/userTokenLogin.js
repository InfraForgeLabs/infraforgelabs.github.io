import { signJWT } from "../utils/jwt.js";

export async function handleUserTokenLogin(request, env) {
  const { token } = await request.json();

  const row = await env.DB.prepare(
    `SELECT t.ticket_code, t.requester_email_hash
     FROM ticket_tokens tt
     JOIN tickets t ON t.id = tt.ticket_id
     WHERE tt.token = ?
       AND tt.expires_at > CURRENT_TIMESTAMP`
  ).bind(token).first();

  if (!row) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const jwt = await signJWT(
    { email_hash: row.requester_email_hash },
    env.JWT_SECRET
  );

  return Response.json({
    ok: true,
    token: jwt,
    ticketCode: row.ticket_code
  });
}
