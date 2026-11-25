import type { Palette, ProviderType, Trailer } from "../db/schema.ts";
import { personId } from "../db/transform.ts";
import { cached, type Tmdb, type TmdbMovie, type TmdbRegionProviders } from "./client.ts";

export const TMDB_ATTRIBUTION = "Where to Watch data by JustWatch, via TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.";
const DAY_MS = 24 * 60 * 60 * 1000;

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Guards against a stored tmdbId that points at a different film (the mock catalog's ids are made up). */
export const sameTitle = (t: Pick<TmdbMovie, "title" | "original_title">, title: string, originalTitle?: string | null) =>
  [t.title, t.original_title].some((x) => norm(x) !== "" && (norm(x) === norm(title) || norm(x) === norm(originalTitle)));

/** Details plus credits, videos and watch providers in one request, cached for a day (BE-26). */
export const movieDetails = (tmdb: Tmdb, tmdbId: number) =>
  cached(`movie:${tmdbId}`, DAY_MS, () =>
    tmdb.get<TmdbMovie>(`/movie/${tmdbId}`, { append_to_response: "credits,videos,watch/providers" }),
  );

const TYPE_BY_BUCKET: [keyof TmdbRegionProviders, ProviderType][] = [
  ["flatrate", "Subscription"],
  ["free", "Free"],
  ["ads", "Free"],
  ["rent", "Rent"],
  ["buy", "Buy"],
];

/** TMDB's providers for one region, in the API's provider shape. TMDB links to its JustWatch page, not to each service. */
export function toProviders(region: TmdbRegionProviders | undefined) {
  if (!region) return [];
  const seen = new Set<string>();
  return TYPE_BY_BUCKET.flatMap(([bucket, type]) =>
    ((region[bucket] as { provider_id: number; provider_name: string }[] | undefined) ?? []).flatMap((p) => {
      const id = `tmdb-${p.provider_id}`;
      if (seen.has(`${id}:${type}`)) return [];
      seen.add(`${id}:${type}`);
      return [{ id, name: p.provider_name, type, price: null, quality: null, url: region.link }];
    }),
  );
}

/** Live TMDB providers for a catalog movie, or null when TMDB doesn't know it (no id, 404, other film). */
export async function tmdbProvidersFor(
  tmdb: Tmdb,
  movie: { tmdbId: number | null; title: string; originalTitle: string | null },
  region: string,
) {
  if (!movie.tmdbId) return null;
  const details = await movieDetails(tmdb, movie.tmdbId);
  if (!details || !sameTitle(details, movie.title, movie.originalTitle)) return null;
  return toProviders(details["watch/providers"]?.results[region]);
}

/** The official YouTube trailer, else any YouTube trailer or teaser (BE-28). */
export function pickTrailer(t: TmdbMovie): Trailer | null {
  const youtube = (t.videos?.results ?? []).filter((v) => v.site === "YouTube");
  const video =
    youtube.find((v) => v.type === "Trailer" && v.official) ??
    youtube.find((v) => v.type === "Trailer") ??
    youtube.find((v) => v.type === "Teaser");
  if (!video) return null;
  return {
    title: video.name,
    duration: "",
    aspect: "16:9",
    summary: t.tagline || "",
    videoUrl: `https://www.youtube.com/watch?v=${video.key}`,
  };
}

const slug = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

/** Catalog rows for a movie imported from TMDB. `palettes` gives imported titles the same placeholder artwork style. */
export function tmdbToCatalog(t: TmdbMovie, palettes: Palette[], languageCodes: Set<string>) {
  const lang = t.original_language?.toUpperCase();
  const firstSentence = t.overview.split(/(?<=[.!?])\s/)[0] ?? "";
  const director = t.credits?.crew.find((c) => c.job === "Director")?.name ?? null;
  const cast = [...(t.credits?.cast ?? [])]
    .sort((a, b) => a.order - b.order)
    .slice(0, 8)
    .map((c, position) => ({ personId: personId(c.name), name: c.name, character: c.character || null, position }));
  return {
    movie: {
      id: `mov-${slug(t.title) || "title"}-${t.id}`,
      tmdbId: t.id,
      imdbId: t.imdb_id || null,
      title: t.title,
      originalTitle: t.original_title || null,
      year: t.release_date ? Number(t.release_date.slice(0, 4)) : null,
      releaseDate: t.release_date || null,
      runtimeMinutes: t.runtime || null,
      rating: t.vote_average ? Math.round(t.vote_average * 10) / 10 : null,
      maturityRating: null,
      languageCode: lang && languageCodes.has(lang) ? lang : null,
      synopsis: t.overview || null,
      shortSynopsis: t.tagline || firstSentence || null,
      directorId: director ? personId(director) : null,
      palette: palettes.length ? palettes[t.id % palettes.length] : null,
      trailer: pickTrailer(t),
    },
    director,
    genres: [...new Set(t.genres.map((g) => g.name))],
    cast,
  };
}
