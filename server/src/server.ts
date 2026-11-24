import { buildApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { createDb } from "./db/client.ts";

const config = loadConfig(process.env);
const { db, pool } = createDb(config.databaseUrl);
const app = buildApp({ logger: true, corsOrigins: config.corsOrigins, db, cookieSecure: config.cookieSecure });
app.addHook("onClose", () => pool.end());

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    app.close().then(() => process.exit(0));
  });
}

await app.listen({ host: config.host, port: config.port });
