import { describe, expect, it } from "vitest";
import { buildSeedRows, HERO_SIZE, parseRating, parseRuntime, parseSizeBytes, personId } from "../src/db/transform.ts";
import { MOCK_CATALOG } from "../src/db/seed.ts";

describe("parsers", () => {
  it.each([
    ["1h 15m", 75],
    ["2h 04m", 124],
    ["2h", 120],
    ["45m", 45],
  ])("parseRuntime(%s) = %i", (label, minutes) => expect(parseRuntime(label)).toBe(minutes));

  it.each(["", "soon", "1x 2y"])("parseRuntime rejects %j", (label) => expect(() => parseRuntime(label)).toThrow());

  it("parseSizeBytes", () => {
    expect(parseSizeBytes("640 MB")).toBe(640_000_000);
    expect(parseSizeBytes("1.5 GB")).toBe(1_500_000_000);
    expect(parseSizeBytes("Stream Only")).toBeNull();
  });

  it("personId", () => {
    expect(personId("Elena Vance")).toBe("per-elena-vance");
    expect(personId("José  Rizal")).toBe("per-jose-rizal");
    expect(() => personId("한국")).toThrow();
  });

  it("parseRating", () => {
    expect(parseRating("8.9")).toBe(8.9);
    expect(() => parseRating("abc")).toThrow();
    expect(() => parseRating("11")).toThrow();
  });
});

describe("buildSeedRows on the real mock catalog", () => {
  const rows = buildSeedRows(MOCK_CATALOG);

  it("keeps every title and chapter", () => {
    expect(rows.movies).toHaveLength(MOCK_CATALOG.movies.length);
    expect(rows.series).toHaveLength(MOCK_CATALOG.series.length);
    expect(rows.chapters).toHaveLength(MOCK_CATALOG.series.flatMap((s) => s.chapters).length);
  });

  it("has no duplicate keys", () => {
    const dupes = (keys: string[]) => keys.length - new Set(keys).size;
    expect(dupes(rows.people.map((p) => p.id))).toBe(0);
    expect(dupes(rows.movieCast.map((c) => `${c.movieId}|${c.personId}`))).toBe(0);
    expect(dupes(rows.chapters.map((c) => c.id))).toBe(0);
    expect(dupes(rows.chapters.map((c) => `${c.seriesId}|${c.number}`))).toBe(0);
    expect(dupes(rows.chapterPages.map((p) => `${p.chapterId}|${p.pageNumber}`))).toBe(0);
    expect(dupes(rows.featuredSlots.map((s) => `${s.slot}|${s.mediaType}|${s.mediaId}`))).toBe(0);
  });

  it("converts display strings to numbers", () => {
    const horizon = rows.movies.find((m) => m.id === "mov-last-horizon")!;
    expect(horizon.runtimeMinutes).toBe(75);
    expect(horizon.rating).toBe(8.9);
    const license = rows.licenses.find((l) => l.movieId === "mov-last-horizon")!;
    expect(license).toMatchObject({ regionCode: null, canStream: true, canDownload: true, sizeBytes: 640_000_000 });
    expect(license).not.toHaveProperty("sizeLabel");
  });

  it("gives every movie with availability one worldwide license", () => {
    expect(rows.licenses).toHaveLength(MOCK_CATALOG.movies.filter((m) => m.availability).length);
    expect(rows.licenses.find((l) => l.movieId === "mov-after-rain")).toMatchObject({ canStream: true, canDownload: false, sizeBytes: null });
  });

  it("orders curation slots by trending rank", () => {
    const trending = rows.featuredSlots.filter((s) => s.slot === "trending" && s.mediaType === "movie");
    const expected = [...MOCK_CATALOG.movies].sort((a, b) => a.trendingRank - b.trendingRank).map((m) => m.id);
    expect(trending.map((s) => s.mediaId)).toEqual(expected);
    expect(rows.featuredSlots.filter((s) => s.slot === "hero")).toHaveLength(HERO_SIZE);
  });

  it("gives every chapter its own pages", () => {
    for (const ch of rows.chapters) {
      expect(rows.chapterPages.filter((p) => p.chapterId === ch.id).length).toBeGreaterThan(0);
    }
  });
});
