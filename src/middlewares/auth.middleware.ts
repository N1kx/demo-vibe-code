import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { getSessionUser } from "../services/auth.services";

export const authMiddleware = new Elysia({ name: "auth-middleware" })
  .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET! }))
  .derive({ as: "scoped" }, async ({ jwt, headers }) => {
    const auth = headers.authorization ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    if (!token) return { user: null, sessionId: null };

    const payload = await jwt.verify(token);
    if (!payload || typeof payload.sid !== "string") {
      return { user: null, sessionId: null };
    }

    const user = await getSessionUser(payload.sid);
    return { user: user ?? null, sessionId: payload.sid };
  })
  .onBeforeHandle({ as: "scoped" }, ({ user, status }) => {
    if (!user) return status(401, { error: "Unauthorized" });
  });
