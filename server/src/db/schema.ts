import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  boolean,
  uuid,
  unique,
} from "drizzle-orm/pg-core";

export type MediaType = "movie" | "series";

// Placeholder artwork colours from the mock catalog; replaced by posterUrl/backdropUrl once real art exists.
export type Palette = Record<string, string>;

/** A movie's availability in one region, as the API returns it (computed from `licenses`). */
export interface Availability {
  canStream: boolean;
  canDownload: boolean;
  format: string | null;
  sizeBytes: number | null;
  resolution: string | null;
  statusText: string;
  /** Last day of the license now in force; null = open-ended or not licensed. */
  availableUntil: string | null;
  /** First day of an upcoming license when nothing is in force yet. */
  availableFrom: string | null;
}

export interface Trailer {
  title: string;
  duration: string;
  aspect: string;
  summary: string;
  /** BE-28: a playable trailer (e.g. a YouTube watch URL or an MP4). Absent until real trailers are added. */
  videoUrl?: string | null;
}

export const PROVIDER_TYPES = ["Subscription", "Free", "Rent", "Buy"] as const;
export type ProviderType = (typeof PROVIDER_TYPES)[number];

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

// ---- Lookups (BE-06) ----

export const genres = pgTable(
  "genres",
  {
    id: serial("id").primaryKey(),
    mediaType: text("media_type").$type<MediaType>().notNull(),
    name: text("name").notNull(),
  },
  (t) => [unique().on(t.mediaType, t.name)],
);

export const languages = pgTable("languages", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
});

export const regions = pgTable("regions", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
});

export const people = pgTable("people", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

// ---- Movies (BE-06) ----

export const movies = pgTable("movies", {
  id: text("id").primaryKey(),
  tmdbId: integer("tmdb_id").unique(),
  imdbId: text("imdb_id").unique(),
  title: text("title").notNull(),
  originalTitle: text("original_title"),
  year: integer("year"),
  releaseDate: date("release_date", { mode: "string" }),
  runtimeMinutes: integer("runtime_minutes"),
  rating: real("rating"),
  maturityRating: text("maturity_rating"),
  languageCode: text("language_code").references(() => languages.code),
  synopsis: text("synopsis"),
  shortSynopsis: text("short_synopsis"),
  directorId: text("director_id").references(() => people.id),
  palette: jsonb("palette").$type<Palette>(),
  // Availability is computed from `licenses` (BE-35).
  trailer: jsonb("trailer").$type<Trailer>(),
  ...timestamps,
});

export const movieGenres = pgTable(
  "movie_genres",
  {
    movieId: text("movie_id").notNull().references(() => movies.id, { onDelete: "cascade" }),
    genreId: integer("genre_id").notNull().references(() => genres.id),
    // Order matters: the first genre is shown as the primary one.
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.movieId, t.genreId] })],
);

export const movieCast = pgTable(
  "movie_cast",
  {
    movieId: text("movie_id").notNull().references(() => movies.id, { onDelete: "cascade" }),
    personId: text("person_id").notNull().references(() => people.id),
    character: text("character"),
    role: text("role"),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.movieId, t.personId] })],
);

// ---- Series, chapters, pages (BE-07) ----

export const series = pgTable("series", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  year: integer("year"),
  rating: real("rating"),
  author: text("author"),
  artist: text("artist"),
  readingDirection: text("reading_direction"),
  readingFormat: text("reading_format"),
  synopsis: text("synopsis"),
  shortSynopsis: text("short_synopsis"),
  palette: jsonb("palette").$type<Palette>(),
  ...timestamps,
});

export const seriesAltTitles = pgTable(
  "series_alt_titles",
  {
    seriesId: text("series_id").notNull().references(() => series.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.seriesId, t.title] })],
);

export const seriesGenres = pgTable(
  "series_genres",
  {
    seriesId: text("series_id").notNull().references(() => series.id, { onDelete: "cascade" }),
    genreId: integer("genre_id").notNull().references(() => genres.id),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.seriesId, t.genreId] })],
);

export const chapters = pgTable(
  "chapters",
  {
    id: text("id").primaryKey(),
    seriesId: text("series_id").notNull().references(() => series.id, { onDelete: "cascade" }),
    // real, not integer: chapters like 10.5 exist.
    number: real("number").notNull(),
    title: text("title"),
    releaseDate: date("release_date", { mode: "string" }),
    palette: jsonb("palette").$type<Palette>(),
    ...timestamps,
  },
  (t) => [unique().on(t.seriesId, t.number)],
);

export const chapterPages = pgTable(
  "chapter_pages",
  {
    chapterId: text("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number").notNull(),
    caption: text("caption"),
    subCaption: text("sub_caption"),
    palette: jsonb("palette").$type<Palette>(),
    // Null until hosted pages exist (BE-33); the reader draws placeholder art from palette.
    imageUrl: text("image_url"),
  },
  (t) => [primaryKey({ columns: [t.chapterId, t.pageNumber] })],
);

