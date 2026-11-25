import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.ts";
import { createDb } from "../src/db/client.ts";
import { movieCast, movieGenres, movies } from "../src/db/schema.ts";
import { seed } from "../src/db/seed.ts";
import { clearTmdbCache, createTmdb, type TmdbMovie } from "../src/tmdb/client.ts";
import { importTmdbMovie } from "../src/tmdb/import.ts";
import { pickTrailer, sameTitle, toProviders } from "../src/tmdb/movies.ts";
import { youtubeId } from "../../src/api/format.js";

const fightClub: TmdbMovie = {
  id: 550,
  imdb_id: "tt0137523",
  title: "Fight Club",
  original_title: "Fight Club",
  original_language: "en",
  release_date: "1999-10-15",
  runtime: 139,
  vote_average: 8.438,
  overview: "A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression. More text.",
  tagline: "Mischief. Mayhem. Soap.",
  genres: [{ id: 18, name: "Drama" }, { id: 53, name: "Thriller" }],
  credits: {
    cast: [
      { name: "Edward Norton", character: "Narrator", order: 0 },
      { name: "Brad Pitt", character: "Tyler Durden", order: 1 },
    ],
    crew: [{ name: "David Fincher", job: "Director" }],
  },
  videos: {
    results: [
      { key: "teaser00001", name: "Teaser", site: "YouTube", type: "Teaser", official: true },
      { key: "BdJKm16Co6M", name: "Official Trailer", site: "YouTube", type: "Trailer", official: true },
    ],
  },
  "watch/providers": {
    results: {
      PH: {
        link: "https://www.themoviedb.org/movie/550/watch?locale=PH",
        flatrate: [{ provider_id: 8, provider_name: "Netflix" }],
        rent: [{ provider_id: 2, provider_name: "Apple TV" }],
        buy: [{ provider_id: 2, provider_name: "Apple TV" }],
      },
    },
  },
};

/** A fake TMDB: `byId` maps TMDB ids to responses; records requests. */
function fakeTmdb(byId: Record<number, TmdbMovie | "error">, key = "v3key") {
  const requests: { url: URL; auth?: string }[] = [];
  const fetchImpl = (async (input: URL, init?: RequestInit) => {
    const url = new URL(input);
    requests.push({ url, auth: (init?.headers as Record<string, string>)?.authorization });
    const id = Number(url.pathname.split("/").at(-1));
    const body = byId[id];
    if (body === "error") return new Response("boom", { status: 503 });
    return body ? Response.json(body) : new Response("{}", { status: 404 });
  }) as typeof fetch;
  return { tmdb: createTmdb(key, fetchImpl), requests };
}

beforeEach(clearTmdbCache);

describe("TMDB mapping", () => {
  it("sends a v3 key as api_key and a v4 token as a Bearer header", async () => {
    const v3 = fakeTmdb({ 550: fightClub });
    await v3.tmdb.get("/movie/550");
    expect(v3.requests[0].url.searchParams.get("api_key")).toBe("v3key");
    expect(v3.requests[0].auth).toBeUndefined();

    const v4 = fakeTmdb({ 550: fightClub }, "eyJhbGciOiJIUzI1NiJ9.token");
    await v4.tmdb.get("/movie/550");
    expect(v4.requests[0].url.searchParams.has("api_key")).toBe(false);
    expect(v4.requests[0].auth).toBe("Bearer eyJhbGciOiJIUzI1NiJ9.token");
  });

  it("maps watch providers to the API's shape, keeping rent and buy apart", () => {
    expect(toProviders(fightClub["watch/providers"]!.results.PH)).toEqual([
      { id: "tmdb-8", name: "Netflix", type: "Subscription", price: null, quality: null, url: expect.stringContaining("/550/watch") },
      { id: "tmdb-2", name: "Apple TV", type: "Rent", price: null, quality: null, url: expect.any(String) },
      { id: "tmdb-2", name: "Apple TV", type: "Buy", price: null, quality: null, url: expect.any(String) },
    ]);
    expect(toProviders(undefined)).toEqual([]);
  });

  it("prefers the official YouTube trailer", () => {
    expect(pickTrailer(fightClub)?.videoUrl).toBe("https://www.youtube.com/watch?v=BdJKm16Co6M");
    expect(pickTrailer({ ...fightClub, videos: { results: [] } })).toBeNull();
  });

  it("matches titles loosely but not across films", () => {
    expect(sameTitle(fightClub, "FIGHT CLUB!")).toBe(true);
    expect(sameTitle(fightClub, "The Last Horizon")).toBe(false);
  });

  it("only embeds real YouTube URLs", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=BdJKm16Co6M")).toBe("BdJKm16Co6M");
    expect(youtubeId("https://youtu.be/BdJKm16Co6M?t=3")).toBe("BdJKm16Co6M");
    expect(youtubeId("https://evil.example/watch?v=BdJKm16Co6M")).toBeNull();
    expect(youtubeId("https://www.youtube.com.evil.example/watch?v=BdJKm16Co6M")).toBeNull();
    expect(youtubeId(null)).toBeNull();
  });
});

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("Where to Watch with TMDB (BE-26)", () => {
  const { db, pool } = createDb(url!);
  afterAll(() => pool.end());

  const providers = async (app: ReturnType<typeof buildApp>, id: string) =>
    (await app.inject({ method: "GET", url: `/api/movies/${id}/providers` })).json();

  it("uses live data when TMDB knows the title", async () => {
    // The mock's tmdbId 901101 answered as "The Last Horizon".
    const { tmdb } = fakeTmdb({ 901101: { ...fightClub, id: 901101, title: "The Last Horizon", original_title: "The Last Horizon" } });
    const body = await providers(buildApp({ db, tmdb }), "mov-last-horizon");
    expect(body).toMatchObject({ source: "tmdb", region: "PH", attribution: expect.stringContaining("JustWatch") });
    expect(body.items.map((p: { name: string }) => p.name)).toEqual(["Netflix", "Apple TV", "Apple TV"]);
  });

  it("falls back to the catalog when the TMDB id is another film, missing, or TMDB is down", async () => {
    const { tmdb } = fakeTmdb({ 901101: fightClub, 901102: "error" });
    const app = buildApp({ db, tmdb });
    for (const id of ["mov-last-horizon", "mov-night-signal", "mov-paper-moon"]) {
      expect(await providers(app, id)).toMatchObject({ source: "catalog", attribution: null });
    }
  });

  it("uses the catalog without a key", async () => {
    expect(await providers(buildApp({ db }), "mov-last-horizon")).toMatchObject({ source: "catalog" });
  });

  it("caches TMDB for a day", async () => {
    const { tmdb, requests } = fakeTmdb({ 901101: fightClub });
    const app = buildApp({ db, tmdb });
    await providers(app, "mov-last-horizon");
    await providers(app, "mov-last-horizon");
    expect(requests).toHaveLength(1);
  });
});

