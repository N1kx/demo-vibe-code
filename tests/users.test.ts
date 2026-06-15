import { describe, it, expect, beforeEach } from "bun:test";
import { db } from "../src/db";
import { users } from "../src/db/schema/users";
import { eq } from "drizzle-orm";
import { cleanDb, request, registerAndLogin } from "./helpers";

describe("POST /api/users — Register", () => {
  beforeEach(cleanDb);

  it("1.1 valid request creates user and returns OK", async () => {
    const res = await request("POST", "/api/users", {
      body: {
        username: "newuser",
        full_name: "New User",
        email: "new@test.com",
        password: "secret123",
      },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: "OK" });
  });

  it("1.2 duplicate username returns 409", async () => {
    const body = {
      username: "dupeuser",
      full_name: "Dupe",
      email: "dupe@test.com",
      password: "secret123",
    };
    await request("POST", "/api/users", { body });
    const res = await request("POST", "/api/users", { body });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Username already exists." });
  });

  it("1.3 missing required field returns 422", async () => {
    const res = await request("POST", "/api/users", {
      body: { username: "nopass", full_name: "No Pass", email: "np@test.com" },
    });
    expect(res.status).toBe(422);
  });

  it("1.4 password is stored as hash, not plaintext", async () => {
    const plaintext = "myplaintextpassword";
    await request("POST", "/api/users", {
      body: {
        username: "hashcheck",
        full_name: "Hash Check",
        email: "hash@test.com",
        password: plaintext,
      },
    });
    const [user] = await db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.username, "hashcheck"))
      .limit(1);
    expect(user.password).not.toBe(plaintext);
    expect(await Bun.password.verify(plaintext, user.password)).toBe(true);
  });
});

describe("GET /api/users/current", () => {
  beforeEach(cleanDb);

  it("4.1 valid token returns user data", async () => {
    const token = await registerAndLogin("currentuser");
    const res = await request("GET", "/api/users/current", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toMatchObject({
      username: "currentuser",
      full_name: "Test User",
    });
    expect(typeof json.data.id).toBe("number");
  });

  it("4.2 response does not contain password or email", async () => {
    const token = await registerAndLogin("secureuser");
    const res = await request("GET", "/api/users/current", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    expect(json.data.password).toBeUndefined();
    expect(json.data.email).toBeUndefined();
  });

  it("4.3 no Authorization header returns 401", async () => {
    const res = await request("GET", "/api/users/current");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("4.4 invalid JWT returns 401", async () => {
    const res = await request("GET", "/api/users/current", {
      headers: { Authorization: "Bearer invalid.jwt.token" },
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("4.5 valid JWT but session deleted from DB returns 401", async () => {
    const token = await registerAndLogin("ghostuser");
    // logout to delete session
    await request("POST", "/api/logout", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await request("GET", "/api/users/current", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });
});
