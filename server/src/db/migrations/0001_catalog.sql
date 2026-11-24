CREATE TABLE "chapter_pages" (
	"chapter_id" text NOT NULL,
	"page_number" integer NOT NULL,
	"caption" text,
	"sub_caption" text,
	"palette" jsonb,
	"image_url" text,
	CONSTRAINT "chapter_pages_chapter_id_page_number_pk" PRIMARY KEY("chapter_id","page_number")
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" text PRIMARY KEY NOT NULL,
	"series_id" text NOT NULL,
	"number" real NOT NULL,
	"title" text,
	"release_date" date,
	"palette" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chapters_series_id_number_unique" UNIQUE("series_id","number")
);
--> statement-breakpoint
CREATE TABLE "featured_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"slot" text NOT NULL,
	"media_type" text NOT NULL,
	"media_id" text NOT NULL,
	"position" integer NOT NULL,
	"kicker" text,
	CONSTRAINT "featured_slots_slot_media_type_media_id_unique" UNIQUE("slot","media_type","media_id")
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" serial PRIMARY KEY NOT NULL,
	"media_type" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "genres_media_type_name_unique" UNIQUE("media_type","name")
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movie_cast" (
	"movie_id" text NOT NULL,
	"person_id" text NOT NULL,
	"character" text,
	"role" text,
	"position" integer NOT NULL,
	CONSTRAINT "movie_cast_movie_id_person_id_pk" PRIMARY KEY("movie_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "movie_genres" (
	"movie_id" text NOT NULL,
	"genre_id" integer NOT NULL,
	CONSTRAINT "movie_genres_movie_id_genre_id_pk" PRIMARY KEY("movie_id","genre_id")
);
--> statement-breakpoint
CREATE TABLE "movies" (
	"id" text PRIMARY KEY NOT NULL,
	"tmdb_id" integer,
	"imdb_id" text,
	"title" text NOT NULL,
	"original_title" text,
	"year" integer,
	"release_date" date,
	"runtime_minutes" integer,
	"rating" real,
	"maturity_rating" text,
	"language_code" text,
	"synopsis" text,
	"short_synopsis" text,
	"director_id" text,
	"palette" jsonb,
	"availability" jsonb,
	"trailer" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movies_tmdb_id_unique" UNIQUE("tmdb_id"),
	CONSTRAINT "movies_imdb_id_unique" UNIQUE("imdb_id")
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"year" integer,
	"rating" real,
	"author" text,
	"artist" text,
	"reading_direction" text,
	"reading_format" text,
	"synopsis" text,
	"short_synopsis" text,
	"palette" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "series_alt_titles" (
	"series_id" text NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "series_alt_titles_series_id_title_pk" PRIMARY KEY("series_id","title")
);
--> statement-breakpoint
CREATE TABLE "series_genres" (
	"series_id" text NOT NULL,
	"genre_id" integer NOT NULL,
	CONSTRAINT "series_genres_series_id_genre_id_pk" PRIMARY KEY("series_id","genre_id")
);
--> statement-breakpoint
ALTER TABLE "chapter_pages" ADD CONSTRAINT "chapter_pages_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_cast" ADD CONSTRAINT "movie_cast_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_cast" ADD CONSTRAINT "movie_cast_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_genres" ADD CONSTRAINT "movie_genres_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_genres" ADD CONSTRAINT "movie_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movies" ADD CONSTRAINT "movies_language_code_languages_code_fk" FOREIGN KEY ("language_code") REFERENCES "public"."languages"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movies" ADD CONSTRAINT "movies_director_id_people_id_fk" FOREIGN KEY ("director_id") REFERENCES "public"."people"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_alt_titles" ADD CONSTRAINT "series_alt_titles_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_genres" ADD CONSTRAINT "series_genres_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_genres" ADD CONSTRAINT "series_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE no action ON UPDATE no action;