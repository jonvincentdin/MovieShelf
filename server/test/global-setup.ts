import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { loadEnv } from "vite";
import { createDb } from "../src/db/client.ts";
import { seed } from "../src/db/seed.ts";

// Runs once before all test files, so parallel files don't migrate the same database at the same time.
export default async function setup() {
  const url = loadEnv("test", process.cwd(), "").DATABASE_URL;
  if (!url) return; // DB tests skip themselves
  const { db, pool } = createDb(url);
  try {
    await migrate(db, { migrationsFolder: fileURLToPath(new URL("../src/db/migrations", import.meta.url)) });
    await seed(db);
    await seed(db); // idempotent
  } finally {
    await pool.end();
  }
}
