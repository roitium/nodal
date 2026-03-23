CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"type" text NOT NULL,
	"size" integer NOT NULL,
	"provider" text DEFAULT 'supabase' NOT NULL,
	"path" text NOT NULL,
	"external_link" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;