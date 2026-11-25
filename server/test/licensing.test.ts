import { and, eq, isNotNull } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.ts";
import { pickAvailability } from "../src/catalog/availability.ts";
import { createDb } from "../src/db/client.ts";
import { licenses } from "../src/db/schema.ts";

type License = Parameters<typeof pickAvailability>[0][number];
let nextId = 1;
const lic = (over: Partial<License>): License => ({
  id: nextId++,
  movieId: "mov-x",
  regionCode: null,
  canStream: true,
  canDownload: true,
  format: "MP4",
  sizeBytes: 640_000_000,
  resolution: "1080p",
  startsOn: null,
  endsOn: null,
  ...over,
});
const today = "2026-11-25";

describe("pickAvailability (BE-35, BE-37)", () => {
  it("a downloadable license", () => {
    expect(pickAvailability([lic({})], "PH", today)).toMatchObject({
      canStream: true,
      canDownload: true,
      sizeBytes: 640_000_000,
      statusText: "MP4 • Eligible for download",
    });
  });

  it("a streaming-only license", () => {
    expect(pickAvailability([lic({ canDownload: false, sizeBytes: null })], "PH", today)).toMatchObject({
      canStream: true,
      canDownload: false,
      statusText: "Authorized for streaming • Download unavailable for this license",
    });
  });

  it("the region's own license beats the worldwide one", () => {
    const all = [lic({}), lic({ regionCode: "US", canDownload: false, sizeBytes: null })];
    expect(pickAvailability(all, "US", today).canDownload).toBe(false);
    expect(pickAvailability(all, "PH", today).canDownload).toBe(true);
  });

  it("ignores other regions' licenses", () => {
    expect(pickAvailability([lic({ regionCode: "US" })], "PH", today)).toMatchObject({
      canStream: false,
      statusText: "Not available in your region",
    });
  });

  it("an expired license flips to Streaming Unavailable", () => {
    expect(pickAvailability([lic({ endsOn: "2026-11-24" })], "PH", today)).toMatchObject({
      canStream: false,
      canDownload: false,
      statusText: "Streaming Unavailable",
    });
  });

  it("the end date is inclusive and reported", () => {
    expect(pickAvailability([lic({ endsOn: today })], "PH", today)).toMatchObject({ canStream: true, availableUntil: today });
  });

  it("an upcoming window says when it opens", () => {
    expect(pickAvailability([lic({ startsOn: "2026-12-01" })], "PH", today)).toMatchObject({
      canStream: false,
      availableFrom: "2026-12-01",
      statusText: "Catalog listing • Streaming window opens Dec 1, 2026",
    });
  });

  it("a catalog-only license", () => {
    expect(pickAvailability([lic({ canStream: false, canDownload: false })], "PH", today)).toMatchObject({
      canStream: false,
      statusText: "Catalog listing • Streaming window not yet open",
    });
  });

  it("an expired regional license falls back to an active worldwide one", () => {
    const all = [lic({ regionCode: "PH", endsOn: "2026-01-01" }), lic({ canDownload: false, sizeBytes: null })];
    expect(pickAvailability(all, "PH", today)).toMatchObject({ canStream: true, canDownload: false });
  });
});

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("availability in the API", () => {
  const { db, pool } = createDb(url!);
  const app = buildApp({ db });
  const harbor = eq(licenses.movieId, "mov-glass-harbor");
  afterAll(async () => {
    // Put the seeded worldwide license back the way the seed left it.
    await db.delete(licenses).where(and(harbor, isNotNull(licenses.regionCode)));
    await db.update(licenses).set({ endsOn: null }).where(harbor);
    await app.close();
    await pool.end();
  });

  const movie = async (id: string, headers: Record<string, string> = {}) =>
    (await app.inject({ method: "GET", url: `/api/movies/${id}`, headers })).json();

  it("matches the mock's availability for the seeded worldwide licenses", async () => {
    expect((await movie("mov-last-horizon")).availability).toMatchObject({
      canStream: true,
      canDownload: true,
      format: "MP4",
      sizeBytes: 640_000_000,
      statusText: "MP4 • Eligible for download",
    });
    expect((await movie("mov-after-rain")).availability).toMatchObject({ canStream: true, canDownload: false });
    expect((await movie("mov-crimson-orbit")).availability).toMatchObject({ canStream: false, canDownload: false });
  });

  it("follows the viewer's region and license windows", async () => {
    // A separate movie so other test files running in parallel aren't affected.
    await db.update(licenses).set({ endsOn: "2020-01-01" }).where(harbor); // worldwide license expired
    await db.insert(licenses).values({ movieId: "mov-glass-harbor", regionCode: "JP", canStream: true, canDownload: false });
    expect((await movie("mov-glass-harbor")).availability.statusText).toBe("Streaming Unavailable");
    expect((await movie("mov-glass-harbor", { "cf-ipcountry": "JP" })).availability).toMatchObject({
      canStream: true,
      canDownload: false,
    });
  });

  it("rejects a license that can download but not stream", async () => {
    await expect(
      db.insert(licenses).values({ movieId: "mov-glass-harbor", canStream: false, canDownload: true }),
    ).rejects.toThrow();
  });
});
