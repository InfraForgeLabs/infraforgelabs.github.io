export function requireAdmin(request) {
  const jwt = request.headers.get("Cf-Access-Jwt-Assertion");

  if (!jwt) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // optional: validate JWT here

  return null; // success
}
