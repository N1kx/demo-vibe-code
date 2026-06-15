import { Elysia, t } from "elysia";
import { registerUser } from "../services/users.services";
import { authMiddleware } from "../middlewares/auth.middleware";

export const usersRoutes = new Elysia()
  .post(
    "/users",
    async ({ body, status }) => {
      try {
        await registerUser(body);
        return { data: "OK" };
      } catch (e) {
        return status(409, { error: (e as Error).message });
      }
    },
    {
      body: t.Object({
        username: t.String(),
        full_name: t.String(),
        email: t.String(),
        password: t.String(),
      }),
    }
  )
  .use(authMiddleware)
  .get("/users/current", ({ user }) => {
    return { data: user };
  });
