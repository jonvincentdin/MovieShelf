import { api, apiAll, storage } from "./client.js";
import { dayLabel, releaseLabel, runtimeLabel, sizeLabel } from "./format.js";

// The pages were built on the mock data's shape; these adapters keep that shape so no page had to change.

export function toUiMovie(m, trendingRank, isRecentRelease) {
  return {
    ...m,
    rating: m.rating == null ? "" : m.rating.toFixed(1),
    runtime: runtimeLabel(m.runtimeMinutes),
    // shortcut: the demo player ticks once per second up to the runtime in minutes, as the mock did; use the media file's real duration once streaming exists (BE-34).
    durationSec: m.runtimeMinutes || 75,
    ReleaseLabel: releaseLabel(m.releaseDate),
    availability: m.availability && { ...m.availability, sizeLabel: sizeLabel(m.availability) },
    trendingRank,
    isRecentRelease,
  };
}

export function toUiSeries(s, chapters) {
  const latest = s.latestChapter;
  const sinceLatest = latest?.releaseDate ? dayLabel(latest.releaseDate) : "";
  return {
    ...s,
    rating: s.rating == null ? "" : s.rating.toFixed(1),
    latestChapterLabel: latest ? `Chapter ${latest.number}` : "",
    updatedLabel:
      s.status === "Completed"
        ? "Completed"
        : sinceLatest === "Today" || sinceLatest === "Yesterday"
          ? `Updated ${sinceLatest}`
          : sinceLatest,
    // Newest first, like the mock; the reader sorts its own copy for prev/next.
    chapters: [...chapters].reverse().map((c) => ({
      ...c,
      numberLabel: `Chapter ${c.number}`,
      dateLabel: dayLabel(c.releaseDate),
      defaultStatus: "Unread", // real statuses come from the library sync
    })),
  };
}

const CATALOG_KEY = "movieshelf.catalog.v1";

/** Last catalog seen, so the app opens instantly and works offline. */
export const cachedCatalog = () => storage.get(CATALOG_KEY, null);

// shortcut: loads the whole catalog up front and lets the pages filter it, as they did with the mock; move Browse and Search to the server's filter and search endpoints once the catalog is too big to load at once.
export async function fetchCatalog() {
  const [movies, series, home] = await Promise.all([apiAll("/api/movies"), apiAll("/api/series"), api("/api/home")]);
  // Series in the home page's trending order, as the mock array was.
  const trending = home.trendingSeries.map((s) => s.id);
  const rank = (id) => (trending.includes(id) ? trending.indexOf(id) : trending.length);
  series.sort((a, b) => rank(a.id) - rank(b.id));
  const chapterLists = await Promise.all(series.map((s) => apiAll(`/api/series/${s.id}/chapters`)));
  const recent = new Set(home.recentReleases.map((m) => m.id));
  const catalog = {
    // /api/movies is already in trending order.
    movies: movies.map((m, i) => toUiMovie(m, i + 1, recent.has(m.id))),
    series: series.map((s, i) => toUiSeries(s, chapterLists[i])),
  };
  storage.set(CATALOG_KEY, catalog);
  return catalog;
}

const PAGES_KEY = "movieshelf.pages.v1";
export const cachedPages = () => storage.get(PAGES_KEY, {});

/** Pages for one chapter, cached so opened chapters stay readable offline. */
export async function fetchChapterPages(chapterId) {
  const { pages } = await api(`/api/chapters/${chapterId}/pages`);
  storage.set(PAGES_KEY, { ...cachedPages(), [chapterId]: pages });
  return pages;
}
