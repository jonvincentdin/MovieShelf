import { sql, type SQL } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { getMovies, getSeries, paged, type PageParams } from "./queries.ts";

export interface SearchParams extends PageParams {
  q: string;
  scope: "all" | "movies" | "series" | "manga" | "manhwa";
  genre?: string;
  sort: "relevance" | "rating" | "year" | "az";
  region?: string; // for movie availability; resolved by the route
}

// One searchable text per title: the same fields the frontend searches today
// (title, original/alternate titles, director, cast, author, artist, genres).
// shortcut: the text is built per query with no index; fine for a few thousand titles.
// Past that, store it in a column with a GIN trigram index and a tsvector index.
const DOCS = sql.raw(`
  select 'movie' as kind, m.id, m.title, m.rating, m.year, null::text as series_type, fs.position as trending,
    array(select g.name from movie_genres mg join genres g on g.id = mg.genre_id where mg.movie_id = m.id) as genre_names,
    concat_ws(' ', m.title, m.original_title, d.name,
      (select string_agg(p.name, ' ') from movie_cast mc join people p on p.id = mc.person_id where mc.movie_id = m.id),
      (select string_agg(g.name, ' ') from movie_genres mg join genres g on g.id = mg.genre_id where mg.movie_id = m.id)
    ) as doc
  from movies m
  left join people d on d.id = m.director_id
  left join featured_slots fs on fs.slot = 'trending' and fs.media_type = 'movie' and fs.media_id = m.id
  union all
  select 'series', s.id, s.title, s.rating, s.year, s.type, fs.position,
    array(select g.name from series_genres sg join genres g on g.id = sg.genre_id where sg.series_id = s.id),
    concat_ws(' ', s.title, s.author, s.artist,
      (select string_agg(a.title, ' ') from series_alt_titles a where a.series_id = s.id),
      (select string_agg(g.name, ' ') from series_genres sg join genres g on g.id = sg.genre_id where sg.series_id = s.id)
    )
  from series s
  left join featured_slots fs on fs.slot = 'trending' and fs.media_type = 'series' and fs.media_id = s.id
`);

const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");

const SCOPE: Record<SearchParams["scope"], SQL> = {
  all: sql`true`,
  movies: sql`kind = 'movie'`,
  series: sql`kind = 'series'`,
  manga: sql`series_type = 'Manga'`,
  manhwa: sql`series_type = 'Manhwa'`,
};

const ORDER: Record<SearchParams["sort"], SQL> = {
  relevance: sql`score desc, trending asc nulls last`,
  rating: sql`rating desc nulls last, score desc`,
  year: sql`year desc nulls last, score desc`,
  az: sql`title asc`,
};

/**
 * Matches a substring (what the frontend does today), any full-text word, or a close
 * spelling via pg_trgm (`<%`, word similarity >= 0.6), so "horizn" finds "Last Horizon".
 * Title hits rank first.
 */
function scored({ q, scope, genre }: Pick<SearchParams, "q" | "scope" | "genre">) {
  const contains = `%${escapeLike(q)}%`;
  const prefix = `${escapeLike(q)}%`;
  const tsq = sql`websearch_to_tsquery('simple', ${q})`;
  return sql`
    with docs as (${DOCS}),
    scored as (
      select kind, id, title, rating, year, trending,
        (case when lower(title) = lower(${q}) then 4 when title ilike ${prefix} then 3 when title ilike ${contains} then 2 else 0 end)
          + ts_rank(to_tsvector('simple', doc), ${tsq})
          + word_similarity(${q}, doc) as score
      from docs
      where (doc ilike ${contains} or to_tsvector('simple', doc) @@ ${tsq} or ${q} <% doc)
        and ${SCOPE[scope]}
        and ${genre ? sql`${genre} = any(genre_names)` : sql`true`}
    )`;
}

type Hit = { kind: "movie" | "series"; id: string };

async function findHits(db: Db, p: Omit<SearchParams, "page" | "pageSize">, limit: number, offset: number) {
  const { rows } = await db.execute<Hit>(
    sql`${scored(p)} select kind, id from scored order by ${ORDER[p.sort]}, kind, id limit ${limit} offset ${offset}`,
  );
  return rows;
}

async function hydrate(db: Db, hits: Hit[], region?: string) {
  const ids = (kind: Hit["kind"]) => hits.filter((h) => h.kind === kind).map((h) => h.id);
  const [movieList, seriesList] = await Promise.all([getMovies(db, ids("movie"), region), getSeries(db, ids("series"))]);
  const movieById = new Map(movieList.map((m) => [m.id, m]));
  const seriesById = new Map(seriesList.map((s) => [s.id, s]));
  return hits.flatMap((h) => {
    const item = h.kind === "movie" ? movieById.get(h.id) : seriesById.get(h.id);
    return item ? [{ kind: h.kind, item }] : [];
  });
}

/** BE-13: ranked, paginated search across movies and series. */
export async function search(db: Db, p: SearchParams) {
  const [hits, { rows }] = await Promise.all([
    findHits(db, p, p.pageSize, (p.page - 1) * p.pageSize),
    db.execute<{ total: number }>(sql`${scored(p)} select count(*)::int as total from scored`),
  ]);
  return paged(await hydrate(db, hits, p.region), p, rows[0].total);
}

/** BE-14: top matches per kind for the Quick Search box, mirroring its 4 + 4 layout. */
export async function suggest(db: Db, q: string, region?: string, limit = 4) {
  const [movieHits, seriesHits] = await Promise.all([
    findHits(db, { q, scope: "movies", sort: "relevance" }, limit, 0),
    findHits(db, { q, scope: "series", sort: "relevance" }, limit, 0),
  ]);
  const [movieList, seriesList] = await Promise.all([
    getMovies(db, movieHits.map((h) => h.id), region),
    getSeries(db, seriesHits.map((h) => h.id)),
  ]);
  return { movies: movieList, series: seriesList };
}
