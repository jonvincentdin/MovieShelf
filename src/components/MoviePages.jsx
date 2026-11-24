import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Download,
  Plus,
  Check,
  Film,
  Filter,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Upload,
} from "lucide-react";
import {
  HorizonArtwork,
  HeroBanner,
  ContentCarousel,
  MovieCard,
  ContinueWatchingCard,
  Modal,
  StateFeedbackBox,
} from "./SharedUI.jsx";
import {
  MOVIE_GENRES,
  MOVIE_LANGUAGES,
  SUBTITLE_CATALOG,
} from "../data/moviesData.js";

/**
 * Movies Home Page (/movies) — (FE-15)
 */
export function MoviesHomePage({
  movies,
  continueWatching,
  onNavigate,
  onOpenMovieDetails,
  onPlayMovie,
  onToggleList,
  isInList,
  onRemoveContinueWatching,
}) {
  const [heroIdx, setHeroIdx] = useState(0);
  const featuredMovies = movies.slice(0, 5);
  const recentMovies = movies.filter((m) => m.isRecentRelease);

  return (
    <div>
      <HeroBanner
        items={featuredMovies}
        activeIndex={heroIdx}
        onSelectIndex={setHeroIdx}
        onPrimaryAction={(item) =>
          item.availability?.canStream ? onPlayMovie(item.id) : onOpenMovieDetails(item.id)
        }
        onSecondaryAction={(item) => onOpenMovieDetails(item.id)}
        onToggleList={onToggleList}
        isInList={isInList("movie", featuredMovies[heroIdx]?.id)}
        mediaType="movie"
      />

      <div className="ms-container">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "28px",
          }}
        >
          <div className="ms-genre-pill-row">
            {["All Genres", "Adventure", "Sci-Fi", "Thriller", "Drama", "Action"].map((pill, i) => (
              <button
                key={pill}
                type="button"
                className={`ms-genre-pill ${i === 0 ? "is-active" : ""}`}
                onClick={() => onNavigate("/movies/browse")}
              >
                {pill}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="ms-btn ms-btn-secondary ms-btn-sm"
            onClick={() => onNavigate("/movies/browse")}
          >
            <Filter size={14} /> Browse All Movies
          </button>
        </div>

      {continueWatching.length > 0 && (
        <ContentCarousel
          title="Continue Watching"
          subtitle="Resume active movies"
          onViewAll={() => onNavigate("/my-list")}
        >
          {continueWatching.map((entry) => {
            const movie = movies.find((m) => m.id === entry.movieId);
            return (
              <ContinueWatchingCard
                key={entry.movieId}
                item={entry}
                movie={movie}
                onResume={onPlayMovie}
                onOpenDetails={onOpenMovieDetails}
                onRemove={onRemoveContinueWatching}
              />
            );
          })}
        </ContentCarousel>
      )}

      <ContentCarousel
        title="Top 10 Movies This Week"
        subtitle="Ranked by viewer activity"
        onViewAll={() => onNavigate("/movies/browse")}
      >
        {movies.map((movie, idx) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            rankNumber={idx + 1}
            onOpenDetails={onOpenMovieDetails}
            onPlay={onPlayMovie}
            onToggleList={onToggleList}
            isInList={isInList("movie", movie.id)}
          />
        ))}
      </ContentCarousel>

      {/* Chronological Recent Releases Feed */}
      <section className="ms-section">
        <div className="ms-section-header">
          <h2 className="ms-section-title">Recent Movie Releases</h2>
          <button
            type="button"
            className="ms-view-all-btn"
            onClick={() => onNavigate("/movies/browse")}
          >
            Full Catalog <ChevronRight size={15} />
          </button>
        </div>
        <div className="ms-feed-list">
          {recentMovies.map((rm) => (
            <div
              key={rm.id}
              className="ms-feed-row"
              onClick={() => onOpenMovieDetails(rm.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenMovieDetails(rm.id);
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <div
                  style={{
                    width: "44px",
                    height: "62px",
                    borderRadius: "4px",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  <HorizonArtwork palette={rm.palette} aspect="poster" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem" }}>{rm.title}</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--ms-text-secondary)" }}>
                    {rm.ReleaseLabel} • {rm.genres.join(" / ")} • {rm.runtime}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="ms-badge ms-badge-green">★ {rm.rating}</span>
                <button
                  type="button"
                  className="ms-btn ms-btn-primary ms-btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    rm.availability?.canStream ? onPlayMovie(rm.id) : onOpenMovieDetails(rm.id);
                  }}
                >
                  <Play size={13} fill="currentColor" /> Watch
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ContentCarousel
        title="Filipino & Asian Spotlight"
        subtitle="Regional cinema and acclaimed originals"
        onViewAll={() => onNavigate("/movies/browse")}
      >
        {movies
          .filter((m) => ["TL", "JA", "KO"].includes(m.languageCode))
          .map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onOpenDetails={onOpenMovieDetails}
              onPlay={onPlayMovie}
              onToggleList={onToggleList}
              isInList={isInList("movie", movie.id)}
            />
          ))}
      </ContentCarousel>
      </div>
    </div>
  );
}

/**
 * Browse Movies Page (/movies/browse) — (FE-16)
 */
export function BrowseMoviesPage({
  movies,
  onOpenMovieDetails,
  onPlayMovie,
  onToggleList,
  isInList,
}) {
  const [genre, setGenre] = useState("All");
  const [year, setYear] = useState("All");
  const [language, setLanguage] = useState("All");
  const [minRating, setMinRating] = useState("All");
  const [sortBy, setSortBy] = useState("popularity");
  const [visibleCount, setVisibleCount] = useState(8);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const years = ["All", "2026", "2025", "2024", "2023"];

  const filtered = movies
    .filter((m) => {
      if (genre !== "All" && !m.genres.includes(genre)) return false;
      if (year !== "All" && String(m.year) !== year) return false;
      if (language !== "All" && m.languageCode !== language) return false;
      if (minRating !== "All" && parseFloat(m.rating) < parseFloat(minRating)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "date") return new Date(b.releaseDate) - new Date(a.releaseDate);
      if (sortBy === "rating") return parseFloat(b.rating) - parseFloat(a.rating);
      if (sortBy === "az") return a.title.localeCompare(b.title);
      return a.trendingRank - b.trendingRank;
    });

  const activeFilters = [
    genre !== "All" && { label: `Genre: ${genre}`, clear: () => setGenre("All") },
    year !== "All" && { label: `Year: ${year}`, clear: () => setYear("All") },
    language !== "All" && { label: `Language: ${language}`, clear: () => setLanguage("All") },
    minRating !== "All" && { label: `Rating ≥ ${minRating}`, clear: () => setMinRating("All") },
  ].filter(Boolean);

  const resetAll = () => {
    setGenre("All");
    setYear("All");
    setLanguage("All");
    setMinRating("All");
    setSortBy("popularity");
  };

  return (
    <div className="ms-container" style={{ paddingTop: "24px" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "1.9rem", fontWeight: 800 }}>
            Browse Movies
          </h1>
          <p style={{ margin: 0, color: "var(--ms-text-secondary)", fontSize: "0.9rem" }}>
            Filter by genre, release year, original language, and rating.
          </p>
        </div>
        <button
          type="button"
          className="ms-btn ms-btn-secondary ms-btn-sm"
          onClick={() => setMobileFilterOpen(true)}
        >
          <Sliders size={15} /> Filter Sheet ({activeFilters.length})
        </button>
      </div>

      {/* Desktop Filter Toolbar */}
      <div className="ms-filter-bar">
        <div className="ms-filter-group">
          <select
            className="ms-select"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            aria-label="Filter by genre"
          >
            <option value="All">All Genres</option>
            {MOVIE_GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <select
            className="ms-select"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            aria-label="Filter by release year"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y === "All" ? "All Years" : y}
              </option>
            ))}
          </select>

          <select
            className="ms-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Filter by original language"
          >
            <option value="All">All Languages</option>
            {MOVIE_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>

          <select
            className="ms-select"
            value={minRating}
            onChange={(e) => setMinRating(e.target.value)}
            aria-label="Filter by minimum rating"
          >
            <option value="All">Any Rating</option>
            <option value="8.5">8.5+ ★</option>
            <option value="8.0">8.0+ ★</option>
          </select>
        </div>

        <div className="ms-filter-group">
          <select
            className="ms-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort movies"
          >
            <option value="popularity">Sort: Popularity</option>
            <option value="date">Sort: Release Date</option>
            <option value="rating">Sort: Highest Rating</option>
            <option value="az">Sort: Title (A–Z)</option>
          </select>

          {activeFilters.length > 0 && (
            <button type="button" className="ms-btn ms-btn-ghost ms-btn-sm" onClick={resetAll}>
              <RotateCcw size={14} /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "18px" }}>
          {activeFilters.map((f) => (
            <button
              key={f.label}
              type="button"
              className="ms-filter-chip"
              onClick={f.clear}
              title="Click to remove filter"
            >
              <span>{f.label}</span>
              <span>×</span>
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <StateFeedbackBox
          icon="search"
          title="No movies match your filters"
          description="Try broadening your selected genre, year, or language filters."
          actionLabel="Reset All Filters"
          onAction={resetAll}
        />
      ) : (
        <>
          <div className="ms-poster-grid">
            {filtered.slice(0, visibleCount).map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onOpenDetails={onOpenMovieDetails}
                onPlay={onPlayMovie}
                onToggleList={onToggleList}
                isInList={isInList("movie", movie.id)}
              />
            ))}
          </div>

          {visibleCount < filtered.length && (
            <div style={{ textAlign: "center", marginTop: "28px" }}>
              <button
                type="button"
                className="ms-btn ms-btn-secondary"
                onClick={() => setVisibleCount((c) => c + 6)}
              >
                Load More Movies ({filtered.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* Mobile Filter Sheet Modal */}
      <Modal
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        title="Filter & Sort Movies"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "6px" }}>
              Genre
            </label>
            <select
              className="ms-select"
              style={{ width: "100%" }}
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            >
              <option value="All">All Genres</option>
              {MOVIE_GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "6px" }}>
              Release Year
            </label>
            <select
              className="ms-select"
              style={{ width: "100%" }}
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y === "All" ? "All Years" : y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "6px" }}>
              Original Language
            </label>
            <select
              className="ms-select"
              style={{ width: "100%" }}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="All">All Languages</option>
              {MOVIE_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginTop: "8px" }}>
            <button type="button" className="ms-btn ms-btn-ghost" onClick={resetAll}>
              Reset All
            </button>
            <button
              type="button"
              className="ms-btn ms-btn-primary"
              onClick={() => setMobileFilterOpen(false)}
            >
              Apply Filters ({filtered.length})
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/**
 * Movie Details Page & Regional Where to Watch (/movie/:id) — Matches 02_movie_details.png (FE-17)
 */
