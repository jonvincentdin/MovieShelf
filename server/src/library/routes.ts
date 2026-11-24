import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "../db/client.ts";
import type { MediaType } from "../db/schema.ts";
import { changeTime } from "./rules.ts";
import * as store from "./store.ts";

// ---- Anonymous device identity (BE-17) ----

export const DEVICE_COOKIE = "ms_device";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_AGE_SEC = 400 * 24 * 60 * 60; // the longest browsers allow; renewed on every write

export function readDeviceCookie(header: string | undefined) {
  for (const part of (header ?? "").split(";")) {
    const [name, value] = part.trim().split("=");
    if (name === DEVICE_COOKIE && value && UUID.test(value)) return value;
  }
  return undefined;
}

export const deviceCookie = (id: string, secure: boolean) =>
  `${DEVICE_COOKIE}=${id}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SEC}${secure ? "; Secure" : ""}`;

// ---- Schemas ----

const uuidParam = { type: "object", required: ["id"], properties: { id: { type: "string", format: "uuid" } } };
const idParam = (name: string, prefix: string) => ({
  type: "object",
  required: [name],
  properties: { [name]: { type: "string", pattern: `^${prefix}-[a-z0-9-]{1,128}$` } },
});
const updatedAt = { type: "string", format: "date-time", description: "When the change happened on the client" };
const seconds = { type: "number", minimum: 0, maximum: 172_800 };

// ---- Routes (BE-19 to BE-21) ----

