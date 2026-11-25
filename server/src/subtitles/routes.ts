import { and, asc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import type { Db } from "../db/client.ts";
import { movies, subtitleTracks } from "../db/schema.ts";
import { toVtt } from "./format.ts";

const notFound = (what: string) => ({ error: { code: "NOT_FOUND", message: `${what} not found` } });

export async function subtitleRoutes(app: FastifyInstance, { db }: { db: Db }) {
  // BE-29: metadata only; cues come from the track file.
  app.get<{ Params: { id: string }; Querystring: { lang?: string } }>(
    "/api/movies/:id/subtitles",
    {
      schema: {
        params: { type: "object", properties: { id: { type: "string", pattern: "^mov-[a-z0-9-]{1,128}$" } } },
        querystring: { type: "object", properties: { lang: { type: "string", pattern: "^[a-z]{2,3}$" } } },
      },
    },
    async (req, reply) => {
      const [movie] = await db.select({ id: movies.id }).from(movies).where(eq(movies.id, req.params.id));
      if (!movie) return reply.status(404).send(notFound("Movie"));
      const items = await db
        .select({
          id: subtitleTracks.id,
          movieId: subtitleTracks.movieId,
          language: subtitleTracks.language,
          langCode: subtitleTracks.langCode,
          releaseName: subtitleTracks.releaseName,
          format: subtitleTracks.format,
          fps: subtitleTracks.fps,
          hearingImpaired: subtitleTracks.hearingImpaired,
        })
        .from(subtitleTracks)
        .where(
          and(
            eq(subtitleTracks.movieId, req.params.id),
            req.query.lang ? eq(subtitleTracks.langCode, req.query.lang) : undefined,
          ),
        )
        .orderBy(asc(subtitleTracks.langCode), asc(subtitleTracks.id));
      return { items };
    },
  );

  // BE-30: always WebVTT, so the player handles one format.
  app.get<{ Params: { trackId: string } }>(
    "/api/subtitles/:trackId",
    { schema: { params: { type: "object", properties: { trackId: { type: "string", pattern: "^sub-[a-z0-9-]{1,128}$" } } } } },
    async (req, reply) => {
      const [track] = await db
        .select({ content: subtitleTracks.content, format: subtitleTracks.format, updatedAt: subtitleTracks.updatedAt })
        .from(subtitleTracks)
        .where(eq(subtitleTracks.id, req.params.trackId));
      if (!track) return reply.status(404).send(notFound("Subtitle track"));
      return reply
        .type("text/vtt; charset=utf-8")
        .header("cache-control", "public, max-age=3600")
        .header("last-modified", track.updatedAt.toUTCString())
        .send(toVtt(track.content, track.format));
    },
  );
}
