import { api, ApiError, storage } from "./client.js";
import { timeAgo } from "./format.js";

// Local-first library sync (BE-24). The app applies every change to its own state at once and stores it on the
// device; this queue sends the changes to the server, in order, whenever the device is online. The server applies
// the same status rules and keeps the newest change, so pulling its state afterwards is safe.

const QUEUE_KEY = "movieshelf.syncQueue.v1";
const LIBRARY_KEY = "movieshelf.library.v1";

export const EMPTY_LIBRARY = {
  myList: [],
  watchedMovies: [],
  continueWatching: [],
  continueReading: [],
  chapterStatuses: {},
};

export const loadLibrary = () => ({ ...EMPTY_LIBRARY, ...storage.get(LIBRARY_KEY, {}) });
export const saveLibrary = (library) => storage.set(LIBRARY_KEY, library);

let queue = storage.get(QUEUE_KEY, []);
let paused = false;
let flushing = null;
let retryAt = 0;

/** Pause while the user has switched to Offline Mode by hand. */
export function setSyncPaused(value) {
  paused = value;
}

export const pendingChanges = () => queue.length;

/**
 * Queues a change. A newer change with the same key replaces the older one, so the player's per-second saves
 * collapse into one. `at` is when it happened; the server uses it to keep the newest change.
 */
function enqueue(key, op) {
  queue = [...queue.filter((o) => o.key !== key), { key, ...op, at: new Date().toISOString() }];
  storage.set(QUEUE_KEY, queue);
}

export const queueAddToList = (mediaType, mediaId) =>
  enqueue(`list:${mediaType}:${mediaId}`, { type: "add", mediaType, mediaId });
export const queueRemoveFromList = (mediaType, mediaId) =>
  enqueue(`list:${mediaType}:${mediaId}`, { type: "remove", mediaType, mediaId });

// Finishing is queued under its own key so a later rewatch from the start can't erase that the movie was watched.
export const queueMovieProgress = (movieId, positionSec, durationSec, finished) =>
  enqueue(`watch:${movieId}${finished ? ":finished" : ""}`, { type: "watch", movieId, positionSec, durationSec });
export const queueDismissMovie = (movieId) => enqueue(`dismiss-watch:${movieId}`, { type: "dismissWatch", movieId });

// One key per chapter (and per finished chapter) so reading several chapters offline doesn't lose any of them.
export const queueReadingProgress = (seriesId, chapterId, pageIndex, totalPages, mode) =>
  enqueue(`read:${seriesId}:${chapterId}${pageIndex >= totalPages ? ":finished" : ""}`, {
    type: "read",
    seriesId,
    chapterId,
    pageIndex,
    totalPages,
    mode,
  });
export const queueDismissSeries = (seriesId) => enqueue(`dismiss-read:${seriesId}`, { type: "dismissRead", seriesId });

async function send(op, serverList) {
  const updatedAt = op.at;
  switch (op.type) {
    case "add":
      return api("/api/library", { method: "POST", body: { mediaType: op.mediaType, mediaId: op.mediaId, updatedAt } });
    case "remove": {
      const item = (await serverList()).find((i) => i.mediaType === op.mediaType && i.mediaId === op.mediaId);
      return item && api(`/api/library/${item.id}`, { method: "DELETE" });
    }
    case "watch":
      return api(`/api/progress/movies/${op.movieId}`, {
        method: "PUT",
        body: { positionSec: op.positionSec, durationSec: op.durationSec, updatedAt },
      });
    case "dismissWatch":
      return api(`/api/progress/movies/${op.movieId}`, { method: "DELETE" });
    case "read":
      return api(`/api/progress/series/${op.seriesId}`, {
        method: "PUT",
        body: { chapterId: op.chapterId, pageIndex: op.pageIndex, totalPages: op.totalPages, mode: op.mode, updatedAt },
      });
    case "dismissRead":
      return api(`/api/progress/series/${op.seriesId}`, { method: "DELETE" });
  }
}

/** Sends queued changes in order. Stops (and keeps the rest) when offline, throttled or the server is failing. */
export function flush() {
  if (paused || !navigator.onLine || Date.now() < retryAt) return Promise.resolve();
  flushing ??= (async () => {
    let list;
    const serverList = () => (list ??= api("/api/library").then((r) => r.items));
    try {
      while (queue.length > 0) {
        const op = queue[0];
        try {
          await send(op, serverList);
        } catch (err) {
          if (err instanceof ApiError && err.status === 429) {
            retryAt = Date.now() + (err.retryAfterSec ?? 10) * 1000;
            return;
          }
          // Offline or a server error: keep the change and try again later.
          if (!(err instanceof ApiError) || err.status >= 500) return;
          // Any other 4xx (409 newer change already saved, 404 title gone) will never succeed: drop it.
        }
        // Remove only this op; a newer change with the same key may have been queued meanwhile.
        queue = queue.filter((o) => o !== op);
        storage.set(QUEUE_KEY, queue);
      }
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

/** The server's copy of this device's library, in the shapes MovieShelf.jsx keeps in state. */
export async function pullLibrary() {
  const [library, movieProgress, seriesProgress, chapters] = await Promise.all([
    api("/api/library"),
    api("/api/progress/movies"),
    api("/api/progress/series"),
    api("/api/progress/chapters"),
  ]);
  return {
    myList: library.items.map(({ id, mediaType, mediaId, status, addedAt }) => ({ id, mediaType, mediaId, status, addedAt })),
    watchedMovies: movieProgress.items.filter((p) => p.watched).map((p) => p.movieId),
    continueWatching: movieProgress.items
      .filter((p) => p.inContinueWatching)
      .map((p) => ({ movieId: p.movieId, positionSec: p.positionSec, durationSec: p.durationSec, updatedLabel: timeAgo(p.updatedAt) })),
    continueReading: seriesProgress.items
      .filter((p) => p.inContinueReading)
      .map((p) => ({
        seriesId: p.seriesId,
        chapterId: p.chapterId,
        chapterLabel: `Chapter ${p.chapterNumber} — ${p.chapterTitle ?? ""}`,
        pageIndex: p.pageIndex,
        totalPages: p.totalPages,
        mode: p.mode,
        updatedLabel: timeAgo(p.updatedAt),
      })),
    chapterStatuses: Object.fromEntries(chapters.items.map((c) => [c.chapterId, c.status])),
  };
}
