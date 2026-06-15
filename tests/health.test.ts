import { describe, it, expect } from "bun:test";
import { request } from "./helpers";

describe("GET /api/health", () => {
  it("5.1 returns ok without authentication", async () => {
    const res = await request("GET", "/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
