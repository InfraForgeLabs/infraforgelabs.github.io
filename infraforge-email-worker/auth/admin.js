export function requireAdmin(request, env) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.ADMIN_REPLY_TOKEN}`) {
    throw new Response("Unauthorized", { status: 401 });
  }
}