export async function libraryRoutes(app: FastifyInstance, { db, cookieSecure }: { db: Db; cookieSecure: boolean }) {
  /** Reads never create a device: a browser with no cookie simply has an empty library. */
  async function existingDevice(req: FastifyRequest) {
    const id = readDeviceCookie(req.headers.cookie);
    return id && (await store.deviceExists(db, id)) ? id : null;
  }

  /** Writes create the device on first use and renew the cookie. */
  async function device(req: FastifyRequest, reply: FastifyReply) {
    const id = (await existingDevice(req)) ?? (await store.createDevice(db));
    reply.header("set-cookie", deviceCookie(id, cookieSecure));
    return id;
  }

  function refuse(reply: FastifyReply, r: store.Refusal) {
    switch (r.refused) {
      case "not_found":
        return reply.status(404).send({ error: { code: "NOT_FOUND", message: `${r.what} not found` } });
      case "stale":
        return reply
          .status(409)
          .send({ error: { code: "STALE_WRITE", message: "A newer change is already saved; refetch and retry" } });
      case "throttled":
        return reply
          .status(429)
          .header("retry-after", String(r.retryAfterSec))
          .send({ error: { code: "TOO_MANY_WRITES", message: "Progress for this title was saved moments ago" } });
      case "invalid":
        return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: r.message } });
    }
  }
  const isRefusal = (r: object): r is store.Refusal => "refused" in r;
  const gone = (reply: FastifyReply, what: string) =>
    reply.status(404).send({ error: { code: "NOT_FOUND", message: `${what} not found` } });

  // My List
  app.get("/api/library", async (req) => {
    const id = await existingDevice(req);
    return { items: id ? await store.listLibrary(db, id) : [] };
  });

  app.post<{ Body: { mediaType: MediaType; mediaId: string; updatedAt?: string } }>(
    "/api/library",
    {
      schema: {
        body: {
          type: "object",
          required: ["mediaType", "mediaId"],
          properties: {
            mediaType: { type: "string", enum: ["movie", "series"] },
            mediaId: { type: "string", pattern: "^(mov|ser)-[a-z0-9-]{1,128}$" },
            updatedAt,
          },
        },
      },
    },
    async (req, reply) => {
      const deviceId = await device(req, reply);
      const { mediaType, mediaId } = req.body;
      const r = await store.addToLibrary(db, deviceId, mediaType, mediaId, changeTime(req.body.updatedAt, new Date()));
      if (isRefusal(r)) return refuse(reply, r);
      return reply.status(r.created ? 201 : 200).send(r.item);
    },
  );

  app.patch<{ Params: { id: string }; Body: { status: string; updatedAt?: string } }>(
    "/api/library/:id",
    {
      schema: {
        params: uuidParam,
        body: {
          type: "object",
          required: ["status"],
          properties: { status: { type: "string", maxLength: 40 }, updatedAt },
        },
      },
    },
    async (req, reply) => {
      const deviceId = await device(req, reply);
      const at = changeTime(req.body.updatedAt, new Date());
      const r = await store.setLibraryStatus(db, deviceId, req.params.id, req.body.status, at);
      return isRefusal(r) ? refuse(reply, r) : r.item;
    },
  );

  app.delete<{ Params: { id: string } }>("/api/library/:id", { schema: { params: uuidParam } }, async (req, reply) => {
    const deviceId = await device(req, reply);
    return (await store.removeFromLibrary(db, deviceId, req.params.id))
      ? reply.status(204).send()
      : gone(reply, "Library item");
  });

  // Movie progress
  app.get("/api/progress/movies", async (req) => {
    const id = await existingDevice(req);
    return { items: id ? await store.listMovieProgress(db, id) : [] };
  });

  app.put<{ Params: { movieId: string }; Body: { positionSec: number; durationSec: number; updatedAt?: string } }>(
    "/api/progress/movies/:movieId",
    {
      schema: {
        params: idParam("movieId", "mov"),
        body: {
          type: "object",
          required: ["positionSec", "durationSec"],
          properties: { positionSec: seconds, durationSec: { ...seconds, exclusiveMinimum: 0 }, updatedAt },
        },
      },
    },
    async (req, reply) => {
      const deviceId = await device(req, reply);
      const now = new Date();
      const { positionSec, durationSec } = req.body;
      const r = await store.saveMovieProgress(
        db,
        deviceId,
        req.params.movieId,
        { positionSec, durationSec },
        changeTime(req.body.updatedAt, now),
        now,
      );
      return isRefusal(r) ? refuse(reply, r) : r;
    },
  );

  app.delete<{ Params: { movieId: string } }>(
    "/api/progress/movies/:movieId",
    { schema: { params: idParam("movieId", "mov") } },
    async (req, reply) => {
      const deviceId = await device(req, reply);
      return (await store.dismissMovieProgress(db, deviceId, req.params.movieId))
        ? reply.status(204).send()
        : gone(reply, "Progress");
    },
  );

  // Reading progress
  app.get("/api/progress/series", async (req) => {
    const id = await existingDevice(req);
    return { items: id ? await store.listSeriesProgress(db, id) : [] };
  });

  app.put<{
    Params: { seriesId: string };
    Body: { chapterId: string; pageIndex: number; totalPages: number; mode: string; updatedAt?: string };
  }>(
    "/api/progress/series/:seriesId",
    {
      schema: {
        params: idParam("seriesId", "ser"),
        body: {
          type: "object",
          required: ["chapterId", "pageIndex", "totalPages", "mode"],
          properties: {
            chapterId: { type: "string", pattern: "^ch-[a-z0-9-]{1,128}$" },
            pageIndex: { type: "integer", minimum: 0, maximum: 10_000 },
            totalPages: { type: "integer", minimum: 1, maximum: 10_000 },
            mode: { type: "string", minLength: 1, maxLength: 20 },
            updatedAt,
          },
        },
      },
    },
    async (req, reply) => {
      const deviceId = await device(req, reply);
      const now = new Date();
      const { chapterId, pageIndex, totalPages, mode } = req.body;
      const r = await store.saveSeriesProgress(
        db,
        deviceId,
        req.params.seriesId,
        { chapterId, pageIndex, totalPages, mode },
        changeTime(req.body.updatedAt, now),
        now,
      );
      return isRefusal(r) ? refuse(reply, r) : r;
    },
  );

  app.delete<{ Params: { seriesId: string } }>(
    "/api/progress/series/:seriesId",
    { schema: { params: idParam("seriesId", "ser") } },
    async (req, reply) => {
      const deviceId = await device(req, reply);
      return (await store.dismissSeriesProgress(db, deviceId, req.params.seriesId))
        ? reply.status(204).send()
        : gone(reply, "Progress");
    },
  );

  app.get<{ Querystring: { seriesId?: string } }>(
    "/api/progress/chapters",
    {
      schema: {
        querystring: {
          type: "object",
          properties: { seriesId: { type: "string", pattern: "^ser-[a-z0-9-]{1,128}$" } },
        },
      },
    },
    async (req) => {
      const id = await existingDevice(req);
      return { items: id ? await store.listChapterStatuses(db, id, req.query.seriesId) : [] };
    },
  );
}
