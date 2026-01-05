import { requireAdmin } from "../auth/admin.js";

export async function handleAdminTickets(request, env) {
  try {
    // DEBUG 1: confirm handler is entered
    console.log("adminTickets: handler start");

    // DEBUG 2: check env.DB
    if (!env.DB) {
      console.error("adminTickets: env.DB is undefined");
      return Response.json(
        { error: "DB binding missing at runtime" },
        { status: 500 }
      );
    }

    // DEBUG 3: auth
    const auth = requireAdmin(request);
    if (auth) {
      console.warn("adminTickets: auth failed");
      return auth;
    }

    console.log("adminTickets: auth passed");

    // DEBUG 4: simple query (no columns)
    const result = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM tickets"
    ).first();

    console.log("adminTickets: DB OK", result);

    return Response.json({
      ok: true,
      ticketCount: result.count
    });

  } catch (err) {
    console.error("adminTickets: CAUGHT ERROR", err);

    return Response.json(
      {
        error: "Internal server error",
        detail: err?.message ?? "unknown"
      },
      { status: 500 }
    );
  }
}
