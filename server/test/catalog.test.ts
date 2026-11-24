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

  // ---- Phase 2: browse, pagination, search ----

  const ids = (body: { items: { id: string }[] }) => body.items.map((x) => x.id);
  const hits = (body: { items: { kind: string; item: { id: string } }[] }) => body.items.map((x) => `${x.kind}:${x.item.id}`);

  it("paginates movies with page metadata", async () => {
    const first = (await get("/api/movies?pageSize=4")).body;
    const third = (await get("/api/movies?pageSize=4&page=3")).body;
    expect(first).toMatchObject({ page: 1, pageSize: 4, total: trendingOrder.length });
    expect(ids(first)).toEqual(trendingOrder.slice(0, 4));
    expect(ids(third)).toEqual(trendingOrder.slice(8, 12));
    expect((await get("/api/movies?page=99")).body).toMatchObject({ items: [], total: trendingOrder.length });
  });

  it("filters movies like the Browse Movies page", async () => {
    const mocks = MOCK_CATALOG.movies;
    const drama = (await get("/api/movies?genre=Drama")).body;
    expect(ids(drama).sort()).toEqual(mocks.filter((m) => m.genres.includes("Drama")).map((m) => m.id).sort());

    const rated = (await get("/api/movies?minRating=8.5&language=EN&sort=rating")).body;
    const expected = mocks
      .filter((m) => m.languageCode === "EN" && parseFloat(m.rating) >= 8.5)
      .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    expect(ids(rated)).toEqual(expected.map((m) => m.id));

    const y = mocks[0].year;
    expect((await get(`/api/movies?year=${y}`)).body.items.every((m: { year: number }) => m.year === y)).toBe(true);
    expect(ids((await get("/api/movies?sort=az")).body)).toEqual(
      [...mocks].sort((a, b) => a.title.localeCompare(b.title)).map((m) => m.id),
    );
  });

  it("filters and sorts series like the Browse Manga page", async () => {
    const manga = (await get("/api/series?type=Manga&status=Ongoing")).body;
    expect(manga.items.length).toBeGreaterThan(0);
    expect(manga.items.every((s: { type: string; status: string }) => s.type === "Manga" && s.status === "Ongoing")).toBe(true);

    const byChapters = (await get("/api/series?sort=chapters")).body.items.map((s: { chapterCount: number }) => s.chapterCount);
    expect(byChapters).toEqual([...byChapters].sort((a, b) => b - a));
    const byRating = (await get("/api/series")).body.items.map((s: { rating: number }) => s.rating);
    expect(byRating).toEqual([...byRating].sort((a, b) => b - a));
  });

  it("paginates chapters", async () => {
    const { body } = await get("/api/series/ser-paper-moon/chapters?pageSize=2&page=2");
    expect(body).toMatchObject({ page: 2, pageSize: 2, total: 3 });
    expect(body.items.map((c: { number: number }) => c.number)).toEqual([3]);
  });

  it("searches titles, people and alternate titles", async () => {
    expect(hits((await get("/api/search?q=last%20horizon")).body)[0]).toBe("movie:mov-last-horizon");
    expect(hits((await get("/api/search?q=julian%20mercer")).body)).toContain("movie:mov-last-horizon"); // cast
    expect(hits((await get("/api/search?q=Dawn%20Blade")).body)).toContain("series:ser-daybreak-chronicle"); // alt title
  });

  it("tolerates typos", async () => {
    expect(hits((await get("/api/search?q=horizn")).body)[0]).toBe("movie:mov-last-horizon");
  });

  it("scopes, filters and paginates search", async () => {
    const manhwa = (await get("/api/search?q=a&scope=manhwa")).body;
    expect(manhwa.items.every((x: { kind: string; item: { type: string } }) => x.item.type === "Manhwa")).toBe(true);
    const movies = (await get("/api/search?q=a&scope=movies&genre=Drama&pageSize=2")).body;
    expect(movies.items).toHaveLength(2);
    expect(movies.total).toBeGreaterThanOrEqual(2);
    expect(movies.items.every((x: { item: { genres: string[] } }) => x.item.genres.includes("Drama"))).toBe(true);
  });

  it("treats LIKE wildcards literally", async () => {
    expect((await get("/api/search?q=%25")).body.total).toBe(0);
    // Only Paper Moon's artist ("studio_lantern") contains a literal underscore.
    expect(hits((await get("/api/search?q=_")).body)).toEqual(["series:ser-paper-moon"]);
  });

  it("suggests up to 4 movies and 4 series", async () => {
    const { status, body } = await get("/api/search/suggest?q=moon");
    expect(status).toBe(200);
    expect(body.series.map((s: { id: string }) => s.id)).toContain("ser-paper-moon");
    expect(body.movies.length).toBeLessThanOrEqual(4);
    expect(body.series.length).toBeLessThanOrEqual(4);
  });

  it.each([
    "/api/search",
    "/api/search?q=%20",
    "/api/search?q=x&scope=books",
    "/api/search/suggest",
    "/api/movies?pageSize=101",
    "/api/movies?page=0",
    "/api/movies?minRating=11",
    "/api/series?sort=rating",
  ])("GET %s → 400", async (path) => {
    const { status, body } = await get(path);
    expect(status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
