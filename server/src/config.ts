export interface Config {
  host: string;
  port: number;
  corsOrigins: string[];
  databaseUrl: string;
}

// Fails fast at startup instead of on the first request.
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const port = Number(env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${env.PORT}`);
  }
  const corsOrigins = (env.CORS_ORIGIN ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  for (const origin of corsOrigins) {
    if (!URL.canParse(origin)) throw new Error(`Invalid CORS_ORIGIN entry: ${origin}`);
  }
  const databaseUrl = env.DATABASE_URL ?? "";
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    throw new Error("DATABASE_URL must be a postgres:// URL. Copy server/.env.example to server/.env.");
  }
  return { host: env.HOST ?? "127.0.0.1", port, corsOrigins, databaseUrl };
}
