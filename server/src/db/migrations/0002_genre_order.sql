-- Temporary default so existing rows can take the NOT NULL column; re-seed to set real positions.
ALTER TABLE "movie_genres" ADD COLUMN "position" integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "movie_genres" ALTER COLUMN "position" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "series_genres" ADD COLUMN "position" integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "series_genres" ALTER COLUMN "position" DROP DEFAULT;
