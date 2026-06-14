import { Elysia } from "elysia";
import { usersRoutes } from "./users.routes";

export const routes = new Elysia({ prefix: "/api" })
  .get("/health", () => ({ status: "ok" }))
  .use(usersRoutes);
