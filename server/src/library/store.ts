import { and, count, desc, eq, sql } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import {
  chapterStatus,
  chapters,
  devices,
  libraryItems,
  movies,
  readingProgress,
  series,
  watchProgress,
  type MediaType,
} from "../db/schema.ts";
import {
  chapterStatusAfterProgress,
  initialMovieStatus,
  initialSeriesStatus,
  isStale,
  isThrottled,
  isWatched,
  MOVIE_STATUSES,
  movieStatusAfterProgress,
  SERIES_STATUSES,
  seriesStatusAfterProgress,
  WRITE_INTERVAL_MS,
  type ChapterStatus,
  type MovieStatus,
} from "./rules.ts";

/** Why a write was refused; routes map these to HTTP errors. */
export type Refusal =
  | { refused: "not_found"; what: string }
  | { refused: "stale" }
  | { refused: "throttled"; retryAfterSec: number }
  | { refused: "invalid"; message: string };

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const iso = (d: Date | null) => d?.toISOString() ?? null;
const notFound = (what: string): Refusal => ({ refused: "not_found", what });
const throttled = (last: Date, now: Date): Refusal => ({
  refused: "throttled",
  retryAfterSec: Math.max(1, Math.ceil((WRITE_INTERVAL_MS - (now.getTime() - last.getTime())) / 1000)),
});

// ---- Devices (BE-17) ----

export async function deviceExists(db: Db, id: string) {
  const [row] = await db.select({ id: devices.id }).from(devices).where(eq(devices.id, id));
  return row !== undefined;
}

export async function createDevice(db: Db) {
  const [row] = await db.insert(devices).values({}).returning({ id: devices.id });
  return row.id;
}

export async function setDeviceRegion(db: Db, id: string, region: string) {
  await db.update(devices).set({ region }).where(eq(devices.id, id));
}

// ---- My List (BE-19) ----

const itemDto = (r: typeof libraryItems.$inferSelect) => ({
  id: r.id,
  mediaType: r.mediaType,
  mediaId: r.mediaId,
  status: r.status,
  addedAt: iso(r.addedAt),
  updatedAt: iso(r.updatedAt),
});

export async function listLibrary(db: Db, deviceId: string) {
  const rows = await db
    .select()
    .from(libraryItems)
    .where(eq(libraryItems.deviceId, deviceId))
    .orderBy(desc(libraryItems.addedAt));
  return rows.map(itemDto);
}

async function mediaExists(tx: Tx, mediaType: MediaType, mediaId: string) {
  const table = mediaType === "movie" ? movies : series;
  const [row] = await tx.select({ id: table.id }).from(table).where(eq(table.id, mediaId));
  return row !== undefined;
}

/** Totals for a series' chapters on this device, ignoring `exceptChapterId` (so callers can add its new status). */
async function chapterCounts(tx: Tx, deviceId: string, seriesId: string, exceptChapterId = "") {
  const [row] = await tx
    .select({
      total: count(),
      read: sql<number>`count(*) filter (where ${chapterStatus.status} = 'Read' and ${chapters.id} <> ${exceptChapterId})`.mapWith(Number),
      started: sql<number>`count(*) filter (where ${chapterStatus.status} in ('In progress', 'Read'))`.mapWith(Number),
    })
    .from(chapters)
    .leftJoin(chapterStatus, and(eq(chapterStatus.chapterId, chapters.id), eq(chapterStatus.deviceId, deviceId)))
    .where(eq(chapters.seriesId, seriesId));
  return row;
}

async function initialStatus(tx: Tx, deviceId: string, mediaType: MediaType, mediaId: string) {
  if (mediaType === "movie") {
    const [p] = await tx
      .select()
      .from(watchProgress)
      .where(and(eq(watchProgress.deviceId, deviceId), eq(watchProgress.movieId, mediaId)));
    return initialMovieStatus({ watched: p?.watchedAt != null, inContinueWatching: p?.inContinue ?? false });
  }
  const [p] = await tx
    .select({ inContinue: readingProgress.inContinue })
    .from(readingProgress)
    .where(and(eq(readingProgress.deviceId, deviceId), eq(readingProgress.seriesId, mediaId)));
  const c = await chapterCounts(tx, deviceId, mediaId);
  return initialSeriesStatus({
    allChaptersRead: c.total > 0 && c.read === c.total,
    anyProgress: (p?.inContinue ?? false) || c.started > 0,
  });
}

