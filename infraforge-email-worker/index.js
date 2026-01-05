import { handleAdminTickets } from "./api/adminTickets.js";
import { handleAdminTicket } from "./api/adminTicket.js";
import { handleAdminAttachment } from "./api/adminAttachment.js";
import { handleAdminStatus } from "./api/adminStatus.js";
import { handleAdminReply } from "./api/adminReply.js";

import { handlePublicTicket } from "./api/publicTicket.js";
import { handleUserAuth } from "./api/userAuth.js";
import { handleUserTicket } from "./api/userTicket.js";
import { handleUserTokenLogin } from "./api/userTokenLogin.js";
import { handleUserReply } from "./api/userReply.js";
import { handleUserTickets } from "./api/userTickets.js";
import { handleUserClose } from "./api/userClose.js";
import { handleUserCreateTicket } from "./api/userCreateTicket.js"; // ✅ ADD

import { processEmail } from "./email/inbound.js";

export default {
  fetch(request, env, ctx) {
    const url = new URL(request.url);

    /* ================= PUBLIC ================= */

    if (url.pathname === "/support/api/ticket")
      return handlePublicTicket(request, env);

    if (url.pathname === "/support/api/user/auth")
      return handleUserAuth(request, env);

    if (url.pathname === "/support/api/user/token-login")
      return handleUserTokenLogin(request, env);

    /* ================= USER ================= */

    if (url.pathname === "/support/api/user/ticket")
      return handleUserCreateTicket(request, env); // ✅ ADD

    if (url.pathname === "/support/api/user/tickets")
      return handleUserTickets(request, env);

    if (url.pathname.startsWith("/support/api/user/ticket/")) {
      const code = url.pathname.split("/").pop();
      return handleUserTicket(request, env, ctx, { code });
    }

    if (url.pathname.startsWith("/support/api/user/reply/")) {
      const code = url.pathname.split("/").pop();
      return handleUserReply(request, env, ctx, { code });
    }

    if (url.pathname.startsWith("/support/api/user/close/")) {
      const code = url.pathname.split("/").pop();
      return handleUserClose(request, env, { code });
    }

    /* ================= ADMIN ================= */

    if (url.pathname === "/support/api/admin/tickets")
      return handleAdminTickets(request, env);

    if (url.pathname.startsWith("/support/api/admin/ticket/")) {
      const code = url.pathname.split("/").pop();
      return handleAdminTicket(request, env, ctx, { id: code });
    }

    if (url.pathname === "/support/api/admin/reply")
      return handleAdminReply(request, env);

    if (url.pathname === "/support/api/admin/status")
      return handleAdminStatus(request, env);

    if (url.pathname === "/support/api/admin/attachment")
      return handleAdminAttachment(request, env);

    return Response.json({ error: "Not found" }, { status: 404 });
  },

  email(message, env, ctx) {
    return processEmail(message, env, ctx);
  }
};
