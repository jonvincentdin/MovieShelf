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
  it("uses defaults", () => {
    expect(loadConfig({})).toEqual({ host: "127.0.0.1", port: 3001, corsOrigins: [] });
  });

  it("parses CORS_ORIGIN list", () => {
    expect(loadConfig({ CORS_ORIGIN: "http://a.test, http://b.test" }).corsOrigins).toEqual([
      "http://a.test",
      "http://b.test",
    ]);
  });

  it.each(["0", "70000", "abc", "3.5"])("rejects PORT=%s", (PORT) => {
    expect(() => loadConfig({ PORT })).toThrow(/Invalid PORT/);
  });

  it("rejects a malformed CORS origin", () => {
    expect(() => loadConfig({ CORS_ORIGIN: "not a url" })).toThrow(/CORS_ORIGIN/);
  });
});
