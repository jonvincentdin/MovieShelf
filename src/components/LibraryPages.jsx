import { useState } from "react";
import {
  Play,
  BookOpen,
  Trash2,
  FolderOpen,
} from "lucide-react";
import { HorizonArtwork, StateFeedbackBox, Modal } from "./SharedUI.jsx";

const MOVIE_LIST_STATUSES = ["All", "Watching", "Watched", "Plan to Watch"];
const SERIES_LIST_STATUSES = [
  "All",
  "Reading",
  "Completed",
  "Plan to Read",
];

function getStatusBadgeStyle(status) {
  if (status === "Watched" || status === "Completed") {
    return "ms-badge ms-badge-green";
  }
  if (status === "Watching" || status === "Reading" || status === "In progress") {
    return "ms-badge ms-badge-red";
  }
  return "ms-badge";
}

/**
 * Unified My List Personal Library Page (/my-list) — Automatic Status & Progress
 */
export function MyListPage({
  myList,
  movies,
  series,
  continueWatching = [],
  continueReading = [],
  onRemoveFromList,
  onOpenMovieDetails,
  onPlayMovie,
  onOpenSeriesDetails,
  onReadChapter,
  onNavigate,
}) {
  const [activeTab, setActiveTab] = useState("movies"); // movies | reading
  const [movieStatusFilter, setMovieStatusFilter] = useState("All");
  const [seriesStatusFilter, setSeriesStatusFilter] = useState("All");

  const savedMovies = myList
    .filter((item) => item.mediaType === "movie")
    .map((item) => ({
      ...item,
      media: movies.find((m) => m.id === item.mediaId),
    }))
    .filter((item) => item.media)
    .filter(
      (item) => movieStatusFilter === "All" || item.status === movieStatusFilter
    );

  const savedSeries = myList
    .filter((item) => item.mediaType === "series")
    .map((item) => ({
      ...item,
      media: series.find((s) => s.id === item.mediaId),
    }))
    .filter((item) => item.media)
    .filter(
      (item) => seriesStatusFilter === "All" || item.status === seriesStatusFilter
    );

  return (
    <div className="ms-container" style={{ paddingTop: "24px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ margin: "0 0 6px", fontSize: "2.1rem", fontWeight: 800 }}>
          My List
        </h1>
        <p style={{ margin: 0, color: "var(--ms-text-secondary)", fontSize: "0.92rem" }}>
          Manage your saved movies, manga, and manhwa reading statuses in one unified personal library.
        </p>
      </div>

      {/* Tabs: Movies & Reading */}
      <div className="ms-tabs" role="tablist" aria-label="My List categories">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "movies"}
          className={`ms-tab ${activeTab === "movies" ? "is-active" : ""}`}
          onClick={() => setActiveTab("movies")}
        >
          Movies ({myList.filter((i) => i.mediaType === "movie").length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "reading"}
          className={`ms-tab ${activeTab === "reading" ? "is-active" : ""}`}
          onClick={() => setActiveTab("reading")}
        >
          Manga / Manhwa ({myList.filter((i) => i.mediaType === "series").length})
        </button>
      </div>

      {activeTab === "movies" ? (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "22px" }}>
            {MOVIE_LIST_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                className={`ms-btn ms-btn-sm ${
                  movieStatusFilter === st ? "ms-btn-primary" : "ms-btn-secondary"
                }`}
                onClick={() => setMovieStatusFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>

          {savedMovies.length === 0 ? (
            <StateFeedbackBox
              icon="empty"
              title="No saved movies in this view"
              description="Add movies from the home page or catalog to track what you are watching, completed, or planning to watch."
              actionLabel="Browse Movies"
              onAction={() => onNavigate("/movies/browse")}
            />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
                gap: "18px",
              }}
            >
              {savedMovies.map(({ id, status, media }) => {
                const progressEntry = continueWatching.find((c) => c.movieId === media.id);
                const pct =
                  status === "Watched"
                    ? 100
                    : progressEntry
                    ? Math.min(
                        99,
                        Math.max(
                          6,
                          Math.round(
                            (progressEntry.positionSec /
                              (progressEntry.durationSec || media.durationSec || 75)) *
                              100
                          )
                        )
                      )
                    : 0;

                return (
                  <div
                    key={id}
                    onClick={() => onOpenMovieDetails(media.id)}
                    style={{
                      background: "#1A1A1A",
                      borderRadius: "var(--ms-radius-md)",
                      padding: "16px",
                      display: "flex",
                      gap: "16px",
                      cursor: "pointer",
                      boxShadow: "0 10px 26px rgba(0,0,0,0.48)",
                    }}
                  >
                    <div
                      style={{
                        width: "92px",
                        aspectRatio: "2 / 3",
                        borderRadius: "6px",
                        overflow: "hidden",
                        flexShrink: 0,
                        cursor: "pointer",
                      }}
                      onClick={() => onOpenMovieDetails(media.id)}
                    >
                      <HorizonArtwork palette={media.palette} aspect="poster" />
                    </div>

                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: "1.05rem",
                            cursor: "pointer",
                            marginBottom: "4px",
                          }}
                          onClick={() => onOpenMovieDetails(media.id)}
                        >
                          {media.title}
                        </div>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--ms-text-secondary)",
                            marginBottom: "10px",
                          }}
                        >
                          {media.year} • {media.runtime} • ★ {media.rating}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            marginBottom: pct > 0 ? "8px" : "0",
                          }}
                        >
                          <span className={getStatusBadgeStyle(status)}>
                            {status}
                          </span>
                          {pct > 0 && (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--ms-text-secondary)",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {pct}%
                            </span>
                          )}
                        </div>

                        {pct > 0 && (
                          <div
                            className="ms-progress-track"
                            style={{ borderRadius: "2px", height: "4px" }}
                          >
                            <div
                              className="ms-progress-fill"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginTop: "12px",
                        }}
                      >
                        <button
                          type="button"
                          className="ms-btn ms-btn-primary ms-btn-sm"
                          style={{ flex: 1 }}
                          onClick={() =>
                            media.availability?.canStream
                              ? onPlayMovie(media.id)
                              : onOpenMovieDetails(media.id)
                          }
                        >
                          <Play size={13} fill="currentColor" />{" "}
                          {status === "Watching"
                            ? "Resume"
                            : status === "Watched"
                            ? "Watch Again"
                            : "Watch"}
                        </button>
                        <button
                          type="button"
                          className="ms-icon-btn"
                          style={{ width: "32px", height: "32px" }}
                          onClick={() => onRemoveFromList("movie", media.id)}
                          aria-label={`Remove ${media.title} from My List`}
                          title="Remove from My List"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "22px" }}>
            {SERIES_LIST_STATUSES.map((st) => (
              <button
                key={st}
                type="button"
                className={`ms-btn ms-btn-sm ${
                  seriesStatusFilter === st ? "ms-btn-primary" : "ms-btn-secondary"
                }`}
                onClick={() => setSeriesStatusFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>

          {savedSeries.length === 0 ? (
            <StateFeedbackBox
              icon="empty"
              title="No saved manga or manhwa in this view"
              description="Save series to track chapters you are currently reading, planning to read, or have completed."
              actionLabel="Browse Manga & Manhwa"
              onAction={() => onNavigate("/manga/browse")}
            />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
                gap: "18px",
              }}
            >
              {savedSeries.map(({ id, status, media }) => {
                const firstCh =
                  media.chapters?.[media.chapters.length - 1] ||
                  media.chapters?.[0];
                const readEntry = continueReading.find(
                  (c) => c.seriesId === media.id
                );
                const pct =
                  status === "Completed"
                    ? 100
                    : readEntry
                    ? Math.min(
                        99,
                        Math.max(
                          10,
                          Math.round(
                            (readEntry.pageIndex / (readEntry.totalPages || 6)) *
                              100
                          )
                        )
                      )
                    : 0;

                return (
                  <div
                    key={id}
                    onClick={() => onOpenMovieDetails(media.id)}
                    style={{
                      background: "#1A1A1A",
                      borderRadius: "var(--ms-radius-md)",
                      padding: "16px",
                      display: "flex",
                      gap: "16px",
                      cursor: "pointer",
                      boxShadow: "0 10px 26px rgba(0,0,0,0.48)",
                    }}
                  >
                    <div
                      style={{
                        width: "92px",
                        aspectRatio: "2 / 3",
                        borderRadius: "6px",
                        overflow: "hidden",
                        flexShrink: 0,
                        cursor: "pointer",
                      }}
                      onClick={() => onOpenSeriesDetails(media.id)}
                    >
                      <HorizonArtwork palette={media.palette} aspect="poster" />
                    </div>

                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: "1.05rem",
                            cursor: "pointer",
                            marginBottom: "4px",
                          }}
                          onClick={() => onOpenSeriesDetails(media.id)}
                        >
                          {media.title}
                        </div>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--ms-text-secondary)",
                            marginBottom: "10px",
                          }}
                        >
                          {media.type} • {media.latestChapterLabel} • ★{" "}
                          {media.rating}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            marginBottom: pct > 0 ? "8px" : "0",
                          }}
                        >
                          <span className={getStatusBadgeStyle(status)}>
                            {status}
                          </span>
                          {readEntry && (
                            <span
                              style={{
                                fontSize: "0.74rem",
                                color: "var(--ms-text-secondary)",
                              }}
                            >
                              Page {readEntry.pageIndex}/{readEntry.totalPages}
                            </span>
                          )}
                        </div>

                        {pct > 0 && (
                          <div
                            className="ms-progress-track"
                            style={{ borderRadius: "2px", height: "4px" }}
                          >
                            <div
                              className="ms-progress-fill"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginTop: "12px",
                        }}
                      >
                        <button
                          type="button"
                          className="ms-btn ms-btn-primary ms-btn-sm"
                          style={{ flex: 1 }}
                          onClick={() =>
                            readEntry
                              ? onReadChapter(media.id, readEntry.chapterId)
                              : firstCh
                              ? onReadChapter(media.id, firstCh.id)
                              : onOpenSeriesDetails(media.id)
                          }
                        >
                          <BookOpen size={13} />{" "}
                          {status === "Reading"
                            ? "Continue"
                            : status === "Completed"
                            ? "Read Again"
                            : "Read"}
                        </button>
                        <button
                          type="button"
                          className="ms-icon-btn"
                          style={{ width: "32px", height: "32px" }}
                          onClick={() => onRemoveFromList("series", media.id)}
                          aria-label={`Remove ${media.title} from My List`}
                          title="Remove from My List"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Downloads Page (/downloads) — Matches 07_downloads.png (FE-24)
 */
export function DownloadsPage({
  movieDownloads,
  mangaDownloads,
  movies,
  series,
  isOffline,
  onOpenLocalPlayer,
  onRemoveMovieDownload,
  onReadChapter,
  onRemoveMangaDownload,
}) {
  const [activeTab, setActiveTab] = useState("movies"); // movies | reading
  const [filePickerOpen, setFilePickerOpen] = useState(false);

  return (
    <div className="ms-container" style={{ paddingTop: "24px" }}>
      {/* Header matching 07_downloads.png */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "14px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "2.35rem", fontWeight: 800 }}>Downloads</h1>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "0.88rem",
            fontWeight: 700,
            color: isOffline ? "#FCD34D" : "var(--ms-text-secondary)",
            letterSpacing: "0.04em",
          }}
        >
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: isOffline ? "#F59E0B" : "#9CA3AF",
            }}
          />
          <span>{isOffline ? "OFFLINE" : "ONLINE"}</span>
        </div>
      </div>

      {/* Movies / Reading Tabs matching 07_downloads.png */}
      <div className="ms-tabs" role="tablist" aria-label="Downloads categories">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "movies"}
          className={`ms-tab ${activeTab === "movies" ? "is-active" : ""}`}
          onClick={() => setActiveTab("movies")}
        >
          Movies
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "reading"}
          className={`ms-tab ${activeTab === "reading" ? "is-active" : ""}`}
          onClick={() => setActiveTab("reading")}
        >
          Reading
        </button>
      </div>

      {activeTab === "movies" ? (
        <>
          {/* Open a local movie Card matching 07_downloads.png */}
          <section
            style={{
              background: "var(--ms-surface)",
              border: "1px solid var(--ms-border)",
              borderRadius: "var(--ms-radius-md)",
              padding: "24px 26px",
              marginBottom: "30px",
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: "1.35rem", fontWeight: 800 }}>
              Open a local movie
            </h2>
            <p style={{ margin: "0 0 18px", color: "var(--ms-text-secondary)", fontSize: "0.94rem" }}>
              Choose a video on this device. Nothing is uploaded.
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="ms-btn ms-btn-primary"
                onClick={() => setFilePickerOpen(true)}
              >
                Open Local Video
              </button>
            </div>
          </section>

          {/* Download History matching 07_downloads.png */}
          <section className="ms-section">
            <h2 className="ms-section-title" style={{ marginBottom: "14px", fontSize: "1.35rem" }}>
              Download history
            </h2>

            {movieDownloads.length === 0 ? (
              <StateFeedbackBox
                icon="empty"
                title="No movie downloads recorded"
                description="Movies you download or open locally will appear in your history here."
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {movieDownloads.map((item) => {
                  const mov = movies.find((m) => m.id === item.movieId) || movies[0];
                  return (
                    <div
                      key={item.id}
                      style={{
                        background: "var(--ms-surface)",
                        border: "1px solid var(--ms-border)",
                        borderRadius: "var(--ms-radius-md)",
                        padding: "16px 20px",
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "16px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <div
                          style={{
                            width: "54px",
                            height: "74px",
                            borderRadius: "4px",
                            overflow: "hidden",
                            flexShrink: 0,
                          }}
                        >
                          <HorizonArtwork palette={mov?.palette} aspect="poster" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: "4px" }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: "0.86rem", color: "var(--ms-text-secondary)" }}>
                            {item.format} • {item.sizeLabel} •{" "}
                            <strong style={{ color: "#FFFFFF" }}>{item.status}</strong> •{" "}
                            {item.detailNote}
                          </div>
                          {item.status === "Downloading" && (
                            <div
                              className="ms-progress-track"
                              style={{ width: "220px", marginTop: "8px", borderRadius: "2px" }}
                            >
                              <div
                                className="ms-progress-fill"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <span className={getStatusBadgeStyle(item.status)}>
                          {item.status}
                        </span>

                        <button
                          type="button"
                          className="ms-btn ms-btn-secondary"
                          disabled={item.status === "Unavailable" || item.status === "Failed"}
                          onClick={() => onOpenLocalPlayer(item.movieId, `${item.title}.mp4`)}
                        >
                          Open Local Video
                        </button>

                        <button
                          type="button"
                          className="ms-icon-btn"
                          onClick={() => onRemoveMovieDownload(item.id)}
                          aria-label={`Remove ${item.title} from download history`}
                          title="Remove from history"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p style={{ marginTop: "18px", color: "var(--ms-text-secondary)", fontSize: "0.88rem" }}>
              Your browser may ask you to select a file again after refresh.
            </p>
          </section>
        </>
      ) : (
        /* Manga / Manhwa Downloads Tab */
        <section className="ms-section">
          <h2 className="ms-section-title" style={{ marginBottom: "14px", fontSize: "1.35rem" }}>
            Saved Manga & Manhwa Chapters
          </h2>

          {mangaDownloads.length === 0 ? (
            <StateFeedbackBox
              icon="empty"
              title="No saved reading chapters"
              description="Chapters you save from Series Details appear here for quick local access."
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {mangaDownloads.map((item) => {
                const ser = series.find((s) => s.id === item.seriesId) || series[0];
                return (
                  <div
                    key={item.id}
                    style={{
                      background: "var(--ms-surface)",
                      border: "1px solid var(--ms-border)",
                      borderRadius: "var(--ms-radius-md)",
                      padding: "16px 20px",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div
                        style={{
                          width: "54px",
                          height: "74px",
                          borderRadius: "4px",
                          overflow: "hidden",
                          flexShrink: 0,
                        }}
                      >
                        <HorizonArtwork palette={ser?.palette} aspect="poster" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "1.08rem", marginBottom: "2px" }}>
                          {item.seriesTitle}
                        </div>
                        <div style={{ fontSize: "0.9rem", color: "#E5E5E5", marginBottom: "2px" }}>
                          {item.chapterTitle}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--ms-text-secondary)" }}>
                          {item.pageCount} pages • {item.sizeLabel} •{" "}
                          <strong style={{ color: "#FFFFFF" }}>{item.status}</strong> •{" "}
                          {item.detailNote}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button
                        type="button"
                        className="ms-btn ms-btn-primary ms-btn-sm"
                        onClick={() => onReadChapter(item.seriesId, item.chapterId)}
                      >
                        <BookOpen size={14} /> Open Chapter
                      </button>
                      <button
                        type="button"
                        className="ms-icon-btn"
                        onClick={() => onRemoveMangaDownload(item.id)}
                        aria-label={`Remove ${item.chapterTitle}`}
                        title="Remove chapter entry"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Local File Selector Modal */}
      <Modal
        isOpen={filePickerOpen}
        onClose={() => setFilePickerOpen(false)}
        title="Select a Local Video File"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--ms-text-secondary)" }}>
            Choose a local MP4 or WebM file from your device to launch the MovieShelf Local Video Player with SRT/WebVTT subtitle pairing.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {movies.slice(0, 4).map((m) => (
              <div
                key={m.id}
                style={{
                  background: "var(--ms-elevated)",
                  border: "1px solid var(--ms-border)",
                  borderRadius: "var(--ms-radius-sm)",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.94rem" }}>
                    {m.title.replace(/\s+/g, "_")}_1080p_Local.mp4
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--ms-text-secondary)" }}>
                    {m.availability?.sizeLabel || "720 MB"} • Local Device Storage
                  </div>
                </div>
                <button
                  type="button"
                  className="ms-btn ms-btn-primary ms-btn-sm"
                  onClick={() => {
                    setFilePickerOpen(false);
                    onOpenLocalPlayer(
                      m.id,
                      `${m.title.replace(/\s+/g, "_")}_1080p_Local.mp4`
                    );
                  }}
                >
                  <FolderOpen size={14} /> Open File
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
