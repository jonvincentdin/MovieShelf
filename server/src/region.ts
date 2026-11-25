import { eq } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import type { Db } from "./db/client.ts";
import { devices, regions } from "./db/schema.ts";
import { readDeviceCookie } from "./library/routes.ts";

export const DEFAULT_REGION = "PH";

// Country headers set by common CDNs/hosts. A client can fake them, which only changes its own region.
const COUNTRY_HEADERS = ["cf-ipcountry", "x-vercel-ip-country", "cloudfront-viewer-country"];

export type RegionSource = "query" | "saved" | "header" | "default";

export async function knownRegion(db: Db, code: string) {
  const [row] = await db.select({ code: regions.code }).from(regions).where(eq(regions.code, code));
  return row !== undefined;
}

/** BE-27: an explicit ?region=, else the device's saved region, else the CDN's country, else PH. */
export async function resolveRegion(
  db: Db,
  req: FastifyRequest,
  explicit?: string,
): Promise<{ region: string; source: RegionSource }> {
  if (explicit) return { region: explicit, source: "query" }; // callers validate it first

  const deviceId = readDeviceCookie(req.headers.cookie);
  if (deviceId) {
    const [d] = await db.select({ region: devices.region }).from(devices).where(eq(devices.id, deviceId));
    if (d?.region) return { region: d.region, source: "saved" };
  }

  for (const name of COUNTRY_HEADERS) {
    const value = req.headers[name];
    const code = typeof value === "string" ? value.trim().toUpperCase() : "";
    if (/^[A-Z]{2}$/.test(code) && (await knownRegion(db, code))) return { region: code, source: "header" };
  }
  return { region: DEFAULT_REGION, source: "default" };
}
