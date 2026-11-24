import React, { useState, useRef } from "react";
import {
  BookOpen,
  ChevronRight,
  Search,
  Filter,
  RotateCcw,
  Keyboard,
  ShieldCheck,
  Film,
  Home,
  Sparkles,
  Award,
} from "lucide-react";
import {
  HorizonArtwork,
  HeroBanner,
  ContentCarousel,
  MovieCard,
  MangaCoverCard,
  ContinueWatchingCard,
  ContinueReadingCard,
  StateFeedbackBox,
} from "./SharedUI.jsx";
import { MOVIE_GENRES } from "../data/moviesData.js";
import { MANGA_GENRES } from "../data/mangaData.js";

/**
 * Shared Home Page (/) — Full-Bleed Netflix Front Face, Discovery Sub-Tabs, Genre Pills & Spotlight Rail
 */
export function HomePage({
  movies,
  series,
  continueWatching,
  continueReading,
  onNavigate,
  onOpenMovieDetails,
  onPlayMovie,
  onOpenSeriesDetails,
  onReadChapter,
  onToggleList,
  isInList,
  onRemoveContinueWatching,
  onRemoveContinueReading,
}) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState("Trending Now");
  const [activeGenrePill, setActiveGenrePill] = useState("All");
  const [pillDragging, setPillDragging] = useState(false);
  const pillRowRef = useRef(null);
  const pillDragRef = useRef({ active: false, startX: 0, scrollLeft: 0, moved: 0 });

  const handlePillMouseDown = (e) => {
    if (e.button !== 0 || !pillRowRef.current) return;
    pillDragRef.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: pillRowRef.current.scrollLeft,
      moved: 0,
    };
  };

  const handlePillMouseMove = (e) => {
    if (!pillDragRef.current.active || !pillRowRef.current) return;
    const dx = e.clientX - pillDragRef.current.startX;
    pillDragRef.current.moved = Math.max(pillDragRef.current.moved, Math.abs(dx));
    if (pillDragRef.current.moved > 5) {
      if (!pillDragging) setPillDragging(true);
      pillRowRef.current.scrollLeft = pillDragRef.current.scrollLeft - dx * 1.2;
    }
  };

  const stopPillDrag = () => {
    pillDragRef.current.active = false;
    if (pillDragging) setPillDragging(false);
  };

  const featuredMovies = movies.slice(0, 4);
  const recentMovies = movies.filter((m) => m.isRecentRelease);
  const manhwaList = series.filter((s) => s.type === "Manhwa");
  const mangaList = series.filter((s) => s.type === "Manga");

  const genrePills = [
    "All",
    "Action",
    "Adventure",
    "Sci-Fi",
    "Thriller",
    "Drama",
    "Fantasy",
    "Mystery",
    "Animation",
  ];

  const filteredTopMovies = movies
    .filter((m) => activeGenrePill === "All" || m.genres.includes(activeGenrePill))
    .sort((a, b) => {
      if (activeSubTab === "Popular") return parseFloat(b.rating) - parseFloat(a.rating);
      if (activeSubTab === "Recently Added") return b.year - a.year;
      return a.trendingRank - b.trendingRank;
    });

  const spotlightFeature = movies[0];

  return (
    <div>
      {/* Full-Bleed 100vw Hero Banner directly from the top edge */}
      <HeroBanner
        items={featuredMovies}
        activeIndex={heroIndex}
        onSelectIndex={setHeroIndex}
        onPrimaryAction={(item) =>
          item.availability?.canStream ? onPlayMovie(item.id) : onOpenMovieDetails(item.id)
        }
        onSecondaryAction={(item) => onOpenMovieDetails(item.id)}
        onToggleList={onToggleList}
        isInList={isInList("movie", featuredMovies[heroIndex]?.id)}
        mediaType="movie"
      />

      <div className="ms-container">
        {/* Netflix Front-Face Discovery Sub-Tabs & Genre Pill Strip */}
        <section className="ms-discovery-strip" aria-label="Discovery categories">
          <div className="ms-subnav-tabs" role="tablist">
            {["Trending Now", "Popular", "MovieShelf Originals", "Premieres", "Recently Added"].map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeSubTab === tab}
                  className={`ms-subnav-item ${activeSubTab === tab ? "is-active" : ""}`}
                  onClick={() => setActiveSubTab(tab)}
                >
                  {tab}
                </button>
              )
            )}
          </div>

          <div
            className={`ms-genre-pill-row ${pillDragging ? "is-dragging" : ""}`}
            ref={pillRowRef}
            onMouseDown={handlePillMouseDown}
            onMouseMove={handlePillMouseMove}
            onMouseUp={stopPillDrag}
            onMouseLeave={stopPillDrag}
            onClickCapture={(e) => {
              if (pillDragRef.current.moved > 8) {
                e.stopPropagation();
                e.preventDefault();
                pillDragRef.current.moved = 0;
              }
            }}
          >
            {genrePills.map((g) => (
              <button
                key={g}
                type="button"
                className={`ms-genre-pill ${activeGenrePill === g ? "is-active" : ""}`}
                onClick={() => setActiveGenrePill(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </section>

        {/* Filtered Discovery Carousel */}
        <ContentCarousel
          title={`${activeSubTab} ${activeGenrePill !== "All" ? `• ${activeGenrePill}` : ""}`}
          subtitle="Click any card to open More Info"
          onViewAll={() => onNavigate("/movies/browse")}
          viewAllLabel="Browse Movies"
        >
          {filteredTopMovies.map((movie, idx) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              rankNumber={activeGenrePill === "All" ? idx + 1 : null}
              onOpenDetails={onOpenMovieDetails}
              onPlay={onPlayMovie}
              onToggleList={onToggleList}
              isInList={isInList("movie", movie.id)}
            />
          ))}
        </ContentCarousel>

        {/* "Only on MovieShelf" Spotlight Row (Wide Featured Card + Poster Cards, inspired by reference image 1) */}
        {spotlightFeature && (
          <ContentCarousel
            title="Only on MovieShelf"
            subtitle="Premiere cinema & acclaimed series"
            onViewAll={() => onNavigate("/movies/browse")}
          >
            <article
              className="ms-spotlight-card"
              onClick={() => onOpenMovieDetails(spotlightFeature.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenMovieDetails(spotlightFeature.id);
                }
              }}
            >
              <div className="ms-spotlight-art">
                <HorizonArtwork palette={spotlightFeature.palette} aspect="wide" />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, transparent 30%, rgba(12,12,12,0.88) 100%)",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    padding: "16px 18px",
                    gap: "12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        letterSpacing: "0.14em",
                        color: "var(--ms-primary)",
                      }}
                    >
                      MOVIESHELF SERIES
                    </div>
                    <div
                      style={{
                        fontSize: "1.45rem",
                        fontWeight: 800,
                        letterSpacing: "-0.02em",
                        textTransform: "uppercase",
                      }}
                    >
                      {spotlightFeature.title}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <span className="ms-badge ms-badge-red">
                      <Sparkles size={11} /> New Release
                    </span>
                    <span className="ms-badge">
                      <Award size={11} /> Festival Winner
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.84rem",
                    fontWeight: 700,
                    color: "#FFFFFF",
                    marginBottom: "4px",
                  }}
                >
                  {spotlightFeature.genres.join(" • ")} • {spotlightFeature.year} •{" "}
                  {spotlightFeature.runtime} • {spotlightFeature.maturityRating}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.84rem",
                    color: "var(--ms-text-secondary)",
                    lineHeight: 1.45,
                  }}
                >
                  {spotlightFeature.shortSynopsis}
                </p>
              </div>
            </article>

            {movies.slice(1, 7).map((movie) => (
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
        )}

        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <ContentCarousel
            title="Continue Watching"
            subtitle="Pick up right where you paused"
            onViewAll={() => onNavigate("/my-list")}
            viewAllLabel="My List"
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

        {/* Continue Reading */}
        {continueReading.length > 0 && (
          <ContentCarousel
            title="Continue Reading"
            subtitle="Active manga and manhwa chapters"
            onViewAll={() => onNavigate("/my-list")}
            viewAllLabel="Reading List"
          >
            {continueReading.map((entry) => {
              const ser = series.find((s) => s.id === entry.seriesId);
              return (
                <ContinueReadingCard
                  key={entry.seriesId}
                  item={entry}
                  series={ser}
                  onResume={onReadChapter}
                  onOpenDetails={onOpenSeriesDetails}
                  onRemove={onRemoveContinueReading}
                />
              );
            })}
          </ContentCarousel>
        )}

        {/* Trending Manhwa */}
        <ContentCarousel
          title="Trending Manhwa"
          subtitle="Vertical scroll series"
          onViewAll={() => onNavigate("/manga/browse")}
          viewAllLabel="Browse Manhwa"
        >
          {manhwaList.map((ser) => (
            <MangaCoverCard
              key={ser.id}
              series={ser}
              onOpenDetails={onOpenSeriesDetails}
              onRead={onReadChapter}
              onToggleList={onToggleList}
              isInList={isInList("series", ser.id)}
            />
          ))}
        </ContentCarousel>

        {/* Trending Manga */}
        <ContentCarousel
          title="Trending Manga"
          subtitle="Single-page & horizontal paginated stories"
          onViewAll={() => onNavigate("/manga/browse")}
          viewAllLabel="Browse Manga"
        >
          {mangaList.map((ser) => (
            <MangaCoverCard
              key={ser.id}
              series={ser}
              onOpenDetails={onOpenSeriesDetails}
              onRead={onReadChapter}
              onToggleList={onToggleList}
              isInList={isInList("series", ser.id)}
            />
          ))}
        </ContentCarousel>

        {/* Compact Recent Releases Bar */}
        <section className="ms-section">
          <div className="ms-section-header">
            <h2 className="ms-section-title">Recent Releases</h2>
            <button
              type="button"
              className="ms-view-all-btn"
              onClick={() => onNavigate("/movies")}
            >
              Movies Hub <ChevronRight size={15} />
            </button>
          </div>
          <div
            style={{
              background: "#1A1A1A",
              borderRadius: "var(--ms-radius-md)",
              padding: "16px 20px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              boxShadow: "0 8px 22px rgba(0,0,0,0.45)",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
              {recentMovies.map((rm, i) => (
                <React.Fragment key={rm.id}>
                  <button
                    type="button"
                    onClick={() => onOpenMovieDetails(rm.id)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "4px 6px",
                      borderRadius: "4px",
                      color: "var(--ms-text)",
                      cursor: "pointer",
                      fontSize: "0.93rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span style={{ color: "var(--ms-text-secondary)" }}>{rm.ReleaseLabel}</span>
                    <span>•</span>
                    <strong style={{ color: "#FFFFFF" }}>{rm.title}</strong>
                  </button>
                  {i < recentMovies.length - 1 && (
                    <span style={{ color: "rgba(255,255,255,0.12)" }}>|</span>
                  )}
                </React.Fragment>
              ))}
            </div>
            <button
              type="button"
              className="ms-btn ms-btn-secondary ms-btn-sm"
              onClick={() => onNavigate("/movies/browse")}
            >
              All New Releases
            </button>
          </div>
        </section>

        {/* Recently Updated Chapters Feed — Clicking opens Series More Info Pop-up */}
        <section className="ms-section">
          <div className="ms-section-header">
            <h2 className="ms-section-title">Recently Updated Chapters</h2>
            <button
              type="button"
              className="ms-view-all-btn"
              onClick={() => onNavigate("/manga")}
            >
              Reading Hub <ChevronRight size={15} />
            </button>
          </div>
          <div className="ms-feed-list">
            {series.slice(0, 5).map((ser) => {
              const latestCh = ser.chapters?.[0];
              return (
                <div
                  key={ser.id}
                  className="ms-feed-row"
                  onClick={() => onOpenSeriesDetails(ser.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpenSeriesDetails(ser.id);
                    }
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span className={`ms-badge ${ser.type === "Manhwa" ? "ms-badge-red" : ""}`}>
                      {ser.type}
                    </span>
                    <strong>{ser.title}</strong>
                    <span style={{ color: "var(--ms-text-secondary)", fontSize: "0.85rem" }}>
                      • {latestCh?.title || ser.status}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <span style={{ color: "var(--ms-text-secondary)", fontSize: "0.9rem" }}>
                      {ser.latestChapterLabel}
                    </span>
                    <span style={{ color: "var(--ms-text-muted)", fontSize: "0.8rem" }}>
                      {ser.updatedLabel}
                    </span>
                    <ChevronRight size={16} color="var(--ms-text-secondary)" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * Unified Global, Movie & Manga/Manhwa Search Results Page (FE-13)
 */
export function SearchResultsPage({
  movies,
  series,
  searchQuery,
  onSearchQueryChange,
  initialScope = "all",
  onOpenMovieDetails,
  onPlayMovie,
  onOpenSeriesDetails,
  onReadChapter,
  onToggleList,
  isInList,
}) {
  const [scopeTab, setScopeTab] = useState(initialScope);
  const [genreFilter, setGenreFilter] = useState("All");
  const [sortBy, setSortBy] = useState("relevance");

  const q = (searchQuery || "").trim().toLowerCase();

  const allGenres = Array.from(new Set([...MOVIE_GENRES, ...MANGA_GENRES]));

  const filteredMovies = movies
    .filter((m) => {
      if (scopeTab === "manga" || scopeTab === "manhwa" || scopeTab === "series") return false;
      const matchesQuery =
        !q ||
        m.title.toLowerCase().includes(q) ||
        (m.originalTitle && m.originalTitle.toLowerCase().includes(q)) ||
        m.director?.toLowerCase().includes(q) ||
        m.cast?.some((c) => c.name.toLowerCase().includes(q)) ||
        m.genres?.some((g) => g.toLowerCase().includes(q));
      const matchesGenre = genreFilter === "All" || m.genres?.includes(genreFilter);
      return matchesQuery && matchesGenre;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return parseFloat(b.rating) - parseFloat(a.rating);
      if (sortBy === "year") return b.year - a.year;
      if (sortBy === "az") return a.title.localeCompare(b.title);
      return a.trendingRank - b.trendingRank;
    });

  const filteredSeries = series
    .filter((s) => {
      if (scopeTab === "movies") return false;
      if (scopeTab === "manga" && s.type !== "Manga") return false;
      if (scopeTab === "manhwa" && s.type !== "Manhwa") return false;
      const matchesQuery =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.alternateTitles?.some((t) => t.toLowerCase().includes(q)) ||
        s.author?.toLowerCase().includes(q) ||
        s.artist?.toLowerCase().includes(q) ||
        s.genres?.some((g) => g.toLowerCase().includes(q));
      const matchesGenre = genreFilter === "All" || s.genres?.includes(genreFilter);
      return matchesQuery && matchesGenre;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return parseFloat(b.rating) - parseFloat(a.rating);
      if (sortBy === "year") return b.year - a.year;
      if (sortBy === "az") return a.title.localeCompare(b.title);
      return b.chapterCount - a.chapterCount;
    });

  const totalCount = filteredMovies.length + filteredSeries.length;

  return (
    <div className="ms-container" style={{ paddingTop: "24px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "2rem", fontWeight: 800 }}>
          {q ? `Search Results for "${searchQuery}"` : "Explore MovieShelf Catalog"}
        </h1>
        <p style={{ margin: 0, color: "var(--ms-text-secondary)" }}>
          Search by title, original or alternate title, director, cast member, author, or genre.
        </p>
      </div>

      {/* Prominent Search Input */}
      <div className="ms-quick-search-bar" style={{ marginBottom: "22px", padding: "14px 18px" }}>
        <Search size={19} color="var(--ms-text-secondary)" />
        <input
          type="text"
          className="ms-quick-search-input"
          style={{ fontSize: "1.05rem" }}
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Type a movie, manga, manhwa, director, or author..."
          aria-label="Search catalog"
        />
        {searchQuery && (
          <button
            type="button"
            className="ms-btn ms-btn-ghost ms-btn-sm"
            onClick={() => onSearchQueryChange("")}
          >
            Clear
          </button>
        )}
      </div>

      {/* Media Type Tabs */}
      <div className="ms-tabs" role="tablist" aria-label="Search category tabs">
        {[
          { id: "all", label: `All (${filteredMovies.length + filteredSeries.length})` },
          { id: "movies", label: `Movies (${filteredMovies.length})` },
          { id: "series", label: `Manga & Manhwa (${filteredSeries.length})` },
          { id: "manhwa", label: "Manhwa Only" },
          { id: "manga", label: "Manga Only" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={scopeTab === tab.id}
            className={`ms-tab ${scopeTab === tab.id ? "is-active" : ""}`}
            onClick={() => setScopeTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter & Sort Controls */}
      <div className="ms-filter-bar">
        <div className="ms-filter-group">
          <Filter size={16} color="var(--ms-text-secondary)" />
          <select
            className="ms-select"
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            aria-label="Filter search results by genre"
          >
            <option value="All">All Genres</option>
            {allGenres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <select
            className="ms-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort search results"
          >
            <option value="relevance">Sort: Featured & Trending</option>
            <option value="rating">Sort: Highest Rated</option>
            <option value="year">Sort: Newest Release Year</option>
            <option value="az">Sort: Alphabetical (A–Z)</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--ms-text-secondary)" }}>
            Showing <strong>{totalCount}</strong> matching titles
          </span>
          {(genreFilter !== "All" || searchQuery || scopeTab !== "all") && (
            <button
              type="button"
              className="ms-btn ms-btn-ghost ms-btn-sm"
              onClick={() => {
                setGenreFilter("All");
                setScopeTab("all");
                onSearchQueryChange("");
              }}
            >
              <RotateCcw size={14} /> Reset
            </button>
          )}
        </div>
      </div>

      {totalCount === 0 ? (
        <StateFeedbackBox
          icon="search"
          title="No matching titles found"
          description={`We couldn't find any movies, manga, or manhwa matching "${searchQuery}" with the active filters.`}
          actionLabel="Clear Search & Filters"
          onAction={() => {
            onSearchQueryChange("");
            setGenreFilter("All");
            setScopeTab("all");
          }}
        />
      ) : (
        <>
          {filteredMovies.length > 0 && (
            <section className="ms-section">
              <div className="ms-section-header">
                <h2 className="ms-section-title">Movies ({filteredMovies.length})</h2>
              </div>
              <div className="ms-poster-grid">
                {filteredMovies.map((movie) => (
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
            </section>
          )}

          {filteredSeries.length > 0 && (
            <section className="ms-section">
              <div className="ms-section-header">
                <h2 className="ms-section-title">Manga & Manhwa ({filteredSeries.length})</h2>
              </div>
              <div className="ms-poster-grid">
                {filteredSeries.map((ser) => (
                  <MangaCoverCard
                    key={ser.id}
                    series={ser}
                    onOpenDetails={onOpenSeriesDetails}
                    onRead={onReadChapter}
                    onToggleList={onToggleList}
                    isInList={isInList("series", ser.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/**
 * About, Shortcuts & Attribution Page (/about) — (FE-14)
 */
export function AboutPage({ onNavigate }) {
  return (
    <div className="ms-container" style={{ paddingTop: "28px", maxWidth: "1020px" }}>
      <h1 style={{ margin: "0 0 10px", fontSize: "2.2rem", fontWeight: 800 }}>
        About MovieShelf
      </h1>
      <p style={{ margin: "0 0 28px", color: "var(--ms-text-secondary)", fontSize: "1.02rem" }}>
        MovieShelf is a cinematic dark entertainment platform designed for discovering and watching movies, reading manga and manhwa in vertical or paginated modes, and managing personal watchlists and local playback.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            background: "var(--ms-surface)",
            border: "1px solid var(--ms-border)",
            borderRadius: "var(--ms-radius-md)",
            padding: "22px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <Film size={20} color="var(--ms-primary)" />
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Cinematic Movie Experience</h3>
          </div>
          <p style={{ margin: 0, color: "var(--ms-text-secondary)", fontSize: "0.9rem" }}>
            Discover weekly trending movies, filter by genre, release year, and language, and watch with customizable English and Filipino/Tagalog subtitles.
          </p>
        </div>

        <div
          style={{
            background: "var(--ms-surface)",
            border: "1px solid var(--ms-border)",
            borderRadius: "var(--ms-radius-md)",
            padding: "22px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <BookOpen size={20} color="var(--ms-primary)" />
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Manga & Manhwa Reader</h3>
          </div>
          <p style={{ margin: 0, color: "var(--ms-text-secondary)", fontSize: "0.9rem" }}>
            Seamlessly switch between vertical webtoon scrolling, single-page mode, and horizontal paginated mode with fit-width, fit-height, zoom controls, and LTR/RTL reading direction support.
          </p>
        </div>

        <div
          style={{
            background: "var(--ms-surface)",
            border: "1px solid var(--ms-border)",
            borderRadius: "var(--ms-radius-md)",
            padding: "22px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <ShieldCheck size={20} color="var(--ms-primary)" />
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Local Privacy & Attributions</h3>
          </div>
          <p style={{ margin: 0, color: "var(--ms-text-secondary)", fontSize: "0.9rem" }}>
            No account sign-in is required. Local video files and SRT/WebVTT subtitle tracks selected in the Downloads & Local Player stay on your device without server uploads.
          </p>
        </div>
      </div>

      {/* Keyboard Shortcuts Reference */}
      <div
        style={{
          background: "var(--ms-surface)",
          border: "1px solid var(--ms-border)",
          borderRadius: "var(--ms-radius-md)",
          padding: "24px",
          marginBottom: "32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <Keyboard size={20} color="var(--ms-primary)" />
          <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Keyboard Shortcuts</h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
            fontSize: "0.88rem",
          }}
        >
          <div><span className="ms-kbd-badge">Ctrl / Cmd + K</span> Focus Quick Search</div>
          <div><span className="ms-kbd-badge">Space / K</span> Play or Pause Video</div>
          <div><span className="ms-kbd-badge">← / →</span> Seek 10s or Turn Reader Page</div>
          <div><span className="ms-kbd-badge">M</span> Toggle Player Mute</div>
          <div><span className="ms-kbd-badge">C</span> Toggle Captions / Subtitles</div>
          <div><span className="ms-kbd-badge">F</span> Toggle Fullscreen</div>
          <div><span className="ms-kbd-badge">Esc</span> Close Modals & Menus</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <button type="button" className="ms-btn ms-btn-primary" onClick={() => onNavigate("/")}>
          <Home size={16} /> Back to Home
        </button>
        <button type="button" className="ms-btn ms-btn-secondary" onClick={() => onNavigate("/movies")}>
          Explore Movies
        </button>
        <button type="button" className="ms-btn ms-btn-secondary" onClick={() => onNavigate("/manga")}>
          Explore Manga & Manhwa
        </button>
      </div>
    </div>
  );
}

/**
 * Not Found Page (404) — Atmospheric Full-Bleed Netflix 404 (Matches Reference Image 2)
 */
export function NotFoundPage({ onNavigate }) {
  return (
    <section
      style={{
        position: "relative",
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
        minHeight: "88vh",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        background: "#08080A",
      }}
    >
      <div style={{ position: "absolute", inset: 0, opacity: 0.72 }}>
        <HorizonArtwork
          palette={{
            skyTop: "#3B1219",
            skyBottom: "#08080A",
            sun: "#E50914",
            peakLeft: "#14090C",
            peakRight: "#1A0B0F",
            monolith: "#060606",
          }}
          aspect="wide"
        />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, #0E0E0E 0%, rgba(14,14,14,0.85) 45%, rgba(14,14,14,0.3) 100%)",
        }}
      />
      <div
        className="ms-container"
        style={{ position: "relative", zIndex: 2, paddingTop: "80px" }}
      >
        <div style={{ maxWidth: "520px" }}>
          <div
            style={{
              fontSize: "clamp(3.6rem, 7vw, 5.5rem)",
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              marginBottom: "14px",
            }}
          >
            404
          </div>
          <h1
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              margin: "0 0 16px",
            }}
          >
            It looks like you&apos;ve crossed beyond the horizon
          </h1>
          <p
            style={{
              color: "var(--ms-text-secondary)",
              fontSize: "1.02rem",
              margin: "0 0 28px",
              maxWidth: "42ch",
            }}
          >
            You should head back before the signal fades. Explore the main catalog from the home screen.
          </p>
          <button
            type="button"
            className="ms-btn ms-btn-primary ms-btn-lg"
            onClick={() => onNavigate("/")}
          >
            Go back
          </button>
        </div>
      </div>
    </section>
  );
}
