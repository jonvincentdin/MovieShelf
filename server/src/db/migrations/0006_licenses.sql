CREATE TABLE "licenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"movie_id" text NOT NULL,
	"region_code" text,
	"can_stream" boolean NOT NULL,
	"can_download" boolean NOT NULL,
	"format" text,
	"size_bytes" bigint,
	"resolution" text,
	"starts_on" date,
	"ends_on" date,
	CONSTRAINT "licenses_window_check" CHECK ("licenses"."starts_on" is null or "licenses"."ends_on" is null or "licenses"."starts_on" <= "licenses"."ends_on"),
	CONSTRAINT "licenses_download_needs_stream" CHECK (not "licenses"."can_download" or "licenses"."can_stream")
);
--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_region_code_regions_code_fk" FOREIGN KEY ("region_code") REFERENCES "public"."regions"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "licenses_movie_id_idx" ON "licenses" USING btree ("movie_id");--> statement-breakpoint
-- Keep existing availability: each movie gets a worldwide, open-ended license built from it.
INSERT INTO "licenses" ("movie_id", "region_code", "can_stream", "can_download", "format", "size_bytes", "resolution")
SELECT "id", NULL,
  coalesce(("availability"->>'canStream')::boolean, false),
  coalesce(("availability"->>'canStream')::boolean, false) AND coalesce(("availability"->>'canDownload')::boolean, false),
  "availability"->>'format', ("availability"->>'sizeBytes')::bigint, "availability"->>'resolution'
FROM "movies" WHERE "availability" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "movies" DROP COLUMN "availability";