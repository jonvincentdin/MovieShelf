import { api, ApiError, storage } from "./client.js";

const TRACKS_KEY = "movieshelf.subtitleTracks.v1";
const CUES_KEY = "movieshelf.subtitleCues.v1";

/** "01:02:03.456" or "02:03.456" → seconds. */
function seconds(stamp) {
  const parts = stamp.trim().replace(",", ".").split(":").map(Number);
  return parts.reduce((total, n) => total * 60 + n, 0);
}

/** WebVTT text → [{ start, end, text }] as the player expects. Ignores headers, notes and cue settings. */
export function parseVtt(text) {
  const cues = [];
  for (const block of text.replace(/\r\n?/g, "\n").split(/\n{2,}/)) {
    const lines = block.split("\n");
    const at = lines.findIndex((l) => l.includes("-->"));
    if (at === -1) continue;
    const [start, rest] = lines[at].split("-->");
    const end = rest.trim().split(/\s+/)[0]; // drop cue settings like "line:90%"
    const body = lines.slice(at + 1).join("\n").trim();
    if (body) cues.push({ start: seconds(start), end: seconds(end), text: body });
  }
  return cues;
}

/** Track metadata for a movie; the last copy is used when offline. */
export async function fetchSubtitleTracks(movieId) {
  const cache = storage.get(TRACKS_KEY, {});
  try {
    const { items } = await api(`/api/movies/${movieId}/subtitles`);
    storage.set(TRACKS_KEY, { ...cache, [movieId]: items });
    return items;
  } catch (err) {
    if (cache[movieId]) return cache[movieId];
    throw err;
  }
}

/** Cues for one track (served as WebVTT); the last copy is used when offline. */
export async function fetchSubtitleCues(trackId) {
  const cache = storage.get(CUES_KEY, {});
  try {
    const res = await fetch(`/api/subtitles/${trackId}`);
    if (!res.ok) throw new ApiError(res.status, null);
    const cues = parseVtt(await res.text());
    storage.set(CUES_KEY, { ...cache, [trackId]: cues });
    return cues;
  } catch (err) {
    if (cache[trackId]) return cache[trackId];
    throw err;
  }
}
