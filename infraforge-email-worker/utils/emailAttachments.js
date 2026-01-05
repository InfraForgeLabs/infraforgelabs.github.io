const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain"
]);

export function validateEmailAttachment(attachment) {
  if (!attachment) return { ok: false };

  if (!ALLOWED_MIME_TYPES.has(attachment.contentType)) {
    return { ok: false };
  }

  if (attachment.size > MAX_SIZE) {
    return { ok: false };
  }

  return { ok: true };
}
