// Initial Session State for My List, Continue Progress & Downloads (FE-04)

export const INITIAL_MY_LIST = [
  {
    id: "ml-mov-1",
    mediaType: "movie",
    mediaId: "mov-last-horizon",
    status: "Watching",
    addedAt: "2026-11-20",
  },
  {
    id: "ml-mov-2",
    mediaType: "movie",
    mediaId: "mov-night-signal",
    status: "Plan to Watch",
    addedAt: "2026-11-22",
  },
  {
    id: "ml-mov-3",
    mediaType: "movie",
    mediaId: "mov-blue-hour",
    status: "Watched",
    addedAt: "2026-11-15",
  },
  {
    id: "ml-ser-1",
    mediaType: "series",
    mediaId: "ser-paper-moon",
    status: "Reading",
    addedAt: "2026-11-18",
  },
  {
    id: "ml-ser-2",
    mediaType: "series",
    mediaId: "ser-lantern-way",
    status: "Reading",
    addedAt: "2026-11-19",
  },
  {
    id: "ml-ser-3",
    mediaType: "series",
    mediaId: "ser-after-rain",
    status: "Completed",
    addedAt: "2026-11-02",
  },
  {
    id: "ml-ser-4",
    mediaType: "series",
    mediaId: "ser-glass-garden",
    status: "Plan to Read",
    addedAt: "2026-11-23",
  },
];

export const INITIAL_CONTINUE_WATCHING = [
  {
    movieId: "mov-last-horizon",
    positionSec: 24,
    durationSec: 75,
    updatedLabel: "2 hours ago",
  },
  {
    movieId: "mov-paper-moon",
    positionSec: 52,
    durationSec: 88,
    updatedLabel: "Yesterday",
  },
  {
    movieId: "mov-silent-city",
    positionSec: 38,
    durationSec: 105,
    updatedLabel: "3 days ago",
  },
];

export const INITIAL_CONTINUE_READING = [
  {
    seriesId: "ser-paper-moon",
    chapterId: "ch-pm-2",
    chapterLabel: "Chapter 2 — The Quiet Road",
    pageIndex: 3,
    totalPages: 6,
    mode: "vertical",
    updatedLabel: "1 hour ago",
  },
  {
    seriesId: "ser-lantern-way",
    chapterId: "ch-lw-17",
    chapterLabel: "Chapter 17 — The Cedar Tea House",
    pageIndex: 4,
    totalPages: 6,
    mode: "single",
    updatedLabel: "2 days ago",
  },
];

export const DOWNLOAD_STATES = [
  "Download requested",
  "File access required",
  "Downloading",
  "Downloaded",
  "Available",
  "Unavailable",
  "Failed",
];

export const INITIAL_MOVIE_DOWNLOADS = [
  {
    id: "dl-mov-1",
    movieId: "mov-last-horizon",
    title: "The Last Horizon",
    format: "MP4",
    sizeLabel: "640 MB",
    status: "Download requested",
    detailNote: "File access not confirmed",
    progress: 100,
    requestedAt: "Today, 18:40",
  },
  {
    id: "dl-mov-2",
    movieId: "mov-night-signal",
    title: "Night Signal",
    format: "MP4",
    sizeLabel: "810 MB",
    status: "Downloaded",
    detailNote: "Ready for local playback",
    progress: 100,
    requestedAt: "Yesterday, 21:15",
  },
  {
    id: "dl-mov-3",
    movieId: "mov-blue-hour",
    title: "Blue Hour",
    format: "MP4",
    sizeLabel: "750 MB",
    status: "Downloading",
    detailNote: "480 MB of 750 MB transferred",
    progress: 64,
    requestedAt: "Today, 19:05",
  },
  {
    id: "dl-mov-4",
    movieId: "mov-after-rain",
    title: "After Rain",
    format: "HLS",
    sizeLabel: "Stream Only",
    status: "Unavailable",
    detailNote: "Streaming license only",
    progress: 0,
    requestedAt: "Nov 22, 2026",
  },
];

export const INITIAL_MANGA_DOWNLOADS = [
  {
    id: "dl-ser-1",
    seriesId: "ser-paper-moon",
    chapterId: "ch-pm-2",
    seriesTitle: "Paper Moon",
    chapterTitle: "Chapter 2 • The Quiet Road",
    pageCount: 6,
    sizeLabel: "14.2 MB",
    status: "Downloaded",
    detailNote: "6 pages cached for offline reading",
  },
  {
    id: "dl-ser-2",
    seriesId: "ser-paper-moon",
    chapterId: "ch-pm-3",
    seriesTitle: "Paper Moon",
    chapterTitle: "Chapter 3 • The Lantern",
    pageCount: 6,
    sizeLabel: "15.8 MB",
    status: "Download requested",
    detailNote: "Queued for local package save",
  },
  {
    id: "dl-ser-3",
    seriesId: "ser-lantern-way",
    chapterId: "ch-lw-17",
    seriesTitle: "Lantern Way",
    chapterTitle: "Chapter 17 • The Cedar Tea House",
    pageCount: 6,
    sizeLabel: "18.4 MB",
    status: "File access required",
    detailNote: "Reselect local chapter folder after refresh",
  },
];
