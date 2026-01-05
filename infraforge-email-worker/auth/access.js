export function getAdminEmailFromAccess(request) {
  const jwt =
    request.headers.get("CF-Access-Jwt-Assertion") ||
    request.headers.get("Cf-Access-Jwt-Assertion");

  if (!jwt) return "unknown-admin";

  try {
    const payload = jwt.split(".")[1];
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );
    return decoded.email || "unknown-admin";
  } catch {
    return "unknown-admin";
  }
}
