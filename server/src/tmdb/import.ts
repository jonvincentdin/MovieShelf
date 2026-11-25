import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { MOCK_CATALOG } from "../db/seed.ts";
import * as t from "../db/schema.ts";
import type { Palette } from "../db/schema.ts";
import { personId } from "../db/transform.ts";
import type { Tmdb } from "./client.ts";
import { movieDetails, tmdbToCatalog } from "./movies.ts";

/**
 * Adds (or refreshes) one movie from TMDB: details, genres, director, top cast and the YouTube trailer.
 * It gets no license, so it is listed but not streamable, like any title MovieShelf has no rights to.
 */
export async function importTmdbMovie(db: Db, tmdb: Tmdb, tmdbId: number) {
  const details = await movieDetails(tmdb, tmdbId);
  if (!details) throw new Error(`TMDB has no movie with id ${tmdbId}`);
  const languageCodes = new Set((await db.select({ code: t.languages.code }).from(t.languages)).map((l) => l.code));
  const palettes = MOCK_CATALOG.movies.flatMap((m) => (m.palette ? [m.palette as Palette] : []));
  const { movie, director, genres, cast } = tmdbToCatalog(details, palettes, languageCodes);

  return db.transaction(async (tx) => {
    const names = [...(director ? [director] : []), ...cast.map((c) => c.name)];
    if (names.length) {
      const people = [...new Map(names.map((name) => [personId(name), name]))].map(([id, name]) => ({ id, name }));
      await tx.insert(t.people).values(people).onConflictDoNothing();
    }

    // Re-importing the same TMDB id updates the existing row instead of adding a second one.
    const [existing] = await tx.select({ id: t.movies.id }).from(t.movies).where(eq(t.movies.tmdbId, tmdbId));
    const row = { ...movie, id: existing?.id ?? movie.id };
    await tx.insert(t.movies).values(row).onConflictDoUpdate({ target: t.movies.id, set: { ...row, updatedAt: new Date() } });

    await tx.delete(t.movieGenres).where(eq(t.movieGenres.movieId, row.id));
    if (genres.length) {
      await tx.insert(t.genres).values(genres.map((name) => ({ mediaType: "movie" as const, name }))).onConflictDoNothing();
      const ids = await tx
        .select({ id: t.genres.id, name: t.genres.name })
        .from(t.genres)
        .where(and(eq(t.genres.mediaType, "movie"), inArray(t.genres.name, genres)));
      const byName = new Map(ids.map((g) => [g.name, g.id]));
      await tx
        .insert(t.movieGenres)
        .values(genres.map((name, position) => ({ movieId: row.id, genreId: byName.get(name)!, position })));
    }

    await tx.delete(t.movieCast).where(eq(t.movieCast.movieId, row.id));
    if (cast.length) {
      await tx
        .insert(t.movieCast)
        .values(cast.map((c) => ({ movieId: row.id, personId: c.personId, character: c.character, role: null, position: c.position })));
    }
    return { id: row.id, title: row.title, trailer: row.trailer?.videoUrl ?? null };
  });
}