// ---- Licensing (BE-35, BE-37) ----

// What MovieShelf itself may do with a title, per region and date window. region_code null = worldwide;
// a region's own license beats the worldwide one. Dates are inclusive, in UTC; null = no limit.
export const licenses = pgTable(
  "licenses",
  {
    id: serial("id").primaryKey(),
    movieId: text("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    regionCode: text("region_code").references(() => regions.code),
    canStream: boolean("can_stream").notNull(),
    canDownload: boolean("can_download").notNull(),
    format: text("format"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    resolution: text("resolution"),
    startsOn: date("starts_on", { mode: "string" }),
    endsOn: date("ends_on", { mode: "string" }),
  },
  (t) => [
    index("licenses_movie_id_idx").on(t.movieId),
    check("licenses_window_check", sql`${t.startsOn} is null or ${t.endsOn} is null or ${t.startsOn} <= ${t.endsOn}`),
    check("licenses_download_needs_stream", sql`not ${t.canDownload} or ${t.canStream}`),
  ],
);

// ---- Where to Watch (BE-25) ----

export const movieProviders = pgTable(
  "movie_providers",
  {
    movieId: text("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    regionCode: text("region_code")
      .notNull()
      .references(() => regions.code),
    providerId: text("provider_id").notNull(),
    name: text("name").notNull(),
    type: text("type").$type<ProviderType>().notNull(),
    price: text("price"), // display price in the region's currency, e.g. "₱149"
    quality: text("quality"),
    url: text("url").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.movieId, t.regionCode, t.providerId] })],
);

// ---- Subtitles (BE-29, BE-30) ----

export const SUBTITLE_FORMATS = ["SRT", "WebVTT"] as const;
export type SubtitleFormat = (typeof SUBTITLE_FORMATS)[number];

// The file is stored as uploaded; SRT is converted to WebVTT when served so the player handles one format.
export const subtitleTracks = pgTable(
  "subtitle_tracks",
  {
    id: text("id").primaryKey(),
    movieId: text("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    langCode: text("lang_code").notNull(),
    releaseName: text("release_name").notNull(),
    format: text("format").$type<SubtitleFormat>().notNull(),
    fps: text("fps"),
    hearingImpaired: boolean("hearing_impaired").notNull().default(false),
    content: text("content").notNull(),
    ...timestamps,
  },
  (t) => [index("subtitle_tracks_movie_id_idx").on(t.movieId)],
);

// ---- Curation ----

// Editorial placement (hero, trending order, rails) kept off the title rows so it can change without editing titles.
// media_id has no FK because it points at movies or series; queries join through media_type.
export const featuredSlots = pgTable(
  "featured_slots",
  {
    id: serial("id").primaryKey(),
    slot: text("slot").notNull(),
    mediaType: text("media_type").$type<MediaType>().notNull(),
    mediaId: text("media_id").notNull(),
    position: integer("position").notNull(),
    kicker: text("kicker"),
  },
  (t) => [unique().on(t.slot, t.mediaType, t.mediaId)],
);

// ---- Per-device library and progress (BE-17, BE-18) ----

// Anonymous identity: the id is the secret held in the HTTP-only cookie. Deleting a device deletes its data.
export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // BE-27: the region the user picked for Where to Watch; null = not chosen yet.
  region: text("region").references(() => regions.code),
});

const deviceId = () =>
  uuid("device_id")
    .notNull()
    .references(() => devices.id, { onDelete: "cascade" });
// Last write wins (BE-24): holds the client's change time, capped at the server clock.
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// My List. media_id has no FK because it points at movies or series; the API checks it exists.
export const libraryItems = pgTable(
  "library_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    deviceId: deviceId(),
    mediaType: text("media_type").$type<MediaType>().notNull(),
    mediaId: text("media_id").notNull(),
    status: text("status").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAt(),
  },
  (t) => [unique().on(t.deviceId, t.mediaType, t.mediaId)],
);

// One row per movie a device has played. watched_at is the watch history; in_continue drives Continue Watching.
export const watchProgress = pgTable(
  "watch_progress",
  {
    deviceId: deviceId(),
    movieId: text("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    positionSec: real("position_sec").notNull(),
    durationSec: real("duration_sec").notNull(),
    watchedAt: timestamp("watched_at", { withTimezone: true }),
    inContinue: boolean("in_continue").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.deviceId, t.movieId] })],
);

// Where a device is in a series; in_continue drives Continue Reading.
export const readingProgress = pgTable(
  "reading_progress",
  {
    deviceId: deviceId(),
    seriesId: text("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    chapterId: text("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    pageIndex: integer("page_index").notNull(),
    totalPages: integer("total_pages").notNull(),
    mode: text("mode").notNull(),
    inContinue: boolean("in_continue").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.deviceId, t.seriesId] })],
);

export const chapterStatus = pgTable(
  "chapter_status",
  {
    deviceId: deviceId(),
    chapterId: text("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.deviceId, t.chapterId] })],
);
