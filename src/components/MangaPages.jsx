import { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Check,
  Filter,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Sliders,
  Download,
  ArrowLeftRight,
} from "lucide-react";
import {
  HorizonArtwork,
  HeroBanner,
  ContentCarousel,
  MangaCoverCard,
  ContinueReadingCard,
  Modal,
  StateFeedbackBox,
} from "./SharedUI.jsx";
import { MANGA_GENRES, MANGA_TYPES, MANGA_STATUSES } from "../data/mangaData.js";

/**
 * Manga / Manhwa Home Page (/manga) — Matches 04_manga_home.png (FE-20)
 */
export function MangaHomePage({
  series,
  continueReading,
  onNavigate,
  onOpenSeriesDetails,
  onReadChapter,
  onToggleList,
  isInList,
  onRemoveContinueReading,
}) {
  const [heroIdx, setHeroIdx] = useState(0);
  const featuredSeries = series.slice(0, 4);
  const manhwaSeries = series.filter((s) => s.type === "Manhwa");
  const mangaSeries = series.filter((s) => s.type === "Manga");
  const completedSeries = series.filter((s) => s.status === "Completed");

  return (
    <div>
      {/* Full-Bleed Featured Series Hero */}
      <HeroBanner
        items={featuredSeries}
        activeIndex={heroIdx}
        onSelectIndex={setHeroIdx}
        onPrimaryAction={(item) => {
          const firstCh = item.chapters?.[item.chapters.length - 1] || item.chapters?.[0];
          onReadChapter(item.id, firstCh?.id);
        }}
        onSecondaryAction={(item) => onOpenSeriesDetails(item.id)}
        onToggleList={onToggleList}
        isInList={isInList("series", featuredSeries[heroIdx]?.id)}
        mediaType="series"
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
            {["All Series", "Manhwa", "Manga", "Ongoing", "Completed", "Fantasy"].map(
              (pill, i) => (
                <button
                  key={pill}
                  type="button"
                  className={`ms-genre-pill ${i === 0 ? "is-active" : ""}`}
                  onClick={() => onNavigate("/manga/browse")}
                >
                  {pill}
                </button>
              )
            )}
          </div>
          <button
            type="button"
            className="ms-btn ms-btn-secondary ms-btn-sm"
            onClick={() => onNavigate("/manga/browse")}
          >
            <Filter size={14} /> Browse All Series
          </button>
        </div>

      {/* Continue Reading */}
      {continueReading.length > 0 && (
        <ContentCarousel
          title="Continue Reading"
          subtitle="Resume your active chapters"
          onViewAll={() => onNavigate("/my-list")}
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

      {/* Trending Manga & Manhwa matching 04_manga_home.png */}
      <ContentCarousel
        title="Trending Manga & Manhwa"
        subtitle="Most read series this week"
        onViewAll={() => onNavigate("/manga/browse")}
      >
        {series.map((ser) => (
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

      {/* Compact Recently Updated Section matching 04_manga_home.png */}
      <section className="ms-section">
        <div className="ms-section-header">
          <h2 className="ms-section-title">Recently Updated</h2>
          <button
            type="button"
            className="ms-view-all-btn"
            onClick={() => onNavigate("/manga/browse")}
          >
            All Updates <ChevronRight size={15} />
          </button>
        </div>
        <div className="ms-feed-list">
          {series.slice(0, 6).map((ser) => {
            const latestChapter = ser.chapters?.[0];
            return (
              <div
                key={ser.id}
                className="ms-feed-row"
                onClick={() =>
                  latestChapter
                    ? onReadChapter(ser.id, latestChapter.id)
                    : onOpenSeriesDetails(ser.id)
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    latestChapter
                      ? onReadChapter(ser.id, latestChapter.id)
                      : onOpenSeriesDetails(ser.id);
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <strong style={{ fontSize: "1rem" }}>{ser.title}</strong>
                  <span className="ms-badge">{ser.type}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                  <span style={{ color: "var(--ms-text-secondary)", fontWeight: 500 }}>
                    {ser.latestChapterLabel}
                  </span>
                  <span style={{ color: "var(--ms-text-muted)", fontSize: "0.82rem" }}>
                    {ser.updatedLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Manhwa Rail */}
      <ContentCarousel
        title="Popular Manhwa"
        subtitle="Full-color vertical scroll webtoons"
        onViewAll={() => onNavigate("/manga/browse")}
      >
        {manhwaSeries.map((ser) => (
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

      {/* Manga & Completed Series Rail */}
      <ContentCarousel
        title="Acclaimed Manga & Completed Stories"
        subtitle="Binge-ready completed & ongoing series"
        onViewAll={() => onNavigate("/manga/browse")}
      >
        {[...mangaSeries, ...completedSeries]
          .filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i)
          .map((ser) => (
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
      </div>
    </div>
  );
}

/**
 * Browse Manga / Manhwa Page (/manga/browse) — (FE-20)
 */
export function BrowseMangaPage({
  series,
  onOpenSeriesDetails,
  onReadChapter,
  onToggleList,
  isInList,
}) {
  const [contentType, setContentType] = useState("All");
  const [genre, setGenre] = useState("All");
  const [status, setStatus] = useState("All");
  const [year, setYear] = useState("All");
  const [sortBy, setSortBy] = useState("popularity");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const years = ["All", "2026", "2025", "2024", "2023"];

  const filtered = series
    .filter((s) => {
      if (contentType !== "All" && s.type !== contentType) return false;
      if (genre !== "All" && !s.genres.includes(genre)) return false;
      if (status !== "All" && s.status !== status) return false;
      if (year !== "All" && String(s.year) !== year) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "latest") return b.year - a.year;
      if (sortBy === "az") return a.title.localeCompare(b.title);
      if (sortBy === "chapters") return b.chapterCount - a.chapterCount;
      return parseFloat(b.rating) - parseFloat(a.rating);
    });

  const resetFilters = () => {
    setContentType("All");
    setGenre("All");
    setStatus("All");
    setYear("All");
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
            Browse Manga & Manhwa
          </h1>
          <p style={{ margin: 0, color: "var(--ms-text-secondary)", fontSize: "0.9rem" }}>
            Filter by series format, publication status, genre, and release year.
          </p>
        </div>
        <button
          type="button"
          className="ms-btn ms-btn-secondary ms-btn-sm"
          onClick={() => setMobileFilterOpen(true)}
        >
          <Sliders size={15} /> Filter Sheet
        </button>
      </div>

      <div className="ms-filter-bar">
        <div className="ms-filter-group">
          <select
            className="ms-select"
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            aria-label="Filter by content type"
          >
            {MANGA_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "All" ? "All Types (Manga & Manhwa)" : t}
              </option>
            ))}
          </select>

          <select
            className="ms-select"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            aria-label="Filter by genre"
          >
            <option value="All">All Genres</option>
            {MANGA_GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <select
            className="ms-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by publication status"
          >
            {MANGA_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st === "All" ? "All Statuses" : st}
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
        </div>

        <div className="ms-filter-group">
          <select
            className="ms-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort series"
          >
            <option value="popularity">Sort: Popularity & Rating</option>
            <option value="latest">Sort: Latest Chapter Update</option>
            <option value="chapters">Sort: Chapter Count</option>
            <option value="az">Sort: Alphabetical (A–Z)</option>
          </select>

          {(contentType !== "All" || genre !== "All" || status !== "All" || year !== "All") && (
            <button type="button" className="ms-btn ms-btn-ghost ms-btn-sm" onClick={resetFilters}>
              <RotateCcw size={14} /> Reset
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <StateFeedbackBox
          icon="search"
          title="No series match your filters"
          description="Try resetting your genre, status, or content type selection."
          actionLabel="Reset Filters"
          onAction={resetFilters}
        />
      ) : (
        <div className="ms-poster-grid">
          {filtered.map((ser) => (
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
      )}

      <Modal
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        title="Filter Manga & Manhwa"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "6px" }}>
              Format Type
            </label>
            <select
              className="ms-select"
              style={{ width: "100%" }}
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
            >
              {MANGA_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "6px" }}>
              Publication Status
            </label>
            <select
              className="ms-select"
              style={{ width: "100%" }}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {MANGA_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
            <button type="button" className="ms-btn ms-btn-ghost" onClick={resetFilters}>
              Reset All
            </button>
            <button
              type="button"
              className="ms-btn ms-btn-primary"
              onClick={() => setMobileFilterOpen(false)}
            >
              Apply ({filtered.length})
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/**
 * Series Details & Chapter List Page (/series/:id) — Matches 05_series_details.png (FE-21)
 */
export function SeriesDetailsPage({
  seriesItem,
  allSeries,
  chapterStatuses,
  onReadChapter,
  onDownloadChapter,
  onToggleList,
  isInList,
  onOpenSeriesDetails,
}) {
  const [sortOrder, setSortOrder] = useState("desc"); // desc = Latest first | asc = Oldest first

  if (!seriesItem) {
    return (
      <div className="ms-container" style={{ paddingTop: "32px" }}>
        <StateFeedbackBox
          icon="error"
          title="Series not found"
          description="The requested series could not be found in the catalog."
        />
      </div>
    );
  }

  const chapters = [...(seriesItem.chapters || [])].sort((a, b) =>
    sortOrder === "desc" ? b.number - a.number : a.number - b.number
  );

  // Determine resume chapter (in-progress or first chapter)
  const inProgressChapter =
    seriesItem.chapters?.find(
      (c) => (chapterStatuses[c.id] || c.defaultStatus) === "In progress"
    ) || seriesItem.chapters?.[seriesItem.chapters.length - 1];

  const relatedSeries = allSeries
    .filter(
      (s) =>
        s.id !== seriesItem.id && s.genres.some((g) => seriesItem.genres.includes(g))
    )
    .slice(0, 6);

  return (
    <div className="ms-container">
      {/* Series Details Header matching 05_series_details.png */}
      <section className="ms-detail-hero">
        <div className="ms-hero-artwork">
          <HorizonArtwork palette={seriesItem.palette} aspect="wide" />
        </div>
        <div className="ms-hero-scrim" />

        <div className="ms-detail-hero-inner">
          <div className="ms-detail-poster">
            <HorizonArtwork palette={seriesItem.palette} aspect="poster" />
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
              {seriesItem.title}
            </h1>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "10px",
                color: "var(--ms-text-secondary)",
                fontSize: "0.95rem",
                marginBottom: "14px",
              }}
            >
              <span>{seriesItem.type}</span>
              <span>•</span>
              <span>{seriesItem.status}</span>
              <span>•</span>
              <span>{seriesItem.genres.join(", ")}</span>
              <span>•</span>
              <span>{seriesItem.year}</span>
              <span>•</span>
              <span className="ms-badge ms-badge-green">★ {seriesItem.rating}</span>
            </div>

            {seriesItem.alternateTitles?.length > 0 && (
              <div
                style={{
                  fontSize: "0.84rem",
                  color: "var(--ms-text-muted)",
                  marginBottom: "12px",
                }}
              >
                Alternate titles: {seriesItem.alternateTitles.join(" • ")} • Author:{" "}
                <strong style={{ color: "var(--ms-text-secondary)" }}>{seriesItem.author}</strong> • Artist:{" "}
                <strong style={{ color: "var(--ms-text-secondary)" }}>{seriesItem.artist}</strong>
              </div>
            )}

            <p
              style={{
                color: "#E8E8E8",
                fontSize: "1.02rem",
                lineHeight: 1.6,
                maxWidth: "62ch",
                margin: "0 0 22px",
              }}
            >
              {seriesItem.synopsis}
            </p>

            {/* Primary Actions matching 05_series_details.png */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
              <button
                type="button"
                className="ms-btn ms-btn-primary ms-btn-lg"
                onClick={() =>
                  onReadChapter(seriesItem.id, inProgressChapter?.id)
                }
              >
                <BookOpen size={17} />
                Continue Reading
              </button>

              <button
                type="button"
                className="ms-btn ms-btn-secondary ms-btn-lg"
                onClick={() => {
                  const firstCh =
                    seriesItem.chapters?.[seriesItem.chapters.length - 1] ||
                    seriesItem.chapters?.[0];
                  onReadChapter(seriesItem.id, firstCh?.id);
                }}
              >
                Read Chapter 1
              </button>

              <button
                type="button"
                className="ms-btn ms-btn-secondary ms-btn-lg"
                onClick={() => onToggleList("series", seriesItem.id)}
              >
                {isInList ? <Check size={17} /> : <Plus size={17} />}
                {isInList ? "In My List" : "+ My List"}
              </button>
            </div>

            <div style={{ fontSize: "0.84rem", color: "var(--ms-text-secondary)" }}>
              {seriesItem.chapterCount} total chapters • {seriesItem.readingFormat} • Default direction:{" "}
              {seriesItem.readingDirection}
            </div>
          </div>
        </div>
      </section>

      {/* Chapters List matching 05_series_details.png */}
      <section className="ms-section">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <h2 className="ms-section-title" style={{ fontSize: "1.55rem" }}>
            Chapters
          </h2>

          <select
            className="ms-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            aria-label="Sort chapters"
          >
            <option value="desc">Latest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {chapters.map((ch) => {
            const status = chapterStatuses[ch.id] || ch.defaultStatus || "Unread";
            return (
              <div
                key={ch.id}
                style={{
                  background: "var(--ms-surface)",
                  border: "1px solid var(--ms-border)",
                  borderRadius: "var(--ms-radius-md)",
                  padding: "14px 18px",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  cursor: "pointer",
                  transition: "background-color 150ms var(--ms-ease), border-color 150ms var(--ms-ease)",
                }}
                onClick={() => onReadChapter(seriesItem.id, ch.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onReadChapter(seriesItem.id, ch.id);
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div
                    style={{
                      width: "96px",
                      height: "58px",
                      borderRadius: "6px",
                      overflow: "hidden",
                      flexShrink: 0,
                      border: "1px solid var(--ms-border)",
                    }}
                  >
                    <HorizonArtwork palette={ch.palette || seriesItem.palette} aspect="wide" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "1.08rem" }}>
                      {ch.numberLabel}
                    </div>
                    <div style={{ fontSize: "0.9rem", color: "var(--ms-text-secondary)" }}>
                      {ch.title}
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "var(--ms-text-muted)", marginTop: "2px" }}>
                      {ch.dateLabel} • {ch.pageCount} pages
                    </div>
                  </div>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span
                    className={`ms-badge ${
                      status === "Read"
                        ? "ms-badge-green"
                        : status === "In progress"
                        ? "ms-badge-amber"
                        : ""
                    }`}
                  >
                    {status}
                  </span>

                  {onDownloadChapter && (
                    <button
                      type="button"
                      className="ms-icon-btn"
                      style={{ width: "34px", height: "34px" }}
                      onClick={() => onDownloadChapter(seriesItem, ch)}
                      aria-label={`Save ${ch.numberLabel} to Downloads`}
                      title="Save Chapter to Downloads"
                    >
                      <Download size={15} />
                    </button>
                  )}

                  <button
                    type="button"
                    className="ms-icon-btn"
                    style={{ width: "34px", height: "34px" }}
                    onClick={() => onReadChapter(seriesItem.id, ch.id)}
                    aria-label={`Read ${ch.numberLabel}`}
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {relatedSeries.length > 0 && (
        <ContentCarousel title="Related Series" subtitle="More in Fantasy & Adventure">
          {relatedSeries.map((ser) => (
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
      )}

      {/* Publication & Reading Specifications */}
      <section className="ms-section">
        <h2 className="ms-section-title" style={{ marginBottom: "14px" }}>
          Series Publication & Reading Details
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
              CREATIVE TEAM
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.98rem", marginTop: "4px" }}>
              Story: {seriesItem.author}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--ms-text-secondary)", marginTop: "2px" }}>
              Illustration: {seriesItem.artist}
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
              SERIALIZATION
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.98rem", marginTop: "4px" }}>
              {seriesItem.type} • {seriesItem.status} ({seriesItem.year})
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--ms-text-secondary)", marginTop: "2px" }}>
              Latest Release: {seriesItem.latestChapterLabel} ({seriesItem.updatedLabel})
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
              READER MODES SUPPORTED
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.98rem", marginTop: "4px" }}>
              Vertical Scroll, Single Page & Spread
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--ms-text-secondary)", marginTop: "2px" }}>
              Default Direction: {seriesItem.readingDirection} • Fit Width / Height & Zoom
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Manga / Manhwa Chapter Reader Interface (/read/:seriesId/:chapterId) — Matches 06_manga_reader.png (FE-22)
 */
export function ChapterReaderPage({
  seriesItem,
  chapter,
  initialPage = 1,
  onSelectChapter,
  onBackToSeries,
  onUpdateReadingProgress,
  onMarkChapterRead,
}) {
  const [readingMode, setReadingMode] = useState("vertical"); // vertical | single | horizontal
  const [fitMode, setFitMode] = useState("width"); // width | height
  const [zoomPct, setZoomPct] = useState(100);
  const [direction, setDirection] = useState(seriesItem?.readingDirection || "LTR");
  const [currentPage, setCurrentPage] = useState(initialPage); // resumes from Continue Reading
  const [settingsOpen, setSettingsOpen] = useState(false);

  const pages = chapter?.pages || [];
  const totalPages = pages.length || 6;

  // Ordered chapters ascending for Prev / Next chapter navigation
  const orderedChapters = [...(seriesItem?.chapters || [])].sort(
    (a, b) => a.number - b.number
  );
  const currentChIndex = orderedChapters.findIndex((c) => c.id === chapter?.id);
  const prevChapter = currentChIndex > 0 ? orderedChapters[currentChIndex - 1] : null;
  const nextChapter =
    currentChIndex >= 0 && currentChIndex < orderedChapters.length - 1
      ? orderedChapters[currentChIndex + 1]
      : null;

  const progressPct = Math.round((currentPage / totalPages) * 100);

  const goToPage = (pageNum) => {
    const clamped = Math.max(1, Math.min(totalPages, pageNum));
    setCurrentPage(clamped);
    if (seriesItem && chapter && onUpdateReadingProgress) {
      onUpdateReadingProgress(seriesItem.id, chapter.id, clamped, totalPages, readingMode);
    }
    if (clamped === totalPages && chapter && onMarkChapterRead) {
      onMarkChapterRead(chapter.id, "Read");
    }
  };

  // Keyboard navigation in reader
  useEffect(() => {
    const handleKey = (e) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (direction === "RTL") goToPage(currentPage - 1);
        else goToPage(currentPage + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (direction === "RTL") goToPage(currentPage + 1);
        else goToPage(currentPage - 1);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const handleFullscreen = () => {
    const el = document.querySelector(".ms-reader-stage");
    if (!el) return;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const baseSheetWidth = fitMode === "height" ? 420 : 540;
  const computedWidth = Math.round((baseSheetWidth * zoomPct) / 100);

  return (
    <div className="ms-reader-stage">
      {/* Top Bar matching 06_manga_reader.png */}
      <div className="ms-reader-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onBackToSeries}
            style={{
              background: "none",
              border: "none",
              color: "#FFFFFF",
              fontSize: "1.2rem",
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ChevronLeft size={20} />
            <span>
              {seriesItem?.title?.toUpperCase()} / {chapter?.numberLabel}
            </span>
          </button>

          {/* Chapter Switcher Dropdown */}
          <select
            className="ms-select"
            value={chapter?.id || ""}
            onChange={(e) => onSelectChapter(seriesItem.id, e.target.value)}
            aria-label="Select chapter"
          >
            {orderedChapters.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {ch.numberLabel} — {ch.title}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Reading Mode Dropdown matching 06_manga_reader.png */}
          <select
            className="ms-select"
            value={readingMode}
            onChange={(e) => setReadingMode(e.target.value)}
            aria-label="Select reading mode"
          >
            <option value="vertical">Vertical scroll</option>
            <option value="single">Single page</option>
            <option value="horizontal">Horizontal paginated</option>
          </select>

          <button
            type="button"
            className="ms-btn ms-btn-secondary ms-btn-sm"
            onClick={() => setDirection((d) => (d === "LTR" ? "RTL" : "LTR"))}
            title="Switch Reading Direction"
          >
            <ArrowLeftRight size={14} /> {direction}
          </button>

          <button
            type="button"
            className="ms-icon-btn"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open reader settings"
            title="Reader Settings"
          >
            <Sliders size={16} />
          </button>

          <button
            type="button"
            className="ms-icon-btn"
            onClick={handleFullscreen}
            aria-label="Toggle reader fullscreen"
            title="Fullscreen"
          >
            <Maximize size={16} />
          </button>
        </div>
      </div>

      {/* Central Cream Canvas with Story Panels matching 06_manga_reader.png */}
      <div className="ms-reader-canvas">
        <div
          className="ms-reader-sheet"
          style={{
            width: "100%",
            maxWidth: `${computedWidth}px`,
          }}
        >
          {readingMode === "vertical" ? (
            pages.map((pg) => (
              <div
                key={pg.pageNumber}
                onClick={() => goToPage(pg.pageNumber)}
                style={{
                  width: "100%",
                  aspectRatio: "16 / 10",
                  borderRadius: "6px",
                  overflow: "hidden",
                  cursor: "pointer",
                  outline:
                    currentPage === pg.pageNumber
                      ? "3px solid var(--ms-primary)"
                      : "none",
                }}
              >
                <HorizonArtwork
                  palette={pg.palette}
                  aspect="reader"
                  speechText={pg.caption}
                  subCaption={`Page ${pg.pageNumber} • ${pg.subCaption}`}
                />
              </div>
            ))
          ) : readingMode === "single" ? (
            <div>
              {(() => {
                const pg = pages[currentPage - 1] || pages[0];
                return (
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "16 / 11",
                      borderRadius: "6px",
                      overflow: "hidden",
                    }}
                  >
                    <HorizonArtwork
                      palette={pg.palette}
                      aspect="reader"
                      speechText={pg.caption}
                      subCaption={`Page ${pg.pageNumber} of ${totalPages} • ${pg.subCaption}`}
                    />
                  </div>
                );
              })()}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "14px",
                  color: "#1E1E1E",
                  fontWeight: 700,
                }}
              >
                <button
                  type="button"
                  className="ms-btn ms-btn-secondary ms-btn-sm"
                  disabled={currentPage <= 1}
                  onClick={() => goToPage(currentPage - 1)}
                >
                  <ChevronLeft size={15} /> Previous Page
                </button>
                <span>
                  Page {currentPage} of {totalPages} ({direction})
                </span>
                <button
                  type="button"
                  className="ms-btn ms-btn-primary ms-btn-sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                >
                  Next Page <ChevronRight size={15} />
                </button>
              </div>
            </div>
          ) : (
            /* Horizontal Paginated Spread (2 pages side-by-side) */
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "12px",
                  direction: direction === "RTL" ? "rtl" : "ltr",
                }}
              >
                {[pages[currentPage - 1], pages[Math.min(totalPages - 1, currentPage)]]
                  .filter((v, idx, arr) => v && arr.indexOf(v) === idx)
                  .map((pg) => (
                    <div
                      key={pg.pageNumber}
                      style={{
                        width: "100%",
                        aspectRatio: "16 / 11",
                        borderRadius: "6px",
                        overflow: "hidden",
                      }}
                    >
                      <HorizonArtwork
                        palette={pg.palette}
                        aspect="reader"
                        speechText={pg.caption}
                        subCaption={`Page ${pg.pageNumber}`}
                      />
                    </div>
                  ))}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "14px",
                  color: "#1E1E1E",
                  fontWeight: 700,
                }}
              >
                <button
                  type="button"
                  className="ms-btn ms-btn-secondary ms-btn-sm"
                  disabled={currentPage <= 1}
                  onClick={() => goToPage(currentPage - 1)}
                >
                  <ChevronLeft size={15} /> Previous Spread
                </button>
                <span>
                  Paginated ({direction}) • Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  className="ms-btn ms-btn-primary ms-btn-sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                >
                  Next Spread <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation & Progress Bar matching 06_manga_reader.png */}
      <div className="ms-reader-bottombar">
        <div className="ms-progress-track" style={{ height: "5px" }}>
          <div className="ms-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div
          className="ms-container"
          style={{
            paddingTop: "12px",
            paddingBottom: "12px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <button
            type="button"
            className="ms-btn ms-btn-ghost ms-btn-sm"
            disabled={!prevChapter}
            onClick={() => prevChapter && onSelectChapter(seriesItem.id, prevChapter.id)}
          >
            <ChevronLeft size={16} /> Previous chapter
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              color: "var(--ms-text-secondary)",
              fontSize: "0.92rem",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span>
              Page {currentPage} / {totalPages} • {progressPct}%
            </span>
            <div style={{ display: "flex", gap: "4px" }}>
              {pages.map((p) => (
                <button
                  key={p.pageNumber}
                  type="button"
                  onClick={() => goToPage(p.pageNumber)}
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "4px",
                    border: "1px solid var(--ms-border)",
                    background:
                      currentPage === p.pageNumber
                        ? "var(--ms-primary)"
                        : "var(--ms-surface)",
                    color: "#FFF",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {p.pageNumber}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              className="ms-btn ms-btn-ghost ms-btn-sm"
              onClick={() => setFitMode((f) => (f === "width" ? "height" : "width"))}
            >
              {fitMode === "width" ? "Fit width" : "Fit height"}
            </button>
            <button
              type="button"
              className="ms-icon-btn"
              style={{ width: "30px", height: "30px" }}
              onClick={() => setZoomPct((z) => Math.min(140, z + 10))}
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              className="ms-icon-btn"
              style={{ width: "30px", height: "30px" }}
              onClick={() => setZoomPct((z) => Math.max(70, z - 10))}
              aria-label="Zoom out"
            >
              −
            </button>
            <button
              type="button"
              className="ms-btn ms-btn-ghost ms-btn-sm"
              disabled={!nextChapter}
              onClick={() => nextChapter && onSelectChapter(seriesItem.id, nextChapter.id)}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Reader Settings Modal */}
      <Modal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Reader Display & Navigation Settings"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "6px" }}>
              Reading Layout Mode
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[
                { id: "vertical", label: "Vertical Scroll" },
                { id: "single", label: "Single Page" },
                { id: "horizontal", label: "Horizontal Paginated" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`ms-btn ms-btn-sm ${
                    readingMode === m.id ? "ms-btn-primary" : "ms-btn-secondary"
                  }`}
                  onClick={() => setReadingMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "6px" }}>
              Page Fit & Zoom ({zoomPct}%)
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                className={`ms-btn ms-btn-sm ${
                  fitMode === "width" ? "ms-btn-primary" : "ms-btn-secondary"
                }`}
                onClick={() => setFitMode("width")}
              >
                Fit Width
              </button>
              <button
                type="button"
                className={`ms-btn ms-btn-sm ${
                  fitMode === "height" ? "ms-btn-primary" : "ms-btn-secondary"
                }`}
                onClick={() => setFitMode("height")}
              >
                Fit Height
              </button>
              <button
                type="button"
                className="ms-btn ms-btn-secondary ms-btn-sm"
                onClick={() => setZoomPct(100)}
              >
                Reset Zoom (100%)
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "6px" }}>
              Reading Direction
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className={`ms-btn ms-btn-sm ${
                  direction === "LTR" ? "ms-btn-primary" : "ms-btn-secondary"
                }`}
                onClick={() => setDirection("LTR")}
              >
                Left-to-Right (Manhwa)
              </button>
              <button
                type="button"
                className={`ms-btn ms-btn-sm ${
                  direction === "RTL" ? "ms-btn-primary" : "ms-btn-secondary"
                }`}
                onClick={() => setDirection("RTL")}
              >
                Right-to-Left (Manga)
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="ms-btn ms-btn-primary"
              onClick={() => setSettingsOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
