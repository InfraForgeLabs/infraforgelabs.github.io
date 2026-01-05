import { signJWT, verifyJWT } from "./jwt.js";

/**
 * Generate short-lived ticket magic token
 * Used for email deep-links
 */
export async function generateTicketToken(
  payload,
  secret,
  expiresInSeconds = 3600
) {
  return signJWT(
    {
      ...payload,
      type: "ticket",
    },
    secret,
    expiresInSeconds
  );
}

/**
 * Verify ticket magic token
 */
export async function verifyTicketToken(token, secret) {
  const data = await verifyJWT(token, secret);

  if (!data || data.type !== "ticket") {
    return null;
  }

  return data;
}