export function MovieDetailsPage({
  movie,
  allMovies,
  onPlayMovie,
  onDownloadMovie,
  onToggleList,
  isInList,
  isWatched,
  onOpenMovieDetails,
}) {
  const [trailerOpen, setTrailerOpen] = useState(false);

  if (!movie) {
    return (
      <div className="ms-container" style={{ paddingTop: "32px" }}>
        <StateFeedbackBox
          icon="error"
          title="Movie not found"
          description="The requested movie ID was not found in the catalog."
        />
      </div>
    );
  }

  const relatedMovies = allMovies
    .filter(
      (m) => m.id !== movie.id && m.genres.some((g) => movie.genres.includes(g))
    )
    .slice(0, 6);

  return (
    <div className="ms-container">
      {/* Main Backdrop & Poster Hero matching 02_movie_details.png */}
      <section className="ms-detail-hero">
        <div className="ms-hero-artwork">
          <HorizonArtwork palette={movie.palette} aspect="wide" />
        </div>
        <div className="ms-hero-scrim" />

        <div className="ms-detail-hero-inner">
          <div className="ms-detail-poster">
            <HorizonArtwork palette={movie.palette} aspect="poster" />
          </div>

          <div>
            <h1
              style={{
                fontSize: "clamp(2rem, 4vw, 3.1rem)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                textTransform: "uppercase",
                margin: "0 0 8px",
              }}
            >
              {movie.title}
            </h1>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "10px",
                color: "var(--ms-text-secondary)",
                fontSize: "0.95rem",
                marginBottom: "16px",
              }}
            >
              <span>{movie.year}</span>
              <span>•</span>
              <span>{movie.genres.join(", ")}</span>
              <span>•</span>
              <span>{movie.runtime}</span>
              <span>•</span>
              <span className="ms-badge">{movie.maturityRating}</span>
              <span className="ms-badge ms-badge-green">★ {movie.rating}</span>
              {movie.originalTitle !== movie.title && (
                <span style={{ color: "var(--ms-text-muted)" }}>
                  ({movie.originalTitle})
                </span>
              )}
            </div>

            <p
              style={{
                color: "#E8E8E8",
                fontSize: "1.02rem",
                lineHeight: 1.6,
                maxWidth: "64ch",
                margin: "0 0 22px",
              }}
            >
              {movie.synopsis}
            </p>

            {/* Primary Actions Bar matching 02_movie_details.png */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
              <button
                type="button"
                className="ms-btn ms-btn-primary ms-btn-lg"
                disabled={!movie.availability?.canStream}
                onClick={() => onPlayMovie(movie.id)}
              >
                <Play size={17} fill="currentColor" />
                {movie.availability?.canStream ? "Watch Now" : "Streaming Unavailable"}
              </button>

              <button
                type="button"
                className="ms-btn ms-btn-secondary ms-btn-lg"
                disabled={!movie.availability?.canDownload}
                onClick={() => onDownloadMovie(movie)}
              >
                <Download size={17} />
                {movie.availability?.canDownload ? "Download Movie" : "Download Restricted"}
              </button>

              <button
                type="button"
                className="ms-btn ms-btn-secondary ms-btn-lg"
                onClick={() => onToggleList("movie", movie.id)}
              >
                {isInList ? <Check size={17} /> : <Plus size={17} />}
                {isInList ? "In My List" : "+ My List"}
              </button>

              <button
                type="button"
                className="ms-btn ms-btn-ghost ms-btn-lg"
                onClick={() => setTrailerOpen(true)}
              >
                <Film size={17} />
                Watch Trailer
              </button>

              {isWatched && (
                <span
                  className="ms-badge ms-badge-green"
                  style={{ padding: "8px 14px", fontSize: "0.84rem" }}
                >
                  ✓ Watched
                </span>
              )}
            </div>

            <div style={{ fontSize: "0.84rem", color: "var(--ms-text-secondary)" }}>
              {movie.availability?.format} • {movie.availability?.sizeLabel} •{" "}
              {movie.availability?.statusText}
            </div>
          </div>
        </div>
      </section>

      {/* Cast & Crew Section matching 02_movie_details.png */}
      <section className="ms-section">
        <h2 className="ms-section-title" style={{ marginBottom: "14px" }}>
          Cast & Crew
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
            gap: "14px",
          }}
        >
          <div
            style={{
              background: "var(--ms-surface)",
              border: "1px solid var(--ms-border)",
              borderRadius: "var(--ms-radius-md)",
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: "0.74rem", color: "var(--ms-primary)", fontWeight: 700 }}>
              DIRECTOR
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.98rem", marginTop: "2px" }}>
              {movie.director}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--ms-text-secondary)" }}>
              Principal Director
            </div>
          </div>

          {movie.cast?.map((member) => (
            <div
              key={member.id}
              style={{
                background: "var(--ms-surface)",
                border: "1px solid var(--ms-border)",
                borderRadius: "var(--ms-radius-md)",
                padding: "14px 16px",
              }}
            >
              <div style={{ fontSize: "0.74rem", color: "var(--ms-text-muted)", fontWeight: 700 }}>
                {member.role.toUpperCase()}
              </div>
              <div style={{ fontWeight: 700, fontSize: "0.98rem", marginTop: "2px" }}>
                {member.name}
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--ms-text-secondary)" }}>
                as {member.character}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Official Trailer Section matching 02_movie_details.png */}
      <section className="ms-section">
        <h2 className="ms-section-title" style={{ marginBottom: "12px" }}>
          Official Trailer
        </h2>
        <div
          style={{
            background: "#1A1A1A",
            borderRadius: "var(--ms-radius-md)",
            padding: "18px 20px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            boxShadow: "0 10px 26px rgba(0,0,0,0.45)",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "4px" }}>
              {movie.trailer?.title || `${movie.title} — Official Teaser`}
            </div>
            <div style={{ fontSize: "0.86rem", color: "var(--ms-text-secondary)" }}>
              {movie.trailer?.summary} ({movie.trailer?.duration || "2:10"} •{" "}
              {movie.trailer?.aspect || "16:9"})
            </div>
          </div>
          <button
            type="button"
            className="ms-btn ms-btn-secondary"
            onClick={() => setTrailerOpen(true)}
          >
            <Play size={15} fill="currentColor" /> Play Trailer Preview
          </button>
        </div>
      </section>

      {/* Scene Stills & Key Chapters Breakdown */}
      <section className="ms-section">
        <h2 className="ms-section-title" style={{ marginBottom: "14px" }}>
          Scene Chapters & Stills
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
          }}
        >
          {[
            {
              label: "Act I • The Frontier Relay",
              time: "00:00",
              desc: "Opening aerial sequence across the western ridge at dusk.",
            },
            {
              label: "Act II • Signal Calibration",
              time: "00:24",
              desc: "Restoring the beacon transmission before the eclipse.",
            },
            {
              label: "Act III • The Amber Horizon",
              time: "00:52",
              desc: "Final ascent to the watchtower under the crimson sky.",
            },
          ].map((scene, idx) => (
            <div
              key={scene.label}
              onClick={() => onPlayMovie(movie.id)}
              style={{
                background: "#1A1A1A",
                borderRadius: "var(--ms-radius-md)",
                overflow: "hidden",
                cursor: "pointer",
                boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
              }}
            >
              <div style={{ width: "100%", aspectRatio: "16 / 9", position: "relative" }}>
                <HorizonArtwork palette={movie.palette} aspect="wide" />
                <span
                  className="ms-badge"
                  style={{ position: "absolute", bottom: "8px", right: "8px" }}
                >
                  {scene.time}
                </span>
                <span
                  className="ms-badge ms-badge-red"
                  style={{ position: "absolute", top: "8px", left: "8px" }}
                >
                  Scene {idx + 1}
                </span>
              </div>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ fontWeight: 700, fontSize: "0.94rem", marginBottom: "4px" }}>
                  {scene.label}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--ms-text-secondary)" }}>
                  {scene.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Technical & Audio / Subtitle Specifications */}
      <section className="ms-section">
        <h2 className="ms-section-title" style={{ marginBottom: "14px" }}>
          Technical & Subtitle Specifications
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
          }}
        >
          <div
            style={{
              background: "#1A1A1A",
              borderRadius: "var(--ms-radius-md)",
              padding: "16px 18px",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--ms-text-muted)", fontWeight: 700 }}>
              VIDEO & MASTERING
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.98rem", marginTop: "4px" }}>
              {movie.availability?.resolution || "1080p Full HD"} • {movie.trailer?.aspect || "2.39:1"}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--ms-text-secondary)", marginTop: "2px" }}>
              Container: {movie.availability?.format} ({movie.availability?.sizeLabel})
            </div>
          </div>

          <div
            style={{
              background: "#1A1A1A",
              borderRadius: "var(--ms-radius-md)",
              padding: "16px 18px",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--ms-text-muted)", fontWeight: 700 }}>
              AUDIO TRACKS
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.98rem", marginTop: "4px" }}>
              {movie.originalLanguage} (Original 5.1 Surround)
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--ms-text-secondary)", marginTop: "2px" }}>
              Stereo 2.0 Downmix • Spatial Dialogue Boost
            </div>
          </div>

          <div
            style={{
              background: "#1A1A1A",
              borderRadius: "var(--ms-radius-md)",
              padding: "16px 18px",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--ms-text-muted)", fontWeight: 700 }}>
              INCLUDED SUBTITLES
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.98rem", marginTop: "4px" }}>
              English, Filipino / Tagalog
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--ms-text-secondary)", marginTop: "2px" }}>
              WebVTT & SRT • Custom size, position & speed in Player
            </div>
          </div>

          <div
            style={{
              background: "#1A1A1A",
              borderRadius: "var(--ms-radius-md)",
              padding: "16px 18px",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--ms-text-muted)", fontWeight: 700 }}>
              CATALOG IDENTIFIERS
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.98rem", marginTop: "4px" }}>
              TMDB #{movie.tmdbId} • {movie.imdbId}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--ms-text-secondary)", marginTop: "2px" }}>
              Release Date: {movie.releaseDate} ({movie.maturityRating})
            </div>
          </div>
        </div>
      </section>

      {/* Related Movies */}
      {relatedMovies.length > 0 && (
        <ContentCarousel title="More Like This" subtitle="Related genre selections">
          {relatedMovies.map((rm) => (
            <MovieCard
              key={rm.id}
              movie={rm}
              onOpenDetails={onOpenMovieDetails}
              onPlay={onPlayMovie}
              onToggleList={onToggleList}
              isInList={isInList("movie", rm.id)}
            />
          ))}
        </ContentCarousel>
      )}

      {/* Trailer Modal */}
      <Modal
        isOpen={trailerOpen}
        onClose={() => setTrailerOpen(false)}
        title={movie.trailer?.title || `${movie.title} — Official Trailer`}
      >
        <div
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            borderRadius: "var(--ms-radius-md)",
            overflow: "hidden",
            position: "relative",
            marginBottom: "14px",
            border: "1px solid var(--ms-border)",
          }}
        >
          <HorizonArtwork palette={movie.palette} aspect="wide" />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: "1.3rem", marginBottom: "8px" }}>
              {movie.title} ({movie.year})
            </div>
            <p style={{ margin: "0 0 16px", color: "#E5E5E5", fontSize: "0.9rem", maxWidth: "42ch" }}>
              {movie.trailer?.summary}
            </p>
            <button
              type="button"
              className="ms-btn ms-btn-primary"
              onClick={() => {
                setTrailerOpen(false);
                onPlayMovie(movie.id);
              }}
            >
              <Play size={15} fill="currentColor" /> Open Full Movie Player
            </button>
          </div>
        </div>
        <div style={{ fontSize: "0.82rem", color: "var(--ms-text-secondary)" }}>
          Duration: {movie.trailer?.duration} • Aspect Ratio: {movie.trailer?.aspect} • Audio: Muted by default
        </div>
      </Modal>
    </div>
  );
}

