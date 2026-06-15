import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { loginUser, logoutUser } from "../services/auth.services";
import { authMiddleware } from "../middlewares/auth.middleware";
import { loginRateLimit } from "../middlewares/rate-limit.middleware";

export const authRoutes = new Elysia()
  .use(jwt({ name: "jwt", secret: process.env.JWT_SECRET! }))
  .use(loginRateLimit)
  .post(
    "/login",
    async ({ body, jwt, status }) => {
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
      await logoutUser(sessionId);
      return { data: "OK" };
    } catch (e) {
      return status(500, { error: "Internal Server Error" });
    }
  });
