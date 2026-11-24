import Fastify from "fastify";

export interface AppOptions {
  logger?: boolean;
}

export function buildApp({ logger = false }: AppOptions = {}) {
  const app = Fastify({ logger });

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

  return app;
}
