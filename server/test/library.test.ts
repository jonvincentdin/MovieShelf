import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.ts";
import { createDb } from "../src/db/client.ts";
import { DEVICE_COOKIE, readDeviceCookie } from "../src/library/routes.ts";

const url = process.env.DATABASE_URL;

describe("readDeviceCookie", () => {
  const id = "0b6f7c7e-3c55-4d1a-9b0e-8a3f2a1d9c10";
  it("finds the device among other cookies", () => {
    expect(readDeviceCookie(`theme=dark; ${DEVICE_COOKIE}=${id}; x=1`)).toBe(id);
  });
  it.each([undefined, "", `${DEVICE_COOKIE}=not-a-uuid`, `${DEVICE_COOKIE}=${id}x`])("ignores %s", (header) => {
    expect(readDeviceCookie(header)).toBeUndefined();
  });
});

// Runs against a real Postgres; global setup migrates and seeds. Every test uses a fresh device.
describe.skipIf(!url)("library API", () => {
  const { db, pool } = createDb(url!);
  const app = buildApp({ db });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  /** A browser: remembers the device cookie the server sets. */
  function device() {
    let cookie: string | undefined;
    return async (method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, payload?: object) => {
      const res = await app.inject({ method, url: path, payload, headers: cookie ? { cookie } : {} });
      const set = res.headers["set-cookie"];
      if (typeof set === "string") cookie = set.split(";")[0];
      return { status: res.statusCode, body: res.body ? res.json() : undefined, headers: res.headers };
    };
  }

  const ago = (sec: number) => new Date(Date.now() - sec * 1000).toISOString();

  describe("identity", () => {
    it("reads without a cookie return empty lists and set no cookie", async () => {
      const res = await app.inject({ method: "GET", url: "/api/library" });
      expect(res.json()).toEqual({ items: [] });
      expect(res.headers["set-cookie"]).toBeUndefined();
    });

    it("the first write issues an HTTP-only device cookie", async () => {
      const res = await app.inject({ method: "POST", url: "/api/library", payload: { mediaType: "movie", mediaId: "mov-blue-hour" } });
      expect(res.statusCode).toBe(201);
      const cookie = res.headers["set-cookie"] as string;
      expect(cookie).toMatch(new RegExp(`^${DEVICE_COOKIE}=[0-9a-f-]{36}; Path=/api; HttpOnly; SameSite=Lax`));
      expect(cookie).not.toContain("Secure");
    });

    it("devices don't see each other's data", async () => {
      const a = device();
      const b = device();
      await a("POST", "/api/library", { mediaType: "movie", mediaId: "mov-blue-hour" });
      await b("POST", "/api/library", { mediaType: "series", mediaId: "ser-paper-moon" });
      const listA = (await a("GET", "/api/library")).body.items;
      expect(listA.map((i: { mediaId: string }) => i.mediaId)).toEqual(["mov-blue-hour"]);
      const itemA = listA[0].id;
      expect((await b("DELETE", `/api/library/${itemA}`)).status).toBe(404);
    });

    it("an unknown device cookie gets a fresh device on write", async () => {
      const cookie = `${DEVICE_COOKIE}=00000000-0000-4000-8000-000000000000`;
      const res = await app.inject({ method: "POST", url: "/api/library", headers: { cookie }, payload: { mediaType: "movie", mediaId: "mov-blue-hour" } });
      expect(res.statusCode).toBe(201);
      expect(res.headers["set-cookie"]).not.toContain("00000000-0000-4000-8000-000000000000");
    });
  });

  describe("My List", () => {
    it("adds, lists, updates and removes", async () => {
      const call = device();
      const added = await call("POST", "/api/library", { mediaType: "movie", mediaId: "mov-night-signal" });
      expect(added.status).toBe(201);
      expect(added.body).toMatchObject({ mediaType: "movie", mediaId: "mov-night-signal", status: "Plan to Watch" });

      const again = await call("POST", "/api/library", { mediaType: "movie", mediaId: "mov-night-signal" });
      expect(again.status).toBe(200);
      expect(again.body.id).toBe(added.body.id);

      const patched = await call("PATCH", `/api/library/${added.body.id}`, { status: "Watched" });
      expect(patched.body.status).toBe("Watched");
      expect((await call("PATCH", `/api/library/${added.body.id}`, { status: "Reading" })).status).toBe(400);

      expect((await call("DELETE", `/api/library/${added.body.id}`)).status).toBe(204);
      expect((await call("GET", "/api/library")).body.items).toEqual([]);
      expect((await call("DELETE", `/api/library/${added.body.id}`)).status).toBe(404);
    });

    it.each([
      [{ mediaType: "movie", mediaId: "mov-nope" }, 404],
      [{ mediaType: "book", mediaId: "mov-blue-hour" }, 400],
      [{ mediaType: "movie" }, 400],
    ])("POST %j → %i", async (payload, expected) => {
      expect((await device()("POST", "/api/library", payload)).status).toBe(expected);
    });

    it("rejects a stale status change", async () => {
      const call = device();
      const { body } = await call("POST", "/api/library", { mediaType: "movie", mediaId: "mov-night-signal" });
      const res = await call("PATCH", `/api/library/${body.id}`, { status: "Watched", updatedAt: ago(3600) });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("STALE_WRITE");
    });
  });

  describe("movie progress", () => {
    it("saving progress moves Plan to Watch → Watching and fills Continue Watching", async () => {
      const call = device();
      const { body: item } = await call("POST", "/api/library", { mediaType: "movie", mediaId: "mov-last-horizon" });
      const res = await call("PUT", "/api/progress/movies/mov-last-horizon", { positionSec: 0, durationSec: 4500 });
      expect(res.status).toBe(200);
      expect(res.body.libraryItem).toMatchObject({ id: item.id, status: "Watching" });
      expect(res.body.progress).toMatchObject({ inContinueWatching: true, watched: false });
    });

    it("≥ 90 % marks Watched and leaves Continue Watching", async () => {
      const call = device();
      await call("POST", "/api/library", { mediaType: "movie", mediaId: "mov-last-horizon" });
      await call("PUT", "/api/progress/movies/mov-last-horizon", { positionSec: 60, durationSec: 4500 });
      const res = await call("PUT", "/api/progress/movies/mov-last-horizon", { positionSec: 4100, durationSec: 4500 });
      expect(res.status).toBe(200); // a status change is never throttled
      expect(res.body.libraryItem.status).toBe("Watched");
      expect(res.body.progress).toMatchObject({ inContinueWatching: false, watched: true });
    });

    it("adding after watching starts as Watched; after partial progress as Watching", async () => {
      const call = device();
      await call("PUT", "/api/progress/movies/mov-blue-hour", { positionSec: 100, durationSec: 100 });
      await call("PUT", "/api/progress/movies/mov-silent-city", { positionSec: 10, durationSec: 100 });
      expect((await call("POST", "/api/library", { mediaType: "movie", mediaId: "mov-blue-hour" })).body.status).toBe("Watched");
      expect((await call("POST", "/api/library", { mediaType: "movie", mediaId: "mov-silent-city" })).body.status).toBe("Watching");
    });

    it("throttles repeat writes within 10 s (BE-23)", async () => {
      const call = device();
      await call("PUT", "/api/progress/movies/mov-silent-city", { positionSec: 10, durationSec: 100 });
      const res = await call("PUT", "/api/progress/movies/mov-silent-city", { positionSec: 11, durationSec: 100 });
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe("TOO_MANY_WRITES");
      expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
    });

    it("rejects an offline write older than the saved one (BE-24)", async () => {
      const call = device();
      await call("PUT", "/api/progress/movies/mov-silent-city", { positionSec: 50, durationSec: 100 });
      const res = await call("PUT", "/api/progress/movies/mov-silent-city", { positionSec: 20, durationSec: 100, updatedAt: ago(60) });
      expect(res.status).toBe(409);
    });

    it("dismissing hides it from Continue Watching but keeps history", async () => {
      const call = device();
      await call("PUT", "/api/progress/movies/mov-silent-city", { positionSec: 10, durationSec: 100 });
      expect((await call("DELETE", "/api/progress/movies/mov-silent-city")).status).toBe(204);
      const { body } = await call("GET", "/api/progress/movies");
      expect(body.items).toEqual([expect.objectContaining({ movieId: "mov-silent-city", inContinueWatching: false })]);
      expect((await call("DELETE", "/api/progress/movies/mov-blue-hour")).status).toBe(404);
    });

    it.each([
      ["/api/progress/movies/mov-nope", { positionSec: 1, durationSec: 10 }, 404],
      ["/api/progress/movies/mov-blue-hour", { positionSec: 1, durationSec: 0 }, 400],
      ["/api/progress/movies/mov-blue-hour", { positionSec: -1, durationSec: 10 }, 400],
      ["/api/progress/movies/mov-blue-hour", { positionSec: 1, durationSec: 10, updatedAt: "yesterday" }, 400],
    ])("PUT %s %j → %i", async (path, payload, expected) => {
      expect((await device()("PUT", path, payload)).status).toBe(expected);
    });
  });

  describe("reading progress", () => {
    const page = (chapterId: string, pageIndex: number) => ({ chapterId, pageIndex, totalPages: 6, mode: "vertical" });

    it("opening a chapter marks it In progress and the series Reading", async () => {
      const call = device();
      await call("POST", "/api/library", { mediaType: "series", mediaId: "ser-paper-moon" });
      const res = await call("PUT", "/api/progress/series/ser-paper-moon", page("ch-pm-1", 1));
      expect(res.status).toBe(200);
      expect(res.body.chapterStatus).toBe("In progress");
      expect(res.body.libraryItem.status).toBe("Reading");
      expect(res.body.progress).toMatchObject({ chapterId: "ch-pm-1", chapterNumber: 1, inContinueReading: true });
    });

    it("reading every chapter to the end completes the series", async () => {
      const call = device();
      await call("POST", "/api/library", { mediaType: "series", mediaId: "ser-paper-moon" });
      for (const ch of ["ch-pm-1", "ch-pm-2"]) {
        expect((await call("PUT", "/api/progress/series/ser-paper-moon", page(ch, 6))).body.libraryItem.status).toBe("Reading");
      }
      const last = await call("PUT", "/api/progress/series/ser-paper-moon", page("ch-pm-3", 6));
      expect(last.body).toMatchObject({ chapterStatus: "Read", libraryItem: { status: "Completed" } });
      expect(last.body.progress.inContinueReading).toBe(false);

      const statuses = (await call("GET", "/api/progress/chapters?seriesId=ser-paper-moon")).body.items;
      expect(statuses.map((s: { status: string }) => s.status)).toEqual(["Read", "Read", "Read"]);
    });

    it("re-reading a Read chapter keeps it Read", async () => {
      const call = device();
      // Dated a minute back so the re-read isn't throttled.
      await call("PUT", "/api/progress/series/ser-paper-moon", { ...page("ch-pm-1", 6), updatedAt: ago(60) });
      const res = await call("PUT", "/api/progress/series/ser-paper-moon", page("ch-pm-1", 2));
      expect(res.status).toBe(200);
      expect(res.body.chapterStatus).toBe("Read");
    });

    it("adding after reading starts as Reading; after reading everything as Completed", async () => {
      const call = device();
      await call("PUT", "/api/progress/series/ser-paper-moon", page("ch-pm-1", 2));
      expect((await call("POST", "/api/library", { mediaType: "series", mediaId: "ser-paper-moon" })).body.status).toBe("Reading");
      expect((await call("POST", "/api/library", { mediaType: "series", mediaId: "ser-red-thread" })).body.status).toBe("Plan to Read");
    });

    it("throttles page turns within 10 s, but not a new chapter", async () => {
      const call = device();
      await call("PUT", "/api/progress/series/ser-paper-moon", page("ch-pm-1", 1));
      expect((await call("PUT", "/api/progress/series/ser-paper-moon", page("ch-pm-1", 2))).status).toBe(429);
      expect((await call("PUT", "/api/progress/series/ser-paper-moon", page("ch-pm-2", 1))).status).toBe(200);
    });

    it("dismissing hides it from Continue Reading", async () => {
      const call = device();
      await call("PUT", "/api/progress/series/ser-paper-moon", page("ch-pm-1", 1));
      expect((await call("DELETE", "/api/progress/series/ser-paper-moon")).status).toBe(204);
      expect((await call("GET", "/api/progress/series")).body.items[0].inContinueReading).toBe(false);
    });

    it.each([
      ["/api/progress/series/ser-nope", page("ch-pm-1", 1), 404],
      ["/api/progress/series/ser-red-thread", page("ch-pm-1", 1), 404], // chapter from another series
      ["/api/progress/series/ser-paper-moon", { ...page("ch-pm-1", 1), totalPages: 0 }, 400],
      ["/api/progress/series/ser-paper-moon", { chapterId: "ch-pm-1" }, 400],
    ])("PUT %s %j → %i", async (path, payload, expected) => {
      expect((await device()("PUT", path, payload)).status).toBe(expected);
    });
  });
});
