import { useState, useRef, useEffect } from "react";
import "./styles.css";
import { MOVIES_DATA } from "./data/moviesData.js";
import { MANGA_SERIES } from "./data/mangaData.js";
import {
  INITIAL_MY_LIST,
  INITIAL_CONTINUE_WATCHING,
  INITIAL_CONTINUE_READING,
  INITIAL_MOVIE_DOWNLOADS,
  INITIAL_MANGA_DOWNLOADS,
} from "./data/libraryData.js";
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
  const [activeMovieId, setActiveMovieId] = useState("mov-last-horizon");
  const [activeSeriesId, setActiveSeriesId] = useState("ser-paper-moon");
  const [activeChapterId, setActiveChapterId] = useState("ch-pm-2");
  const [localPlayerFile, setLocalPlayerFile] = useState("The_Last_Horizon_1080p_Local.mp4");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState("all");
  const [region, setRegion] = useState("PH");
  const [isOffline, setIsOffline] = useState(false);

  const [myList, setMyList] = useState(INITIAL_MY_LIST);
  const [watchedMovies, setWatchedMovies] = useState(["mov-blue-hour"]);
  const [continueWatching, setContinueWatching] = useState(INITIAL_CONTINUE_WATCHING);
  const [continueReading, setContinueReading] = useState(INITIAL_CONTINUE_READING);
  const [movieDownloads, setMovieDownloads] = useState(INITIAL_MOVIE_DOWNLOADS);
  const [mangaDownloads, setMangaDownloads] = useState(INITIAL_MANGA_DOWNLOADS);
  const [chapterStatuses, setChapterStatuses] = useState({
    "ch-pm-3": "Unread",
    "ch-pm-2": "In progress",
    "ch-pm-1": "Read",
  });

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

  const navigate = (nextRoute) => {
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openMovieDetails = (movieId) => {
    const mov = MOVIES_DATA.find((m) => m.id === movieId);
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
    const ser = MANGA_SERIES.find((s) => s.id === seriesId);
    if (ser) {
      setPreviewItem({ kind: "series", data: ser });
    }
  };

  const openFullSeriesPage = (seriesId) => {
    setActiveSeriesId(seriesId);
    navigate(`/series/${seriesId}`);
  };

  const readChapter = (seriesId, chapterId) => {
    const ser = MANGA_SERIES.find((s) => s.id === seriesId) || MANGA_SERIES[0];
    const chId = chapterId || ser.chapters?.[0]?.id;
    setActiveSeriesId(ser.id);
    setActiveChapterId(chId);

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
        ? MOVIES_DATA.find((m) => m.id === mediaId)?.title
        : MANGA_SERIES.find((s) => s.id === mediaId)?.title;

    if (exists) {
      setMyList((prev) =>
        prev.filter((i) => !(i.mediaType === mediaType && i.mediaId === mediaId))
      );
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
        const ser = MANGA_SERIES.find((s) => s.id === mediaId);
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
          addedAt: "Today",
        },
        ...prev,
      ]);
      notify(`Added "${title}" to My List (${autoInitialStatus})`);
    }
  };

  const removeFromList = (mediaType, mediaId) => {
    toggleList(mediaType, mediaId);
  };

  // Continue Watching & Reading helpers — Automatically drive status transitions
  const saveMovieProgress = (movieId, positionSec, durationSec) => {
    const isCompleted = positionSec >= durationSec * 0.9 || positionSec >= durationSec;

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
    notify("Removed from Continue Watching");
  };

  const updateReadingProgress = (seriesId, chapterId, pageIndex, totalPages, mode) => {
    const ser = MANGA_SERIES.find((s) => s.id === seriesId);
    const ch = ser?.chapters?.find((c) => c.id === chapterId);
    const nextChStatus = pageIndex >= totalPages ? "Read" : "In progress";

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
    MOVIES_DATA.find((m) => m.id === activeMovieId) || MOVIES_DATA[0];
  const activeSeries =
    MANGA_SERIES.find((s) => s.id === activeSeriesId) || MANGA_SERIES[0];
  const activeChapter =
    activeSeries.chapters?.find((c) => c.id === activeChapterId) ||
    activeSeries.chapters?.[0];

  const activeWatchProgress = continueWatching.find(
    (c) => c.movieId === activeMovie?.id
  );

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
          movies={MOVIES_DATA}
          series={MANGA_SERIES}
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
          movies={MOVIES_DATA}
          series={MANGA_SERIES}
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
          movies={MOVIES_DATA}
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
          movies={MOVIES_DATA}
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
          allMovies={MOVIES_DATA}
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
          initialPositionSec={activeWatchProgress?.positionSec ?? 24}
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
            const idx = MOVIES_DATA.findIndex((m) => m.id === activeMovie.id);
            const nextMovie = MOVIES_DATA[(idx + 1) % MOVIES_DATA.length];
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
          series={MANGA_SERIES}
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
          series={MANGA_SERIES}
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
          allSeries={MANGA_SERIES}
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
          movies={MOVIES_DATA}
          series={MANGA_SERIES}
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
          movies={MOVIES_DATA}
          series={MANGA_SERIES}
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
          movies={MOVIES_DATA}
          series={MANGA_SERIES}
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
          onToggleOffline={() => {
            const next = !isOffline;
            setIsOffline(next);
            if (next) {
              setPreviewItem(null);
              navigate("/downloads");
              notify("Switched to Offline Mode — Viewing Downloads");
            } else {
              notify("Reconnected to Online Mode");
            }
          }}
          onOpenSearchPage={() => navigate("/search")}
          movies={MOVIES_DATA}
          series={MANGA_SERIES}
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
        allMovies={MOVIES_DATA}
        allSeries={MANGA_SERIES}
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
