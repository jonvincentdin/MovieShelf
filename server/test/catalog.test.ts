import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.ts";
import { createDb } from "../src/db/client.ts";
import { MOCK_CATALOG, seed } from "../src/db/seed.ts";

const url = process.env.DATABASE_URL;

// Runs against a real Postgres (CI service, or `npm run db:up` locally). Skipped when no DATABASE_URL is set.
describe.skipIf(!url)("catalog API", () => {
  const { db, pool } = createDb(url!);
  const app = buildApp({ db });
  const get = async (path: string) => {
    const res = await app.inject({ method: "GET", url: path });
    return { status: res.statusCode, body: res.json() };
  };

  beforeAll(async () => {
    await migrate(db, { migrationsFolder: fileURLToPath(new URL("../src/db/migrations", import.meta.url)) });
    await seed(db);
    await seed(db); // idempotent
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  const trendingOrder = [...MOCK_CATALOG.movies].sort((a, b) => a.trendingRank - b.trendingRank).map((m) => m.id);

  it("GET /api/movies lists every movie in trending order", async () => {
    const { status, body } = await get("/api/movies");
    expect(status).toBe(200);
    expect(body.items.map((m: { id: string }) => m.id)).toEqual(trendingOrder);
  });

  it("GET /api/movies/:id returns the cleaned-up shape", async () => {
    const { status, body } = await get("/api/movies/mov-last-horizon");
    const mock = MOCK_CATALOG.movies.find((m) => m.id === "mov-last-horizon")!;
    expect(status).toBe(200);
    expect(body).toMatchObject({
      id: "mov-last-horizon",
      title: mock.title,
      runtimeMinutes: 75,
      rating: 8.9,
      languageCode: "EN",
      originalLanguage: "English",
      genres: mock.genres,
      director: mock.director,
      availability: { canStream: true, canDownload: true, sizeBytes: 640_000_000 },
    });
    expect(body.cast.map((c: { name: string }) => c.name)).toEqual(mock.cast.map((c) => c.name));
    expect(body).not.toHaveProperty("ReleaseLabel");
    expect(body).not.toHaveProperty("trendingRank");
    expect(Date.parse(body.updatedAt)).not.toBeNaN();
  });

  it.each([
    ["/api/movies/mov-does-not-exist", 404],
    ["/api/movies/not-a-movie-id", 400],
    ["/api/movies/MOV-UPPER", 400],
    ["/api/series/ser-nope", 404],
    ["/api/series/mov-last-horizon", 400],
    ["/api/series/ser-nope/chapters", 404],
    ["/api/chapters/ch-nope/pages", 404],
    ["/api/chapters/x/pages", 400],
    ["/api/meta/genres", 400],
    ["/api/meta/genres?type=book", 400],
  ])("GET %s → %i with the error format", async (path, expected) => {
    const { status, body } = await get(path);
    expect(status).toBe(expected);
    expect(body.error).toMatchObject({ code: expect.any(String), message: expect.any(String) });
  });

  it("GET /api/series computes chapter counts from real chapters", async () => {
    const { body } = await get("/api/series");
    expect(body.items).toHaveLength(MOCK_CATALOG.series.length);
    const redThread = body.items.find((s: { id: string }) => s.id === "ser-red-thread");
    const mock = MOCK_CATALOG.series.find((s) => s.id === "ser-red-thread")!;
    expect(redThread.chapterCount).toBe(mock.chapters.length);
    expect(redThread.latestChapter).toMatchObject({ id: "ch-rt-12", number: 12 });
    expect(redThread.alternateTitles).toEqual(mock.alternateTitles);
    expect(redThread).not.toHaveProperty("chapters");
  });

  it("GET /api/series/:id/chapters is ascending with page counts", async () => {
    const { status, body } = await get("/api/series/ser-paper-moon/chapters");
    expect(status).toBe(200);
    expect(body.items.map((c: { number: number }) => c.number)).toEqual([1, 2, 3]);
    expect(body.items.every((c: { pageCount: number }) => c.pageCount === 6)).toBe(true);
    expect(body.items[0]).not.toHaveProperty("defaultStatus");
  });

  it("GET /api/chapters/:id/pages returns ordered pages", async () => {
    const { status, body } = await get("/api/chapters/ch-pm-2/pages");
    expect(status).toBe(200);
    expect(body.seriesId).toBe("ser-paper-moon");
    expect(body.pages.map((p: { pageNumber: number }) => p.pageNumber)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(body.pages[0]).toMatchObject({ caption: expect.any(String), imageUrl: null });
  });

  it("GET /api/meta/* returns lookups", async () => {
    expect((await get("/api/meta/genres?type=movie")).body.items).toEqual(expect.arrayContaining(MOCK_CATALOG.movieGenres));
    expect((await get("/api/meta/genres?type=series")).body.items).toEqual(expect.arrayContaining(MOCK_CATALOG.seriesGenres));
    expect((await get("/api/meta/languages")).body.items).toHaveLength(MOCK_CATALOG.languages.length);
    expect((await get("/api/meta/regions")).body.items).toContainEqual({ code: "PH", name: "Philippines" });
  });

  it("GET /api/home rebuilds the frontend rails", async () => {
    const { status, body } = await get("/api/home");
    const ids = (list: { id: string }[]) => list.map((x) => x.id);
    expect(status).toBe(200);
    expect(ids(body.hero)).toEqual(trendingOrder.slice(0, 5));
    expect(ids(body.trending)).toEqual(trendingOrder);
    expect(ids(body.recentReleases)).toEqual(
      trendingOrder.filter((id) => MOCK_CATALOG.movies.find((m) => m.id === id)!.isRecentRelease),
    );
    expect(body.regionalPicks.every((m: { languageCode: string }) => ["TL", "JA", "KO"].includes(m.languageCode))).toBe(true);
    expect(ids(body.trendingSeries)).toEqual(MOCK_CATALOG.series.map((s) => s.id));
    expect(body.manhwa.every((s: { type: string }) => s.type === "Manhwa")).toBe(true);
    expect(body.manga.every((s: { type: string }) => s.type === "Manga")).toBe(true);
    expect(body.hero[0].kicker).toBe(MOCK_CATALOG.movies.find((m) => m.id === trendingOrder[0])!.kicker);
  });
});
