import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "../db/client.ts";
import * as q from "./queries.ts";
import { search, suggest, type SearchParams } from "./search.ts";
import { knownRegion, resolveRegion } from "../region.ts";
import { eq } from "drizzle-orm";
import { movies } from "../db/schema.ts";
import type { Tmdb } from "../tmdb/client.ts";
import { TMDB_ATTRIBUTION, tmdbProvidersFor } from "../tmdb/movies.ts";

const idParam = (prefix: string) => ({
  type: "object",
  required: ["id"],
  properties: { id: { type: "string", pattern: `^${prefix}-[a-z0-9-]{1,128}$` } },
});

const pageProps = (defaultSize = 20, maxSize = 100) => ({
  page: { type: "integer", minimum: 1, maximum: 10_000, default: 1 },
  pageSize: { type: "integer", minimum: 1, maximum: maxSize, default: defaultSize },
});

const text = { type: "string", minLength: 1, maxLength: 100 };
const year = { type: "integer", minimum: 1800, maximum: 2200 };
const oneOf = (values: string[]) => ({ type: "string", enum: values, default: values[0] });
// At least one non-space character; the handler trims it.
const searchText = { type: "string", maxLength: 100, pattern: "\\S" };

const notFound = (reply: FastifyReply, what: string) =>
  reply.status(404).send({ error: { code: "NOT_FOUND", message: `${what} not found` } });

export async function catalogRoutes(app: FastifyInstance, { db, tmdb }: { db: Db; tmdb?: Tmdb }) {
  // Movie availability depends on the viewer's region (saved, then CDN country, then PH).
  const regionOf = async (req: FastifyRequest) => (await resolveRegion(db, req)).region;

  app.get<{ Querystring: q.MovieFilters }>(
    "/api/movies",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            ...pageProps(),
            genre: text,
            language: text,
            year,
            minRating: { type: "number", minimum: 0, maximum: 10 },
            sort: oneOf(["popularity", "date", "rating", "az"]),
          },
        },
      },
    },
    async (req) => q.listMovies(db, { ...req.query, region: await regionOf(req) }),
  );

  app.get<{ Params: { id: string } }>("/api/movies/:id", { schema: { params: idParam("mov") } }, async (req, reply) => {
    const movie = await q.getMovie(db, req.params.id, await regionOf(req));
    return movie ?? notFound(reply, "Movie");
  });

  app.get<{ Querystring: q.SeriesFilters }>(
    "/api/series",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            ...pageProps(),
            type: text,
            status: text,
            genre: text,
            year,
            sort: oneOf(["popularity", "latest", "az", "chapters"]),
          },
        },
      },
    },
    async (req) => q.listSeries(db, req.query),
  );

  app.get<{ Params: { id: string }; Querystring: { region?: string } }>(
    "/api/movies/:id/providers",
    {
      schema: {
        params: idParam("mov"),
        querystring: { type: "object", properties: { region: { type: "string", pattern: "^[A-Z]{2}$" } } },
      },
    },
    async (req, reply) => {
      const explicit = req.query.region;
      if (explicit && !(await knownRegion(db, explicit))) {
        return reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: `Unknown region ${explicit}` } });
      }
      const { region, source } = await resolveRegion(db, req, explicit);
      const items = await q.getMovieProviders(db, req.params.id, region);
      if (!items) return notFound(reply, "Movie");
      const base = { region, regionSource: source };

      // BE-26: live TMDB/JustWatch data when a key is set and TMDB knows this title; the catalog's own list otherwise.
      if (tmdb) {
        const [movie] = await db
          .select({ tmdbId: movies.tmdbId, title: movies.title, originalTitle: movies.originalTitle })
          .from(movies)
          .where(eq(movies.id, req.params.id));
        try {
          const live = await tmdbProvidersFor(tmdb, movie, region);
          if (live) return { ...base, source: "tmdb", attribution: TMDB_ATTRIBUTION, items: live };
        } catch (err) {
          req.log.warn({ err }, "TMDB providers lookup failed; using catalog data");
        }
      }
      return { ...base, source: "catalog", attribution: null, items };
    },
  );

  app.get<{ Params: { id: string } }>("/api/series/:id", { schema: { params: idParam("ser") } }, async (req, reply) => {
    const s = await q.getOneSeries(db, req.params.id);
    return s ?? notFound(reply, "Series");
  });

  app.get<{ Params: { id: string }; Querystring: q.PageParams }>(
    "/api/series/:id/chapters",
    { schema: { params: idParam("ser"), querystring: { type: "object", properties: pageProps(100, 500) } } },
    async (req, reply) => {
      const result = await q.getSeriesChapters(db, req.params.id, req.query);
      return result ?? notFound(reply, "Series");
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

  app.get<{ Querystring: SearchParams }>(
    "/api/search",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["q"],
          properties: {
            ...pageProps(),
            q: searchText,
            scope: oneOf(["all", "movies", "series", "manga", "manhwa"]),
            genre: text,
            sort: oneOf(["relevance", "rating", "year", "az"]),
          },
        },
      },
    },
    async (req) => search(db, { ...req.query, q: req.query.q.trim(), region: await regionOf(req) }),
  );

  app.get<{ Querystring: { q: string } }>(
    "/api/search/suggest",
    { schema: { querystring: { type: "object", required: ["q"], properties: { q: searchText } } } },
    async (req) => suggest(db, req.query.q.trim(), await regionOf(req)),
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

  app.get("/api/home", async (req) => q.getHome(db, await regionOf(req)));
}
