import { randomUUID } from "node:crypto";
import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import { catalogRoutes } from "./catalog/routes.ts";
import type { Db } from "./db/client.ts";
import { libraryRoutes } from "./library/routes.ts";
import { subtitleRoutes } from "./subtitles/routes.ts";
import type { Tmdb } from "./tmdb/client.ts";

export interface AppOptions {
  logger?: boolean;
  corsOrigins?: string[];
  /** Catalog and library routes are only mounted when a database is given (unit tests run without one). */
  db?: Db;
  cookieSecure?: boolean;
  /** TMDB client; when set, Where to Watch uses live TMDB/JustWatch data. */
  tmdb?: Tmdb;
}

// Accept a caller's request ID only if it's safe to log and echo back.
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

export function buildApp({ logger = false, corsOrigins = [], db, cookieSecure = false, tmdb }: AppOptions = {}) {
  const app = Fastify({
    logger,
    requestIdHeader: false,
    genReqId: (req) => {
      const incoming = req.headers["x-request-id"];
      return typeof incoming === "string" && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
    },
  });

  app.addHook("onRequest", async (req, reply) => {
    reply.header("x-request-id", req.id);
  });

  // Empty list = same-origin only (the Vite proxy needs no CORS).
  // credentials: allowed origins may send the device cookie (it is SameSite=Lax, so only same-site origins can).
  app.register(cors, { origin: corsOrigins.length > 0 ? corsOrigins : false, credentials: true });

  app.setErrorHandler((err: FastifyError, req, reply) => {
    const status = err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;
    if (status >= 500) {
      req.log.error(err);
      return reply.status(status).send({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    }
    const code = err.validation ? "VALIDATION_ERROR" : (err.code ?? "BAD_REQUEST");
    return reply.status(status).send({ error: { code, message: err.message } });
  });

  app.setNotFoundHandler((_req, reply) =>
    reply.status(404).send({ error: { code: "NOT_FOUND", message: "Route not found" } }),
  );

  const healthSchema = {
    response: {
      200: {
        type: "object",
        properties: { ok: { type: "boolean" } },
        required: ["ok"],
      },
    },
  };
  // /health for process monitors; /api/health is what the frontend reaches through the Vite proxy.
  for (const path of ["/health", "/api/health"]) {
    app.get(path, { schema: healthSchema }, async () => ({ ok: true }));
  }

  if (db) {
    app.register(catalogRoutes, { db, tmdb });
    app.register(libraryRoutes, { db, cookieSecure });
    app.register(subtitleRoutes, { db });
  }

  return app;
}
