import { useState, useRef, useEffect } from "react";
import {
  Play,
  Plus,
  Check,
  Info,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  WifiOff,
  Search,
  Film,
  Sparkles,
  Download,
} from "lucide-react";

/**
 * Rich Multi-Layer Geometric Horizon Vector Artwork
 * Enhances the reference wireframe aesthetic with starlight nodes, concentric lunar halo rings,
 * distant ridge silhouettes, beacon signal slit, and atmospheric valley mist.
 */
export function HorizonArtwork({
  palette,
  aspect = "poster",
  speechText = null,
  subCaption = null,
  className = "",
}) {
  const p = palette || {
    skyTop: "#1C2E42",
    skyBottom: "#0F1722",
    sun: "#D08862",
    peakLeft: "#111A26",
    peakRight: "#131D2A",
    monolith: "#181818",
  };

  const uid = `${p.skyTop}-${p.sun}`.replace(/[^a-zA-Z0-9]/g, "");

  if (aspect === "wide" || aspect === "reader") {
    return (
      <svg
        viewBox="0 0 800 450"
        preserveAspectRatio="xMidYMid slice"
        className={className}
        style={{ width: "100%", height: "100%", display: "block" }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`sky-w-${uid}`} x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor={p.skyTop} />
            <stop offset="100%" stopColor={p.skyBottom} />
          </linearGradient>
          <radialGradient id={`halo-w-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={p.sun} stopOpacity="0.48" />
            <stop offset="60%" stopColor={p.sun} stopOpacity="0.12" />
            <stop offset="100%" stopColor={p.sun} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`mist-w-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.sun} stopOpacity="0" />
            <stop offset="100%" stopColor={p.skyBottom} stopOpacity="0.88" />
          </linearGradient>
        </defs>

        {/* Deep sky gradient */}
        <rect width="800" height="450" fill={`url(#sky-w-${uid})`} />

        {/* Subtle geometric starfield & constellation lines */}
        <g opacity="0.38">
          <circle cx="95" cy="68" r="1.4" fill="#FFFFFF" />
          <circle cx="165" cy="48" r="1.8" fill="#FFFFFF" />
          <circle cx="242" cy="84" r="1.2" fill="#FFFFFF" />
          <circle cx="330" cy="52" r="1.5" fill="#FFFFFF" />
          <circle cx="428" cy="76" r="1.3" fill="#FFFFFF" />
          <circle cx="715" cy="64" r="1.6" fill="#FFFFFF" />
          <polyline
            points="95,68 165,48 242,84 330,52"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="0.6"
            strokeDasharray="3 3"
            opacity="0.45"
          />
        </g>

        {/* Outer atmospheric solar/lunar glow & orbital rings */}
        <circle cx="585" cy="138" r="158" fill={`url(#halo-w-${uid})`} />
        <circle
          cx="585"
          cy="138"
          r="104"
          fill="none"
          stroke={p.sun}
          strokeWidth="0.8"
          strokeDasharray="6 6"
          opacity="0.32"
        />
        <circle cx="585" cy="138" r="78" fill={p.sun} opacity="0.94" />

        {/* Far distant ridge silhouette */}
        <polygon
          points="0,330 140,210 310,310 470,225 650,315 800,255 800,450 0,450"
          fill={p.skyBottom}
          opacity="0.55"
        />

        {/* Primary foreground mountain peaks */}
        <polygon points="0,360 220,156 465,365 465,450 0,450" fill={p.peakLeft} />
        <polygon
          points="220,156 268,202 220,365"
          fill={p.sun}
          opacity="0.07"
        />
        <polygon points="305,365 565,202 800,338 800,450 305,450" fill={p.peakRight} />
        <polygon
          points="565,202 612,232 565,365"
          fill={p.sun}
          opacity="0.06"
        />

        {/* Valley atmospheric mist layer */}
        <rect x="0" y="320" width="800" height="130" fill={`url(#mist-w-${uid})`} />

        {/* Central monolith & glowing beacon slit */}
        <rect x="382" y="268" width="32" height="115" rx="3" fill={p.monolith || "#151515"} />
        <rect x="396" y="280" width="4" height="34" rx="2" fill={p.sun} opacity="0.85" />
        <circle cx="398" cy="252" r="3" fill={p.sun} opacity="0.9" />

        {speechText && (
          <g>
            <rect
              x="32"
              y="28"
              width="345"
              height="60"
              rx="18"
              fill="#F5EFE6"
              stroke="rgba(0,0,0,0.12)"
              strokeWidth="1.5"
            />
            <text
              x="54"
              y="65"
              fill="#181818"
              fontSize="22"
              fontFamily="Inter, sans-serif"
              fontWeight="700"
            >
              {speechText}
            </text>
          </g>
        )}
        {subCaption && (
          <g>
            <rect x="32" y="382" width="736" height="44" rx="8" fill="rgba(10, 10, 10, 0.78)" />
            <text
              x="52"
              y="410"
              fill="#EAEAEA"
              fontSize="17"
              fontFamily="Inter, sans-serif"
              fontWeight="500"
            >
              {subCaption}
            </text>
          </g>
        )}
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 300 450"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`sky-p-${uid}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={p.skyTop} />
          <stop offset="100%" stopColor={p.skyBottom} />
        </linearGradient>
        <radialGradient id={`halo-p-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={p.sun} stopOpacity="0.46" />
          <stop offset="100%" stopColor={p.sun} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="300" height="450" fill={`url(#sky-p-${uid})`} />

      {/* Subtle stars */}
      <g opacity="0.4">
        <circle cx="46" cy="58" r="1.2" fill="#FFFFFF" />
        <circle cx="94" cy="40" r="1.5" fill="#FFFFFF" />
        <circle cx="136" cy="76" r="1.1" fill="#FFFFFF" />
        <polyline
          points="46,58 94,40 136,76"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="0.6"
          strokeDasharray="2 2"
        />
      </g>

      {/* Sun/Moon corona & orbital ring */}
      <circle cx="208" cy="115" r="88" fill={`url(#halo-p-${uid})`} />
      <circle
        cx="208"
        cy="115"
        r="58"
        fill="none"
        stroke={p.sun}
        strokeWidth="0.75"
        strokeDasharray="4 4"
        opacity="0.35"
      />
      <circle cx="208" cy="115" r="45" fill={p.sun} opacity="0.95" />

      {/* Distant peak layer */}
      <polygon
        points="0,335 60,230 145,320 235,240 300,310 300,450 0,450"
        fill={p.skyBottom}
        opacity="0.5"
      />

      {/* Foreground peaks with rim lighting */}
      <polygon points="0,375 95,176 205,375 205,450 0,450" fill={p.peakLeft} />
      <polygon points="95,176 122,225 95,375" fill={p.sun} opacity="0.08" />
      <polygon points="105,375 215,212 300,360 300,450 105,450" fill={p.peakRight} />

      {/* Monolith & glowing beacon core */}
      <rect x="142" y="272" width="14" height="96" rx="2" fill={p.monolith || "#161616"} />
      <rect x="148" y="282" width="2.5" height="26" rx="1" fill={p.sun} opacity="0.88" />
    </svg>
  );
}

/**
 * Interactive 3D Pointer-Tracking Handler for Media Cards
 */
function useCardTilt() {
  const handleMouseMove = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = x / rect.width;
    const py = y / rect.height;
    const rx = ((0.5 - py) * 7).toFixed(2);
    const ry = ((px - 0.5) * 7).toFixed(2);
    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
    el.style.setProperty("--gx", `${Math.round(px * 100)}%`);
    el.style.setProperty("--gy", `${Math.round(py * 100)}%`);
  };

  const handleMouseLeave = (e) => {
    const el = e.currentTarget;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return { handleMouseMove, handleMouseLeave };
}

/**
 * Accessible Modal Dialog
 */
export function Modal({ isOpen, onClose, title, children, maxWidth = "640px" }) {
  useEffect(() => {
    if (!isOpen) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="ms-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ms-modal" style={{ maxWidth }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginBottom: "18px",
            paddingBottom: "12px",
            borderBottom: "1px solid var(--ms-border)",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>{title}</h3>
          <button
            type="button"
            className="ms-icon-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Horizontal Content Carousel with Prev/Next Controls & Mouse/Touch Drag-to-Scroll
 */
export function ContentCarousel({ title, subtitle, onViewAll, viewAllLabel = "View All", children }) {
  const railRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
    movedDistance: 0,
  });

  const scrollByAmount = (dir) => {
    if (!railRef.current) return;
    const amount = Math.max(railRef.current.clientWidth * 0.72, 320);
    railRef.current.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0 || !railRef.current) return;
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: railRef.current.scrollLeft,
      movedDistance: 0,
    };
  };

  const handleMouseMove = (e) => {
    if (!dragStateRef.current.active || !railRef.current) return;
    const dx = e.clientX - dragStateRef.current.startX;
    dragStateRef.current.movedDistance = Math.max(
      dragStateRef.current.movedDistance,
      Math.abs(dx)
    );
    if (dragStateRef.current.movedDistance > 6) {
      if (!isDragging) setIsDragging(true);
      e.preventDefault();
      railRef.current.scrollLeft = dragStateRef.current.scrollLeft - dx * 1.25;
    }
  };

  const stopDragging = () => {
    if (!dragStateRef.current.active) return;
    dragStateRef.current.active = false;
    if (isDragging) {
      setIsDragging(false);
    }
  };

  const handleClickCapture = (e) => {
    // Prevent accidental card popup click when the user just dragged the carousel horizontally
    if (dragStateRef.current.movedDistance > 8) {
      e.stopPropagation();
      e.preventDefault();
      dragStateRef.current.movedDistance = 0;
    }
  };

  return (
    <section className="ms-section">
      <div className="ms-section-header">
        <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap" }}>
          <h2 className="ms-section-title">{title}</h2>
          {subtitle && <span className="ms-section-subtitle">{subtitle}</span>}
        </div>
        {onViewAll && (
          <button type="button" className="ms-view-all-btn" onClick={onViewAll}>
            {viewAllLabel} <ChevronRight size={15} />
          </button>
        )}
      </div>
      <div className="ms-rail-wrapper">
        <button
          type="button"
          className="ms-rail-arrow is-left"
          onClick={() => scrollByAmount(-1)}
          aria-label={`Scroll ${title} left`}
        >
          <ChevronLeft size={20} />
        </button>
        <div
          className={`ms-rail ${isDragging ? "is-dragging" : ""}`}
          ref={railRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDragging}
          onMouseLeave={stopDragging}
          onClickCapture={handleClickCapture}
          onDragStart={(e) => e.preventDefault()}
        >
          {children}
        </div>
        <button
          type="button"
          className="ms-rail-arrow is-right"
          onClick={() => scrollByAmount(1)}
          aria-label={`Scroll ${title} right`}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
}

/**
 * Cinematic Hero Banner with Dynamic Ambient Color Halo, Auto-Rotation & Horizontal Drag-to-Swipe
 */
export function HeroBanner({
  items = [],
  activeIndex = 0,
  onSelectIndex,
  onPrimaryAction,
  onSecondaryAction,
  onToggleList,
  isInList,
  mediaType = "movie",
}) {
  const item = items[activeIndex] || items[0];
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [isDraggingHero, setIsDraggingHero] = useState(false);
  const heroDragRef = useRef({
    active: false,
    startX: 0,
    deltaX: 0,
  });

  useEffect(() => {
    if (items.length <= 1 || !onSelectIndex || isDraggingHero) return;
    const timer = setInterval(() => {
      onSelectIndex((activeIndex + 1) % items.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [items.length, activeIndex, onSelectIndex, isDraggingHero]);

  if (!item) return null;

  const isMovie = mediaType === "movie" || Boolean(item.runtime);
  const ambientGlow = item.palette?.sun ? `${item.palette.sun}38` : "rgba(229, 9, 20, 0.2)";

  const goPrevSlide = () => {
    if (!onSelectIndex || items.length <= 1) return;
    onSelectIndex((activeIndex - 1 + items.length) % items.length);
  };

  const goNextSlide = () => {
    if (!onSelectIndex || items.length <= 1) return;
    onSelectIndex((activeIndex + 1) % items.length);
  };

  const handleHeroPointerDown = (e) => {
    if (e.target.closest("button")) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    heroDragRef.current = {
      active: true,
      startX: clientX,
      deltaX: 0,
    };
    setIsDraggingHero(true);
  };

  const handleHeroPointerMove = (e) => {
    if (!heroDragRef.current.active) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const dx = clientX - heroDragRef.current.startX;
    heroDragRef.current.deltaX = dx;
    setDragOffsetX(Math.max(-180, Math.min(180, dx * 0.45)));
  };

  const handleHeroPointerUp = () => {
    if (!heroDragRef.current.active) return;
    const dx = heroDragRef.current.deltaX;
    heroDragRef.current.active = false;
    setIsDraggingHero(false);
    setDragOffsetX(0);

    if (items.length > 1 && onSelectIndex) {
      if (dx <= -55) {
        goNextSlide();
      } else if (dx >= 55) {
        goPrevSlide();
      }
    }
  };

  return (
    <section
      className={`ms-hero ${isDraggingHero ? "is-dragging" : ""}`}
      aria-label="Featured title — drag left or right to switch"
      style={{ "--hero-glow": ambientGlow }}
      onMouseDown={handleHeroPointerDown}
      onMouseMove={handleHeroPointerMove}
      onMouseUp={handleHeroPointerUp}
      onMouseLeave={handleHeroPointerUp}
      onTouchStart={handleHeroPointerDown}
      onTouchMove={handleHeroPointerMove}
      onTouchEnd={handleHeroPointerUp}
      onDragStart={(e) => e.preventDefault()}
    >
      <div
        className="ms-hero-artwork"
        style={
          dragOffsetX !== 0
            ? { transform: `translateX(${dragOffsetX * 0.55}px) scale(1.03)` }
            : undefined
        }
      >
        <HorizonArtwork palette={item.palette} aspect="wide" />
      </div>
      <div className="ms-hero-scrim" />
      <div
        className="ms-hero-content"
        key={item.id}
        style={
          dragOffsetX !== 0
            ? {
                transform: `translateX(${dragOffsetX}px)`,
                opacity: Math.max(0.55, 1 - Math.abs(dragOffsetX) / 320),
              }
            : undefined
        }
      >
        <div className="ms-hero-meta">
          {isMovie ? (
            <>
              <span className="ms-badge ms-badge-gold">IMDb</span>
              <span style={{ color: "#E50914", fontWeight: 800 }}>★ {item.rating}</span>
              <span>•</span>
              <span>{item.year}</span>
              <span>•</span>
              <span>{item.runtime}</span>
              <span>•</span>
              <span>{item.genres?.slice(0, 2).join(" / ")}</span>
            </>
          ) : (
            <>
              <span className="ms-badge ms-badge-red">{item.type}</span>
              <span style={{ color: "#E50914", fontWeight: 800 }}>★ {item.rating}</span>
              <span>•</span>
              <span>{item.status}</span>
              <span>•</span>
              <span>{item.chapterCount} Chapters</span>
              <span>•</span>
              <span>{item.genres?.slice(0, 2).join(" / ")}</span>
            </>
          )}
        </div>
        <h1 className="ms-hero-title">{item.title}</h1>
        <p className="ms-hero-synopsis">{item.shortSynopsis || item.synopsis}</p>
        <div className="ms-hero-actions">
          <button
            type="button"
            className="ms-btn ms-btn-primary ms-hero-pill-btn"
            onClick={() => onPrimaryAction(item)}
          >
            {isMovie ? <Play size={16} fill="currentColor" /> : <BookOpen size={16} />}
            {isMovie ? "Watch" : "Read Now"}
          </button>
          {onToggleList && (
            <button
              type="button"
              className="ms-btn ms-btn-secondary ms-hero-pill-btn"
              onClick={() => onToggleList(isMovie ? "movie" : "series", item.id)}
            >
              {isInList ? <Check size={16} /> : <Plus size={16} />}
              {isInList ? "In My List" : "Add to List"}
            </button>
          )}
          {onSecondaryAction && (
            <button
              type="button"
              className="ms-btn ms-btn-secondary ms-hero-pill-btn"
              onClick={() => onSecondaryAction(item)}
            >
              <Info size={16} />
              More Info
            </button>
          )}
        </div>
      </div>

      {items.length > 1 && onSelectIndex && (
        <div className="ms-hero-Pagination" role="tablist" aria-label="Featured items">
          {items.map((entry, idx) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={idx === activeIndex}
              aria-label={`Feature ${entry.title}`}
              className={`ms-hero-dot ${idx === activeIndex ? "is-active" : ""}`}
              onClick={() => onSelectIndex(idx)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Movie Poster Card (2:3) with 3D Interactive Tilt, Glare & Optional Top-10 Outlined Numeral
 */
export function MovieCard({
  movie,
  onOpenDetails,
  onPlay,
  onToggleList,
  isInList,
  rankNumber = null,
}) {
  const { handleMouseMove, handleMouseLeave } = useCardTilt();
  const cardGlow = movie.palette?.sun ? `${movie.palette.sun}48` : "rgba(229, 9, 20, 0.28)";

  return (
    <article
      className={`ms-card ${rankNumber ? "has-rank" : ""}`}
      style={{ "--card-glow": cardGlow }}
    >
      {rankNumber && (
        <span className="ms-rank-numeral" aria-hidden="true">
          {rankNumber}
        </span>
      )}
      <div
        className="ms-card-poster-wrap"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => onOpenDetails(movie.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenDetails(movie.id);
          }
        }}
        aria-label={`Open details for ${movie.title}`}
      >
        <HorizonArtwork palette={movie.palette} aspect="poster" />
        <div className="ms-card-badges">
          <span className="ms-badge">{movie.year}</span>
          <span className="ms-badge ms-badge-green">★ {movie.rating}</span>
        </div>
        <div className="ms-card-overlay">
          <div className="ms-card-drawer">
            <div style={{ fontSize: "0.76rem", color: "#E2E2E2", fontWeight: 600 }}>
              {movie.genres?.slice(0, 2).join(" • ")} • {movie.runtime}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                className="ms-btn ms-btn-primary ms-btn-sm"
                style={{ flex: 1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetails(movie.id);
                }}
              >
                <Info size={13} />
                More Info
              </button>
              <button
                type="button"
                className="ms-icon-btn"
                style={{ width: "32px", height: "32px" }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (movie.availability?.canStream) onPlay(movie.id);
                  else onOpenDetails(movie.id);
                }}
                aria-label={`Play ${movie.title}`}
                title="Watch Now"
              >
                <Play size={13} fill="currentColor" />
              </button>
              <button
                type="button"
                className="ms-icon-btn"
                style={{ width: "32px", height: "32px" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleList("movie", movie.id);
                }}
                aria-label={
                  isInList
                    ? `Remove ${movie.title} from My List`
                    : `Add ${movie.title} to My List`
                }
                title={isInList ? "In My List" : "Add to My List"}
              >
                {isInList ? <Check size={14} /> : <Plus size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>
      <h3 className="ms-card-title" onClick={() => onOpenDetails(movie.id)}>
        {movie.title}
      </h3>
      <div className="ms-card-sub">
        <span>{movie.genres?.[0]}</span>
        <span>•</span>
        <span>{movie.originalLanguage}</span>
      </div>
    </article>
  );
}

/**
 * Manga / Manhwa Cover Card (2:3) with 3D Interactive Tilt & Glare
 */
export function MangaCoverCard({
  series,
  onOpenDetails,
  onRead,
  onToggleList,
  isInList,
}) {
  const { handleMouseMove, handleMouseLeave } = useCardTilt();
  const firstChapterId =
    series.chapters?.[series.chapters.length - 1]?.id || series.chapters?.[0]?.id;
  const cardGlow = series.palette?.sun ? `${series.palette.sun}48` : "rgba(229, 9, 20, 0.28)";

  return (
    <article className="ms-card" style={{ "--card-glow": cardGlow }}>
      <div
        className="ms-card-poster-wrap"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => onOpenDetails(series.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenDetails(series.id);
          }
        }}
        aria-label={`Open series details for ${series.title}`}
      >
        <HorizonArtwork palette={series.palette} aspect="poster" />
        <div className="ms-card-badges">
          <span className={`ms-badge ${series.type === "Manhwa" ? "ms-badge-red" : ""}`}>
            {series.type}
          </span>
          <span className="ms-badge">{series.status}</span>
        </div>
        <div className="ms-card-overlay">
          <div className="ms-card-drawer">
            <div style={{ fontSize: "0.76rem", color: "#E2E2E2", fontWeight: 600 }}>
              {series.latestChapterLabel} • ★ {series.rating}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                className="ms-btn ms-btn-primary ms-btn-sm"
                style={{ flex: 1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetails(series.id);
                }}
              >
                <Info size={13} />
                More Info
              </button>
              <button
                type="button"
                className="ms-icon-btn"
                style={{ width: "32px", height: "32px" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onRead(series.id, firstChapterId);
                }}
                aria-label={`Read ${series.title}`}
                title="Read Now"
              >
                <BookOpen size={13} />
              </button>
              <button
                type="button"
                className="ms-icon-btn"
                style={{ width: "32px", height: "32px" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleList("series", series.id);
                }}
                aria-label={
                  isInList
                    ? `Remove ${series.title} from My List`
                    : `Add ${series.title} to My List`
                }
                title={isInList ? "In My List" : "Add to My List"}
              >
                {isInList ? <Check size={14} /> : <Plus size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>
      <h3 className="ms-card-title" onClick={() => onOpenDetails(series.id)}>
        {series.title}
      </h3>
      <div className="ms-card-sub">
        <span>{series.latestChapterLabel}</span>
        <span>•</span>
        <span>{series.genres?.[0]}</span>
      </div>
    </article>
  );
}

/**
 * Continue Watching Card (16:9 Landscape with Red Progress Bar)
 */
export function ContinueWatchingCard({ item, movie, onResume, onOpenDetails, onRemove }) {
  if (!movie) return null;
  const pct = Math.min(
    100,
    Math.max(6, Math.round((item.positionSec / (item.durationSec || 75)) * 100))
  );
  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <article
      className="ms-continue-card"
      onClick={() => onOpenDetails(movie.id)}
      style={{ cursor: "pointer" }}
    >
      <div
        className="ms-continue-thumb"
        onClick={(e) => {
          e.stopPropagation();
          onResume(movie.id);
        }}
      >
        <HorizonArtwork palette={movie.palette} aspect="wide" />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.76) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span className="ms-continue-play-ring">
            <Play size={18} fill="currentColor" />
          </span>
        </div>
        <span
          className="ms-badge"
          style={{ position: "absolute", bottom: "8px", right: "8px" }}
        >
          {formatTime(item.positionSec)} / {formatTime(item.durationSec)}
        </span>
      </div>
      <div className="ms-progress-track" aria-label={`${pct}% watched`}>
        <div className="ms-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="ms-continue-body">
        <div style={{ minWidth: 0 }}>
          <h4
            style={{
              margin: 0,
              fontSize: "0.94rem",
              fontWeight: 700,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              cursor: "pointer",
            }}
            onClick={() => onOpenDetails(movie.id)}
          >
            {movie.title}
          </h4>
          <span style={{ fontSize: "0.78rem", color: "var(--ms-text-secondary)" }}>
            {pct}% watched • {item.updatedLabel}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            className="ms-icon-btn"
            style={{ width: "32px", height: "32px" }}
            onClick={() => onOpenDetails(movie.id)}
            aria-label={`Details for ${movie.title}`}
            title="Movie Details"
          >
            <Info size={14} />
          </button>
          <button
            type="button"
            className="ms-icon-btn"
            style={{ width: "32px", height: "32px" }}
            onClick={() => onRemove(movie.id)}
            aria-label={`Remove ${movie.title} from Continue Watching`}
            title="Remove from row"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}

/**
 * Continue Reading Card (16:9 Landscape with Red Progress Bar)
 */
export function ContinueReadingCard({ item, series, onResume, onOpenDetails, onRemove }) {
  if (!series) return null;
  const pct = Math.min(
    100,
    Math.max(10, Math.round((item.pageIndex / (item.totalPages || 6)) * 100))
  );

  return (
    <article
      className="ms-continue-card"
      onClick={() => onOpenDetails(series.id)}
      style={{ cursor: "pointer" }}
    >
      <div
        className="ms-continue-thumb"
        onClick={(e) => {
          e.stopPropagation();
          onResume(series.id, item.chapterId);
        }}
      >
        <HorizonArtwork palette={series.palette} aspect="wide" />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.78) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              padding: "8px 16px",
              borderRadius: "999px",
              background: "rgba(229, 9, 20, 0.92)",
              border: "1px solid rgba(255,255,255,0.28)",
              boxShadow: "0 6px 18px rgba(229, 9, 20, 0.5)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "#FFF",
              fontSize: "0.8rem",
              fontWeight: 700,
            }}
          >
            <BookOpen size={14} /> Resume Page {item.pageIndex}
          </span>
        </div>
        <span
          className="ms-badge"
          style={{ position: "absolute", bottom: "8px", right: "8px" }}
        >
          Page {item.pageIndex} / {item.totalPages}
        </span>
      </div>
      <div className="ms-progress-track" aria-label={`${pct}% read`}>
        <div className="ms-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="ms-continue-body">
        <div style={{ minWidth: 0 }}>
          <h4
            style={{
              margin: 0,
              fontSize: "0.94rem",
              fontWeight: 700,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              cursor: "pointer",
            }}
            onClick={() => onOpenDetails(series.id)}
          >
            {series.title}
          </h4>
          <span
            style={{
              fontSize: "0.78rem",
              color: "var(--ms-text-secondary)",
              display: "block",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.chapterLabel}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            className="ms-icon-btn"
            style={{ width: "32px", height: "32px" }}
            onClick={() => onOpenDetails(series.id)}
            aria-label={`Details for ${series.title}`}
            title="Series Details"
          >
            <Info size={14} />
          </button>
          <button
            type="button"
            className="ms-icon-btn"
            style={{ width: "32px", height: "32px" }}
            onClick={() => onRemove(series.id)}
            aria-label={`Remove ${series.title} from Continue Reading`}
            title="Remove from row"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}

/**
 * Reusable Application State Box (Empty, No Results, Error, Offline)
 */
export function StateFeedbackBox({
  icon = "empty",
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) {
  const renderIcon = () => {
    if (icon === "offline") return <WifiOff size={36} color="#F59E0B" />;
    if (icon === "error") return <AlertTriangle size={36} color="#EF4444" />;
    if (icon === "search") return <Search size={36} color="var(--ms-text-secondary)" />;
    if (icon === "sparkles") return <Sparkles size={36} color="var(--ms-primary)" />;
    return <Film size={36} color="var(--ms-text-secondary)" />;
  };

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #1B1B1B 0%, #151515 100%)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "var(--ms-radius-lg)",
        padding: "44px 24px",
        textAlign: "center",
        maxWidth: "560px",
        margin: "24px auto",
        boxShadow: "var(--ms-shadow-sm)",
      }}
    >
      <div
        style={{
          width: "68px",
          height: "68px",
          borderRadius: "50%",
          background: "var(--ms-elevated)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
        }}
      >
        {renderIcon()}
      </div>
      <h3 style={{ margin: "0 0 8px", fontSize: "1.25rem", fontWeight: 700 }}>{title}</h3>
      <p style={{ margin: "0 auto 22px", color: "var(--ms-text-secondary)", maxWidth: "46ch" }}>
        {description}
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
        {actionLabel && onAction && (
          <button type="button" className="ms-btn ms-btn-primary" onClick={onAction}>
            {actionLabel}
          </button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <button type="button" className="ms-btn ms-btn-secondary" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Netflix-Style Glassmorphism Full-Details Modal
 * Opens when clicking any Movie or Manga/Manhwa card. Self-contained and scrollable
 * with full details (Where to Watch, Cast & Crew, Trailer & Scene Stills, Chapters, Specs, and More Like This).
 */
export function ContentPreviewModal({
  previewItem,
  onClose,
  onPlayMovie,
  onDownloadMovie,
  onReadChapter,
  onDownloadChapter,
  onToggleList,
  isInList,
  autoStatus = null,
  allMovies = [],
  allSeries = [],
  chapterStatuses = {},
  onSelectPreviewItem,
}) {
  const [chapterSort, setChapterSort] = useState("desc");
  const [trailerPlayingId, setTrailerPlayingId] = useState(null);
  const modalScrollRef = useRef(null);

  useEffect(() => {
    if (!previewItem) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }

    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [previewItem, onClose]);

  if (!previewItem) return null;

  const { kind, data } = previewItem;
  const trailerPlaying = trailerPlayingId === data.id;
  const isMovie = kind === "movie";
  const inList = isInList(isMovie ? "movie" : "series", data.id);
  const glowColor = data.palette?.sun ? `${data.palette.sun}45` : "rgba(229, 9, 20, 0.28)";
  const firstChapter = !isMovie
    ? data.chapters?.[data.chapters.length - 1] || data.chapters?.[0]
    : null;

  const sortedChapters = !isMovie
    ? [...(data.chapters || [])].sort((a, b) =>
        chapterSort === "desc" ? b.number - a.number : a.number - b.number
      )
    : [];

  const relatedItems = isMovie
    ? allMovies
        .filter(
          (m) => m.id !== data.id && m.genres?.some((g) => data.genres?.includes(g))
        )
        .slice(0, 4)
    : allSeries
        .filter(
          (s) => s.id !== data.id && s.genres?.some((g) => data.genres?.includes(g))
        )
        .slice(0, 4);

  return (
    <div
      className="ms-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${data.title} details`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ms-preview-modal"
        ref={modalScrollRef}
        style={{ "--preview-glow": glowColor }}
      >
        <div className="ms-preview-close-wrap">
          <button
            type="button"
            className="ms-preview-close"
            onClick={onClose}
            aria-label="Close details"
          >
            <X size={18} />
          </button>
        </div>

        {/* 16:9 Cinematic Backdrop Header */}
        <div className="ms-preview-banner">
          <HorizonArtwork palette={data.palette} aspect="wide" />
          <div className="ms-preview-banner-scrim" />

          <div className="ms-preview-banner-content">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
              <span className="ms-badge ms-badge-red">
                {isMovie ? "MOVIE" : data.type?.toUpperCase()}
              </span>
              <span className="ms-badge ms-badge-green">★ {data.rating}</span>
              <span className="ms-badge">
                {isMovie ? data.year : `${data.status} • ${data.chapterCount} Chapters`}
              </span>
              {isMovie && data.maturityRating && (
                <span className="ms-badge">{data.maturityRating}</span>
              )}
              {autoStatus && (
                <span
                  className={`ms-badge ${
                    autoStatus === "Watched" || autoStatus === "Completed"
                      ? "ms-badge-green"
                      : autoStatus === "Watching" || autoStatus === "Reading"
                      ? "ms-badge-red"
                      : ""
                  }`}
                >
                  {autoStatus}
                </span>
              )}
            </div>

            <h2
              style={{
                margin: "0 0 14px",
                fontSize: "clamp(1.85rem, 3.8vw, 2.75rem)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                textTransform: "uppercase",
                textShadow: "0 8px 26px rgba(0,0,0,0.88)",
              }}
            >
              {data.title}
            </h2>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
              {isMovie ? (
                <>
                  <button
                    type="button"
                    className="ms-btn ms-btn-primary"
                    disabled={!data.availability?.canStream}
                    onClick={() => {
                      onClose();
                      onPlayMovie(data.id);
                    }}
                  >
                    <Play size={16} fill="currentColor" />
                    {data.availability?.canStream ? "Watch Now" : "Streaming Unavailable"}
                  </button>

                  {data.availability?.canDownload && (
                    <button
                      type="button"
                      className="ms-btn ms-btn-secondary"
                      onClick={() => onDownloadMovie(data)}
                    >
                      <Download size={16} />
                      Download ({data.availability?.sizeLabel})
                    </button>
                  )}

                  <button
                    type="button"
                    className="ms-btn ms-btn-secondary"
                    onClick={() =>
                      setTrailerPlayingId((prev) => (prev === data.id ? null : data.id))
                    }
                  >
                    <Film size={16} />
                    {trailerPlaying ? "Hide Trailer" : "Watch Trailer"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="ms-btn ms-btn-primary"
                  onClick={() => {
                    onClose();
                    onReadChapter(data.id, firstChapter?.id);
                  }}
                >
                  <BookOpen size={16} />
                  Read Now ({firstChapter?.numberLabel || "Chapter 1"})
                </button>
              )}

              <button
                type="button"
                className="ms-btn ms-btn-secondary"
                onClick={() => onToggleList(isMovie ? "movie" : "series", data.id)}
              >
                {inList ? <Check size={16} /> : <Plus size={16} />}
                {inList ? "In My List" : "+ My List"}
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Glassmorphism Body with Generous Breathing Room */}
        <div className="ms-preview-body">
          {/* Overview & Quick Specs Row (60/40 proportion with generous 36px gap) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "36px",
              alignItems: "start",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "0.94rem",
                  color: "var(--ms-text-secondary)",
                  marginBottom: "16px",
                }}
              >
                <span style={{ color: "#86EFAC", fontWeight: 700 }}>98% Match</span>
                <span>•</span>
                <span>{isMovie ? data.runtime : data.readingFormat}</span>
                <span>•</span>
                <span>{data.genres?.join(" / ")}</span>
              </div>
              <p
                style={{
                  margin: "0 0 16px",
                  color: "#F3F3F3",
                  fontSize: "1.05rem",
                  lineHeight: 1.75,
                }}
              >
                {data.synopsis}
              </p>
              {isMovie && data.originalTitle && data.originalTitle !== data.title && (
                <div style={{ fontSize: "0.86rem", color: "var(--ms-text-muted)" }}>
                  Original Title: <strong style={{ color: "#D4D4D4" }}>{data.originalTitle}</strong> • Release Date: {data.releaseDate}
                </div>
              )}
              {!isMovie && data.alternateTitles?.length > 0 && (
                <div style={{ fontSize: "0.86rem", color: "var(--ms-text-muted)" }}>
                  Alternate Titles: <strong style={{ color: "#D4D4D4" }}>{data.alternateTitles.join(" • ")}</strong>
                </div>
              )}
            </div>

            <div
              className="ms-preview-glass-card"
              style={{
                padding: "22px 24px",
                fontSize: "0.9rem",
                lineHeight: 1.6,
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {isMovie ? (
                <>
                  <div>
                    <span style={{ color: "var(--ms-text-muted)", display: "block", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Director</span>
                    <strong style={{ fontSize: "0.98rem" }}>{data.director}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--ms-text-muted)", display: "block", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cast</span>
                    <span>{data.cast?.map((c) => c.name).join(", ")}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--ms-text-muted)", display: "block", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Audio & Subtitles</span>
                    <span>{data.originalLanguage} (5.1) • English & Filipino / Tagalog CC</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--ms-text-muted)", display: "block", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Format</span>
                    <span>
                      {data.availability?.resolution || "1080p Full HD"} • {data.availability?.statusText}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span style={{ color: "var(--ms-text-muted)", display: "block", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Author & Artist</span>
                    <strong style={{ fontSize: "0.98rem" }}>{data.author} • {data.artist}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--ms-text-muted)", display: "block", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Latest Update</span>
                    <span>
                      {data.latestChapterLabel} ({data.updatedLabel})
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "var(--ms-text-muted)", display: "block", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Reader Modes</span>
                    <span>
                      {data.readingFormat} • Default {data.readingDirection}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Inline Trailer Player Preview when toggled */}
          {isMovie && trailerPlaying && (
            <div
              className="ms-preview-glass-card"
              style={{ padding: "18px", overflow: "hidden" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "0.96rem" }}>
                  {data.trailer?.title || `${data.title} — Official Trailer`}
                </div>
                <span className="ms-badge">
                  {data.trailer?.duration || "2:14"} • {data.trailer?.aspect || "2.39:1"}
                </span>
              </div>
              <div
                style={{
                  width: "100%",
                  aspectRatio: "16 / 9",
                  maxHeight: "260px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <HorizonArtwork palette={data.palette} aspect="wide" />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(0,0,0,0.42)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <p style={{ margin: "0 0 12px", maxWidth: "46ch", fontSize: "0.9rem", color: "#EFEFEF" }}>
                    {data.trailer?.summary}
                  </p>
                  <button
                    type="button"
                    className="ms-btn ms-btn-primary ms-btn-sm"
                    onClick={() => {
                      onClose();
                      onPlayMovie(data.id);
                    }}
                  >
                    <Play size={14} fill="currentColor" /> Launch Full Movie Player
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MOVIE DETAILS SECTIONS: Scene Chapters, Cast & Crew */}
          {isMovie && (
            <>
              {/* Scene Chapters & Stills */}
              <div>
                <h3 style={{ margin: "0 0 16px", fontSize: "1.2rem", fontWeight: 800 }}>
                  Scene Chapters & Stills
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                    gap: "16px",
                  }}
                >
                  {[
                    {
                      label: "Act I • The Frontier Relay",
                      time: "00:00",
                      desc: "Opening aerial sequence across the western ridge.",
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
                      className="ms-preview-glass-card is-interactive"
                      style={{ overflow: "hidden", cursor: "pointer" }}
                      onClick={() => {
                        onClose();
                        onPlayMovie(data.id);
                      }}
                    >
                      <div style={{ width: "100%", aspectRatio: "16 / 9", position: "relative" }}>
                        <HorizonArtwork palette={data.palette} aspect="wide" />
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
                          Act {idx + 1}
                        </span>
                      </div>
                      <div style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.94rem", marginBottom: "4px" }}>
                          {scene.label}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--ms-text-secondary)", lineHeight: 1.5 }}>
                          {scene.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cast & Crew Grid */}
              <div>
                <h3 style={{ margin: "0 0 16px", fontSize: "1.2rem", fontWeight: 800 }}>
                  Cast & Crew
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                    gap: "14px",
                  }}
                >
                  <div className="ms-preview-glass-card" style={{ padding: "16px 18px" }}>
                    <div style={{ fontSize: "0.72rem", color: "var(--ms-primary)", fontWeight: 800, letterSpacing: "0.05em" }}>
                      DIRECTOR
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.98rem", marginTop: "4px" }}>
                      {data.director}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--ms-text-secondary)", marginTop: "2px" }}>
                      Principal Director
                    </div>
                  </div>
                  {data.cast?.map((member) => (
                    <div
                      key={member.id}
                      className="ms-preview-glass-card"
                      style={{ padding: "16px 18px" }}
                    >
                      <div style={{ fontSize: "0.72rem", color: "var(--ms-text-muted)", fontWeight: 700, letterSpacing: "0.05em" }}>
                        {member.role.toUpperCase()}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "0.98rem", marginTop: "4px" }}>
                        {member.name}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--ms-text-secondary)", marginTop: "2px" }}>
                        as {member.character}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* SERIES DETAILS SECTIONS: Full Sortable Chapter List with Thumbnails & Downloads */}
          {!isMovie && sortedChapters.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  marginBottom: "12px",
                }}
              >
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>
                  Chapters ({sortedChapters.length})
                </h3>
                <select
                  className="ms-select"
                  style={{ padding: "6px 10px", fontSize: "0.8rem" }}
                  value={chapterSort}
                  onChange={(e) => setChapterSort(e.target.value)}
                  aria-label="Sort chapters"
                >
                  <option value="desc">Latest first</option>
                  <option value="asc">Oldest first</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {sortedChapters.map((ch) => {
                  const st = chapterStatuses[ch.id] || ch.defaultStatus || "Unread";
                  return (
                    <div
                      key={ch.id}
                      className="ms-preview-glass-card is-interactive"
                      style={{
                        padding: "12px 14px",
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        onClose();
                        onReadChapter(data.id, ch.id);
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div
                          style={{
                            width: "84px",
                            height: "50px",
                            borderRadius: "6px",
                            overflow: "hidden",
                            flexShrink: 0,
                          }}
                        >
                          <HorizonArtwork palette={ch.palette || data.palette} aspect="wide" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "0.98rem" }}>
                            {ch.numberLabel} — {ch.title}
                          </div>
                          <div style={{ fontSize: "0.78rem", color: "var(--ms-text-secondary)" }}>
                            {ch.dateLabel} • {ch.pageCount} pages
                          </div>
                        </div>
                      </div>

                      <div
                        style={{ display: "flex", alignItems: "center", gap: "10px" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span
                          className={`ms-badge ${
                            st === "Read"
                              ? "ms-badge-green"
                              : st === "In progress"
                              ? "ms-badge-amber"
                              : ""
                          }`}
                        >
                          {st}
                        </span>
                        {onDownloadChapter && (
                          <button
                            type="button"
                            className="ms-icon-btn"
                            style={{ width: "32px", height: "32px" }}
                            onClick={() => onDownloadChapter(data, ch)}
                            aria-label={`Save ${ch.numberLabel} to Downloads`}
                            title="Save Chapter to Downloads"
                          >
                            <Download size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="ms-btn ms-btn-primary ms-btn-sm"
                          onClick={() => {
                            onClose();
                            onReadChapter(data.id, ch.id);
                          }}
                        >
                          Read
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* More Like This Grid Inside the Scrollable Pop-Up */}
          {relatedItems.length > 0 && (
            <div>
              <h3 style={{ margin: "0 0 16px", fontSize: "1.2rem", fontWeight: 800 }}>
                More Like This
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(195px, 1fr))",
                  gap: "16px",
                }}
              >
                {relatedItems.map((rel) => (
                  <div
                    key={rel.id}
                    className="ms-preview-glass-card is-interactive"
                    style={{ overflow: "hidden", cursor: "pointer" }}
                    onClick={() => {
                      if (onSelectPreviewItem) {
                        onSelectPreviewItem({
                          kind: isMovie ? "movie" : "series",
                          data: rel,
                        });
                      }
                    }}
                  >
                    <div style={{ width: "100%", aspectRatio: "16 / 9", position: "relative" }}>
                      <HorizonArtwork palette={rel.palette} aspect="wide" />
                      <span
                        className="ms-badge ms-badge-green"
                        style={{ position: "absolute", top: "8px", right: "8px" }}
                      >
                        ★ {rel.rating}
                      </span>
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.94rem", marginBottom: "4px" }}>
                        {rel.title}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--ms-text-secondary)" }}>
                        {isMovie ? `${rel.year} • ${rel.runtime}` : `${rel.type} • ${rel.latestChapterLabel}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
