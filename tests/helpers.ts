import { db } from "../src/db";
import { userSessions } from "../src/db/schema/user_sessions";
import { users } from "../src/db/schema/users";
import { routes } from "../src/routes";
import { Elysia } from "elysia";

export const app = new Elysia().use(routes);

export async function cleanDb(): Promise<void> {
  await db.delete(userSessions);
  await db.delete(users);
}

export async function request(
  method: string,
  path: string,
  options: { body?: unknown; headers?: Record<string, string> } = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  );
}

export async function registerAndLogin(
  username = "testuser",
  password = "testpass123"
): Promise<string> {
  await request("POST", "/api/users", {
    body: { username, full_name: "Test User", email: `${username}@test.com`, password },
  });
  const res = await request("POST", "/api/login", { body: { username, password } });
  const json = await res.json();
  return json.data as string;
}
