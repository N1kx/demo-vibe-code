import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { loginUser, logoutUser } from "../services/auth.services";
import { authMiddleware } from "../middlewares/auth.middleware";

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX = 5;
const WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (rec.count >= MAX) return false;
  rec.count++;
  return true;
}

export const authRoutes = new Elysia()
  .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET! }))
  .post(
    "/login",
    async ({ body, jwt, status, request }) => {
      const ip =
        request.headers.get("x-forwarded-for") ??
        request.headers.get("x-real-ip") ??
        "unknown";

      if (!checkRateLimit(ip)) {
        return status(429, { error: "Too many requests. Please try again later." });
      }

      try {
        const session = await loginUser(body);
        const token = await jwt.sign({
          sid: session.sessionId,
          username: session.username,
        });
        return { data: token };
      } catch (e) {
        return status(401, { error: (e as Error).message });
      }
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
      }),
    }
  )
  .use(authMiddleware)
  .post("/logout", async ({ sessionId, status }) => {
    try {
      await logoutUser(sessionId!);
      return { data: "OK" };
    } catch (e) {
      return status(500, { error: "Internal Server Error" });
    }
  });
