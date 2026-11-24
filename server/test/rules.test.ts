import { describe, expect, it } from "vitest";
import {
  changeTime,
  chapterStatusAfterProgress,
  initialMovieStatus,
  initialSeriesStatus,
  isStale,
  isThrottled,
  isWatched,
  movieStatusAfterProgress,
  seriesStatusAfterProgress,
} from "../src/library/rules.ts";

describe("movie rules", () => {
  it("counts ≥ 90 % as watched", () => {
    expect(isWatched(67.5, 75)).toBe(true);
    expect(isWatched(67.4, 75)).toBe(false);
    expect(isWatched(80, 75)).toBe(true);
  });

  it("starting or saving progress moves Plan to Watch → Watching", () => {
    expect(movieStatusAfterProgress("Plan to Watch", false)).toBe("Watching");
    expect(movieStatusAfterProgress("Watching", false)).toBe("Watching");
  });

  it("finishing marks Watched", () => {
    expect(movieStatusAfterProgress("Plan to Watch", true)).toBe("Watched");
    expect(movieStatusAfterProgress("Watching", true)).toBe("Watched");
  });

  it("rewatching below 90 % keeps Watched", () => {
    expect(movieStatusAfterProgress("Watched", false)).toBe("Watched");
  });

  it("adding to My List picks the status from history", () => {
    expect(initialMovieStatus({ watched: true, inContinueWatching: true })).toBe("Watched");
    expect(initialMovieStatus({ watched: false, inContinueWatching: true })).toBe("Watching");
    expect(initialMovieStatus({ watched: false, inContinueWatching: false })).toBe("Plan to Watch");
  });
});

describe("series rules", () => {
  it("opening or reading a chapter marks it In progress", () => {
    expect(chapterStatusAfterProgress(undefined, 1, 6)).toBe("In progress");
    expect(chapterStatusAfterProgress("Unread", 0, 6)).toBe("In progress");
  });

  it("reaching the last page marks it Read", () => {
    expect(chapterStatusAfterProgress("In progress", 6, 6)).toBe("Read");
  });

  it("re-reading a Read chapter keeps it Read", () => {
    expect(chapterStatusAfterProgress("Read", 2, 6)).toBe("Read");
  });

  it("every chapter read → Completed, otherwise Reading", () => {
    expect(seriesStatusAfterProgress(true)).toBe("Completed");
    expect(seriesStatusAfterProgress(false)).toBe("Reading");
  });

  it("adding to My List picks the status from history", () => {
    expect(initialSeriesStatus({ allChaptersRead: true, anyProgress: true })).toBe("Completed");
    expect(initialSeriesStatus({ allChaptersRead: false, anyProgress: true })).toBe("Reading");
    expect(initialSeriesStatus({ allChaptersRead: false, anyProgress: false })).toBe("Plan to Read");
  });
});

describe("sync rules", () => {
  const now = new Date("2026-11-25T12:00:00Z");

  it("uses the client's change time, capped at the server clock", () => {
    expect(changeTime("2026-11-25T11:00:00Z", now)).toEqual(new Date("2026-11-25T11:00:00Z"));
    expect(changeTime("2030-01-01T00:00:00Z", now)).toEqual(now);
    expect(changeTime(undefined, now)).toEqual(now);
  });

  it("rejects writes older than what's stored", () => {
    expect(isStale(now, new Date("2026-11-25T11:59:59Z"))).toBe(true);
    expect(isStale(now, now)).toBe(false);
    expect(isStale(undefined, now)).toBe(false);
  });

  it("throttles repeat progress writes for 10 s unless a status changes", () => {
    const fiveSecAgo = new Date(now.getTime() - 5_000);
    const elevenSecAgo = new Date(now.getTime() - 11_000);
    expect(isThrottled(fiveSecAgo, now, false)).toBe(true);
    expect(isThrottled(fiveSecAgo, now, true)).toBe(false);
    expect(isThrottled(elevenSecAgo, now, false)).toBe(false);
    expect(isThrottled(undefined, now, false)).toBe(false);
  });
});
