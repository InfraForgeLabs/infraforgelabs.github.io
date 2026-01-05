import { processEmail } from "./email/inbound";
import { handlePublicTicket } from "./api/publicTicket";
import { handleReply } from "./api/reply";
import { handleAdminRead } from "./api/adminRead";
import { handleAdminStatus } from "./api/adminStatus";

function cors(res) {
  res.headers.set("Access-Control-Allow-Origin", "https://infraforgelabs.in");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  return res;
}

export default {
  async email(message, env, ctx) {
    try { await message.forward("infraforgelabs@gmail.com"); } catch {}
    ctx.waitUntil(processEmail(message, env));
  },

  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return cors(new Response(null));
    }

    const url = new URL(request.url);

    if (url.pathname === "/support/api/ticket" && request.method === "POST")
      return cors(await handlePublicTicket(request, env));

    if (url.pathname === "/reply" && request.method === "POST")
      return cors(await handleReply(request, env));

    if (url.pathname === "/support/api/admin/status")
      return cors(await handleAdminStatus(request, env));

    if (url.pathname.startsWith("/support/api/admin"))
      return cors(await handleAdminRead(request, env, url));

    return new Response("Not found", { status: 404 });
  }
};
