import { buildApp } from "./app.ts";
import { loadConfig } from "./config.ts";

const config = loadConfig(process.env);
const app = buildApp({ logger: true });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    app.close().then(() => process.exit(0));
  });
}

await app.listen({ host: config.host, port: config.port });
