import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { getSessionUser } from "../services/auth.services";

export const authMiddleware = new Elysia({ name: "auth-middleware" })
  .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET! }))
  .derive(async ({ jwt, headers, status }) => {
    const auth = headers.authorization ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    if (!token) return status(401, { error: "Unauthorized" });

    const payload = await jwt.verify(token);
    if (!payload || typeof payload.sid !== "string") {
      return status(401, { error: "Unauthorized" });
    }

    const user = await getSessionUser(payload.sid);
    if (!user) return status(401, { error: "Unauthorized" });

    return { user, sessionId: payload.sid };
  });
