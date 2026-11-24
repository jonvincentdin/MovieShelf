import type { FastifyInstance, FastifyReply } from "fastify";
import type { Db } from "../db/client.ts";
import * as q from "./queries.ts";

const idParam = (prefix: string) => ({
  type: "object",
  required: ["id"],
  properties: { id: { type: "string", pattern: `^${prefix}-[a-z0-9-]{1,128}$` } },
});

const notFound = (reply: FastifyReply, what: string) =>
  reply.status(404).send({ error: { code: "NOT_FOUND", message: `${what} not found` } });

export async function catalogRoutes(app: FastifyInstance, { db }: { db: Db }) {
  // shortcut: list endpoints return the whole catalog; pagination and filters arrive in BE-15/BE-16.
  app.get("/api/movies", async () => ({ items: await q.getMovies(db) }));

  app.get<{ Params: { id: string } }>("/api/movies/:id", { schema: { params: idParam("mov") } }, async (req, reply) => {
    const movie = await q.getMovie(db, req.params.id);
    return movie ?? notFound(reply, "Movie");
  });

  app.get("/api/series", async () => ({ items: await q.getSeries(db) }));

  app.get<{ Params: { id: string } }>("/api/series/:id", { schema: { params: idParam("ser") } }, async (req, reply) => {
    const s = await q.getOneSeries(db, req.params.id);
    return s ?? notFound(reply, "Series");
  });

  app.get<{ Params: { id: string } }>(
    "/api/series/:id/chapters",
    { schema: { params: idParam("ser") } },
    async (req, reply) => {
      const items = await q.getSeriesChapters(db, req.params.id);
      return items ? { items } : notFound(reply, "Series");
    },
  );

  app.get<{ Params: { id: string } }>(
    "/api/chapters/:id/pages",
    { schema: { params: idParam("ch") } },
    async (req, reply) => {
      const pages = await q.getChapterPages(db, req.params.id);
      return pages ?? notFound(reply, "Chapter");
    },
  );

  app.get<{ Querystring: { type: "movie" | "series" } }>(
    "/api/meta/genres",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["type"],
          properties: { type: { type: "string", enum: ["movie", "series"] } },
        },
      },
    },
    async (req) => ({ items: await q.getGenres(db, req.query.type) }),
  );

  app.get("/api/meta/languages", async () => ({ items: await q.getLanguages(db) }));
  app.get("/api/meta/regions", async () => ({ items: await q.getRegions(db) }));

  app.get("/api/home", async () => q.getHome(db));
}
