import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.ts";
import { createDb } from "../src/db/client.ts";
import { MOCK_CATALOG } from "../src/db/seed.ts";
import { dayLabel, releaseLabel, runtimeLabel, sizeLabel, timeAgo } from "../../src/api/format.js";

// Tests the frontend's src/api/ against the real server: fetch is routed into app.inject.

describe("display labels", () => {
  const now = new Date(2026, 10, 25, 12); // 25 Nov 2026, local time

  it("formats runtime and size like the mock", () => {
    expect(runtimeLabel(75)).toBe("1h 15m");
    expect(runtimeLabel(122)).toBe("2h 02m");
    expect(runtimeLabel(45)).toBe("45m");
    expect(sizeLabel({ sizeBytes: 640_000_000 })).toBe("640 MB");
    expect(sizeLabel({ sizeBytes: 1_200_000_000 })).toBe("1.2 GB");
    expect(sizeLabel({ sizeBytes: null, canStream: true })).toBe("Stream Only");
    expect(sizeLabel({ sizeBytes: null, canStream: false })).toBe("Theatrical Window");
  });

  it("formats dates relative to today", () => {
    expect(releaseLabel("2026-11-25", now)).toBe("Today");
    expect(releaseLabel("2026-11-24", now)).toBe("Yesterday");
    expect(releaseLabel("2026-11-22", now)).toBe("3 Days Ago");
    expect(releaseLabel("2025-08-01", now)).toBe("Aug 2025");
    expect(dayLabel("2026-11-20", now)).toBe("5 days ago");
    expect(dayLabel("2026-10-30", now)).toBe("Oct 30, 2026");
    expect(timeAgo(new Date(now.getTime() - 30_000).toISOString(), now)).toBe("Just now");
    expect(timeAgo(new Date(now.getTime() - 2 * 3_600_000).toISOString(), now)).toBe("2 hours ago");
  });
});

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("src/api against the server", () => {
  const { db, pool } = createDb(url!);
  const app = buildApp({ db });
  let cookie: string | undefined;
  let requests: string[];

  beforeEach(() => {
    cookie = undefined; // a fresh browser per test
    requests = [];
    vi.resetModules(); // fresh sync queue per test
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("fetch", async (path: string, init: RequestInit = {}) => {
      const method = (init.method ?? "GET") as "GET";
      requests.push(`${method} ${path}`);
      const res = await app.inject({
        method,
        url: path,
        payload: init.body as string | undefined,
        headers: { ...(init.headers as Record<string, string>), ...(cookie ? { cookie } : {}) },
      });
      const set = res.headers["set-cookie"];
      if (typeof set === "string") cookie = set.split(";")[0];
      const headers = res.headers["retry-after"] ? { "retry-after": String(res.headers["retry-after"]) } : undefined;
      return new Response(res.statusCode === 204 ? null : res.body, { status: res.statusCode, headers });
    });
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    await app.close();
    await pool.end();
  });

  const loadSync = () => import("../../src/api/sync.js");

  it("fetchCatalog rebuilds the shape the pages were built on", async () => {
    const { fetchCatalog } = await import("../../src/api/catalog.js");
    const { movies, series } = await fetchCatalog();
    expect(movies).toHaveLength(MOCK_CATALOG.movies.length);
    for (const mock of MOCK_CATALOG.movies) {
      const m = movies.find((x: { id: string }) => x.id === mock.id)!;
      expect(m).toMatchObject({
        runtime: mock.runtime,
        rating: mock.rating,
        trendingRank: mock.trendingRank,
        isRecentRelease: Boolean(mock.isRecentRelease),
        availability: { sizeLabel: mock.availability!.sizeLabel },
      });
    }
    expect(series.map((s: { id: string }) => s.id)).toEqual(MOCK_CATALOG.series.map((s) => s.id));
    const paperMoon = series.find((s: { id: string }) => s.id === "ser-paper-moon")!;
    expect(paperMoon.chapters.map((c: { numberLabel: string }) => c.numberLabel)).toEqual(["Chapter 3", "Chapter 2", "Chapter 1"]);
    expect(paperMoon.latestChapterLabel).toBe("Chapter 3");
  });

  it("queued changes reach the server and come back from pullLibrary", async () => {
    const sync = await loadSync();
    sync.queueAddToList("movie", "mov-last-horizon");
    sync.queueMovieProgress("mov-last-horizon", 10, 75, false);
    sync.queueAddToList("series", "ser-paper-moon");
    sync.queueReadingProgress("ser-paper-moon", "ch-pm-1", 6, 6, "vertical");
    await sync.flush();
    expect(sync.pendingChanges()).toBe(0);

    const lib = await sync.pullLibrary();
    expect(lib.myList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ mediaId: "mov-last-horizon", status: "Watching" }),
        expect.objectContaining({ mediaId: "ser-paper-moon", status: "Reading" }),
      ]),
    );
    expect(lib.continueWatching).toEqual([expect.objectContaining({ movieId: "mov-last-horizon", positionSec: 10 })]);
    expect(lib.chapterStatuses).toEqual({ "ch-pm-1": "Read" });
    expect(lib.continueReading[0].chapterLabel).toBe("Chapter 1 — A New Beginning");
  });

  it("collapses the player's per-second saves into one request", async () => {
    const sync = await loadSync();
    for (let t = 1; t <= 30; t += 1) sync.queueMovieProgress("mov-silent-city", t, 105, false);
    await sync.flush();
    expect(requests.filter((r) => r.startsWith("PUT"))).toEqual(["PUT /api/progress/movies/mov-silent-city"]);
    expect((await sync.pullLibrary()).continueWatching[0].positionSec).toBe(30);
  });

  it("keeps changes while offline and sends them on reconnect", async () => {
    const sync = await loadSync();
    vi.stubGlobal("navigator", { onLine: false });
    sync.queueAddToList("movie", "mov-blue-hour");
    await sync.flush();
    expect(requests).toEqual([]);
    expect(sync.pendingChanges()).toBe(1);

    vi.stubGlobal("navigator", { onLine: true });
    await sync.flush();
    expect(sync.pendingChanges()).toBe(0);
    expect((await sync.pullLibrary()).myList.map((i: { mediaId: string }) => i.mediaId)).toEqual(["mov-blue-hour"]);
  });

  it("an add then remove made offline never reaches the server as an add", async () => {
    const sync = await loadSync();
    sync.queueAddToList("movie", "mov-blue-hour");
    sync.queueRemoveFromList("movie", "mov-blue-hour");
    await sync.flush();
    expect(requests.some((r) => r.startsWith("POST"))).toBe(false);
    expect((await sync.pullLibrary()).myList).toEqual([]);
  });

  it("finishing a movie survives a rewatch queued before the sync", async () => {
    const sync = await loadSync();
    sync.queueAddToList("movie", "mov-north-star");
    sync.queueMovieProgress("mov-north-star", 74, 75, true);
    sync.queueMovieProgress("mov-north-star", 5, 75, false);
    await sync.flush();
    const lib = await sync.pullLibrary();
    expect(lib.watchedMovies).toContain("mov-north-star");
    expect(lib.myList[0].status).toBe("Watched");
  });

  it("reading several chapters offline keeps every finished chapter", async () => {
    const sync = await loadSync();
    for (const ch of ["ch-pm-1", "ch-pm-2"]) {
      sync.queueReadingProgress("ser-paper-moon", ch, 6, 6, "vertical");
    }
    sync.queueReadingProgress("ser-paper-moon", "ch-pm-3", 2, 6, "vertical");
    await sync.flush();
    expect((await sync.pullLibrary()).chapterStatuses).toEqual({
      "ch-pm-1": "Read",
      "ch-pm-2": "Read",
      "ch-pm-3": "In progress",
    });
  });

  it("waits out a 429 and keeps the change", async () => {
    const sync = await loadSync();
    sync.queueMovieProgress("mov-silent-city", 10, 105, false);
    await sync.flush();
    sync.queueMovieProgress("mov-silent-city", 11, 105, false); // within 10 s, no status change
    await sync.flush();
    expect(requests.at(-1)).toBe("PUT /api/progress/movies/mov-silent-city");
    expect(sync.pendingChanges()).toBe(1);
    await sync.flush(); // still inside Retry-After: nothing sent
    expect(requests.filter((r) => r.startsWith("PUT"))).toHaveLength(2);
  });
});