describe.skipIf(!url)("npm run tmdb:import", () => {
  // Its own database, so the imported movie can't show up in other test files running in parallel.
  const name = `movieshelf_tmdb_${process.pid}`;
  const admin = new pg.Pool({ connectionString: url });
  let isolated: ReturnType<typeof createDb>;

  beforeAll(async () => {
    await admin.query(`create database ${name}`);
    const u = new URL(url!);
    u.pathname = `/${name}`;
    isolated = createDb(u.toString());
    await migrate(isolated.db, { migrationsFolder: fileURLToPath(new URL("../src/db/migrations", import.meta.url)) });
    await seed(isolated.db);
  });

  afterAll(async () => {
    await isolated?.pool.end();
    await admin.query(`drop database if exists ${name}`);
    await admin.end();
  });

  it("adds a movie with genres, director, cast and trailer, and re-importing updates it", async () => {
    const { db } = isolated;
    const { tmdb } = fakeTmdb({ 550: fightClub });
    const first = await importTmdbMovie(db, tmdb, 550);
    expect(first).toEqual({ id: "mov-fight-club-550", title: "Fight Club", trailer: "https://www.youtube.com/watch?v=BdJKm16Co6M" });

    const app = buildApp({ db });
    const movie = (await app.inject({ method: "GET", url: "/api/movies/mov-fight-club-550" })).json();
    expect(movie).toMatchObject({
      tmdbId: 550,
      imdbId: "tt0137523",
      year: 1999,
      runtimeMinutes: 139,
      rating: 8.4,
      languageCode: "EN",
      genres: ["Drama", "Thriller"],
      director: "David Fincher",
      cast: [{ name: "Edward Norton", character: "Narrator" }, { name: "Brad Pitt", character: "Tyler Durden" }],
      shortSynopsis: "Mischief. Mayhem. Soap.",
      availability: { canStream: false, canDownload: false, statusText: "Not available in your region" },
      trailer: { videoUrl: "https://www.youtube.com/watch?v=BdJKm16Co6M" },
    });
    expect(movie.palette).toEqual(expect.any(Object));

    clearTmdbCache();
    await importTmdbMovie(db, fakeTmdb({ 550: { ...fightClub, vote_average: 9 } }).tmdb, 550);
    expect(await db.select().from(movies).where(eq(movies.tmdbId, 550))).toHaveLength(1);
    expect((await db.select().from(movieGenres).where(eq(movieGenres.movieId, first.id)))).toHaveLength(2);
    expect((await db.select().from(movieCast).where(eq(movieCast.movieId, first.id)))).toHaveLength(2);
    expect((await app.inject({ method: "GET", url: "/api/movies/mov-fight-club-550" })).json().rating).toBe(9);
    await app.close();
  });

  it("fails clearly for an unknown TMDB id", async () => {
    await expect(importTmdbMovie(isolated.db, fakeTmdb({}).tmdb, 999999)).rejects.toThrow(/no movie with id 999999/);
  });
});
