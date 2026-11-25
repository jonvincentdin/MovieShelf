// Subtitle file formats. Tracks are stored as uploaded and always served as WebVTT (BE-30).

export interface Cue {
  start: number; // seconds
  end: number;
  text: string;
}

/** 75.5 → "00:01:15.500" (VTT) or "00:01:15,500" (SRT). */
function timestamp(sec: number, decimal: "." | ",") {
  const ms = Math.round(sec * 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor(ms / 60_000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}${decimal}${pad(ms % 1000, 3)}`;
}

export const cuesToVtt = (cues: Cue[]) =>
  `WEBVTT\n\n${cues.map((c) => `${timestamp(c.start, ".")} --> ${timestamp(c.end, ".")}\n${c.text}\n`).join("\n")}`;

export const cuesToSrt = (cues: Cue[]) =>
  cues.map((c, i) => `${i + 1}\n${timestamp(c.start, ",")} --> ${timestamp(c.end, ",")}\n${c.text}\n`).join("\n");

/**
 * SRT → WebVTT. The formats differ only in the header and the millisecond separator; SRT's numeric
 * counters are valid VTT cue identifiers, so they stay.
 */
const stripBom = (s: string) => (s.charCodeAt(0) === 0xfeff ? s.slice(1) : s);

export function srtToVtt(srt: string) {
  const body = stripBom(srt)
    .replace(/\r\n?/g, "\n")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")
    .trim();
  return `WEBVTT\n\n${body}\n`;
}

export function toVtt(content: string, format: "SRT" | "WebVTT") {
  if (format === "SRT") return srtToVtt(content);
  return stripBom(content);
}
