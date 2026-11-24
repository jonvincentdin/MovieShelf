import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app.ts";
import { loadConfig } from "../src/config.ts";

describe("health", () => {
  it.each(["/health", "/api/health"])("GET %s returns { ok: true }", async (url) => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});

describe("config", () => {
  const DATABASE_URL = "postgres://u:p@localhost:5432/db";

  it("uses defaults", () => {
    expect(loadConfig({ DATABASE_URL })).toEqual({
      host: "127.0.0.1",
      port: 3001,
      corsOrigins: [],
      databaseUrl: DATABASE_URL,
    });
  });

  it("parses CORS_ORIGIN list", () => {
    expect(loadConfig({ DATABASE_URL, CORS_ORIGIN: "http://a.test, http://b.test" }).corsOrigins).toEqual([
      "http://a.test",
      "http://b.test",
    ]);
  });

  it.each(["0", "70000", "abc", "3.5"])("rejects PORT=%s", (PORT) => {
    expect(() => loadConfig({ DATABASE_URL, PORT })).toThrow(/Invalid PORT/);
  });

  it("rejects a malformed CORS origin", () => {
    expect(() => loadConfig({ DATABASE_URL, CORS_ORIGIN: "not a url" })).toThrow(/CORS_ORIGIN/);
  });

  it.each([undefined, "", "mysql://x"])("rejects DATABASE_URL=%s", (url) => {
    expect(() => loadConfig({ DATABASE_URL: url })).toThrow(/DATABASE_URL/);
  });
});

describe("error format", () => {
  it("404s with { error: { code, message } }", async () => {
    const res = await buildApp().inject({ method: "GET", url: "/api/nope" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: { code: "NOT_FOUND", message: "Route not found" } });
  });

  it("hides internal error details", async () => {
    const app = buildApp();
    app.get("/boom", async () => {
      throw new Error("db password is hunter2");
    });
    const res = await app.inject({ method: "GET", url: "/boom" });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
  });

  it("reports validation errors", async () => {
    const app = buildApp();
    app.get(
      "/needs-q",
      { schema: { querystring: { type: "object", required: ["q"], properties: { q: { type: "string" } } } } },
      async () => ({}),
    );
    const res = await app.inject({ method: "GET", url: "/needs-q" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });
});

describe("request IDs", () => {
  it("generates one when absent", async () => {
    const res = await buildApp().inject({ method: "GET", url: "/health" });
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("echoes a safe incoming ID", async () => {
    const res = await buildApp().inject({ method: "GET", url: "/health", headers: { "x-request-id": "abc-123" } });
    expect(res.headers["x-request-id"]).toBe("abc-123");
  });

  it("replaces an unsafe incoming ID", async () => {
    const res = await buildApp().inject({ method: "GET", url: "/health", headers: { "x-request-id": "a b<script>" } });
    expect(res.headers["x-request-id"]).not.toBe("a b<script>");
    expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("is also set on error responses", async () => {
    const res = await buildApp().inject({ method: "GET", url: "/missing" });
    expect(res.headers["x-request-id"]).toBeTruthy();
  });
});

describe("CORS", () => {
  const origin = "http://allowed.test";

  it("allows a configured origin", async () => {
    const res = await buildApp({ corsOrigins: [origin] }).inject({ method: "GET", url: "/health", headers: { origin } });
    expect(res.headers["access-control-allow-origin"]).toBe(origin);
  });

  it("does not allow other origins", async () => {
    const res = await buildApp({ corsOrigins: [origin] }).inject({
      method: "GET",
      url: "/health",
      headers: { origin: "http://evil.test" },
    });
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("is off by default", async () => {
    const res = await buildApp().inject({ method: "GET", url: "/health", headers: { origin } });
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