/** Adding twice is a no-op that returns the existing item (safe to replay from an offline queue). */
export async function addToLibrary(db: Db, deviceId: string, mediaType: MediaType, mediaId: string, at: Date) {
  return db.transaction(async (tx) => {
    if (!(await mediaExists(tx, mediaType, mediaId))) return notFound(mediaType === "movie" ? "Movie" : "Series");
    const where = and(
      eq(libraryItems.deviceId, deviceId),
      eq(libraryItems.mediaType, mediaType),
      eq(libraryItems.mediaId, mediaId),
    );
    const [existing] = await tx.select().from(libraryItems).where(where);
    if (existing) return { item: itemDto(existing), created: false };
    const status = await initialStatus(tx, deviceId, mediaType, mediaId);
    const [row] = await tx
      .insert(libraryItems)
      .values({ deviceId, mediaType, mediaId, status, addedAt: at, updatedAt: at })
      .onConflictDoNothing()
      .returning();
    // A concurrent add won the race; return its row.
    const item = row ?? (await tx.select().from(libraryItems).where(where))[0];
    return { item: itemDto(item), created: row !== undefined };
  });
}

export async function setLibraryStatus(db: Db, deviceId: string, id: string, status: string, at: Date) {
  return db.transaction(async (tx): Promise<Refusal | { item: ReturnType<typeof itemDto> }> => {
    const [item] = await tx
      .select()
      .from(libraryItems)
      .where(and(eq(libraryItems.id, id), eq(libraryItems.deviceId, deviceId)))
      .for("update");
    if (!item) return notFound("Library item");
    const allowed: readonly string[] = item.mediaType === "movie" ? MOVIE_STATUSES : SERIES_STATUSES;
    if (!allowed.includes(status)) {
      return { refused: "invalid", message: `status must be one of: ${allowed.join(", ")}` };
    }
    if (isStale(item.updatedAt, at)) return { refused: "stale" };
    const [row] = await tx
      .update(libraryItems)
      .set({ status, updatedAt: at })
      .where(eq(libraryItems.id, id))
      .returning();
    return { item: itemDto(row) };
  });
}

export async function removeFromLibrary(db: Db, deviceId: string, id: string) {
  const rows = await db
    .delete(libraryItems)
    .where(and(eq(libraryItems.id, id), eq(libraryItems.deviceId, deviceId)))
    .returning({ id: libraryItems.id });
  return rows.length > 0;
}

/** Applies a status the rules derived from progress, unless the item was changed more recently (e.g. by hand). */
async function applyDerivedStatus(tx: Tx, deviceId: string, mediaType: MediaType, mediaId: string, next: string, at: Date) {
  const [item] = await tx
    .select()
    .from(libraryItems)
    .where(
      and(eq(libraryItems.deviceId, deviceId), eq(libraryItems.mediaType, mediaType), eq(libraryItems.mediaId, mediaId)),
    );
  if (!item || item.status === next || isStale(item.updatedAt, at)) return item ? itemDto(item) : null;
  const [row] = await tx
    .update(libraryItems)
    .set({ status: next, updatedAt: at })
    .where(eq(libraryItems.id, item.id))
    .returning();
  return itemDto(row);
}

async function libraryStatusOf(tx: Tx, deviceId: string, mediaType: MediaType, mediaId: string) {
  const [item] = await tx
    .select({ status: libraryItems.status })
    .from(libraryItems)
    .where(
      and(eq(libraryItems.deviceId, deviceId), eq(libraryItems.mediaType, mediaType), eq(libraryItems.mediaId, mediaId)),
    );
  return item?.status;
}

// ---- Movie progress (BE-20) ----

