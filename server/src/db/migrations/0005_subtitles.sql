CREATE TABLE "subtitle_tracks" (
	"id" text PRIMARY KEY NOT NULL,
	"movie_id" text NOT NULL,
	"language" text NOT NULL,
	"lang_code" text NOT NULL,
	"release_name" text NOT NULL,
	"format" text NOT NULL,
	"fps" text,
	"hearing_impaired" boolean DEFAULT false NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subtitle_tracks" ADD CONSTRAINT "subtitle_tracks_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subtitle_tracks_movie_id_idx" ON "subtitle_tracks" USING btree ("movie_id");