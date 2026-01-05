/**
 * Cloudflare Workers–safe crypto helpers
 * PBKDF2 + SHA-256 + per-user salt + global pepper
 */

const ITERATIONS = 100000; // ⬅ MAX supported by Cloudflare Workers
const KEY_LENGTH = 32;

export async function hashEmail(email, pepper) {
  const normalized = email.trim().toLowerCase();
  const data = new TextEncoder().encode(normalized + pepper);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bufferToHex(new Uint8Array(digest));
}

export async function hashPassword(password, pepper) {
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password + pepper),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256"
    },
    key,
    KEY_LENGTH * 8
  );

  return `${bufferToHex(salt)}:${bufferToHex(new Uint8Array(bits))}`;
}

export async function verifyPassword(stored, password, pepper) {
  const [saltHex, hashHex] = stored.split(":");
  const salt = hexToBuffer(saltHex);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password + pepper),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256"
    },
    key,
    KEY_LENGTH * 8
  );

  return bufferToHex(new Uint8Array(bits)) === hashHex;
}

/* ---------- helpers ---------- */

function bufferToHex(buf) {
  return [...buf].map(b => b.toString(16).padStart(2, "0")).join("");
}

function hexToBuffer(hex) {
  return new Uint8Array(
    hex.match(/.{1,2}/g).map(b => parseInt(b, 16))
  );
}
