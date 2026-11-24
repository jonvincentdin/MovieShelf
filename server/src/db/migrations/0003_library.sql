CREATE TABLE "chapter_status" (
	"device_id" uuid NOT NULL,
	"chapter_id" text NOT NULL,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chapter_status_device_id_chapter_id_pk" PRIMARY KEY("device_id","chapter_id")
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"media_type" text NOT NULL,
	"media_id" text NOT NULL,
	"status" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "library_items_device_id_media_type_media_id_unique" UNIQUE("device_id","media_type","media_id")
);
--> statement-breakpoint
CREATE TABLE "reading_progress" (
	"device_id" uuid NOT NULL,
	"series_id" text NOT NULL,
	"chapter_id" text NOT NULL,
	"page_index" integer NOT NULL,
	"total_pages" integer NOT NULL,
	"mode" text NOT NULL,
	"in_continue" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reading_progress_device_id_series_id_pk" PRIMARY KEY("device_id","series_id")
);
--> statement-breakpoint
CREATE TABLE "watch_progress" (
	"device_id" uuid NOT NULL,
	"movie_id" text NOT NULL,
	"position_sec" real NOT NULL,
	"duration_sec" real NOT NULL,
	"watched_at" timestamp with time zone,
	"in_continue" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "watch_progress_device_id_movie_id_pk" PRIMARY KEY("device_id","movie_id")
);
--> statement-breakpoint
ALTER TABLE "chapter_status" ADD CONSTRAINT "chapter_status_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_status" ADD CONSTRAINT "chapter_status_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_progress" ADD CONSTRAINT "watch_progress_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_progress" ADD CONSTRAINT "watch_progress_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;