/**
 * Movie Player & Subtitle Management Interface (/watch/:id) — Matches 03_movie_player.png (FE-18 & FE-19)
 */
export function MoviePlayerPage({
  movie,
  initialPositionSec = 24,
  onBack,
  onSaveProgress,
  onNotify,
  isLocalMode = false,
  localFileName = null,
  onSelectLocalFile = null,
}) {
  const durationSec = movie?.durationSec || 75;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialPositionSec);
  const [volume, setVolume] = useState(85);
  const [isMuted, setIsMuted] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [activeTrackId, setActiveTrackId] = useState("sub-en-horizon-web");
  const [timingOffset, setTimingOffset] = useState(0.0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [captionSize, setCaptionSize] = useState("medium"); // small | medium | large | xlarge
  const [captionBottomPct, setCaptionBottomPct] = useState(8); // 4% (Bottom) to 78% (Top)
  const [captionBgOpacity, setCaptionBgOpacity] = useState(85);
  const [customCueText, setCustomCueText] = useState("");
  const [customTrackLang, setCustomTrackLang] = useState("English");
  const [captionSettingsOpen, setCaptionSettingsOpen] = useState(false);
  const [findSubtitlesOpen, setFindSubtitlesOpen] = useState(false);
  const [importSubtitlesOpen, setImportSubtitlesOpen] = useState(false);
  const [subtitleLangFilter, setSubtitleLangFilter] = useState("All");
  const [importedTracks, setImportedTracks] = useState([]);
  const trackCounterRef = useRef(1);

  const allTracks = [...SUBTITLE_CATALOG, ...importedTracks];
  const activeTrack =
    allTracks.find((t) => t.id === activeTrackId) || SUBTITLE_CATALOG[0];

  const captionFontSizeMap = {
    small: "0.9rem",
    medium: "1.15rem",
    large: "1.45rem",
    xlarge: "1.8rem",
  };

  // Playback timer — respects playbackSpeed multiplier and marks Watched on completion
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = Math.max(200, Math.round(1000 / playbackSpeed));
    const timer = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 1 >= durationSec ? durationSec : prev + 1;
        if (next >= durationSec) {
          setIsPlaying(false);
        }
        if (movie && onSaveProgress) {
          onSaveProgress(movie.id, next, durationSec);
        }
        return next;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, durationSec, movie, onSaveProgress, playbackSpeed]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        return;
      }
      if (e.key === " " || e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentTime((t) => Math.max(0, t - 10));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentTime((t) => Math.min(durationSec, t + 10));
      } else if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        setIsMuted((m) => !m);
      } else if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        setCaptionsEnabled((c) => !c);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [durationSec]);

  const seekTo = (nextSec) => {
    const clamped = Math.max(0, Math.min(durationSec, Math.round(nextSec)));
    setCurrentTime(clamped);
    if (movie && onSaveProgress) {
      onSaveProgress(movie.id, clamped, durationSec);
    }
  };

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Compute active cue factoring in timingOffset
  const effectiveTime = Math.max(0, currentTime - timingOffset);
  const currentCue =
    activeTrack?.cues?.find(
      (c) => effectiveTime >= c.start && effectiveTime <= c.end
    ) || activeTrack?.cues?.[0];

  const handleFullscreen = () => {
    const el = document.querySelector(".ms-player-stage");
    if (!el) return;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const filteredSubtitles = allTracks.filter((t) => {
    const matchesMovie = t.movieId === movie?.id || t.movieId === "ALL";
    const matchesLang =
      subtitleLangFilter === "All" || t.language === subtitleLangFilter;
    return matchesMovie && matchesLang;
  });

  return (
    <div className="ms-player-stage">
      {/* Top Bar matching 03_movie_player.png */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={() => {
              if (movie && onSaveProgress) {
                onSaveProgress(movie.id, currentTime, durationSec);
              }
              onBack();
            }}
            style={{
              background: "none",
              border: "none",
              color: "#FFFFFF",
              fontSize: "1.35rem",
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ChevronLeft size={22} />
            <span style={{ textTransform: "uppercase" }}>
              {localFileName || movie?.title || "THE LAST HORIZON"}
            </span>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span
            style={{
              fontSize: "0.84rem",
              color: "var(--ms-text-secondary)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {isLocalMode ? "LOCAL DEVICE PLAYBACK" : `${movie?.availability?.resolution || "1080P HD"} • ${activeTrack?.language}`}
          </span>
        </div>
      </div>

      {/* Central 16:9 Video Canvas matching 03_movie_player.png */}
      <div
        className="ms-player-canvas-wrap"
        onClick={() => setIsPlaying((p) => !p)}
        role="button"
        tabIndex={0}
        aria-label={isPlaying ? "Pause video" : "Play video"}
        onKeyDown={(e) => {
          if (e.key === "Enter") setIsPlaying((p) => !p);
        }}
      >
        <HorizonArtwork palette={movie?.palette} aspect="wide" />

        {/* Subtle Play status overlay when paused */}
        {!isPlaying && (
          <div
            style={{
              position: "absolute",
              top: "18px",
              right: "18px",
              background: "rgba(12, 12, 12, 0.78)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "0.78rem",
              color: "var(--ms-text-secondary)",
            }}
          >
            Paused • Click canvas or press Space to play
          </div>
        )}

        {/* Subtitle Caption Box with Dynamic Position, Font Size & Background Opacity */}
        {captionsEnabled && currentCue && (
          <div
            className="ms-subtitle-caption-box"
            style={{
              bottom: `${captionBottomPct}%`,
              fontSize: captionFontSizeMap[captionSize] || "1.15rem",
              background: `rgba(10, 10, 10, ${(captionBgOpacity / 100).toFixed(2)})`,
            }}
          >
            {currentCue.text}
            {timingOffset !== 0 && (
              <span
                style={{
                  display: "block",
                  fontSize: "0.72rem",
                  color: "var(--ms-text-secondary)",
                  marginTop: "2px",
                }}
              >
                Subtitle offset: {timingOffset > 0 ? `+${timingOffset.toFixed(1)}s` : `${timingOffset.toFixed(1)}s`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls Deck matching 03_movie_player.png */}
      <div>
        {/* Red Seek Bar */}
        <div
          className="ms-player-timeline"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            seekTo(ratio * durationSec);
          }}
          role="slider"
          aria-label="Seek timeline"
          aria-valuemin={0}
          aria-valuemax={durationSec}
          aria-valuenow={currentTime}
          tabIndex={0}
        >
          <div
            className="ms-player-timeline-fill"
            style={{ width: `${Math.min(100, (currentTime / durationSec) * 100)}%` }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "14px",
          }}
        >
          {/* Left Controls: Play, -10s, +10s, Volume, Time */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "14px" }}>
            <button
              type="button"
              className="ms-icon-btn"
              onClick={() => setIsPlaying((p) => !p)}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
            </button>

            <button
              type="button"
              className="ms-btn ms-btn-ghost ms-btn-sm"
              onClick={() => seekTo(currentTime - 10)}
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw size={15} /> 10
            </button>

            <button
              type="button"
              className="ms-btn ms-btn-ghost ms-btn-sm"
              onClick={() => seekTo(currentTime + 10)}
              aria-label="Forward 10 seconds"
            >
              10 <RotateCw size={15} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                className="ms-btn ms-btn-ghost ms-btn-sm"
                onClick={() => setIsMuted((m) => !m)}
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
                <span>Volume</span>
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setIsMuted(false);
                  setVolume(Number(e.target.value));
                }}
                style={{ width: "78px", accentColor: "var(--ms-primary)", cursor: "pointer" }}
                aria-label="Volume level"
              />
            </div>

            <span
              style={{
                fontSize: "0.92rem",
                color: "var(--ms-text-secondary)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatTime(currentTime)} / {formatTime(durationSec)}
            </span>
          </div>

          {/* Right Controls: Find Subtitles, Import SRT/VTT, CC, Speed, Fullscreen */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
            {isLocalMode && onSelectLocalFile && (
              <button
                type="button"
                className="ms-btn ms-btn-secondary ms-btn-sm"
                onClick={onSelectLocalFile}
              >
                <Upload size={14} /> Switch Local Video
              </button>
            )}

            <button
              type="button"
              className="ms-btn ms-btn-secondary ms-btn-sm"
              onClick={() => setCaptionSettingsOpen(true)}
            >
              <Sliders size={14} /> Caption Settings
            </button>

            <button
              type="button"
              className="ms-btn ms-btn-secondary ms-btn-sm"
              onClick={() => setFindSubtitlesOpen(true)}
            >
              Find Subtitles
            </button>

            <button
              type="button"
              className="ms-btn ms-btn-secondary ms-btn-sm"
              onClick={() => setImportSubtitlesOpen(true)}
            >
              Import SRT / VTT
            </button>

            <button
              type="button"
              className={`ms-btn ms-btn-sm ${captionsEnabled ? "ms-btn-primary" : "ms-btn-secondary"}`}
              onClick={() => setCaptionsEnabled((c) => !c)}
              aria-label="Toggle captions"
            >
              CC
            </button>

            <select
              className="ms-select"
              style={{ padding: "5px 8px", fontSize: "0.8rem" }}
              value={String(playbackSpeed)}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              aria-label="Playback speed"
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1.0x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2.0x</option>
            </select>

            <button
              type="button"
              className="ms-icon-btn"
              onClick={handleFullscreen}
              aria-label="Toggle fullscreen"
            >
              <Maximize size={16} />
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: "10px",
            fontSize: "0.8rem",
            color: "var(--ms-text-muted)",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <span>Keyboard / touch controls • Timing adjustment in subtitle menu</span>
          <span>
            Active track: {captionsEnabled ? `${activeTrack?.releaseName} (${activeTrack?.format})` : "Captions Off"}
          </span>
        </div>
      </div>

      {/* Find Subtitles Modal (FE-19) */}
      <Modal
        isOpen={findSubtitlesOpen}
        onClose={() => setFindSubtitlesOpen(false)}
        title={`Find Subtitles — ${movie?.title || "Current Video"}`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "10px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {["All", "English", "Filipino / Tagalog"].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  className={`ms-btn ms-btn-sm ${
                    subtitleLangFilter === lang ? "ms-btn-primary" : "ms-btn-secondary"
                  }`}
                  onClick={() => setSubtitleLangFilter(lang)}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {filteredSubtitles.length === 0 ? (
            <div
              style={{
                background: "var(--ms-elevated)",
                border: "1px solid var(--ms-border)",
                borderRadius: "var(--ms-radius-md)",
                padding: "20px",
                textAlign: "center",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: "6px" }}>No Subtitles Available</div>
              <p style={{ margin: 0, fontSize: "0.86rem", color: "var(--ms-text-secondary)" }}>
                No matching tracks found for the selected language filter.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {filteredSubtitles.map((track) => {
                const isSelected = track.id === activeTrackId && captionsEnabled;
                return (
                  <div
                    key={track.id}
                    style={{
                      background: "var(--ms-elevated)",
                      border: `1px solid ${isSelected ? "var(--ms-primary)" : "var(--ms-border)"}`,
                      borderRadius: "var(--ms-radius-sm)",
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          wordBreak: "break-all",
                        }}
                      >
                        {track.releaseName}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--ms-text-secondary)", marginTop: "3px" }}>
                        {track.language} • Format: <strong>{track.format}</strong> • {track.fps} FPS
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`ms-btn ms-btn-sm ${isSelected ? "ms-btn-primary" : "ms-btn-secondary"}`}
                      onClick={() => {
                        setActiveTrackId(track.id);
                        setCaptionsEnabled(true);
                        if (onNotify) {
                          onNotify(`Loaded ${track.language} subtitle (${track.format})`);
                        }
                      }}
                    >
                      {isSelected ? "Active" : "Load Track"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* Import SRT / VTT & Subtitle Timing Adjustment Modal (FE-19) */}
      <Modal
        isOpen={importSubtitlesOpen}
        onClose={() => setImportSubtitlesOpen(false)}
        title="Import Local SRT / WebVTT & Timing Sync"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              background: "var(--ms-elevated)",
              border: "1px dashed #444",
              borderRadius: "var(--ms-radius-md)",
              padding: "18px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, marginBottom: "4px" }}>
                Import Local Subtitle File
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--ms-text-secondary)" }}>
                Supports `.srt` (automatically converted to WebVTT cues) and `.vtt` files.
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="ms-btn ms-btn-primary ms-btn-sm"
                onClick={() => {
                  trackCounterRef.current += 1;
                  const newTrack = {
                    id: `sub-local-en-${trackCounterRef.current}`,
                    movieId: movie?.id || "ALL",
                    language: "English",
                    langCode: "en",
                    releaseName: `${(movie?.title || "Movie").replace(/\s+/g, ".")}.Local.Custom.SRT`,
                    format: "SRT",
                    fps: "23.976",
                    cues: SUBTITLE_CATALOG[0].cues,
                  };
                  setImportedTracks((prev) => [newTrack, ...prev]);
                  setActiveTrackId(newTrack.id);
                  setCaptionsEnabled(true);
                  if (onNotify) onNotify("Imported local English .SRT track");
                }}
              >
                <Upload size={14} /> Add Local English .SRT
              </button>
              <button
                type="button"
                className="ms-btn ms-btn-secondary ms-btn-sm"
                onClick={() => {
                  trackCounterRef.current += 1;
                  const newTrack = {
                    id: `sub-local-tl-${trackCounterRef.current}`,
                    movieId: movie?.id || "ALL",
                    language: "Filipino / Tagalog",
                    langCode: "tl",
                    releaseName: `${(movie?.title || "Movie").replace(/\s+/g, ".")}.Tagalog.Local.VTT`,
                    format: "WebVTT",
                    fps: "23.976",
                    cues: SUBTITLE_CATALOG[1].cues,
                  };
                  setImportedTracks((prev) => [newTrack, ...prev]);
                  setActiveTrackId(newTrack.id);
                  setCaptionsEnabled(true);
                  if (onNotify) onNotify("Imported local Filipino .VTT track");
                }}
              >
                <Upload size={14} /> Add Local Tagalog .VTT
              </button>
            </div>
          </div>

          {/* Timing Offset Controls */}
          <div
            style={{
              background: "var(--ms-elevated)",
              border: "1px solid var(--ms-border)",
              borderRadius: "var(--ms-radius-md)",
              padding: "18px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>Subtitle Timing Offset</div>
                <div style={{ fontSize: "0.8rem", color: "var(--ms-text-secondary)" }}>
                  Negative values advance captions earlier; positive values delay captions later.
                </div>
              </div>
              <span className="ms-badge ms-badge-red" style={{ fontSize: "0.85rem" }}>
                {timingOffset > 0 ? `+${timingOffset.toFixed(1)}s` : `${timingOffset.toFixed(1)}s`}
              </span>
            </div>

            <input
              type="range"
              min="-5"
              max="5"
              step="0.1"
              value={timingOffset}
              onChange={(e) => setTimingOffset(parseFloat(e.target.value))}
              style={{
                width: "100%",
                accentColor: "var(--ms-primary)",
                marginBottom: "14px",
                cursor: "pointer",
              }}
              aria-label="Subtitle timing offset in seconds"
            />

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="ms-btn ms-btn-secondary ms-btn-sm"
                  onClick={() =>
                    setTimingOffset((v) => Math.max(-5, parseFloat((v - 0.5).toFixed(1))))
                  }
                >
                  -0.5s Advance
                </button>
                <button
                  type="button"
                  className="ms-btn ms-btn-secondary ms-btn-sm"
                  onClick={() =>
                    setTimingOffset((v) => Math.max(-5, parseFloat((v - 0.1).toFixed(1))))
                  }
                >
                  -0.1s
                </button>
                <button
                  type="button"
                  className="ms-btn ms-btn-secondary ms-btn-sm"
                  onClick={() =>
                    setTimingOffset((v) => Math.min(5, parseFloat((v + 0.1).toFixed(1))))
                  }
                >
                  +0.1s
                </button>
                <button
                  type="button"
                  className="ms-btn ms-btn-secondary ms-btn-sm"
                  onClick={() =>
                    setTimingOffset((v) => Math.min(5, parseFloat((v + 0.5).toFixed(1))))
                  }
                >
                  +0.5s Delay
                </button>
              </div>
              <button
                type="button"
                className="ms-btn ms-btn-ghost ms-btn-sm"
                onClick={() => setTimingOffset(0.0)}
              >
                Reset (0.0s)
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <button
              type="button"
              className="ms-btn ms-btn-primary"
              onClick={() => setImportSubtitlesOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Comprehensive Caption & Playback Settings Modal (Speed, Add Subtitles, Position, Size) */}
      <Modal
        isOpen={captionSettingsOpen}
        onClose={() => setCaptionSettingsOpen(false)}
        title="Caption & Playback Settings"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Live Caption Preview Box */}
          <div
            style={{
              background: "#101722",
              borderRadius: "var(--ms-radius-md)",
              padding: "22px 16px",
              textAlign: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--ms-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: "8px",
              }}
            >
              Caption Appearance ({captionSize.toUpperCase()} • {captionBottomPct}% from bottom • {playbackSpeed}x speed)
            </div>
            <div
              style={{
                display: "inline-block",
                padding: "8px 18px",
                borderRadius: "6px",
                color: "#FFFFFF",
                fontSize: captionFontSizeMap[captionSize],
                background: `rgba(10, 10, 10, ${(captionBgOpacity / 100).toFixed(2)})`,
              }}
            >
              {currentCue?.text || "Every journey begins somewhere."}
            </div>
          </div>

          {/* 1. Playback Speed & Timing Speed Offset */}
          <div
            style={{
              background: "var(--ms-elevated)",
              borderRadius: "var(--ms-radius-md)",
              padding: "16px",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: "8px" }}>
              1. Playback & Caption Speed
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  className={`ms-btn ms-btn-sm ${
                    playbackSpeed === spd ? "ms-btn-primary" : "ms-btn-secondary"
                  }`}
                  onClick={() => setPlaybackSpeed(spd)}
                >
                  {spd}x
                </button>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.82rem",
                color: "var(--ms-text-secondary)",
                marginBottom: "6px",
              }}
            >
              <span>Subtitle Sync Delay / Advance</span>
              <strong style={{ color: "#FFFFFF" }}>
                {timingOffset > 0 ? `+${timingOffset.toFixed(1)}s` : `${timingOffset.toFixed(1)}s`}
              </strong>
            </div>
            <input
              type="range"
              min="-5"
              max="5"
              step="0.1"
              value={timingOffset}
              onChange={(e) => setTimingOffset(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "var(--ms-primary)", cursor: "pointer" }}
              aria-label="Subtitle timing sync offset"
            />
          </div>

          {/* 2. Caption Size & Background Opacity */}
          <div
            style={{
              background: "var(--ms-elevated)",
              borderRadius: "var(--ms-radius-md)",
              padding: "16px",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: "8px" }}>
              2. Caption Font Size & Background
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
              {[
                { id: "small", label: "Small" },
                { id: "medium", label: "Medium" },
                { id: "large", label: "Large" },
                { id: "xlarge", label: "Extra Large" },
              ].map((sz) => (
                <button
                  key={sz.id}
                  type="button"
                  className={`ms-btn ms-btn-sm ${
                    captionSize === sz.id ? "ms-btn-primary" : "ms-btn-secondary"
                  }`}
                  onClick={() => setCaptionSize(sz.id)}
                >
                  {sz.label}
                </button>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.82rem",
                color: "var(--ms-text-secondary)",
                marginBottom: "6px",
              }}
            >
              <span>Caption Box Opacity</span>
              <strong style={{ color: "#FFFFFF" }}>{captionBgOpacity}%</strong>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              step="5"
              value={captionBgOpacity}
              onChange={(e) => setCaptionBgOpacity(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--ms-primary)", cursor: "pointer" }}
              aria-label="Caption background opacity"
            />
          </div>

          {/* 3. Caption Vertical Position */}
          <div
            style={{
              background: "var(--ms-elevated)",
              borderRadius: "var(--ms-radius-md)",
              padding: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontWeight: 700 }}>3. Caption Vertical Position</span>
              <span className="ms-badge">{captionBottomPct}% from bottom</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
              {[
                { pct: 6, label: "Lower Edge (6%)" },
                { pct: 14, label: "Standard (14%)" },
                { pct: 45, label: "Center (45%)" },
                { pct: 76, label: "Top (76%)" },
              ].map((pos) => (
                <button
                  key={pos.pct}
                  type="button"
                  className={`ms-btn ms-btn-sm ${
                    captionBottomPct === pos.pct ? "ms-btn-primary" : "ms-btn-secondary"
                  }`}
                  onClick={() => setCaptionBottomPct(pos.pct)}
                >
                  {pos.label}
                </button>
              ))}
            </div>
            <input
              type="range"
              min="4"
              max="82"
              step="1"
              value={captionBottomPct}
              onChange={(e) => setCaptionBottomPct(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--ms-primary)", cursor: "pointer" }}
              aria-label="Caption vertical position percentage"
            />
          </div>

          {/* 4. Add / Create / Switch Subtitles */}
          <div
            style={{
              background: "var(--ms-elevated)",
              borderRadius: "var(--ms-radius-md)",
              padding: "16px",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: "8px" }}>
              4. Add or Switch Subtitle Track
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
              <select
                className="ms-select"
                style={{ flex: 1, minWidth: "200px" }}
                value={activeTrackId}
                onChange={(e) => {
                  setActiveTrackId(e.target.value);
                  setCaptionsEnabled(true);
                }}
                aria-label="Active subtitle track"
              >
                {allTracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.language} — {t.releaseName} ({t.format})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={`ms-btn ms-btn-sm ${
                  captionsEnabled ? "ms-btn-primary" : "ms-btn-secondary"
                }`}
                onClick={() => setCaptionsEnabled((c) => !c)}
              >
                {captionsEnabled ? "Captions On" : "Captions Off"}
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <select
                className="ms-select"
                value={customTrackLang}
                onChange={(e) => setCustomTrackLang(e.target.value)}
                aria-label="Custom subtitle language"
              >
                <option value="English">English</option>
                <option value="Filipino / Tagalog">Filipino / Tagalog</option>
              </select>
              <input
                type="text"
                className="ms-select"
                style={{ flex: 1, minWidth: "180px", cursor: "text" }}
                placeholder="Type custom subtitle line or paste cue..."
                value={customCueText}
                onChange={(e) => setCustomCueText(e.target.value)}
                aria-label="Custom subtitle cue text"
              />
              <button
                type="button"
                className="ms-btn ms-btn-primary ms-btn-sm"
                onClick={() => {
                  trackCounterRef.current += 1;
                  const line =
                    customCueText.trim() ||
                    (customTrackLang === "English"
                      ? "Custom added English subtitle track active."
                      : "Aktibo ang idinagdag na Filipino subtitle track.");
                  const newTrack = {
                    id: `sub-custom-${trackCounterRef.current}`,
                    movieId: movie?.id || "ALL",
                    language: customTrackLang,
                    langCode: customTrackLang === "English" ? "en" : "tl",
                    releaseName: `Custom.${customTrackLang.split(" ")[0]}.Track.${trackCounterRef.current}`,
                    format: "WebVTT",
                    fps: "23.976",
                    cues: [{ start: 0, end: durationSec + 20, text: line }],
                  };
                  setImportedTracks((prev) => [newTrack, ...prev]);
                  setActiveTrackId(newTrack.id);
                  setCaptionsEnabled(true);
                  setCustomCueText("");
                  if (onNotify) onNotify(`Added new ${customTrackLang} subtitle track`);
                }}
              >
                + Add Subtitle
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
            <button
              type="button"
              className="ms-btn ms-btn-ghost ms-btn-sm"
              onClick={() => {
                setPlaybackSpeed(1.0);
                setTimingOffset(0.0);
                setCaptionSize("medium");
                setCaptionBottomPct(8);
                setCaptionBgOpacity(85);
              }}
            >
              Reset Defaults
            </button>
            <button
              type="button"
              className="ms-btn ms-btn-primary"
              onClick={() => setCaptionSettingsOpen(false)}
            >
              Apply Settings
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
