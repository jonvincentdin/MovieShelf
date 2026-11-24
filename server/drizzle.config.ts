import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile();
} catch {
  // No server/.env: use the real environment (CI sets DATABASE_URL directly).
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Copy server/.env.example to server/.env.");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: { url },
});
