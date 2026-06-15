import { describe, it, expect, beforeEach } from "bun:test";
import { db } from "../src/db";
import { userSessions } from "../src/db/schema/user_sessions";
import { users } from "../src/db/schema/users";
import { eq } from "drizzle-orm";
import { cleanDb, request, registerAndLogin } from "./helpers";
import { resetLoginAttempts } from "../src/routes/auth.routes";

describe("POST /api/login", () => {
  beforeEach(async () => {
    await cleanDb();
    resetLoginAttempts();
    await request("POST", "/api/users", {
      body: {
        username: "loginuser",
        full_name: "Login User",
        email: "login@test.com",
        password: "correctpass",
      },
    });
  });

  it("2.1 valid credentials return JWT token", async () => {
    const res = await request("POST", "/api/login", {
      body: { username: "loginuser", password: "correctpass" },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(typeof json.data).toBe("string");
    expect(json.data.split(".")).toHaveLength(3); // valid JWT format
  });

  it("2.2 unknown username returns 401 with generic message", async () => {
    const res = await request("POST", "/api/login", {
      body: { username: "nobody", password: "correctpass" },
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Username or password is not found. Please try again.");
  });

  it("2.3 wrong password returns same error message as 2.2", async () => {
    const res = await request("POST", "/api/login", {
      body: { username: "loginuser", password: "wrongpass" },
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Username or password is not found. Please try again.");
  });

  it("2.4 successful login creates a session row in user_sessions", async () => {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, "loginuser"))
      .limit(1);

    await request("POST", "/api/login", {
      body: { username: "loginuser", password: "correctpass" },
    });

    const sessions = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, user.id));

    expect(sessions).toHaveLength(1);
  });

  it("2.5 second login deletes old session, only 1 active session exists", async () => {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, "loginuser"))
      .limit(1);

    await request("POST", "/api/login", {
      body: { username: "loginuser", password: "correctpass" },
    });
    await request("POST", "/api/login", {
      body: { username: "loginuser", password: "correctpass" },
    });

    const sessions = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, user.id));

    expect(sessions).toHaveLength(1);
  });

  it("2.6 6th request from same IP+username within window returns 429", async () => {
    const headers = { "X-Forwarded-For": "10.0.0.99" };
    for (let i = 0; i < 5; i++) {
      await request("POST", "/api/login", {
        body: { username: "loginuser", password: "wrong" },
        headers,
      });
    }
    const res = await request("POST", "/api/login", {
      body: { username: "loginuser", password: "wrong" },
      headers,
    });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: "Too many requests. Please try again later.",
    });
  });

  it("2.7 rate limit does not block different username from same IP", async () => {
    const headers = { "X-Forwarded-For": "10.0.0.99" };
    for (let i = 0; i < 5; i++) {
      await request("POST", "/api/login", {
        body: { username: "loginuser", password: "wrong" },
        headers,
      });
    }
    // different username — should NOT be rate limited
    const res = await request("POST", "/api/login", {
      body: { username: "otheruser", password: "wrong" },
      headers,
    });
    expect(res.status).toBe(401); // auth error, not 429
  });

  it("2.8 missing required field returns 422", async () => {
    const res = await request("POST", "/api/login", {
      body: { username: "loginuser" },
    });
    expect(res.status).toBe(422);
  });
});

describe("POST /api/logout", () => {
  beforeEach(async () => {
    await cleanDb();
    resetLoginAttempts();
  });

  it("3.1 valid token logs out successfully", async () => {
    const token = await registerAndLogin("logoutuser");
    const res = await request("POST", "/api/logout", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: "OK" });
  });

  it("3.2 logout deletes session row from user_sessions", async () => {
    const token = await registerAndLogin("sessiondeluser");
    await request("POST", "/api/logout", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const sessions = await db.select().from(userSessions);
    expect(sessions).toHaveLength(0);
  });

  it("3.3 no Authorization header returns 401", async () => {
    const res = await request("POST", "/api/logout");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("3.4 malformed Authorization header (no Bearer prefix) returns 401", async () => {
    const token = await registerAndLogin("malformeduser");
    const res = await request("POST", "/api/logout", {
      headers: { Authorization: token },
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("3.5 invalid JWT signature returns 401", async () => {
    const res = await request("POST", "/api/logout", {
      headers: { Authorization: "Bearer invalid.jwt.token" },
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("3.6 valid JWT but session already deleted returns 401", async () => {
    const token = await registerAndLogin("doubleloutuser");
    await request("POST", "/api/logout", {
      headers: { Authorization: `Bearer ${token}` },
    });
    // second logout with same token
    const res = await request("POST", "/api/logout", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });
});
