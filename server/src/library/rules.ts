// Status rules ported from src/MovieShelf.jsx (BE-22). Pure functions so each rule has a unit test.

export const MOVIE_STATUSES = ["Plan to Watch", "Watching", "Watched"] as const;
export const SERIES_STATUSES = ["Plan to Read", "Reading", "Completed"] as const;
export type MovieStatus = (typeof MOVIE_STATUSES)[number];
export type SeriesStatus = (typeof SERIES_STATUSES)[number];
export type ChapterStatus = "Unread" | "In progress" | "Read";

/** Share of the duration after which a movie counts as watched. */
export const WATCHED_RATIO = 0.9;
/** BE-23: minimum gap between two progress writes for the same title, unless the write changes a status. */
export const WRITE_INTERVAL_MS = 10_000;

export const isWatched = (positionSec: number, durationSec: number) => positionSec >= durationSec * WATCHED_RATIO;

/** Any saved progress: ≥ 90 % → Watched; otherwise Watching, but never downgrades Watched. Covers "starting playback". */
export function movieStatusAfterProgress(current: MovieStatus, watched: boolean): MovieStatus {
  if (watched) return "Watched";
  return current === "Watched" ? "Watched" : "Watching";
}

/** Adding a movie to My List picks its status from history. */
export function initialMovieStatus(h: { watched: boolean; inContinueWatching: boolean }): MovieStatus {
  if (h.watched) return "Watched";
  return h.inContinueWatching ? "Watching" : "Plan to Watch";
}

/** Reaching the last page marks the chapter Read; otherwise In progress, but Read stays Read. */
export function chapterStatusAfterProgress(
  current: ChapterStatus | undefined,
  pageIndex: number,
  totalPages: number,
): ChapterStatus {
  if (pageIndex >= totalPages) return "Read";
  return current === "Read" ? "Read" : "In progress";
}

/** After reading progress: every chapter Read → Completed (and it leaves Continue Reading); otherwise Reading. */
export const seriesStatusAfterProgress = (allChaptersRead: boolean): SeriesStatus =>
  allChaptersRead ? "Completed" : "Reading";

/** Adding a series to My List picks its status from history. */
export function initialSeriesStatus(h: { allChaptersRead: boolean; anyProgress: boolean }): SeriesStatus {
  if (h.allChaptersRead) return "Completed";
  return h.anyProgress ? "Reading" : "Plan to Read";
}

/**
 * BE-24 last write wins: the client says when the change happened; the server caps it at its own clock so a
 * fast client clock can't win forever. A write older than what's stored is stale.
 */
export function changeTime(clientUpdatedAt: string | undefined, now: Date) {
  const t = clientUpdatedAt ? new Date(clientUpdatedAt) : now;
  return t > now ? now : t;
}

export const isStale = (stored: Date | undefined, incoming: Date) => stored !== undefined && incoming < stored;

/** BE-23: drop a progress write that lands within the interval of the last one and changes no status. */
export const isThrottled = (lastWrite: Date | undefined, now: Date, changesStatus: boolean) =>
  !changesStatus && lastWrite !== undefined && now.getTime() - lastWrite.getTime() < WRITE_INTERVAL_MS;
