// Pure conversion of the frontend mock catalog (src/data/*) into database rows.
// Throws on anything it can't convert, so a bad mock edit fails the seed instead of storing junk.

import type { Availability, MediaType, Palette, Trailer } from "./schema.ts";

/** "1h 15m" → 75, "2h" → 120, "45m" → 45 */
export function parseRuntime(label: string): number {
  const m = /^\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*$/i.exec(label);
  if (!m || (m[1] === undefined && m[2] === undefined)) throw new Error(`Unparseable runtime: "${label}"`);
  return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
}

const SIZE_UNITS: Record<string, number> = { KB: 1e3, MB: 1e6, GB: 1e9 };

/** "640 MB" → 640000000; non-size labels like "Stream Only" → null. Decimal units, as file managers show them. */
export function parseSizeBytes(label: string): number | null {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(KB|MB|GB)\s*$/i.exec(label);
  return m ? Math.round(Number(m[1]) * SIZE_UNITS[m[2].toUpperCase()]) : null;
}

/** "Elena Vance" → "per-elena-vance"; one row per person even if they appear in several titles. */
export function personId(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) throw new Error(`Cannot build a person id from "${name}"`);
  return `per-${slug}`;
}

export function parseRating(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 10) throw new Error(`Invalid rating: "${value}"`);
  return n;
}

// ---- Mock input shapes (only the fields the seed reads) ----

interface MockMovie {
  id: string;
  tmdbId?: number;
  imdbId?: string;
  title: string;
  originalTitle?: string;
  kicker?: string;
  year?: number;
  releaseDate?: string;
  runtime: string;
  rating: string;
  maturityRating?: string;
  languageCode?: string;
  genres: string[];
  synopsis?: string;
  shortSynopsis?: string;
  director?: string;
  cast: { name: string; character?: string; role?: string }[];
  palette?: Palette;
  availability?: Omit<Availability, "sizeBytes"> & { sizeLabel: string };
  trailer?: Trailer;
  trendingRank: number;
  isRecentRelease?: boolean;
}

interface MockPage {
  pageNumber: number;
  caption?: string;
  subCaption?: string;
  palette?: Palette;
}

interface MockSeries {
  id: string;
  title: string;
  alternateTitles?: string[];
  kicker?: string;
  type: string;
  status: string;
  year?: number;
  rating: string;
  author?: string;
  artist?: string;
  readingDirection?: string;
  readingFormat?: string;
  genres: string[];
  synopsis?: string;
  shortSynopsis?: string;
  palette?: Palette;
  chapters: {
    id: string;
    seriesId: string;
    number: number;
    title?: string;
    releaseDate?: string;
    palette?: Palette;
    pages: MockPage[];
  }[];
}

export interface MockCatalog {
  movies: MockMovie[];
  movieGenres: string[];
  languages: { code: string; label: string }[];
  regions: { code: string; name: string }[];
  series: MockSeries[];
  seriesGenres: string[];
}

// Movies in these original languages make up the "Filipino & Asian Spotlight" rail.
const REGIONAL_LANGUAGES = new Set(["TL", "JA", "KO"]);
export const HERO_SIZE = 5;
export const SEEDED_SLOTS = ["hero", "trending", "recent", "regional"] as const;

