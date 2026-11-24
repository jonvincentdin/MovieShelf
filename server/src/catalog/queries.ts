import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import {
  chapterPages,
  chapters,
  featuredSlots,
  genres,
  languages,
  movieCast,
  movieGenres,
  movies,
  people,
  regions,
  series,
  seriesAltTitles,
  seriesGenres,
  type MediaType,
} from "../db/schema.ts";

// API shapes live here; see server/openapi.yaml for the contract.

const iso = (d: Date) => d.toISOString();

function group<T, V>(rows: T[], key: (r: T) => string, value: (r: T) => V) {
  const out = new Map<string, V[]>();
  for (const r of rows) {
    const k = key(r);
    if (!out.has(k)) out.set(k, []);
    out.get(k)!.push(value(r));
  }
  return out;
}

const trendingJoin = (mediaType: MediaType, idColumn: typeof movies.id | typeof series.id) =>
  and(eq(featuredSlots.slot, "trending"), eq(featuredSlots.mediaType, mediaType), eq(featuredSlots.mediaId, idColumn));

/** Movies in trending order (untracked titles last, by title). `ids` limits the result; order is still trending order. */
export async function getMovies(db: Db, ids?: string[]) {
  if (ids && ids.length === 0) return [];
  const rows = await db
    .select({ movie: movies, director: people.name, language: languages.label })
    .from(movies)
    .leftJoin(people, eq(people.id, movies.directorId))
    .leftJoin(languages, eq(languages.code, movies.languageCode))
    .leftJoin(featuredSlots, trendingJoin("movie", movies.id))
    .where(ids ? inArray(movies.id, ids) : undefined)
    .orderBy(sql`${featuredSlots.position} asc nulls last`, asc(movies.title));
  if (rows.length === 0) return [];

  const movieIds = rows.map((r) => r.movie.id);
  const [genreRows, castRows] = await Promise.all([
    db
      .select({ movieId: movieGenres.movieId, name: genres.name })
      .from(movieGenres)
      .innerJoin(genres, eq(genres.id, movieGenres.genreId))
      .where(inArray(movieGenres.movieId, movieIds))
      .orderBy(asc(movieGenres.position)),
    db
      .select({ movieId: movieCast.movieId, id: people.id, name: people.name, character: movieCast.character, role: movieCast.role })
      .from(movieCast)
      .innerJoin(people, eq(people.id, movieCast.personId))
      .where(inArray(movieCast.movieId, movieIds))
      .orderBy(asc(movieCast.position)),
  ]);
  const genresBy = group(genreRows, (r) => r.movieId, (r) => r.name);
  const castBy = group(castRows, (r) => r.movieId, ({ id, name, character, role }) => ({ id, name, character, role }));

  return rows.map(({ movie: m, director, language }) => ({
    id: m.id,
    tmdbId: m.tmdbId,
    imdbId: m.imdbId,
    title: m.title,
    originalTitle: m.originalTitle,
    year: m.year,
    releaseDate: m.releaseDate,
    runtimeMinutes: m.runtimeMinutes,
    rating: m.rating,
    maturityRating: m.maturityRating,
    languageCode: m.languageCode,
    originalLanguage: language,
    genres: genresBy.get(m.id) ?? [],
    synopsis: m.synopsis,
    shortSynopsis: m.shortSynopsis,
    director,
    cast: castBy.get(m.id) ?? [],
    palette: m.palette,
    availability: m.availability,
    trailer: m.trailer,
    updatedAt: iso(m.updatedAt),
  }));
}

export async function getMovie(db: Db, id: string) {
  return (await getMovies(db, [id]))[0] ?? null;
}

export type MovieDto = Awaited<ReturnType<typeof getMovies>>[number];

/** Chapter metadata with page counts, ascending by number. */
async function getChaptersFor(db: Db, seriesIds: string[]) {
  if (seriesIds.length === 0) return [];
  const rows = await db
    .select({
      id: chapters.id,
      seriesId: chapters.seriesId,
      number: chapters.number,
      title: chapters.title,
      releaseDate: chapters.releaseDate,
      palette: chapters.palette,
      pageCount: count(chapterPages.pageNumber),
    })
    .from(chapters)
    .leftJoin(chapterPages, eq(chapterPages.chapterId, chapters.id))
    .where(inArray(chapters.seriesId, seriesIds))
    .groupBy(chapters.id)
    .orderBy(asc(chapters.seriesId), asc(chapters.number));
  return rows;
}

export type ChapterDto = Awaited<ReturnType<typeof getChaptersFor>>[number];

