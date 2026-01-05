export function assertId(id, label) {
  if (!id || typeof id !== "number" || id <= 0) {
    throw new Error(`Invalid ${label}: ${id}`);
  }
  return id;
}
