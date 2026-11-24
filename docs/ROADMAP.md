# MovieShelf Backend Roadmap

Status: draft v1 · Last updated: 2026-11-25

This roadmap plans the backend that will replace the mock data in `src/data/` and the in-memory state in `src/MovieShelf.jsx`. Ticket codes use the `BE-xx` prefix to sit alongside the frontend's existing `FE-xx` codes.

---

## 1. Where the frontend stands today

The frontend is feature-complete as a prototype, but nothing persists and nothing talks to a server.

| Area | Current source | What the backend must replace |
|---|---|---|
| Movie catalog | `src/data/moviesData.js` (`MOVIES_DATA`, `MOVIE_GENRES`, `MOVIE_LANGUAGES`, `REGIONS`) | Catalog API, genres/languages/regions lookups |
| Subtitles | `SUBTITLE_CATALOG` in `moviesData.js` (cues inlined) | Subtitle search + track download |
| Where to Watch | `providersByRegion` on each movie | Regional provider lookup (cached) |
| Manga/Manhwa catalog | `src/data/mangaData.js` (`MANGA_SERIES` with nested `chapters` and `pages`) | Series, chapters, page manifests |
| My List | `INITIAL_MY_LIST` + `myList` state | Per-user library with statuses |
| Continue Watching / Reading | `INITIAL_CONTINUE_*` + state | Progress sync |
| Chapter read state | `chapterStatuses` state | Per-user chapter status |
| Watched movies | `watchedMovies` state | Derived from progress / history |
| Downloads | `INITIAL_MOVIE_DOWNLOADS`, `INITIAL_MANGA_DOWNLOADS`, fake `setTimeout` progress | Download entitlement + manifest; files stay on device |
| Search, browse, sort | Client-side `.filter()` / `.sort()` in `SharedPages.jsx`, `MoviePages.jsx`, `MangaPages.jsx` | Server-side search, filters, sorting, pagination |
| Routing | `route` string in state (`react-router-dom` is installed but unused) | Not backend work, but needed for deep links to API-backed pages |

Commitments already made to users in the UI that the backend must honor:

- **"No account sign-in is required"** (About page, FE-14). The backend must work for anonymous users. Accounts, if added, are optional and only for cross-device sync.
- **Local files never leave the device.** Local video files and imported SRT/WebVTT tracks in the Local Player must not be uploaded. The backend never receives them.
- **Attribution.** The footer cites TMDB-style metadata and OpenSubtitles-style subtitle discovery. If those real services are used, their attribution and terms apply (see §6).

---

## 2. Decisions to make before Phase 1

These change the shape of everything after them. Each needs an owner and a date.

1. **Content source.** The current catalog is fictional. Choose one:
   - (a) Keep a self-curated catalog (seeded from the mock data, edited through an admin tool), or
   - (b) Pull metadata from TMDB (movies) and a manga metadata source, cached locally.
   Recommendation: start with (a) so the frontend can integrate immediately, and design the schema with `tmdb_id` / `imdb_id` / external-ID columns so (b) can be layered on later.
2. **Media rights.** Streaming (`canStream`), downloads (`canDownload`), and hosted chapter pages require rights to the content. Until that is settled, the backend serves **metadata and links only**, and the player stays in local-file mode. Do not host or proxy copyrighted video or scans.
3. **Accounts.** Anonymous device ID only, or anonymous plus optional sign-in for sync. Recommendation: anonymous device ID in Phase 3, optional sign-in in Phase 3b.
4. **Stack.** Recommendation below; confirm or override.
5. **Unused dependencies.** `qrcode`, `react-simple-captcha`, and `fflate` are installed but not used anywhere in `src/`. Confirm what they were meant for (QR device pairing? captcha on a contact/report form? zipping chapter downloads?) so the backend can support it or the packages can be removed.

### Recommended stack

| Concern | Choice | Why |
|---|---|---|
| Runtime | Node.js 22 LTS + TypeScript | Same language as the frontend; one toolchain |
| HTTP framework | Fastify | Fast, built-in JSON-schema validation, good OpenAPI tooling |
| Database | PostgreSQL 16 | Relational data (lists, progress, chapters), full-text + `pg_trgm` search |
| ORM / migrations | Drizzle or Prisma | Typed queries, versioned migrations |
| Cache | Redis (optional until Phase 4) | Provider/TMDB response caching, rate limiting |
| Object storage | S3-compatible (only if Decision 2 allows hosted media) | Posters, page images, HLS segments |
| API contract | OpenAPI 3.1 in `server/openapi.yaml` | Frontend and backend agree on shapes before code |
| Tests | Vitest + Supertest | Matches the Vite ecosystem |

