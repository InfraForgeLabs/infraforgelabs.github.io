import {
  hashEmail,
  hashPassword,
  verifyPassword
} from "../utils/crypto.js";
import { signJWT } from "../utils/jwt.js";

export async function handleUserAuth(request, env) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password || !fullName) {
      return Response.json(
        { ok: false, error: "Missing fields" },
        { status: 400 }
      );
    }

    if (!env.EMAIL_PEPPER || !env.JWT_SECRET) {
      return Response.json(
        { ok: false, error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    const emailHash = await hashEmail(email, env.EMAIL_PEPPER);

    // Check if user exists
    const existing = await env.DB.prepare(
      "SELECT id, password_hash FROM users WHERE email_hash = ?"
    ).bind(emailHash).first();

    let userId;

    if (!existing) {
      // 🔐 Register user
      const passwordHash = await hashPassword(
        password,
        env.EMAIL_PEPPER
      );

      const res = await env.DB.prepare(
        `INSERT INTO users (email_hash, password_hash, full_name)
         VALUES (?, ?, ?)`
      ).bind(
        emailHash,
        passwordHash,
        fullName
      ).run();

      userId = res.lastRowId;
    } else {
      // 🔐 Login user
      const ok = await verifyPassword(
        existing.password_hash,
        password,
        env.EMAIL_PEPPER
      );

      if (!ok) {
        return Response.json(
          { ok: false, error: "Invalid credentials" },
          { status: 401 }
        );
      }

      userId = existing.id;
    }

    // Issue JWT
    const token = await signJWT(
      {
        uid: userId,
        email_hash: emailHash
      },
      env.JWT_SECRET
    );

    return Response.json({
      ok: true,
      token
    });

  } catch (err) {
    console.error("User auth error:", err);

    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
