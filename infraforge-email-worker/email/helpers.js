export function extractEmail(raw) {
  if (!raw) return "";
  const m = raw.match(/<([^>]+)>/);
  return m ? m[1].trim() : raw.trim();
}

export function normalizeMessageId(id) {
  if (!id) return null;
  return id.startsWith("<") ? id : `<${id}>`;
}

export function extractTicketIdFromSubject(subject) {
  const m = subject?.match(/\bINF-\d{4}-\d+\b/);
  return m ? m[0] : null;
}