export function buildSeedRows(mock: MockCatalog) {
  const byTrending = [...mock.movies].sort((a, b) => a.trendingRank - b.trendingRank);

  const peopleById = new Map<string, string>();
  const addPerson = (name: string) => {
    const id = personId(name);
    peopleById.set(id, name);
    return id;
  };

  const toAvailability = ({ sizeLabel, ...rest }: NonNullable<MockMovie["availability"]>): Availability => ({
    ...rest,
    sizeBytes: parseSizeBytes(sizeLabel),
  });

  const movies = mock.movies.map((m) => {
    return {
      id: m.id,
      tmdbId: m.tmdbId ?? null,
      imdbId: m.imdbId ?? null,
      title: m.title,
      originalTitle: m.originalTitle ?? null,
      year: m.year ?? null,
      releaseDate: m.releaseDate ?? null,
      runtimeMinutes: parseRuntime(m.runtime),
      rating: parseRating(m.rating),
      maturityRating: m.maturityRating ?? null,
      languageCode: m.languageCode ?? null,
      synopsis: m.synopsis ?? null,
      shortSynopsis: m.shortSynopsis ?? null,
      directorId: m.director ? addPerson(m.director) : null,
      palette: m.palette ?? null,
      availability: m.availability ? toAvailability(m.availability) : null,
      trailer: m.trailer ?? null,
    };
  });

  const movieCast = mock.movies.flatMap((m) =>
    m.cast.map((c, i) => ({
      movieId: m.id,
      personId: addPerson(c.name),
      character: c.character ?? null,
      role: c.role ?? null,
      position: i,
    })),
  );

  const genreRows = (mediaType: MediaType, names: string[]) =>
    [...new Set(names)].map((name) => ({ mediaType, name }));
  const genres = [
    ...genreRows("movie", [...mock.movieGenres, ...mock.movies.flatMap((m) => m.genres)]),
    ...genreRows("series", [...mock.seriesGenres, ...mock.series.flatMap((s) => s.genres)]),
  ];

  const movieGenres = mock.movies.flatMap((m) => [...new Set(m.genres)].map((name) => ({ movieId: m.id, name })));

  const series = mock.series.map((s) => ({
    id: s.id,
    title: s.title,
    type: s.type,
    status: s.status,
    year: s.year ?? null,
    rating: parseRating(s.rating),
    author: s.author ?? null,
    artist: s.artist ?? null,
    readingDirection: s.readingDirection ?? null,
    readingFormat: s.readingFormat ?? null,
    synopsis: s.synopsis ?? null,
    shortSynopsis: s.shortSynopsis ?? null,
    palette: s.palette ?? null,
  }));

  const seriesAltTitles = mock.series.flatMap((s) =>
    [...new Set(s.alternateTitles ?? [])].map((title, i) => ({ seriesId: s.id, title, position: i })),
  );
  const seriesGenres = mock.series.flatMap((s) => [...new Set(s.genres)].map((name) => ({ seriesId: s.id, name })));

  const allChapters = mock.series.flatMap((s) => s.chapters);
  const chapters = allChapters.map((c) => ({
    id: c.id,
    seriesId: c.seriesId,
    number: c.number,
    title: c.title ?? null,
    releaseDate: c.releaseDate ?? null,
    palette: c.palette ?? null,
  }));
  // Mock chapters all share one page set; each chapter gets its own copy so it can be replaced individually.
  const chapterPages = allChapters.flatMap((c) =>
    c.pages.map((p) => ({
      chapterId: c.id,
      pageNumber: p.pageNumber,
      caption: p.caption ?? null,
      subCaption: p.subCaption ?? null,
      palette: p.palette ?? null,
      imageUrl: null,
    })),
  );

  const slot = (name: string, mediaType: MediaType, items: { id: string; kicker?: string }[]) =>
    items.map((item, i) => ({ slot: name, mediaType, mediaId: item.id, position: i + 1, kicker: item.kicker ?? null }));

  const featuredSlots = [
    ...slot("hero", "movie", byTrending.slice(0, HERO_SIZE)),
    ...slot("trending", "movie", byTrending),
    ...slot("recent", "movie", byTrending.filter((m) => m.isRecentRelease)),
    ...slot("regional", "movie", byTrending.filter((m) => m.languageCode && REGIONAL_LANGUAGES.has(m.languageCode))),
    ...slot("trending", "series", mock.series),
  ];

  return {
    languages: mock.languages,
    regions: mock.regions,
    genres,
    people: [...peopleById].map(([id, name]) => ({ id, name })),
    movies,
    movieGenres,
    movieCast,
    series,
    seriesAltTitles,
    seriesGenres,
    chapters,
    chapterPages,
    featuredSlots,
  };
}

export type SeedRows = ReturnType<typeof buildSeedRows>;