Proposed layout (monorepo, no file moves needed for the frontend):

```
MovieShelf/
├── src/            frontend (unchanged)
├── server/
│   ├── src/
│   │   ├── app.ts
│   │   ├── routes/      movies, series, search, library, subtitles, providers, downloads
│   │   ├── services/
│   │   ├── db/          schema, migrations, seed
│   │   └── lib/
│   ├── test/
│   ├── openapi.yaml
│   └── package.json
└── docs/
```

---

## 3. Phases

Each phase ends with something the frontend can actually switch over to.

### Phase 0 — Foundations (BE-01 to BE-05)

| Ticket | Work | Done when |
|---|---|---|
| BE-01 | Scaffold `server/` (Fastify + TS), `npm run dev:server`, shared ESLint config | `GET /health` returns `{ ok: true }` |
| BE-02 | Postgres via Docker Compose, migrations tool, `.env.example` | `npm run db:migrate` works on a clean machine |
| BE-03 | Vite dev proxy: `/api` → server (add `server.proxy` to `vite.config.js`) | Frontend can `fetch('/api/health')` in dev |
| BE-04 | OpenAPI skeleton + error format (`{ error: { code, message } }`), request IDs, CORS | Contract file reviewed by frontend owner |
| BE-05 | CI: lint, typecheck, test, migration check on every PR | Green pipeline on `main` |

### Phase 1 — Catalog API (BE-06 to BE-12)

Replace `moviesData.js` and `mangaData.js` with read-only endpoints. Seed the database from the existing mock files so the UI looks identical after the switch.

| Ticket | Work |
|---|---|
| BE-06 | Schema: `movies`, `people`, `movie_cast`, `genres`, `movie_genres`, `languages`, `regions` |
| BE-07 | Schema: `series`, `series_alt_titles`, `series_genres`, `chapters`, `chapter_pages` |
| BE-08 | Seed script that imports `MOVIES_DATA` and `MANGA_SERIES` (one-time, idempotent) |
| BE-09 | `GET /api/movies`, `GET /api/movies/:id` |
| BE-10 | `GET /api/series`, `GET /api/series/:id`, `GET /api/series/:id/chapters`, `GET /api/chapters/:id/pages` |
| BE-11 | `GET /api/meta/genres?type=movie|series`, `/api/meta/languages`, `/api/meta/regions` |
| BE-12 | Home/rail endpoints: `GET /api/home` (featured, trending, recent releases, regional picks, manhwa/manga rails) |

**Data-shape cleanup during the move** (agree with frontend before BE-09):

| Mock field | Problem | API shape |
|---|---|---|
| `ReleaseLabel`, `updatedLabel`, `dateLabel`, `requestedAt`, `addedAt: "Today"` | Display strings baked into data; capital-R `ReleaseLabel` is inconsistent | ISO 8601 timestamps; frontend formats "2 days ago" |
| `rating: "8.9"` | String; sorted with `parseFloat` | Number |
| `runtime: "1h 15m"` + `durationSec: 75` | Duplicated, and `durationSec` is a demo value | `runtimeMinutes` (number); real duration comes from the media file |
| `sizeLabel: "640 MB"` | String | `sizeBytes` (number) |
| `palette` objects | Placeholder art for the mock posters | Keep as optional `palette` until real artwork exists, then add `posterUrl`, `backdropUrl` |
| Chapter `pages: DEFAULT_READER_PAGES` | Every chapter shares one fake page set | Per-chapter page manifest (`/api/chapters/:id/pages`) |
| Chapter `defaultStatus` | User state stored on catalog data | Removed; comes from the library API (Phase 3) |
| Series `chapterCount`, `latestChapterLabel` | Can drift from the real chapter list | Computed by the server |
| `kicker`, `isFeatured`, `trendingRank`, `isRecentRelease` | Editorial flags | Move to a `featured_slots` / curation table so they can change without editing titles |

Frontend follow-up: add `src/api/` (a small fetch client) and swap imports page by page. Keep the mock files until every page is on the API, then delete them.

### Phase 2 — Search & Browse (BE-13 to BE-16)

| Ticket | Work |
|---|---|
| BE-13 | `GET /api/search?q=&scope=all|movies|series&sort=relevance|rating|year&page=` — Postgres full-text + `pg_trgm` for typo tolerance, searching title, original title, alternate titles, cast, director, author |
| BE-14 | `GET /api/search/suggest?q=` — fast top-N for the Quick Search / Ctrl+K box (FE-07); target < 100 ms |
| BE-15 | Browse filters: movies by genre, language, year, rating, sort `popularity|date|rating|az`; series by type (Manhwa/Manga), status (Ongoing/Completed/Hiatus), genre, sort `popularity|latest|az|chapters` — matching the existing dropdowns |
| BE-16 | Cursor or page-based pagination on every list endpoint |

