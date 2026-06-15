import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { loginUser, logoutUser } from "../services/auth.services";
import { authMiddleware } from "../middlewares/auth.middleware";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

type RateLimitEntry = { count: number; resetAt: number };
const loginAttempts = new Map<string, RateLimitEntry>();

function checkRateLimit(ip: string, username: string): boolean {
  const key = `${ip}:${username}`;
  const now = Date.now();
  const rec = loginAttempts.get(key);

  if (!rec || now > rec.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (rec.count >= MAX_ATTEMPTS) return false;
  rec.count++;
  return true;
}

function pruneExpiredAttempts(): void {
  const now = Date.now();
  for (const [key, rec] of loginAttempts) {
    if (now > rec.resetAt) loginAttempts.delete(key);
  }
}

export const authRoutes = new Elysia()
  .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET! }))
  .post(
    "/login",
    async ({ body, jwt, status, request }) => {
      pruneExpiredAttempts();

      const ip =
        request.headers.get("x-forwarded-for") ??
        request.headers.get("x-real-ip") ??
        "unknown";

      if (!checkRateLimit(ip, body.username)) {
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
    if (!sessionId) return status(400, { error: "Invalid session." });
    try {
      await logoutUser(sessionId);
      return { data: "OK" };
    } catch (e) {
      return status(500, { error: "Internal Server Error" });
    }
  });