/** Series in trending order. chapterCount and latestChapter are computed from the chapter list. */
export async function getSeries(db: Db, ids?: string[]) {
  if (ids && ids.length === 0) return [];
  const rows = await db
    .select({ series })
    .from(series)
    .leftJoin(featuredSlots, trendingJoin("series", series.id))
    .where(ids ? inArray(series.id, ids) : undefined)
    .orderBy(sql`${featuredSlots.position} asc nulls last`, asc(series.title));
  if (rows.length === 0) return [];

  const seriesIds = rows.map((r) => r.series.id);
  // shortcut: loads every chapter row for the listed series; switch to a grouped query once lists paginate (BE-16).
  const [altRows, genreRows, chapterRows] = await Promise.all([
    db
      .select({ seriesId: seriesAltTitles.seriesId, title: seriesAltTitles.title })
      .from(seriesAltTitles)
      .where(inArray(seriesAltTitles.seriesId, seriesIds))
      .orderBy(asc(seriesAltTitles.position)),
    db
      .select({ seriesId: seriesGenres.seriesId, name: genres.name })
      .from(seriesGenres)
      .innerJoin(genres, eq(genres.id, seriesGenres.genreId))
      .where(inArray(seriesGenres.seriesId, seriesIds))
      .orderBy(asc(seriesGenres.position)),
    getChaptersFor(db, seriesIds),
  ]);
  const altBy = group(altRows, (r) => r.seriesId, (r) => r.title);
  const genresBy = group(genreRows, (r) => r.seriesId, (r) => r.name);
  const chaptersBy = group(chapterRows, (r) => r.seriesId, (r) => r);

  return rows.map(({ series: s }) => {
    const list = chaptersBy.get(s.id) ?? [];
    const latest = list.at(-1);
    return {
      id: s.id,
      title: s.title,
      alternateTitles: altBy.get(s.id) ?? [],
      type: s.type,
      status: s.status,
      year: s.year,
      rating: s.rating,
      author: s.author,
      artist: s.artist,
      readingDirection: s.readingDirection,
      readingFormat: s.readingFormat,
      genres: genresBy.get(s.id) ?? [],
      synopsis: s.synopsis,
      shortSynopsis: s.shortSynopsis,
      palette: s.palette,
      chapterCount: list.length,
      latestChapter: latest
        ? { id: latest.id, number: latest.number, title: latest.title, releaseDate: latest.releaseDate }
        : null,
      updatedAt: iso(s.updatedAt),
    };
  });
}

export async function getOneSeries(db: Db, id: string) {
  return (await getSeries(db, [id]))[0] ?? null;
}

/** null when the series doesn't exist (vs. [] for a series with no chapters). */
export async function getSeriesChapters(db: Db, seriesId: string) {
  const [exists] = await db.select({ id: series.id }).from(series).where(eq(series.id, seriesId));
  if (!exists) return null;
  return getChaptersFor(db, [seriesId]);
}

export async function getChapterPages(db: Db, chapterId: string) {
  const [chapter] = await db
    .select({ id: chapters.id, seriesId: chapters.seriesId })
    .from(chapters)
    .where(eq(chapters.id, chapterId));
  if (!chapter) return null;
  const pages = await db
    .select({
      pageNumber: chapterPages.pageNumber,
      caption: chapterPages.caption,
      subCaption: chapterPages.subCaption,
      palette: chapterPages.palette,
      imageUrl: chapterPages.imageUrl,
    })
    .from(chapterPages)
    .where(eq(chapterPages.chapterId, chapterId))
    .orderBy(asc(chapterPages.pageNumber));
  return { chapterId: chapter.id, seriesId: chapter.seriesId, pages };
}

// ---- Lookups (BE-11) ----

export async function getGenres(db: Db, mediaType: MediaType) {
  const rows = await db
    .select({ name: genres.name })
    .from(genres)
    .where(eq(genres.mediaType, mediaType))
    .orderBy(asc(genres.id));
  return rows.map((r) => r.name);
}

export const getLanguages = (db: Db) => db.select().from(languages).orderBy(asc(languages.code));
export const getRegions = (db: Db) => db.select().from(regions).orderBy(asc(regions.code));

// ---- Home rails (BE-12) ----

async function slotItems(db: Db, slot: string, mediaType: MediaType) {
  return db
    .select({ id: featuredSlots.mediaId, kicker: featuredSlots.kicker })
    .from(featuredSlots)
    .where(and(eq(featuredSlots.slot, slot), eq(featuredSlots.mediaType, mediaType)))
    .orderBy(asc(featuredSlots.position));
}

export async function getHome(db: Db) {
  const [hero, trending, recent, regional, seriesSlots] = await Promise.all([
    slotItems(db, "hero", "movie"),
    slotItems(db, "trending", "movie"),
    slotItems(db, "recent", "movie"),
    slotItems(db, "regional", "movie"),
    slotItems(db, "trending", "series"),
  ]);
  const movieIds = [...new Set([hero, trending, recent, regional].flat().map((s) => s.id))];
  const [movieList, seriesList] = await Promise.all([
    getMovies(db, movieIds),
    getSeries(db, seriesSlots.map((s) => s.id)),
  ]);
  const moviesById = new Map(movieList.map((m) => [m.id, m]));
  const seriesById = new Map(seriesList.map((s) => [s.id, s]));

  // Slots pointing at deleted titles are skipped rather than failing the whole page.
  const rail = <T>(slots: { id: string; kicker: string | null }[], byId: Map<string, T>) =>
    slots.flatMap((s) => {
      const item = byId.get(s.id);
      return item ? [{ ...item, kicker: s.kicker }] : [];
    });

  const trendingSeries = rail(seriesSlots, seriesById);
  return {
    hero: rail(hero, moviesById),
    trending: rail(trending, moviesById),
    recentReleases: rail(recent, moviesById),
    regionalPicks: rail(regional, moviesById),
    trendingSeries,
    manhwa: trendingSeries.filter((s) => s.type === "Manhwa"),
    manga: trendingSeries.filter((s) => s.type === "Manga"),
  };
}
