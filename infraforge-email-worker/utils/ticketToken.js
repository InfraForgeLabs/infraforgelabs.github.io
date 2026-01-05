export function generateToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export function expiresIn(minutes = 30) {
  return new Date(Date.now() + minutes * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}
