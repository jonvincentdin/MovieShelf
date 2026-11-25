// Minimal fetch wrapper for the MovieShelf API (server/openapi.yaml). Same origin: Vite proxies /api in dev.

export class ApiError extends Error {
  constructor(status, body, retryAfterSec) {
    super(body?.error?.message || `Request failed (${status})`);
    this.status = status;
    this.code = body?.error?.code;
    this.retryAfterSec = retryAfterSec;
  }
}

export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin", // sends the anonymous device cookie
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data, Number(res.headers.get("retry-after")) || undefined);
  return data;
}

/** Follows page/total until every item of a paged list endpoint is loaded. */
export async function apiAll(path) {
  const sep = path.includes("?") ? "&" : "?";
  const items = [];
  for (let page = 1; ; page += 1) {
    const res = await api(`${path}${sep}pageSize=100&page=${page}`);
    items.push(...res.items);
    if (items.length >= res.total || res.items.length === 0) return items;
  }
}

/** localStorage that never throws (private mode, quota, blocked storage). */
export const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or blocked: the app keeps working from memory.
    }
  },
};
