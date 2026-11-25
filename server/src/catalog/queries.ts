import { and, asc, count, desc, eq, gte, inArray, sql, type Column } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { DEFAULT_REGION } from "../region.ts";
import { availabilityFor } from "./availability.ts";
import {
  chapterPages,
  chapters,
  featuredSlots,
  genres,
  languages,
  movieCast,
  movieGenres,
  movieProviders,
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

/** Puts hydrated rows back in the order the page query chose. Unknown ids are dropped. */
function inOrder<T extends { id: string }>(ids: string[], rows: T[]) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

function group<T, V>(rows: T[], key: (r: T) => string, value: (r: T) => V) {
  const out = new Map<string, V[]>();
  for (const r of rows) {
    const k = key(r);
    if (!out.has(k)) out.set(k, []);
    out.get(k)!.push(value(r));
  }
  return out;
}

export const trendingJoin = (mediaType: MediaType, idColumn: typeof movies.id | typeof series.id) =>
  and(eq(featuredSlots.slot, "trending"), eq(featuredSlots.mediaType, mediaType), eq(featuredSlots.mediaId, idColumn));

/** Full movie DTOs for `ids`, in the same order. */
export async function getMovies(db: Db, ids: string[], region = DEFAULT_REGION) {
  if (ids.length === 0) return [];
  const rows = await db
    .select({ movie: movies, director: people.name, language: languages.label })
    .from(movies)
    .leftJoin(people, eq(people.id, movies.directorId))
    .leftJoin(languages, eq(languages.code, movies.languageCode))
    .where(inArray(movies.id, ids));
  if (rows.length === 0) return [];

  const [genreRows, castRows, availability] = await Promise.all([
    db
      .select({ movieId: movieGenres.movieId, name: genres.name })
      .from(movieGenres)
      .innerJoin(genres, eq(genres.id, movieGenres.genreId))
      .where(inArray(movieGenres.movieId, ids))
      .orderBy(asc(movieGenres.position)),
    db
      .select({ movieId: movieCast.movieId, id: people.id, name: people.name, character: movieCast.character, role: movieCast.role })
      .from(movieCast)
      .innerJoin(people, eq(people.id, movieCast.personId))
      .where(inArray(movieCast.movieId, ids))
      .orderBy(asc(movieCast.position)),
    availabilityFor(db, ids, region),
  ]);
  const genresBy = group(genreRows, (r) => r.movieId, (r) => r.name);
  const castBy = group(castRows, (r) => r.movieId, ({ id, name, character, role }) => ({ id, name, character, role }));

  const dtos = rows.map(({ movie: m, director, language }) => ({
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
    availability: availability.get(m.id)!,
    trailer: m.trailer && { ...m.trailer, videoUrl: m.trailer.videoUrl ?? null },
    updatedAt: iso(m.updatedAt),
  }));
  return inOrder(ids, dtos);
}

export async function getMovie(db: Db, id: string, region?: string) {
  return (await getMovies(db, [id], region))[0] ?? null;
}

export type MovieDto = Awaited<ReturnType<typeof getMovies>>[number];

/** Full series DTOs for `ids`, in the same order. chapterCount and latestChapter are computed from the chapter list. */
export async function getSeries(db: Db, ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await db.select().from(series).where(inArray(series.id, ids));
  if (rows.length === 0) return [];

  const [altRows, genreRows, countRows, latestRows] = await Promise.all([
    db
      .select({ seriesId: seriesAltTitles.seriesId, title: seriesAltTitles.title })
      .from(seriesAltTitles)
      .where(inArray(seriesAltTitles.seriesId, ids))
      .orderBy(asc(seriesAltTitles.position)),
    db
      .select({ seriesId: seriesGenres.seriesId, name: genres.name })
      .from(seriesGenres)
      .innerJoin(genres, eq(genres.id, seriesGenres.genreId))
      .where(inArray(seriesGenres.seriesId, ids))
      .orderBy(asc(seriesGenres.position)),
    db
      .select({ seriesId: chapters.seriesId, n: count() })
      .from(chapters)
      .where(inArray(chapters.seriesId, ids))
      .groupBy(chapters.seriesId),
    db
      .selectDistinctOn([chapters.seriesId], {
        seriesId: chapters.seriesId,
        id: chapters.id,
        number: chapters.number,
        title: chapters.title,
        releaseDate: chapters.releaseDate,
      })
      .from(chapters)
      .where(inArray(chapters.seriesId, ids))
      .orderBy(chapters.seriesId, desc(chapters.number)),
  ]);
  const altBy = group(altRows, (r) => r.seriesId, (r) => r.title);
  const genresBy = group(genreRows, (r) => r.seriesId, (r) => r.name);
  const countBy = new Map(countRows.map((r) => [r.seriesId, r.n]));
  const latestBy = new Map(latestRows.map(({ seriesId, ...latest }) => [seriesId, latest]));

  const dtos = rows.map((s) => ({
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
    chapterCount: countBy.get(s.id) ?? 0,
    latestChapter: latestBy.get(s.id) ?? null,
    updatedAt: iso(s.updatedAt),
  }));
  return inOrder(ids, dtos);
}

export async function getOneSeries(db: Db, id: string) {
  return (await getSeries(db, [id]))[0] ?? null;
}

// ---- Pagination and browse (BE-15, BE-16) ----

export interface PageParams {
  page: number;
  pageSize: number;
}

export const paged = <T>(items: T[], { page, pageSize }: PageParams, total: number) => ({ items, page, pageSize, total });

export interface MovieFilters extends PageParams {
  region?: string; // for availability; resolved by the route
  genre?: string;
  language?: string;
  year?: number;
  minRating?: number;
  sort: "popularity" | "date" | "rating" | "az";
}

export interface SeriesFilters extends PageParams {
  type?: string;
  status?: string;
  genre?: string;
  year?: number;
  sort: "popularity" | "latest" | "az" | "chapters";
}

const hasGenre = (link: typeof movieGenres | typeof seriesGenres, owner: Column, ownerId: Column, genre: string) =>
  sql`exists (select 1 from ${link} join ${genres} on ${genres.id} = ${link.genreId} where ${owner} = ${ownerId} and ${genres.name} = ${genre})`;

const offset = ({ page, pageSize }: PageParams) => (page - 1) * pageSize;

/** Movies matching the Browse Movies filters. "popularity" is trending order, as the page does today. */
export async function listMovies(db: Db, f: MovieFilters) {
  const where = and(
    f.genre ? hasGenre(movieGenres, movieGenres.movieId, movies.id, f.genre) : undefined,
    f.language ? eq(movies.languageCode, f.language) : undefined,
    f.year ? eq(movies.year, f.year) : undefined,
    f.minRating != null ? gte(movies.rating, f.minRating) : undefined,
  );
  const order = {
    popularity: [sql`${featuredSlots.position} asc nulls last`, asc(movies.title)],
    date: [sql`${movies.releaseDate} desc nulls last`],
    rating: [sql`${movies.rating} desc nulls last`],
    az: [asc(movies.title)],
  }[f.sort];
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ id: movies.id })
      .from(movies)
      .leftJoin(featuredSlots, trendingJoin("movie", movies.id))
      .where(where)
      .orderBy(...order, asc(movies.id))
      .limit(f.pageSize)
      .offset(offset(f)),
    db.select({ total: count() }).from(movies).where(where),
  ]);
  return paged(await getMovies(db, rows.map((r) => r.id), f.region), f, total);
}

