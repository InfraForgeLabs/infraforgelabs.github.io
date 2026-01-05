export async function signReplyToken(payload, secret) {
  const data = btoa(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

export async function verifyReplyToken(token, secret) {
  const [data, sig] = token.split(".");
  if (!data || !sig) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    Uint8Array.from(atob(sig), c => c.charCodeAt(0)),
    new TextEncoder().encode(data)
  );

  if (!ok) return null;

  const payload = JSON.parse(atob(data));
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}
