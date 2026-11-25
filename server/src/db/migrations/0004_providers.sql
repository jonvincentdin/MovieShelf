CREATE TABLE "movie_providers" (
	"movie_id" text NOT NULL,
	"region_code" text NOT NULL,
	"provider_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"price" text,
	"quality" text,
	"url" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "movie_providers_movie_id_region_code_provider_id_pk" PRIMARY KEY("movie_id","region_code","provider_id")
);
--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "movie_providers" ADD CONSTRAINT "movie_providers_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_providers" ADD CONSTRAINT "movie_providers_region_code_regions_code_fk" FOREIGN KEY ("region_code") REFERENCES "public"."regions"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_region_regions_code_fk" FOREIGN KEY ("region") REFERENCES "public"."regions"("code") ON DELETE no action ON UPDATE no action;