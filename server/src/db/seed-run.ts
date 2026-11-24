import { createDb } from "./client.ts";
import { seed } from "./seed.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Copy server/.env.example to server/.env.");

const { db, pool } = createDb(url);
try {
  const counts = await seed(db);
  console.log(`Seeded ${counts.movies} movies, ${counts.series} series, ${counts.chapters} chapters.`);
} finally {
  await pool.end();
}
