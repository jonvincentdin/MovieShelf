import { useState, useRef, useEffect } from "react";
import {
  Search,
  Home,
  Film,
  BookOpen,
  Plus,
  Download,
  Menu,
  X,
  Info,
  Wifi,
  WifiOff,
  ArrowRight,
} from "lucide-react";
import { HorizonArtwork } from "./SharedUI.jsx";

/**
 * Reusable Quick Search Input with Instant Movie & Manga/Manhwa Suggestions (FE-07)
 */
export function QuickSearchBar({
  movies = [],
  series = [],
  query,
  onQueryChange,
  onSubmitSearch,
  onSelectMovie,
  onSelectSeries,
  placeholder = "Find movies, manga and manhwa...",
  inputRef,
  compact = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapRef = useRef(null);

  const normalized = (query || "").trim().toLowerCase();

  const matchedMovies = normalized
    ? movies
        .filter(
          (m) =>
            m.title.toLowerCase().includes(normalized) ||
            (m.originalTitle && m.originalTitle.toLowerCase().includes(normalized)) ||
            m.director?.toLowerCase().includes(normalized) ||
            m.genres?.some((g) => g.toLowerCase().includes(normalized))
        )
        .slice(0, 4)
    : [];

  const matchedSeries = normalized
    ? series
        .filter(
          (s) =>
            s.title.toLowerCase().includes(normalized) ||
            s.alternateTitles?.some((t) => t.toLowerCase().includes(normalized)) ||
            s.author?.toLowerCase().includes(normalized) ||
            s.genres?.some((g) => g.toLowerCase().includes(normalized))
        )
        .slice(0, 4)
    : [];

  const combinedResults = [
    ...matchedMovies.map((item) => ({ kind: "movie", item })),
    ...matchedSeries.map((item) => ({ kind: "series", item })),
  ];

  useEffect(() => {
    const handleOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightIdx(-1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightIdx((prev) =>
        combinedResults.length ? (prev + 1) % combinedResults.length : -1
      );
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightIdx((prev) =>
        combinedResults.length
          ? (prev - 1 + combinedResults.length) % combinedResults.length
          : -1
      );
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIdx >= 0 && combinedResults[highlightIdx]) {
        const picked = combinedResults[highlightIdx];
        setIsOpen(false);
        if (picked.kind === "movie") onSelectMovie(picked.item.id);
        else onSelectSeries(picked.item.id);
      } else {
        setIsOpen(false);
        onSubmitSearch(query);
      }
    }
  };

  return (
    <div
      className="ms-quick-search-wrap"
      ref={wrapRef}
      style={compact ? { margin: 0, minWidth: "260px" } : undefined}
    >
      <div className="ms-quick-search-bar" style={compact ? { padding: "7px 12px" } : undefined}>
        <Search size={17} color="var(--ms-text-secondary)" />
        <input
          ref={inputRef}
          type="text"
          className="ms-quick-search-input"
          value={query}
          placeholder={placeholder}
          aria-label={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setIsOpen(true);
            setHighlightIdx(-1);
          }}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              onQueryChange("");
              setHighlightIdx(-1);
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--ms-text-secondary)",
              cursor: "pointer",
              display: "inline-flex",
              padding: "2px",
            }}
            aria-label="Clear search query"
          >
            <X size={15} />
          </button>
        )}
        {!compact && <span className="ms-kbd-badge">Ctrl K</span>}
      </div>

      {isOpen && normalized.length > 0 && (
        <div className="ms-search-dropdown" role="listbox" aria-label="Search suggestions">
          {combinedResults.length === 0 ? (
            <div style={{ padding: "18px 14px", textAlign: "center", color: "var(--ms-text-secondary)" }}>
              No instant matches for <strong>&ldquo;{query}&rdquo;</strong>. Press Enter to view full search.
            </div>
          ) : (
            <>
              {matchedMovies.length > 0 && (
                <div>
                  <div className="ms-suggestion-group-label">Movies ({matchedMovies.length})</div>
                  {matchedMovies.map((m, idx) => {
                    const isHighlighted = highlightIdx === idx;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className={`ms-suggestion-item ${isHighlighted ? "is-highlighted" : ""}`}
                        onClick={() => {
                          setIsOpen(false);
                          onSelectMovie(m.id);
                        }}
                      >
                        <div
                          style={{
                            width: "34px",
                            height: "48px",
                            borderRadius: "4px",
                            overflow: "hidden",
                            flexShrink: 0,
                          }}
                        >
                          <HorizonArtwork palette={m.palette} aspect="poster" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{m.title}</div>
                          <div style={{ fontSize: "0.76rem", color: "var(--ms-text-secondary)" }}>
                            Movie • {m.year} • {m.genres?.slice(0, 2).join(", ")}
                          </div>
                        </div>
                        <span className="ms-badge">★ {m.rating}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {matchedSeries.length > 0 && (
                <div>
                  <div className="ms-suggestion-group-label">
                    Manga & Manhwa ({matchedSeries.length})
                  </div>
                  {matchedSeries.map((s, idx) => {
                    const globalIdx = matchedMovies.length + idx;
                    const isHighlighted = highlightIdx === globalIdx;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`ms-suggestion-item ${isHighlighted ? "is-highlighted" : ""}`}
                        onClick={() => {
                          setIsOpen(false);
                          onSelectSeries(s.id);
                        }}
                      >
                        <div
                          style={{
                            width: "34px",
                            height: "48px",
                            borderRadius: "4px",
                            overflow: "hidden",
                            flexShrink: 0,
                          }}
                        >
                          <HorizonArtwork palette={s.palette} aspect="poster" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{s.title}</div>
                          <div style={{ fontSize: "0.76rem", color: "var(--ms-text-secondary)" }}>
                            {s.type} • {s.status} • {s.latestChapterLabel}
                          </div>
                        </div>
                        <span className="ms-badge">{s.type}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div
                style={{
                  borderTop: "1px solid var(--ms-border)",
                  marginTop: "6px",
                  paddingTop: "6px",
                }}
              >
                <button
                  type="button"
                  className="ms-suggestion-item"
                  style={{ justifyContent: "space-between", color: "var(--ms-primary)", fontWeight: 700 }}
                  onClick={() => {
                    setIsOpen(false);
                    onSubmitSearch(query);
                  }}
                >
                  <span>View all search results for &ldquo;{query}&rdquo;</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Global Navigation Bar, Expandable Navbar Search, Mobile Drawer, Bottom Nav & Footer (FE-06)
 */
export function NavigationHeader({
  currentRoute,
  onNavigate,
  myListCount,
  downloadsCount,
  isOffline,
  onToggleOffline,
  onOpenSearchPage,
  movies = [],
  series = [],
  searchQuery = "",
  onSearchQueryChange,
  onSubmitSearch,
  onSelectMovie,
  onSelectSeries,
  quickSearchInputRef,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navSearchExpanded, setNavSearchExpanded] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 36);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isRouteActive = (target) => {
    if (target === "/") return currentRoute === "/";
    if (target === "/movies") {
      return (
        currentRoute.startsWith("/movies") ||
        currentRoute.startsWith("/movie/") ||
        currentRoute.startsWith("/watch/")
      );
    }
    if (target === "/manga") {
      return (
        currentRoute.startsWith("/manga") ||
        currentRoute.startsWith("/series/") ||
        currentRoute.startsWith("/read/")
      );
    }
    if (target === "/my-list") return currentRoute.startsWith("/my-list");
    if (target === "/downloads") return currentRoute.startsWith("/downloads");
    if (target === "/search") return currentRoute.startsWith("/search");
    return currentRoute === target;
  };

  const allNavItems = [
    { label: "Home", path: "/", icon: Home },
    { label: "Movies", path: "/movies", icon: Film },
    { label: "Manga / Manhwa", mobileLabel: "Reading", path: "/manga", icon: BookOpen },
    { label: "My List", path: "/my-list", icon: Plus, badge: myListCount },
    { label: "Downloads", path: "/downloads", icon: Download, badge: downloadsCount },
  ];

  const navItems = isOffline
    ? allNavItems.filter((item) => item.path === "/downloads")
    : allNavItems;

  return (
    <>
      <header className={`ms-header ${isScrolled ? "is-solid" : ""}`}>
        <div className="ms-container ms-header-inner">
          <div className="ms-header-left">
            <button
              type="button"
              className="ms-wordmark"
              onClick={() => onNavigate(isOffline ? "/downloads" : "/")}
              aria-label="MovieShelf Home"
            >
              MOVIESHELF
            </button>

            <nav className="ms-nav" aria-label="Primary navigation">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  className={`ms-nav-link ${isRouteActive(item.path) ? "is-active" : ""}`}
                  onClick={() => onNavigate(item.path)}
                >
                  <span>{item.label}</span>
                  {item.badge > 0 && <span className="ms-nav-badge">{item.badge}</span>}
                </button>
              ))}
            </nav>
          </div>

          <div className="ms-header-right">
            {!isOffline && (
              <>
                {navSearchExpanded || searchQuery ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <QuickSearchBar
                      movies={movies}
                      series={series}
                      query={searchQuery}
                      onQueryChange={onSearchQueryChange}
                      onSubmitSearch={(q) => {
                        if (onSubmitSearch) onSubmitSearch(q);
                      }}
                      onSelectMovie={(id) => {
                        setNavSearchExpanded(false);
                        if (onSelectMovie) onSelectMovie(id);
                      }}
                      onSelectSeries={(id) => {
                        setNavSearchExpanded(false);
                        if (onSelectSeries) onSelectSeries(id);
                      }}
                      placeholder="Titles, genres, people..."
                      inputRef={quickSearchInputRef}
                      compact={true}
                    />
                    <button
                      type="button"
                      className="ms-btn ms-btn-ghost ms-btn-sm"
                      onClick={() => {
                        setNavSearchExpanded(false);
                        if (onSearchQueryChange) onSearchQueryChange("");
                      }}
                      aria-label="Close search bar"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`ms-nav-link ${isRouteActive("/search") ? "is-active" : ""}`}
                    onClick={() => {
                      setNavSearchExpanded(true);
                      setTimeout(() => {
                        if (quickSearchInputRef?.current) {
                          quickSearchInputRef.current.focus();
                        }
                      }, 40);
                    }}
                    onDoubleClick={onOpenSearchPage}
                    aria-label="Open search"
                  >
                    <Search size={17} />
                    <span>Search</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              className={`ms-status-pill ${isOffline ? "is-offline" : ""}`}
              onClick={onToggleOffline}
              title={
                isOffline
                  ? "Offline Mode active — Click to reconnect"
                  : "Online — Click to switch to Offline Mode"
              }
            >
              <span className="ms-status-dot" />
              <span>{isOffline ? "Offline" : "Online"}</span>
            </button>

            <button
              type="button"
              className="ms-icon-btn ms-mobile-menu-btn"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle mobile navigation menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Offline status bar when offline mode is active */}
        {isOffline && (
          <div
            style={{
              background: "rgba(245, 158, 11, 0.14)",
              borderTop: "1px solid rgba(245, 158, 11, 0.3)",
              padding: "8px 0",
            }}
          >
            <div
              className="ms-container"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
                fontSize: "0.82rem",
                color: "#FCD34D",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <WifiOff size={15} />
                <span>
                  Offline mode active — Downloads and Local Video Player remain accessible.
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  className="ms-btn ms-btn-primary ms-btn-sm"
                  onClick={onToggleOffline}
                >
                  <Wifi size={13} /> Reconnect
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div
            style={{
              background: "var(--ms-surface)",
              borderTop: "1px solid var(--ms-border)",
              padding: "16px 24px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    className={`ms-nav-link ${isRouteActive(item.path) ? "is-active" : ""}`}
                    style={{ justifyContent: "space-between", width: "100%", padding: "10px 12px" }}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate(item.path);
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                      <Icon size={17} /> {item.label}
                    </span>
                    {item.badge > 0 && <span className="ms-nav-badge">{item.badge}</span>}
                  </button>
                );
              })}
              {!isOffline && (
                <button
                  type="button"
                  className="ms-nav-link"
                  style={{ justifyContent: "flex-start", width: "100%", padding: "10px 12px", gap: "10px" }}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate("/about");
                  }}
                >
                  <Info size={17} /> About & Attributions
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar matching 08_home_mobile.png */}
      <nav
        className="ms-mobile-bottom-nav"
        aria-label="Mobile bottom navigation"
        style={isOffline ? { gridTemplateColumns: "1fr" } : undefined}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isRouteActive(item.path);
          return (
            <button
              key={item.path}
              type="button"
              className={`ms-mobile-nav-item ${active ? "is-active" : ""}`}
              onClick={() => onNavigate(item.path)}
            >
              <Icon size={19} />
              <span>{item.mobileLabel || item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

/**
 * Global Footer with Quick Routes & Required Attributions
 */
export function Footer({ onNavigate }) {
  return (
    <footer className="ms-footer">
      <div className="ms-container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "28px",
            marginBottom: "28px",
          }}
        >
          <div>
            <div
              style={{
                color: "var(--ms-primary)",
                fontWeight: 800,
                fontSize: "1.25rem",
                letterSpacing: "-0.03em",
                marginBottom: "8px",
              }}
            >
              MOVIESHELF
            </div>
            <p style={{ margin: 0, color: "var(--ms-text-secondary)", fontSize: "0.84rem" }}>
              Unified entertainment hub for discovering and watching movies, reading manga and manhwa, and managing local media playback.
            </p>
          </div>

          <div>
            <div style={{ fontWeight: 700, color: "var(--ms-text)", marginBottom: "10px" }}>
              Browse & Discover
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <button type="button" className="ms-view-all-btn" onClick={() => onNavigate("/")}>
                Home
              </button>
              <button type="button" className="ms-view-all-btn" onClick={() => onNavigate("/movies")}>
                Movies Home
              </button>
              <button type="button" className="ms-view-all-btn" onClick={() => onNavigate("/movies/browse")}>
                Browse All Movies
              </button>
              <button type="button" className="ms-view-all-btn" onClick={() => onNavigate("/manga")}>
                Manga & Manhwa Home
              </button>
              <button type="button" className="ms-view-all-btn" onClick={() => onNavigate("/manga/browse")}>
                Browse Series Catalog
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, color: "var(--ms-text)", marginBottom: "10px" }}>
              Personal Library & Tools
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <button type="button" className="ms-view-all-btn" onClick={() => onNavigate("/my-list")}>
                My List
              </button>
              <button type="button" className="ms-view-all-btn" onClick={() => onNavigate("/downloads")}>
                Downloads & Offline
              </button>
              <button type="button" className="ms-view-all-btn" onClick={() => onNavigate("/downloads/player")}>
                Local Video Player
              </button>
              <button type="button" className="ms-view-all-btn" onClick={() => onNavigate("/search")}>
                Global Search
              </button>
              <button type="button" className="ms-view-all-btn" onClick={() => onNavigate("/about")}>
                About & Attributions
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, color: "var(--ms-text)", marginBottom: "10px" }}>
              Attributions & Rights
            </div>
            <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "var(--ms-text-muted)" }}>
              Movie metadata architecture follows TMDB specifications and standard cinema catalog formats.
            </p>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--ms-text-muted)" }}>
              Subtitle discovery structure aligns with OpenSubtitles REST specifications and local WebVTT / SRT tracks.
            </p>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid var(--ms-border)",
            paddingTop: "18px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            color: "var(--ms-text-muted)",
            fontSize: "0.78rem",
          }}
        >
          <span>© 2026 MovieShelf • Non-Commercial Entertainment Hub</span>
          <span>Shortcuts: Ctrl+K Search • Space Play/Pause • Esc Close Overlays</span>
        </div>
      </div>
    </footer>
  );
}