### Phase 3 — Identity & Library Sync (BE-17 to BE-24)

This moves the business rules now in `MovieShelf.jsx` onto the server so they are the same on every device.

| Ticket | Work |
|---|---|
| BE-17 | Anonymous identity: server issues a device ID (HTTP-only cookie or bearer token) on first visit; no sign-in |
| BE-18 | Schema: `library_items`, `watch_progress`, `reading_progress`, `chapter_status` keyed by user/device |
| BE-19 | `GET/POST/DELETE /api/library` (My List) with `PATCH /api/library/:id` for manual status changes |
| BE-20 | `PUT /api/progress/movies/:movieId` `{ positionSec, durationSec }`; `GET /api/progress/movies` (Continue Watching); `DELETE` to dismiss |
| BE-21 | `PUT /api/progress/series/:seriesId` `{ chapterId, pageIndex, totalPages, mode }`; `GET /api/progress/series` (Continue Reading); `DELETE` to dismiss |
| BE-22 | Server-side status rules (below), with unit tests for each |
| BE-23 | Write batching: the player currently calls `onSaveProgress` every second; server accepts at most one write per title every ~10 s (frontend debounces, server rate-limits) |
| BE-24 | Local-first sync: frontend keeps state in IndexedDB/localStorage, syncs when online; server resolves conflicts by latest `updatedAt` |

**Phase 3b (optional):** email or OAuth sign-in that merges an anonymous device's library into an account, plus "sign out everywhere". Only build this if Decision 3 says so.

**Status rules to port (currently in `MovieShelf.jsx`):**

Movies — statuses: `Plan to Watch`, `Watching`, `Watched`
- Starting playback moves `Plan to Watch` → `Watching`.
- Saving progress at **≥ 90 %** of duration marks the movie `Watched` and removes it from Continue Watching.
- Saving progress below 90 % sets `Watching` unless already `Watched`.
- Adding to My List picks the initial status from history: watched → `Watched`; has progress → `Watching`; otherwise `Plan to Watch`.

Series — statuses: `Plan to Read`, `Reading`, `Completed`; chapter statuses: `Unread`, `In progress`, `Read`
- Opening a chapter sets it to `In progress` unless already `Read`, and moves the series from `Plan to Read` → `Reading`.
- Reaching the last page marks the chapter `Read`.
- When every chapter is `Read`, the series becomes `Completed` and leaves Continue Reading.
- Adding to My List: all chapters read → `Completed`; any progress → `Reading`; otherwise `Plan to Read`.

Open question for the team: when a new chapter is released for a `Completed` series, does it go back to `Reading`? The current code doesn't handle this.

### Phase 4 — Where to Watch & Trailers (BE-25 to BE-28)

| Ticket | Work |
|---|---|
| BE-25 | `GET /api/movies/:id/providers?region=PH` returning the `providersByRegion[region]` shape (`name`, `type` Subscription/Free/Rent/Buy, `price`, `quality`, `url`) |
| BE-26 | If using TMDB (Decision 1b): fetch watch-provider data per region, cache in Redis for 24 h, show the required JustWatch/TMDB attribution |
| BE-27 | Region default: use the user's saved region, falling back to the request's country header, then `PH` |
| BE-28 | Trailer metadata (`title`, `duration`, `aspect`, `summary`, and a video URL, e.g. YouTube key from TMDB) |

### Phase 5 — Subtitles (BE-29 to BE-32)

| Ticket | Work |
|---|---|
| BE-29 | `GET /api/movies/:id/subtitles?lang=` returns track metadata only (`language`, `langCode`, `releaseName`, `format`, `fps`, `hearingImpaired`) — no inlined cues |
| BE-30 | `GET /api/subtitles/:trackId` returns the WebVTT file (convert SRT to VTT on the server so the player handles one format) |
| BE-31 | Optional OpenSubtitles integration behind the same endpoints (requires an API key, per-user download quotas, and attribution) |
| BE-32 | Remove the `movieId: "ALL"` "universal" tracks from the data model; they only exist for the demo |

Imported tracks in the player (`importedTracks`) stay client-side. They are never uploaded.

### Phase 6 — Media Delivery (BE-33 to BE-37) — blocked on Decision 2

Only start once there's a clear right to serve the content.

