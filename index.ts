import { Elysia } from "elysia";
import { routes } from "./src/routes";

const app = new Elysia()
  .use(routes)
  .listen(process.env.PORT ?? 3000);

console.log(`Server running at http://localhost:${app.server?.port}`);
