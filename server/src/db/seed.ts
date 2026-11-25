import { getTableColumns, inArray, sql, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { MOVIES_DATA, MOVIE_GENRES, MOVIE_LANGUAGES, REGIONS, SUBTITLE_CATALOG } from "../../../src/data/moviesData.js";
import { MANGA_GENRES, MANGA_SERIES } from "../../../src/data/mangaData.js";
import type { Db } from "./client.ts";
import * as t from "./schema.ts";
import { buildSeedRows, SEEDED_SLOTS, type MockCatalog } from "./transform.ts";

export const MOCK_CATALOG = {
  movies: MOVIES_DATA,
  subtitles: SUBTITLE_CATALOG,
  movieGenres: MOVIE_GENRES,
  languages: MOVIE_LANGUAGES,
  regions: REGIONS,
  series: MANGA_SERIES,
  seriesGenres: MANGA_GENRES,
} as MockCatalog;

/** ON CONFLICT DO UPDATE SET <every non-key column> = excluded.<column> */
function updateAll<T extends PgTable>(table: T, keys: string[]) {
  const set: Record<string, SQL> = {};
  for (const [prop, col] of Object.entries(getTableColumns(table))) {
    if (keys.includes(prop) || prop === "createdAt") continue;
    set[prop] = prop === "updatedAt" ? sql`now()` : sql.raw(`excluded."${col.name}"`);
  }
  return set;
}

/**
 * Loads the mock catalog. Idempotent: titles are upserted by id, and their child rows
 * (genres, cast, alt titles, pages) and the seeded curation slots are replaced.
 */
export async function seed(db: Db, mock: MockCatalog = MOCK_CATALOG) {
  const rows = buildSeedRows(mock);

  await db.transaction(async (tx) => {
    await tx.insert(t.languages).values(rows.languages).onConflictDoUpdate({
      target: t.languages.code,
      set: updateAll(t.languages, ["code"]),
    });
    await tx.insert(t.regions).values(rows.regions).onConflictDoUpdate({
      target: t.regions.code,
      set: updateAll(t.regions, ["code"]),
    });
    await tx.insert(t.genres).values(rows.genres).onConflictDoNothing();
    const genreIds = new Map(
      (await tx.select().from(t.genres)).map((g) => [`${g.mediaType}:${g.name}`, g.id]),
    );
    const genreId = (mediaType: t.MediaType, name: string) => {
      const id = genreIds.get(`${mediaType}:${name}`);
      if (id === undefined) throw new Error(`Unknown ${mediaType} genre ${name}`);
      return id;
    };

    await tx.insert(t.people).values(rows.people).onConflictDoUpdate({
      target: t.people.id,
      set: updateAll(t.people, ["id"]),
    });

    const movieIds = rows.movies.map((m) => m.id);
    await tx.insert(t.movies).values(rows.movies).onConflictDoUpdate({
      target: t.movies.id,
      set: updateAll(t.movies, ["id"]),
    });
    await tx.delete(t.movieGenres).where(inArray(t.movieGenres.movieId, movieIds));
    await tx
      .insert(t.movieGenres)
      .values(rows.movieGenres.map((g) => ({ movieId: g.movieId, genreId: genreId("movie", g.name), position: g.position })));
    await tx.delete(t.movieCast).where(inArray(t.movieCast.movieId, movieIds));
    await tx.insert(t.movieCast).values(rows.movieCast);
    await tx.delete(t.movieProviders).where(inArray(t.movieProviders.movieId, movieIds));
    if (rows.movieProviders.length) await tx.insert(t.movieProviders).values(rows.movieProviders);
    if (rows.subtitleTracks.length) {
      await tx.insert(t.subtitleTracks).values(rows.subtitleTracks).onConflictDoUpdate({
        target: t.subtitleTracks.id,
        set: updateAll(t.subtitleTracks, ["id"]),
      });
    }

    const seriesIds = rows.series.map((s) => s.id);
    await tx.insert(t.series).values(rows.series).onConflictDoUpdate({
      target: t.series.id,
      set: updateAll(t.series, ["id"]),
    });
    await tx.delete(t.seriesAltTitles).where(inArray(t.seriesAltTitles.seriesId, seriesIds));
    if (rows.seriesAltTitles.length) await tx.insert(t.seriesAltTitles).values(rows.seriesAltTitles);
    await tx.delete(t.seriesGenres).where(inArray(t.seriesGenres.seriesId, seriesIds));
    await tx
      .insert(t.seriesGenres)
      .values(rows.seriesGenres.map((g) => ({ seriesId: g.seriesId, genreId: genreId("series", g.name), position: g.position })));

    const chapterIds = rows.chapters.map((c) => c.id);
    await tx.insert(t.chapters).values(rows.chapters).onConflictDoUpdate({
      target: t.chapters.id,
      set: updateAll(t.chapters, ["id"]),
    });
    await tx.delete(t.chapterPages).where(inArray(t.chapterPages.chapterId, chapterIds));
    await tx.insert(t.chapterPages).values(rows.chapterPages);

    // The seed owns these slots; hand-curated rows in other slots are left alone.
    await tx.delete(t.featuredSlots).where(inArray(t.featuredSlots.slot, [...SEEDED_SLOTS]));
    await tx.insert(t.featuredSlots).values(rows.featuredSlots);
  });

  return { movies: rows.movies.length, series: rows.series.length, chapters: rows.chapters.length };
}
