const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain"
]);

export function validateAttachment(file) {
  if (!file) {
    return { ok: false, error: "No file provided" };
  }

  if (file.size > MAX_ATTACHMENT_SIZE) {
    return { ok: false, error: "File too large (max 5MB)" };
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { ok: false, error: "Unsupported file type" };
  }

  return { ok: true };
}
