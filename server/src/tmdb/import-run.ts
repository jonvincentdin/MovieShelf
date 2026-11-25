// npm run tmdb:import -- 550 27205   (TMDB movie ids, from the number in a themoviedb.org/movie/<id> URL)
import { createDb } from "../db/client.ts";
import { createTmdb } from "./client.ts";
import { importTmdbMovie } from "./import.ts";

const ids = process.argv.slice(2).map(Number);
if (ids.length === 0 || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
  console.error("Usage: npm run tmdb:import -- <tmdbId> [<tmdbId> ...]");
  process.exit(1);
}
if (!process.env.TMDB_API_KEY) {
  console.error("Set TMDB_API_KEY in server/.env (see server/.env.example).");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL in server/.env.");
  process.exit(1);
}

const { db, pool } = createDb(process.env.DATABASE_URL);
const tmdb = createTmdb(process.env.TMDB_API_KEY);
let failed = 0;
for (const id of ids) {
  try {
    const r = await importTmdbMovie(db, tmdb, id);
    console.log(`Imported ${r.title} as ${r.id}${r.trailer ? ` (trailer: ${r.trailer})` : " (no trailer)"}`);
  } catch (err) {
    failed += 1;
    console.error(`TMDB ${id}: ${(err as Error).message}`);
  }
}
await pool.end();
process.exit(failed ? 1 : 0);
