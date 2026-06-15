import { Elysia } from "elysia";
import { usersRoutes } from "./users.routes";
import { authRoutes } from "./auth.routes";

export const routes = new Elysia({ prefix: "/api" })
  .get("/health", () => ({ status: "ok" }))
  .use(usersRoutes)
  .use(authRoutes);