const movieProgressDto = (r: typeof watchProgress.$inferSelect) => ({
  movieId: r.movieId,
  positionSec: r.positionSec,
  durationSec: r.durationSec,
  watched: r.watchedAt !== null,
  watchedAt: iso(r.watchedAt),
  inContinueWatching: r.inContinue,
  updatedAt: iso(r.updatedAt),
});

/** Every movie this device has played, newest first. Continue Watching = inContinueWatching; history = watched. */
export async function listMovieProgress(db: Db, deviceId: string) {
  const rows = await db
    .select()
    .from(watchProgress)
    .where(eq(watchProgress.deviceId, deviceId))
    .orderBy(desc(watchProgress.updatedAt));
  return rows.map(movieProgressDto);
}

export async function saveMovieProgress(
  db: Db,
  deviceId: string,
  movieId: string,
  p: { positionSec: number; durationSec: number },
  at: Date,
  now: Date,
) {
  return db.transaction(async (tx) => {
    if (!(await mediaExists(tx, "movie", movieId))) return notFound("Movie");
    const key = and(eq(watchProgress.deviceId, deviceId), eq(watchProgress.movieId, movieId));
    const [prev] = await tx.select().from(watchProgress).where(key).for("update");
    if (isStale(prev?.updatedAt, at)) return { refused: "stale" } as Refusal;

    const watched = isWatched(p.positionSec, p.durationSec);
    const current = await libraryStatusOf(tx, deviceId, "movie", movieId);
    const nextStatus = current ? movieStatusAfterProgress(current as MovieStatus, watched) : undefined;
    const changesStatus =
      !prev || (watched && prev.watchedAt === null) || prev.inContinue === watched || nextStatus !== current;
    if (prev && isThrottled(prev.updatedAt, now, changesStatus)) return throttled(prev.updatedAt, now);

    const values = {
      positionSec: p.positionSec,
      durationSec: p.durationSec,
      watchedAt: watched ? (prev?.watchedAt ?? at) : (prev?.watchedAt ?? null),
      inContinue: !watched,
      updatedAt: at,
    };
    const [row] = await tx
      .insert(watchProgress)
      .values({ deviceId, movieId, ...values })
      .onConflictDoUpdate({ target: [watchProgress.deviceId, watchProgress.movieId], set: values })
      .returning();
    const libraryItem = nextStatus
      ? await applyDerivedStatus(tx, deviceId, "movie", movieId, nextStatus, at)
      : null;
    return { progress: movieProgressDto(row), libraryItem };
  });
}

export async function dismissMovieProgress(db: Db, deviceId: string, movieId: string) {
  const rows = await db
    .update(watchProgress)
    .set({ inContinue: false, updatedAt: new Date() })
    .where(and(eq(watchProgress.deviceId, deviceId), eq(watchProgress.movieId, movieId)))
    .returning({ movieId: watchProgress.movieId });
  return rows.length > 0;
}

// ---- Reading progress (BE-21) ----

export async function listSeriesProgress(db: Db, deviceId: string) {
  const rows = await db
    .select({ p: readingProgress, chapterNumber: chapters.number, chapterTitle: chapters.title })
    .from(readingProgress)
    .innerJoin(chapters, eq(chapters.id, readingProgress.chapterId))
    .where(eq(readingProgress.deviceId, deviceId))
    .orderBy(desc(readingProgress.updatedAt));
  return rows.map(({ p, chapterNumber, chapterTitle }) => seriesProgressDto(p, chapterNumber, chapterTitle));
}

const seriesProgressDto = (r: typeof readingProgress.$inferSelect, chapterNumber: number, chapterTitle: string | null) => ({
  seriesId: r.seriesId,
  chapterId: r.chapterId,
  chapterNumber,
  chapterTitle,
  pageIndex: r.pageIndex,
  totalPages: r.totalPages,
  mode: r.mode,
  inContinueReading: r.inContinue,
  updatedAt: iso(r.updatedAt),
});

