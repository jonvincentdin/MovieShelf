import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.ts";
import { createDb } from "../src/db/client.ts";
import { MOCK_CATALOG } from "../src/db/seed.ts";

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("Where to Watch and region (Phase 4)", () => {
  const { db, pool } = createDb(url!);
  const app = buildApp({ db });
  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  const get = async (path: string, headers: Record<string, string> = {}) => {
    const res = await app.inject({ method: "GET", url: path, headers });
    return { status: res.statusCode, body: res.json() };
  };
  const horizon = MOCK_CATALOG.movies.find((m) => m.id === "mov-last-horizon")! as unknown as {
    providersByRegion: Record<string, { id: string; name: string; type: string; price?: string }[]>;
  };

  it("returns a region's providers in order, PH by default", async () => {
    const { status, body } = await get("/api/movies/mov-last-horizon/providers");
    expect(status).toBe(200);
    expect(body).toMatchObject({ region: "PH", regionSource: "default" });
    expect(body.items.map((p: { id: string }) => p.id)).toEqual(horizon.providersByRegion.PH.map((p) => p.id));
    expect(body.items[2]).toMatchObject({ type: "Rent", price: "₱149" });
  });

  it("honours ?region= and the CDN country header", async () => {
    expect((await get("/api/movies/mov-last-horizon/providers?region=US")).body.items[1]).toMatchObject({ type: "Buy" });
    const viaHeader = await get("/api/movies/mov-last-horizon/providers", { "cf-ipcountry": "jp" });
    expect(viaHeader.body).toMatchObject({ region: "JP", regionSource: "header" });
    // Unknown countries fall back to PH.
    expect((await get("/api/me/region", { "cf-ipcountry": "ZZ" })).body).toEqual({ region: "PH", source: "default" });
  });

  it("a saved region beats the header", async () => {
    const put = await app.inject({ method: "PUT", url: "/api/me/region", payload: { region: "KR" } });
    expect(put.json()).toEqual({ region: "KR", source: "saved" });
    const cookie = (put.headers["set-cookie"] as string).split(";")[0];
    expect((await get("/api/me/region", { cookie, "cf-ipcountry": "US" })).body).toEqual({ region: "KR", source: "saved" });
    expect((await get("/api/movies/mov-last-horizon/providers", { cookie })).body.region).toBe("KR");
  });

  it("is empty for a region with no providers", async () => {
    const { body } = await get("/api/movies/mov-night-signal/providers?region=GB");
    expect(body.items).toEqual(expect.any(Array));
  });

  it.each([
    ["/api/movies/mov-nope/providers", 404],
    ["/api/movies/mov-last-horizon/providers?region=ZZ", 400],
    ["/api/movies/mov-last-horizon/providers?region=ph", 400],
  ])("GET %s → %i", async (path, expected) => {
    expect((await get(path)).status).toBe(expected);
  });

  it("rejects an unknown saved region", async () => {
    const res = await app.inject({ method: "PUT", url: "/api/me/region", payload: { region: "ZZ" } });
    expect(res.statusCode).toBe(400);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("trailers carry a videoUrl field (BE-28)", async () => {
    const { body } = await get("/api/movies/mov-last-horizon");
    expect(body.trailer).toMatchObject({ title: expect.any(String), videoUrl: null });
  });
});
