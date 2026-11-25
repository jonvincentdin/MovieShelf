import { and, inArray, isNull, or, eq } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { licenses, type Availability } from "../db/schema.ts";

type License = typeof licenses.$inferSelect;

/** Today as YYYY-MM-DD in UTC; license dates are compared as plain dates. */
export const utcToday = (now = new Date()) => now.toISOString().slice(0, 10);

const isActive = (l: License, today: string) =>
  (l.startsOn === null || l.startsOn <= today) && (l.endsOn === null || l.endsOn >= today);

const longDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/**
 * BE-35/BE-37: a movie's availability in `region` on `today`, from its licenses (any region).
 * The region's own license beats a worldwide one; an expired title says "Streaming Unavailable".
 */
export function pickAvailability(all: License[], region: string, today: string): Availability {
  const relevant = all.filter((l) => l.regionCode === region || l.regionCode === null);
  // Region-specific first, then worldwide; within each, the one ending last.
  const rank = (l: License) => [l.regionCode === region ? 0 : 1, l.endsOn === null ? "9999" : l.endsOn] as const;
  const sorted = [...relevant].sort((a, b) => {
    const [ra, ea] = rank(a);
    const [rb, eb] = rank(b);
    return ra - rb || (ea < eb ? 1 : ea > eb ? -1 : 0);
  });

  const active = sorted.find((l) => isActive(l, today));
  const upcoming = relevant
    .filter((l) => l.canStream && l.startsOn !== null && l.startsOn > today)
    .sort((a, b) => (a.startsOn! < b.startsOn! ? -1 : 1))[0];
  const base = active ?? upcoming ?? sorted[0];
  const details = {
    format: base?.format ?? null,
    sizeBytes: base?.sizeBytes ?? null,
    resolution: base?.resolution ?? null,
    availableUntil: active?.endsOn ?? null,
    availableFrom: !active?.canStream && upcoming ? upcoming.startsOn : null,
  };
  const opens = upcoming ? `Streaming window opens ${longDate(upcoming.startsOn!)}` : "Streaming window not yet open";

  if (active?.canDownload) {
    return { canStream: true, canDownload: true, ...details, statusText: `${active.format ?? "File"} • Eligible for download` };
  }
  if (active?.canStream) {
    return {
      canStream: true,
      canDownload: false,
      ...details,
      statusText: "Authorized for streaming • Download unavailable for this license",
    };
  }
  if (active) return { canStream: false, canDownload: false, ...details, statusText: `Catalog listing • ${opens}` };
  if (upcoming) return { canStream: false, canDownload: false, ...details, statusText: `Catalog listing • ${opens}` };
  if (relevant.length > 0) return { canStream: false, canDownload: false, ...details, statusText: "Streaming Unavailable" };
  return { canStream: false, canDownload: false, ...details, statusText: "Not available in your region" };
}

/** Availability for several movies in one region. */
export async function availabilityFor(db: Db, movieIds: string[], region: string, today = utcToday()) {
  const rows = await db
    .select()
    .from(licenses)
    .where(and(inArray(licenses.movieId, movieIds), or(isNull(licenses.regionCode), eq(licenses.regionCode, region))));
  return new Map(movieIds.map((id) => [id, pickAvailability(rows.filter((l) => l.movieId === id), region, today)]));
}
