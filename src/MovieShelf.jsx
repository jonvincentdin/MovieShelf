import { useState, useRef, useEffect } from "react";
import "./styles.css";
import { storage } from "./api/client.js";
import { cachedCatalog, cachedPages, fetchCatalog, fetchChapterPages } from "./api/catalog.js";
import {
  flush,
  loadLibrary,
  pendingChanges,
  pullLibrary,
  queueAddToList,
  queueDismissMovie,
  queueDismissSeries,
  queueMovieProgress,
  queueReadingProgress,
  queueRemoveFromList,
  saveLibrary,
  setSyncPaused,
} from "./api/sync.js";
import { NavigationHeader, Footer } from "./components/NavigationShell.jsx";
import {
  HomePage,
  SearchResultsPage,
  AboutPage,
  NotFoundPage,
} from "./components/SharedPages.jsx";
import {
  MoviesHomePage,
  BrowseMoviesPage,
  MovieDetailsPage,
  MoviePlayerPage,
} from "./components/MoviePages.jsx";
import {
  MangaHomePage,
  BrowseMangaPage,
  SeriesDetailsPage,
  ChapterReaderPage,
} from "./components/MangaPages.jsx";
import {
  MyListPage,
  DownloadsPage,
} from "./components/LibraryPages.jsx";
import { ContentPreviewModal } from "./components/SharedUI.jsx";
import { X } from "lucide-react";

/**
 * MovieShelf — Main Application Entry Component (FE-01 through FE-27)
 */