| Ticket | Work |
|---|---|
| BE-33 | Chapter page images in object storage, served through a CDN with signed, expiring URLs |
| BE-34 | Movie streaming as HLS (`.m3u8`) with signed URLs; `availability.canStream` computed per region and per license |
| BE-35 | `availability.canDownload` and format/size per title from license data, not hard-coded |
| BE-36 | Media ingest pipeline (transcode to HLS renditions, generate posters/thumbnails) |
| BE-37 | Licensing windows: start/end dates per title and region; expired titles flip to "Streaming Unavailable" |

Until then: the player keeps local-file mode (`/downloads/player`), and the reader keeps using placeholder pages.

### Phase 7 — Downloads & Offline (BE-38 to BE-41)

The Downloads page already models these states: `Download requested`, `File access required`, `Downloading`, `Downloaded`, `Available`, `Unavailable`, `Failed`. Only some of them belong on the server.

| State | Owned by |
|---|---|
| `Available` / `Unavailable` | Server (license + `canDownload`) |
| `Download requested`, `Downloading`, `Downloaded`, `Failed` | Device (actual transfer and storage) |
| `File access required` | Device (browser lost the file handle after refresh) |

| Ticket | Work |
|---|---|
| BE-38 | `POST /api/downloads` checks entitlement and returns a short-lived signed download URL (or a 403 with the reason, e.g. "Streaming license only") |
| BE-39 | `GET /api/downloads` returns the user's download history metadata (title, format, size, requested time) so it shows on every device; file presence is still checked locally |
| BE-40 | Chapter download manifest: `GET /api/chapters/:id/download` lists page URLs + checksums (the frontend could zip them with `fflate`, if that's what it was meant for) |
| BE-41 | Offline support: the frontend caches the shell and downloaded chapters with a service worker and IndexedDB; the server sets cache headers and ETags so the cache stays valid |

### Phase 8 — Hardening & Launch (BE-42 to BE-48)

| Ticket | Work |
|---|---|
| BE-42 | Rate limiting (per device ID and IP), especially on search suggest and progress writes |
| BE-43 | Input validation on every route via JSON schema; reject unknown fields |
| BE-44 | Caching: HTTP caching for catalog endpoints, Redis for third-party calls |
| BE-45 | Logging, error tracking, basic metrics (p95 latency, error rate) |
| BE-46 | Privacy: data retention policy for anonymous devices (e.g. purge after 12 months idle), export/delete my data endpoint |
| BE-47 | Admin/curation tool (or a seed-file workflow) for featured slots, new titles, and chapters |
| BE-48 | Deployment: container image, managed Postgres, staging + production environments, DB backups |

---

## 4. Suggested order and milestones

| Milestone | Phases | What users see |
|---|---|---|
| M1 — "Same app, real API" | 0, 1 | No visible change; data now comes from the server |
| M2 — "Find anything" | 2 | Real search and filtering over a larger catalog |
| M3 — "It remembers me" | 3 | My List, Continue Watching/Reading survive refresh and work across devices |
| M4 — "Where can I watch it" | 4, 5 | Real regional providers, trailers, subtitles |
| M5 — "Watch and read here" | 6, 7 | Streaming, hosted chapters, downloads (only if rights are in place) |
| M6 — Launch | 8 | Production-ready |

M1–M4 do not depend on media rights and can ship on their own.

---

## 5. Frontend work that the backend depends on

These aren't backend tickets, but each phase stalls without them:

- `src/api/` client with loading and error states for every page (currently none, since data is synchronous).
- Real routing with `react-router-dom` so `/movie/:id`, `/series/:id`, and `/read/:seriesId/:chapterId` can be opened directly and fetch their own data.
- Splitting `MovieShelf.jsx` state into a data layer (e.g. TanStack Query) so library and progress writes go to the API rather than `useState`.
- Date formatting helpers to replace the hard-coded "2 hours ago" / "Today" labels.
- Debounced progress saves in the player and reader.
- Replace `isOffline` (currently a manual toggle) with `navigator.onLine` plus the sync queue from BE-24.

---

## 6. Third-party terms to check before integrating

- **TMDB:** requires attribution and the TMDB logo; watch-provider data must credit JustWatch. Commercial use needs a separate agreement.
- **OpenSubtitles:** API key, per-user download limits, and attribution.
- **Manga metadata/pages:** most public manga APIs forbid rehosting scans and require linking back. Hosting pages needs publisher rights (Decision 2).

---

## 7. Open questions

1. Content source and media rights (Decisions 1 and 2) — who decides, and by when?
2. Is sign-in ever in scope, given the "no account required" promise on the About page?
3. What were `qrcode`, `react-simple-captcha`, and `fflate` meant for?
4. Should a `Completed` series reopen when a new chapter is released?
5. Hosting budget and target region (latency to the Philippines matters if most users are there).