export async function saveSeriesProgress(
  db: Db,
  deviceId: string,
  seriesId: string,
  p: { chapterId: string; pageIndex: number; totalPages: number; mode: string },
  at: Date,
  now: Date,
) {
  return db.transaction(async (tx) => {
    if (!(await mediaExists(tx, "series", seriesId))) return notFound("Series");
    const [chapter] = await tx
      .select({ number: chapters.number, title: chapters.title })
      .from(chapters)
      .where(and(eq(chapters.id, p.chapterId), eq(chapters.seriesId, seriesId)));
    if (!chapter) return notFound("Chapter in this series");

    const key = and(eq(readingProgress.deviceId, deviceId), eq(readingProgress.seriesId, seriesId));
    const [prev] = await tx.select().from(readingProgress).where(key).for("update");
    if (isStale(prev?.updatedAt, at)) return { refused: "stale" } as Refusal;

    const chapterKey = and(eq(chapterStatus.deviceId, deviceId), eq(chapterStatus.chapterId, p.chapterId));
    const [prevChapter] = await tx.select().from(chapterStatus).where(chapterKey);
    const nextChapter = chapterStatusAfterProgress(prevChapter?.status as ChapterStatus | undefined, p.pageIndex, p.totalPages);
    const c = await chapterCounts(tx, deviceId, seriesId, p.chapterId);
    const allRead = c.total > 0 && c.read + (nextChapter === "Read" ? 1 : 0) === c.total;
    const current = await libraryStatusOf(tx, deviceId, "series", seriesId);
    const nextStatus = current ? seriesStatusAfterProgress(allRead) : undefined;

    const changesStatus =
      !prev ||
      prev.chapterId !== p.chapterId ||
      prevChapter?.status !== nextChapter ||
      prev.inContinue === allRead ||
      nextStatus !== current;
    if (prev && isThrottled(prev.updatedAt, now, changesStatus)) return throttled(prev.updatedAt, now);

    if (prevChapter?.status !== nextChapter) {
      await tx
        .insert(chapterStatus)
        .values({ deviceId, chapterId: p.chapterId, status: nextChapter, updatedAt: at })
        .onConflictDoUpdate({
          target: [chapterStatus.deviceId, chapterStatus.chapterId],
          set: { status: nextChapter, updatedAt: at },
        });
    }
    const values = { ...p, inContinue: !allRead, updatedAt: at };
    const [row] = await tx
      .insert(readingProgress)
      .values({ deviceId, seriesId, ...values })
      .onConflictDoUpdate({ target: [readingProgress.deviceId, readingProgress.seriesId], set: values })
      .returning();
    const libraryItem = nextStatus
      ? await applyDerivedStatus(tx, deviceId, "series", seriesId, nextStatus, at)
      : null;
    return {
      progress: seriesProgressDto(row, chapter.number, chapter.title),
      chapterStatus: nextChapter,
      libraryItem,
    };
  });
}

export async function dismissSeriesProgress(db: Db, deviceId: string, seriesId: string) {
  const rows = await db
    .update(readingProgress)
    .set({ inContinue: false, updatedAt: new Date() })
    .where(and(eq(readingProgress.deviceId, deviceId), eq(readingProgress.seriesId, seriesId)))
    .returning({ seriesId: readingProgress.seriesId });
  return rows.length > 0;
}

/** Chapter statuses this device has set (chapters without a row are Unread). */
export async function listChapterStatuses(db: Db, deviceId: string, seriesId?: string) {
  const rows = await db
    .select({
      chapterId: chapterStatus.chapterId,
      seriesId: chapters.seriesId,
      status: chapterStatus.status,
      updatedAt: chapterStatus.updatedAt,
    })
    .from(chapterStatus)
    .innerJoin(chapters, eq(chapters.id, chapterStatus.chapterId))
    .where(and(eq(chapterStatus.deviceId, deviceId), seriesId ? eq(chapters.seriesId, seriesId) : undefined))
    .orderBy(chapters.seriesId, chapters.number);
  return rows.map((r) => ({ ...r, updatedAt: iso(r.updatedAt) }));
}
