export function generateTicketId() {
  const d = new Date();
  return `INF-${d.getFullYear()}-${Date.now()}`;
}
