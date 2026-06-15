import { Elysia } from "elysia";

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX = 5;
const WINDOW_MS = 60_000;

export const loginRateLimit = new Elysia({ name: "login-rate-limit" }).onBeforeHandle(
  { as: "scoped" },
  ({ request, status }) => {
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
    const now = Date.now();
    const rec = attempts.get(ip);

    if (!rec || now > rec.resetAt) {
      attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
      return;
    }
    if (rec.count >= MAX) {
      return status(429, { error: "Too many requests. Please try again later." });
    }
    rec.count++;
  }
);