export default function MovieShelf() {
  const [route, setRoute] = useState("/");
  const [activeMovieId, setActiveMovieId] = useState(null);
  const [activeSeriesId, setActiveSeriesId] = useState(null);
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [localPlayerFile, setLocalPlayerFile] = useState("The_Last_Horizon_1080p_Local.mp4");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState("all");
  const [region, setRegion] = useState("PH");
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);

  // Catalog from the API; the last copy is cached so the app opens instantly and works offline.
  const [catalog, setCatalog] = useState(cachedCatalog);
  const [catalogError, setCatalogError] = useState(null);
  const [pagesByChapter, setPagesByChapter] = useState(cachedPages);
  const movies = catalog?.movies ?? [];
  const series = catalog?.series ?? [];

  // Library state lives on this device first (survives refresh and offline) and syncs to the server.
  const [initialLibrary] = useState(loadLibrary);
  const [myList, setMyList] = useState(initialLibrary.myList);
  const [watchedMovies, setWatchedMovies] = useState(initialLibrary.watchedMovies);
  const [continueWatching, setContinueWatching] = useState(initialLibrary.continueWatching);
  const [continueReading, setContinueReading] = useState(initialLibrary.continueReading);
  const [chapterStatuses, setChapterStatuses] = useState(initialLibrary.chapterStatuses);
  // Downloads stay on the device (Phase 7 adds the server side).
  const [movieDownloads, setMovieDownloads] = useState(() => storage.get("movieshelf.movieDownloads.v1", []));
  const [mangaDownloads, setMangaDownloads] = useState(() => storage.get("movieshelf.mangaDownloads.v1", []));

  const [toasts, setToasts] = useState([]);
  const [previewItem, setPreviewItem] = useState(null);
  const quickSearchInputRef = useRef(null);
  const seqRef = useRef(100);

  const notify = (message) => {
    seqRef.current += 1;
    const id = `toast-${seqRef.current}`;
    setToasts((prev) => [...prev.slice(-2), { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  };

  // Global Ctrl+K / Cmd+K shortcut to focus Quick Search or open Search view
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (isOffline) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (quickSearchInputRef.current) {
          quickSearchInputRef.current.focus();
        } else {
          setRoute("/search");
        }
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [isOffline]);

  useEffect(() => {
    fetchCatalog().then(setCatalog, setCatalogError);
  }, []);
  const retryCatalog = () => {
    setCatalogError(null);
    fetchCatalog().then(setCatalog, setCatalogError);
  };

  // Keep library and downloads on the device.
  useEffect(() => {
    saveLibrary({ myList, watchedMovies, continueWatching, continueReading, chapterStatuses });
  }, [myList, watchedMovies, continueWatching, continueReading, chapterStatuses]);
  useEffect(() => storage.set("movieshelf.movieDownloads.v1", movieDownloads), [movieDownloads]);
  useEffect(() => storage.set("movieshelf.mangaDownloads.v1", mangaDownloads), [mangaDownloads]);

  // Sync: send queued changes, then adopt the server's copy (it applies the same rules). Skipped while changes are
  // still queued, so nothing made offline is overwritten.
  useEffect(() => {
    setSyncPaused(isOffline);
    if (isOffline) return undefined;
    let cancelled = false;
    flush()
      .then(() => (pendingChanges() === 0 ? pullLibrary() : null))
      .then((server) => {
        if (!server || cancelled || pendingChanges() > 0) return;
        setMyList(server.myList);
        setWatchedMovies(server.watchedMovies);
        setContinueWatching(server.continueWatching);
        setContinueReading(server.continueReading);
        setChapterStatuses(server.chapterStatuses);
      })
      .catch(() => {}); // stays local-only until the next sync
    // The player saves every second; queued saves collapse and go out at most every 10 s (the server's limit).
    const timer = setInterval(flush, 10_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isOffline]);

  // Load a chapter's pages when the reader opens it.
  useEffect(() => {
    if (!route.startsWith("/read/") || !activeChapterId || pagesByChapter[activeChapterId] || isOffline) return;
    fetchChapterPages(activeChapterId)
      .then((pages) => setPagesByChapter((prev) => ({ ...prev, [activeChapterId]: pages })))
      .catch(() => notify("Couldn't load this chapter's pages. Check your connection."));
  }, [route, activeChapterId, pagesByChapter, isOffline]);

  const navigate = (nextRoute) => {
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setOffline = (next) => {
    if (next === isOffline) return;
    setIsOffline(next);
    if (next) {
      setPreviewItem(null);
      navigate("/downloads");
      notify("Switched to Offline Mode — Viewing Downloads");
    } else {
      notify("Reconnected to Online Mode");
    }
  };

  // Follow the browser's real connection state (the header toggle still works as a manual override).
  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  });

  const openMovieDetails = (movieId) => {
    const mov = movies.find((m) => m.id === movieId);
    if (mov) {
      setPreviewItem({ kind: "movie", data: mov });
    }
  };

  const openFullMoviePage = (movieId) => {
    setActiveMovieId(movieId);
    navigate(`/movie/${movieId}`);
  };

  const playMovie = (movieId) => {
    setActiveMovieId(movieId);
    // Tells the server playback started (it moves Plan to Watch → Watching), keeping any saved position.
    const mov = movies.find((m) => m.id === movieId);
    const saved = continueWatching.find((c) => c.movieId === movieId);
    if (mov) queueMovieProgress(movieId, saved?.positionSec ?? 0, mov.durationSec, false);
    // Automatically update status to Watching (unless already Watched)
    setMyList((prev) =>
      prev.map((item) =>
        item.mediaType === "movie" &&
        item.mediaId === movieId &&
        item.status === "Plan to Watch"
          ? { ...item, status: "Watching" }
          : item
      )
    );
    navigate(`/watch/${movieId}`);
  };

  const openSeriesDetails = (seriesId) => {
    const ser = series.find((s) => s.id === seriesId);
    if (ser) {
      setPreviewItem({ kind: "series", data: ser });
    }
  };

  const openFullSeriesPage = (seriesId) => {
    setActiveSeriesId(seriesId);
    navigate(`/series/${seriesId}`);
  };

  const readChapter = (seriesId, chapterId) => {
    const ser = series.find((s) => s.id === seriesId) || series[0];
    if (!ser) return;
    const chId = chapterId || ser.chapters?.[0]?.id;
    setActiveSeriesId(ser.id);
    setActiveChapterId(chId);

    // Tells the server the chapter was opened (In progress, series → Reading), keeping any saved page.
    const ch = ser.chapters?.find((c) => c.id === chId);
    const saved = continueReading.find((c) => c.seriesId === ser.id && c.chapterId === chId);
    if (ch) queueReadingProgress(ser.id, chId, saved?.pageIndex ?? 1, ch.pageCount || 1, saved?.mode ?? "vertical");

    // Automatically mark chapter In progress (if Unread) and series as Reading
    setChapterStatuses((prev) => ({
      ...prev,
      [chId]: prev[chId] === "Read" ? "Read" : "In progress",
    }));
    setMyList((prev) =>
      prev.map((item) =>
        item.mediaType === "series" &&
        item.mediaId === ser.id &&
        item.status === "Plan to Read"
          ? { ...item, status: "Reading" }
          : item
      )
    );

    navigate(`/read/${ser.id}/${chId}`);
  };

  const openLocalPlayer = (movieId, fileName) => {
    if (movieId) setActiveMovieId(movieId);
    if (fileName) setLocalPlayerFile(fileName);
    navigate("/downloads/player");
  };

  // My List helpers
  const isInList = (mediaType, mediaId) =>
    myList.some((item) => item.mediaType === mediaType && item.mediaId === mediaId);

  const toggleList = (mediaType, mediaId) => {
    if (!mediaId) return;
    const exists = isInList(mediaType, mediaId);
    const title =
      mediaType === "movie"
        ? movies.find((m) => m.id === mediaId)?.title
        : series.find((s) => s.id === mediaId)?.title;

    if (exists) {
      setMyList((prev) =>
        prev.filter((i) => !(i.mediaType === mediaType && i.mediaId === mediaId))
      );
      queueRemoveFromList(mediaType, mediaId);
      notify(`Removed "${title}" from My List`);
    } else {
      seqRef.current += 1;
      const newEntryId = `ml-${seqRef.current}`;
      // Automatically derive initial status from existing watch/read progress
      let autoInitialStatus =
        mediaType === "movie" ? "Plan to Watch" : "Plan to Read";
      if (mediaType === "movie") {
        if (watchedMovies.includes(mediaId)) autoInitialStatus = "Watched";
        else if (continueWatching.some((c) => c.movieId === mediaId))
          autoInitialStatus = "Watching";
      } else {
        const ser = series.find((s) => s.id === mediaId);
        const allChRead =
          ser?.chapters?.length > 0 &&
          ser.chapters.every(
            (c) => (chapterStatuses[c.id] || c.defaultStatus) === "Read"
          );
        if (allChRead) autoInitialStatus = "Completed";
        else if (
          continueReading.some((c) => c.seriesId === mediaId) ||
          ser?.chapters?.some((c) =>
            ["In progress", "Read"].includes(
              chapterStatuses[c.id] || c.defaultStatus
            )
          )
        ) {
          autoInitialStatus = "Reading";
        }
      }

      setMyList((prev) => [
        {
          id: newEntryId,
          mediaType,
          mediaId,
          status: autoInitialStatus,
          addedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      queueAddToList(mediaType, mediaId);
      notify(`Added "${title}" to My List (${autoInitialStatus})`);
    }
  };

  const removeFromList = (mediaType, mediaId) => {
    toggleList(mediaType, mediaId);
  };

  // Continue Watching & Reading helpers — Automatically drive status transitions
  const saveMovieProgress = (movieId, positionSec, durationSec) => {
    const isCompleted = positionSec >= durationSec * 0.9 || positionSec >= durationSec;
    queueMovieProgress(movieId, positionSec, durationSec, isCompleted);

    if (isCompleted) {
      setWatchedMovies((prev) =>
        prev.includes(movieId) ? prev : [...prev, movieId]
      );
      setContinueWatching((prev) => prev.filter((p) => p.movieId !== movieId));
      setMyList((prev) =>
        prev.map((item) =>
          item.mediaType === "movie" && item.mediaId === movieId
            ? { ...item, status: "Watched" }
            : item
        )
      );
    } else {
      setContinueWatching((prev) => {
        const filtered = prev.filter((p) => p.movieId !== movieId);
        return [
          {
            movieId,
            positionSec,
            durationSec,
            updatedLabel: "Just now",
          },
          ...filtered,
        ];
      });
      setMyList((prev) =>
        prev.map((item) =>
          item.mediaType === "movie" &&
          item.mediaId === movieId &&
          item.status !== "Watched"
            ? { ...item, status: "Watching" }
            : item
        )
      );
    }
  };

  const removeContinueWatching = (movieId) => {
    setContinueWatching((prev) => prev.filter((p) => p.movieId !== movieId));
    queueDismissMovie(movieId);
    notify("Removed from Continue Watching");
  };

  const updateReadingProgress = (seriesId, chapterId, pageIndex, totalPages, mode) => {
    const ser = series.find((s) => s.id === seriesId);
    const ch = ser?.chapters?.find((c) => c.id === chapterId);
    queueReadingProgress(seriesId, chapterId, pageIndex, totalPages, mode);
    // Read stays Read when re-reading, matching the server's rule.
    const nextChStatus =
      pageIndex >= totalPages || chapterStatuses[chapterId] === "Read" ? "Read" : "In progress";

    const nextStatuses = {
      ...chapterStatuses,
      [chapterId]: nextChStatus,
    };
    setChapterStatuses(nextStatuses);

    const allChaptersCompleted =
      ser?.chapters?.length > 0 &&
      ser.chapters.every(
        (c) => (nextStatuses[c.id] || c.defaultStatus) === "Read"
      );

    setContinueReading((prev) => {
      const filtered = prev.filter((p) => p.seriesId !== seriesId);
      if (allChaptersCompleted) return filtered;
      return [
        {
          seriesId,
          chapterId,
          chapterLabel: `${ch?.numberLabel || "Chapter"} — ${ch?.title || ""}`,
          pageIndex,
          totalPages,
          mode,
          updatedLabel: "Just now",
        },
        ...filtered,
      ];
    });

    setMyList((prev) =>
      prev.map((item) =>
        item.mediaType === "series" && item.mediaId === seriesId
          ? {
              ...item,
              status: allChaptersCompleted ? "Completed" : "Reading",
            }
          : item
      )
    );
  };

  const removeContinueReading = (seriesId) => {
    setContinueReading((prev) => prev.filter((p) => p.seriesId !== seriesId));
    queueDismissSeries(seriesId);
    notify("Removed from Continue Reading");
  };

  // Downloads helpers — Automatically progress from Download requested -> Downloading -> Downloaded
  const handleDownloadMovie = (movie) => {
    if (!movie) return;
    const exists = movieDownloads.some((d) => d.movieId === movie.id);
    if (exists) {
      notify(`"${movie.title}" is already in your Downloads history`);
      navigate("/downloads");
      return;
    }
    seqRef.current += 1;
    const newDlId = `dl-mov-${seqRef.current}`;
    setMovieDownloads((prev) => [
      {
        id: newDlId,
        movieId: movie.id,
        title: movie.title,
        format: movie.availability?.format || "MP4",
        sizeLabel: movie.availability?.sizeLabel || "720 MB",
        status: "Downloading",
        detailNote: "Transferring MP4 stream package...",
        progress: 35,
        requestedAt: "Just now",
      },
      ...prev,
    ]);
    notify(`Downloading "${movie.title}" (${movie.availability?.format || "MP4"})...`);

    setTimeout(() => {
      setMovieDownloads((prev) =>
        prev.map((d) =>
          d.id === newDlId
            ? {
                ...d,
                status: "Downloaded",
                detailNote: "Ready for local playback",
                progress: 100,
              }
            : d
        )
      );
    }, 2200);
  };

  const handleDownloadChapter = (seriesItem, chapter) => {
    if (!seriesItem || !chapter) return;
    const exists = mangaDownloads.some((d) => d.chapterId === chapter.id);
    if (exists) {
      notify(`${seriesItem.title} ${chapter.numberLabel} is already in Downloads`);
      return;
    }
    seqRef.current += 1;
    const newChDlId = `dl-ser-${seqRef.current}`;
    setMangaDownloads((prev) => [
      {
        id: newChDlId,
        seriesId: seriesItem.id,
        chapterId: chapter.id,
        seriesTitle: seriesItem.title,
        chapterTitle: `${chapter.numberLabel} • ${chapter.title}`,
        pageCount: chapter.pageCount || 6,
        sizeLabel: "15.4 MB",
        status: "Downloaded",
        detailNote: `${chapter.pageCount || 6} pages ready for local reading`,
      },
      ...prev,
    ]);
    notify(`Saved ${seriesItem.title} — ${chapter.numberLabel} to Reading Downloads`);
  };

  const activeMovie =
    movies.find((m) => m.id === activeMovieId) || movies[0];
  const activeSeries =
    series.find((s) => s.id === activeSeriesId) || series[0];
  const chapterMeta =
    activeSeries?.chapters?.find((c) => c.id === activeChapterId) ||
    activeSeries?.chapters?.[0];
  // Pages load when the reader opens the chapter; until then the reader shows its placeholder.
  const activeChapter = chapterMeta && { ...chapterMeta, pages: pagesByChapter[chapterMeta.id] };

  const activeWatchProgress = continueWatching.find(
    (c) => c.movieId === activeMovie?.id
  );
  const activeReadProgress = continueReading.find(
    (c) => c.seriesId === activeSeries?.id && c.chapterId === activeChapter?.id
  );

  if (!catalog) {
    return (
      <div className="ms-app">
        <main className="ms-main ms-container" style={{ paddingTop: "120px", textAlign: "center" }} aria-live="polite">
          {catalogError ? (
            <>
              <p>Couldn&apos;t load the catalog. Check your connection and try again.</p>
              <button type="button" className="ms-btn ms-btn-primary" onClick={retryCatalog}>
                Try again
              </button>
            </>
          ) : (
            <p>Loading MovieShelf…</p>
          )}
        </main>
      </div>
    );
  }

  // Route View Switcher
  const renderView = () => {
    if (
      isOffline &&
      route !== "/downloads/player" &&
      !route.startsWith("/read/")
    ) {
      return (
        <DownloadsPage
          movieDownloads={movieDownloads}
          mangaDownloads={mangaDownloads}
          movies={movies}
          series={series}
          isOffline={isOffline}
          onOpenLocalPlayer={openLocalPlayer}
          onRemoveMovieDownload={(id) => {
            setMovieDownloads((prev) => prev.filter((d) => d.id !== id));
            notify("Removed item from movie download history");
          }}
          onReadChapter={readChapter}
          onRemoveMangaDownload={(id) => {
            setMangaDownloads((prev) => prev.filter((d) => d.id !== id));
            notify("Removed chapter from saved reading list");
          }}
        />
      );
    }

    if (route === "/") {
      return (
        <HomePage
          movies={movies}
          series={series}
          continueWatching={continueWatching}
          continueReading={continueReading}
          onNavigate={navigate}
          onOpenMovieDetails={openMovieDetails}
          onPlayMovie={playMovie}
          onOpenSeriesDetails={openSeriesDetails}
          onReadChapter={readChapter}
          onToggleList={toggleList}
          isInList={isInList}
          onRemoveContinueWatching={removeContinueWatching}
          onRemoveContinueReading={removeContinueReading}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSubmitSearch={(q) => {
            setSearchQuery(q);
            setSearchScope("all");
            navigate("/search");
          }}
          quickSearchInputRef={quickSearchInputRef}
        />
      );
    }

    if (route === "/movies") {
      return (
        <MoviesHomePage
          movies={movies}
          continueWatching={continueWatching}
          onNavigate={navigate}
          onOpenMovieDetails={openMovieDetails}
          onPlayMovie={playMovie}
          onToggleList={toggleList}
          isInList={isInList}
          onRemoveContinueWatching={removeContinueWatching}
        />
      );
    }

    if (route === "/movies/browse") {
      return (
        <BrowseMoviesPage
          movies={movies}
          onOpenMovieDetails={openMovieDetails}
          onPlayMovie={playMovie}
          onToggleList={toggleList}
          isInList={isInList}
        />
      );
    }

    if (route.startsWith("/movie/")) {
      return (
        <MovieDetailsPage
          movie={activeMovie}
          allMovies={movies}
          region={region}
          onRegionChange={setRegion}
          onPlayMovie={playMovie}
          onDownloadMovie={handleDownloadMovie}
          onToggleList={toggleList}
          isInList={isInList("movie", activeMovie?.id)}
          isWatched={watchedMovies.includes(activeMovie?.id)}
          onOpenMovieDetails={openMovieDetails}
        />
      );
    }

    if (route.startsWith("/watch/")) {
      return (
        <MoviePlayerPage
          movie={activeMovie}
          initialPositionSec={activeWatchProgress?.positionSec ?? 0}
          onBack={() => openFullMoviePage(activeMovie.id)}
          onSaveProgress={saveMovieProgress}
          onNotify={notify}
          isLocalMode={false}
        />
      );
    }

    if (route === "/downloads/player") {
      return (
        <MoviePlayerPage
          movie={activeMovie}
          initialPositionSec={12}
          onBack={() => navigate("/downloads")}
          onSaveProgress={saveMovieProgress}
          onNotify={notify}
          isLocalMode={true}
          localFileName={localPlayerFile}
          onSelectLocalFile={() => {
            const idx = movies.findIndex((m) => m.id === activeMovie.id);
            const nextMovie = movies[(idx + 1) % movies.length];
            setActiveMovieId(nextMovie.id);
            setLocalPlayerFile(
              `${nextMovie.title.replace(/\s+/g, "_")}_1080p_Local.mp4`
            );
            notify(`Loaded local file: ${nextMovie.title}.mp4`);
          }}
        />
      );
    }

    if (route === "/manga") {
      return (
        <MangaHomePage
          series={series}
          continueReading={continueReading}
          onNavigate={navigate}
          onOpenSeriesDetails={openSeriesDetails}
          onReadChapter={readChapter}
          onToggleList={toggleList}
          isInList={isInList}
          onRemoveContinueReading={removeContinueReading}
        />
      );
    }

    if (route === "/manga/browse") {
      return (
        <BrowseMangaPage
          series={series}
          onOpenSeriesDetails={openSeriesDetails}
          onReadChapter={readChapter}
          onToggleList={toggleList}
          isInList={isInList}
        />
      );
    }

    if (route.startsWith("/series/")) {
      return (
        <SeriesDetailsPage
          seriesItem={activeSeries}
          allSeries={series}
          chapterStatuses={chapterStatuses}
          onReadChapter={readChapter}
          onDownloadChapter={handleDownloadChapter}
          onToggleList={toggleList}
          isInList={isInList("series", activeSeries?.id)}
          onOpenSeriesDetails={openSeriesDetails}
        />
      );
    }

    if (route.startsWith("/read/")) {
      return (
        <ChapterReaderPage
          seriesItem={activeSeries}
          chapter={activeChapter}
          initialPage={activeReadProgress?.pageIndex ?? 1}
          onSelectChapter={readChapter}
          onBackToSeries={() =>
            isOffline ? navigate("/downloads") : openFullSeriesPage(activeSeries.id)
          }
          onUpdateReadingProgress={updateReadingProgress}
          onMarkChapterRead={(chId, st) =>
            setChapterStatuses((prev) => ({ ...prev, [chId]: st }))
          }
        />
      );
    }

    if (
      route === "/search" ||
      route === "/movies/search" ||
      route === "/manga/search"
    ) {
      const initialScope =
        route === "/movies/search"
          ? "movies"
          : route === "/manga/search"
          ? "series"
          : searchScope;
      return (
        <SearchResultsPage
          movies={movies}
          series={series}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          initialScope={initialScope}
          onOpenMovieDetails={openMovieDetails}
          onPlayMovie={playMovie}
          onOpenSeriesDetails={openSeriesDetails}
          onReadChapter={readChapter}
          onToggleList={toggleList}
          isInList={isInList}
        />
      );
    }

    if (route === "/my-list") {
      return (
        <MyListPage
          myList={myList}
          movies={movies}
          series={series}
          continueWatching={continueWatching}
          continueReading={continueReading}
          onRemoveFromList={removeFromList}
          onOpenMovieDetails={openMovieDetails}
          onPlayMovie={playMovie}
          onOpenSeriesDetails={openSeriesDetails}
          onReadChapter={readChapter}
          onNavigate={navigate}
        />
      );
    }

    if (route === "/downloads" || isOffline) {
      return (
        <DownloadsPage
          movieDownloads={movieDownloads}
          mangaDownloads={mangaDownloads}
          movies={movies}
          series={series}
          isOffline={isOffline}
          onOpenLocalPlayer={openLocalPlayer}
          onRemoveMovieDownload={(id) => {
            setMovieDownloads((prev) => prev.filter((d) => d.id !== id));
            notify("Removed item from movie download history");
          }}
          onReadChapter={readChapter}
          onRemoveMangaDownload={(id) => {
            setMangaDownloads((prev) => prev.filter((d) => d.id !== id));
            notify("Removed chapter from saved reading list");
          }}
        />
      );
    }

    if (route === "/about") {
      return <AboutPage onNavigate={navigate} />;
    }

    return <NotFoundPage onNavigate={navigate} />;
  };

  const hasFullBleedHero =
    !isOffline &&
    (route === "/" ||
      route === "/movies" ||
      route === "/manga" ||
      route.startsWith("/movie/") ||
      route.startsWith("/series/"));

  const isImmersiveRoute =
    route.startsWith("/watch/") ||
    route === "/downloads/player" ||
    route.startsWith("/read/");

  return (
    <div className="ms-app">
      {!isImmersiveRoute && (
        <NavigationHeader
          currentRoute={isOffline ? "/downloads" : route}
          onNavigate={navigate}
          myListCount={myList.length}
          downloadsCount={movieDownloads.length + mangaDownloads.length}
          isOffline={isOffline}
          onToggleOffline={() => setOffline(!isOffline)}
          onOpenSearchPage={() => navigate("/search")}
          movies={movies}
          series={series}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSubmitSearch={(q) => {
            setSearchQuery(q);
            setSearchScope("all");
            navigate("/search");
          }}
          onSelectMovie={openMovieDetails}
          onSelectSeries={openSeriesDetails}
          quickSearchInputRef={quickSearchInputRef}
        />
      )}

      <main
        className="ms-main"
        key={route}
        style={{
          paddingTop: hasFullBleedHero || isImmersiveRoute ? 0 : "74px",
          paddingBottom: isImmersiveRoute ? 0 : undefined,
        }}
      >
        {renderView()}
      </main>

      {!isImmersiveRoute && <Footer onNavigate={navigate} />}

      {/* Netflix-Style Glassmorphism Full-Details Modal on Card Click */}
      <ContentPreviewModal
        previewItem={previewItem}
        onClose={() => setPreviewItem(null)}
        onPlayMovie={playMovie}
        onDownloadMovie={handleDownloadMovie}
        onReadChapter={readChapter}
        onDownloadChapter={handleDownloadChapter}
        onToggleList={toggleList}
        isInList={isInList}
        autoStatus={
          previewItem
            ? myList.find(
                (i) =>
                  i.mediaType ===
                    (previewItem.kind === "movie" ? "movie" : "series") &&
                  i.mediaId === previewItem.data.id
              )?.status ||
              (previewItem.kind === "movie"
                ? watchedMovies.includes(previewItem.data.id)
                  ? "Watched"
                  : continueWatching.some(
                      (c) => c.movieId === previewItem.data.id
                    )
                  ? "Watching"
                  : null
                : continueReading.some(
                    (c) => c.seriesId === previewItem.data.id
                  )
                ? "Reading"
                : null)
            : null
        }
        region={region}
        onRegionChange={setRegion}
        allMovies={movies}
        allSeries={series}
        chapterStatuses={chapterStatuses}
        onSelectPreviewItem={setPreviewItem}
      />

      {/* Toast Notification Stack */}
      {toasts.length > 0 && (
        <div className="ms-toast-stack" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className="ms-toast">
              <span>{t.message}</span>
              <button
                type="button"
                onClick={() =>
                  setToasts((prev) => prev.filter((item) => item.id !== t.id))
                }
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--ms-text-secondary)",
                  cursor: "pointer",
                  padding: "2px",
                  display: "inline-flex",
                }}
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