/** Series matching the Browse Manga filters. "popularity" is rating order, as the page does today. */
export async function listSeries(db: Db, f: SeriesFilters) {
  const where = and(
    f.type ? eq(series.type, f.type) : undefined,
    f.status ? eq(series.status, f.status) : undefined,
    f.genre ? hasGenre(seriesGenres, seriesGenres.seriesId, series.id, f.genre) : undefined,
    f.year ? eq(series.year, f.year) : undefined,
  );
  const chapterCount = sql`(select count(*) from ${chapters} where ${chapters.seriesId} = ${series.id})`;
  const latestRelease = sql`(select max(${chapters.releaseDate}) from ${chapters} where ${chapters.seriesId} = ${series.id})`;
  const order = {
    popularity: [sql`${series.rating} desc nulls last`],
    latest: [sql`${latestRelease} desc nulls last`],
    az: [asc(series.title)],
    chapters: [sql`${chapterCount} desc`],
  }[f.sort];
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ id: series.id })
      .from(series)
      .where(where)
      .orderBy(...order, asc(series.id))
      .limit(f.pageSize)
      .offset(offset(f)),
    db.select({ total: count() }).from(series).where(where),
  ]);
  return paged(await getSeries(db, rows.map((r) => r.id)), f, total);
}

/** A page of chapters with page counts, ascending by number. null when the series doesn't exist. */
export async function getSeriesChapters(db: Db, seriesId: string, p: PageParams) {
  const [exists] = await db.select({ id: series.id }).from(series).where(eq(series.id, seriesId));
  if (!exists) return null;
  const [items, [{ total }]] = await Promise.all([
    db
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
      .where(eq(chapters.seriesId, seriesId))
      .groupBy(chapters.id)
      .orderBy(asc(chapters.number))
      .limit(p.pageSize)
      .offset(offset(p)),
    db.select({ total: count() }).from(chapters).where(eq(chapters.seriesId, seriesId)),
  ]);
  return paged(items, p, total);
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

// ---- Where to Watch (BE-25) ----

/** Providers for one movie in one region, in display order. null when the movie doesn't exist. */
export async function getMovieProviders(db: Db, movieId: string, region: string) {
  const [movie] = await db.select({ id: movies.id }).from(movies).where(eq(movies.id, movieId));
  if (!movie) return null;
  return db
    .select({
      id: movieProviders.providerId,
      name: movieProviders.name,
      type: movieProviders.type,
      price: movieProviders.price,
      quality: movieProviders.quality,
      url: movieProviders.url,
    })
    .from(movieProviders)
    .where(and(eq(movieProviders.movieId, movieId), eq(movieProviders.regionCode, region)))
    .orderBy(asc(movieProviders.position));
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

export async function getHome(db: Db, region?: string) {
  const [hero, trending, recent, regional, seriesSlots] = await Promise.all([
    slotItems(db, "hero", "movie"),
    slotItems(db, "trending", "movie"),
    slotItems(db, "recent", "movie"),
    slotItems(db, "regional", "movie"),
    slotItems(db, "trending", "series"),
  ]);
  const movieIds = [...new Set([hero, trending, recent, regional].flat().map((s) => s.id))];
  const [movieList, seriesList] = await Promise.all([
    getMovies(db, movieIds, region),
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
