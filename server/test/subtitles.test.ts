import { afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.ts";
import { createDb } from "../src/db/client.ts";
import { MOCK_CATALOG } from "../src/db/seed.ts";
import { cuesToSrt, cuesToVtt, srtToVtt } from "../src/subtitles/format.ts";
import { parseVtt } from "../../src/api/subtitles.js";

const cues = [
  { start: 0, end: 15, text: "Every journey begins somewhere." },
  { start: 75.5, end: 3725.25, text: "Two\nlines" },
];

describe("subtitle formats", () => {
  it("SRT converts to WebVTT the player can parse back", () => {
    const vtt = srtToVtt(`﻿${cuesToSrt(cues).replace(/\n/g, "\r\n")}`);
    expect(vtt.startsWith("WEBVTT\n\n1\n00:00:00.000 --> 00:00:15.000\n")).toBe(true);
    expect(vtt).toContain("01:02:05.250");
    expect(parseVtt(vtt)).toEqual(cues);
  });

  it("parses VTT with headers, notes and cue settings", () => {
    const vtt = `${cuesToVtt(cues)}\nNOTE a comment\n\n00:10.000 --> 00:12.000 line:90%\nShort stamp\n`;
    expect(parseVtt(vtt)).toEqual([...cues, { start: 10, end: 12, text: "Short stamp" }]);
  });
});

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("subtitle API (Phase 5)", () => {
  const { db, pool } = createDb(url!);
  const app = buildApp({ db });
  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  const subs = MOCK_CATALOG.subtitles!;

  it("lists track metadata only, including per-movie copies of the old ALL tracks", async () => {
    const res = await app.inject({ method: "GET", url: "/api/movies/mov-last-horizon/subtitles" });
    const ids = res.json().items.map((t: { id: string }) => t.id);
    const own = subs.filter((s) => s.movieId === "mov-last-horizon").map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining([...own, "sub-en-general-last-horizon", "sub-tl-general-last-horizon"]));
    expect(res.json().items[0]).not.toHaveProperty("cues");
    expect(res.json().items[0]).not.toHaveProperty("content");
    expect(res.json().items.every((t: { movieId: string }) => t.movieId === "mov-last-horizon")).toBe(true);
  });

  it("filters by language", async () => {
    const res = await app.inject({ method: "GET", url: "/api/movies/mov-last-horizon/subtitles?lang=tl" });
    expect(res.json().items.every((t: { langCode: string }) => t.langCode === "tl")).toBe(true);
  });

  it.each(["sub-tl-horizon-web", "sub-en-horizon-web"])("serves %s as WebVTT with the mock's cues", async (id) => {
    const res = await app.inject({ method: "GET", url: `/api/subtitles/${id}` });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toBe("text/vtt; charset=utf-8");
    expect(parseVtt(res.body)).toEqual(subs.find((s) => s.id === id)!.cues);
  });

  it.each([
    ["/api/movies/mov-nope/subtitles", 404],
    ["/api/movies/mov-last-horizon/subtitles?lang=EN", 400],
    ["/api/subtitles/sub-nope", 404],
    ["/api/subtitles/../etc", 404],
  ])("GET %s → %i", async (path, expected) => {
    expect((await app.inject({ method: "GET", url: path })).statusCode).toBe(expected);
  });
});
