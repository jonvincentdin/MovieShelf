// TMDB (themoviedb.org) API client. The key stays on the server; set TMDB_API_KEY in server/.env.
// Accepts either the v3 "API Key" or the v4 "API Read Access Token" from https://www.themoviedb.org/settings/api.

export interface Tmdb {
  /** GET /3{path}. Returns null on 404; throws on other failures. */
  get<T>(path: string, params?: Record<string, string>): Promise<T | null>;
}

export function createTmdb(key: string, fetchImpl: typeof fetch = fetch): Tmdb {
  const bearer = key.startsWith("eyJ"); // v4 tokens are JWTs
  return {
    async get<T>(path: string, params: Record<string, string> = {}) {
      const url = new URL(`https://api.themoviedb.org/3${path}`);
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
      if (!bearer) url.searchParams.set("api_key", key);
      const res = await fetchImpl(url, {
        headers: { accept: "application/json", ...(bearer ? { authorization: `Bearer ${key}` } : {}) },
        signal: AbortSignal.timeout(5000),
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`TMDB ${path} failed with ${res.status}`);
      return (await res.json()) as T;
    },
  };
}

// shortcut: per-process memory cache; move to Redis (BE-44) when the server runs on more than one instance.
const cache = new Map<string, { until: number; value: Promise<unknown> }>();

/** Caches a lookup for `ttlMs`; a failed lookup is not cached. */
export function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.value as Promise<T>;
  const value = load();
  cache.set(key, { until: Date.now() + ttlMs, value });
  value.catch(() => cache.delete(key));
  return value;
}

export const clearTmdbCache = () => cache.clear();

// ---- Response shapes (only the fields used) ----

export interface TmdbProvider {
  provider_id: number;
  provider_name: string;
}

export interface TmdbRegionProviders {
  link: string;
  flatrate?: TmdbProvider[];
  free?: TmdbProvider[];
  ads?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
}

export interface TmdbVideo {
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface TmdbMovie {
  id: number;
  imdb_id: string | null;
  title: string;
  original_title: string;
  original_language: string;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  overview: string;
  tagline: string;
  genres: { id: number; name: string }[];
  credits?: {
    cast: { name: string; character: string; order: number }[];
    crew: { name: string; job: string }[];
  };
  videos?: { results: TmdbVideo[] };
  "watch/providers"?: { results: Record<string, TmdbRegionProviders> };
}
