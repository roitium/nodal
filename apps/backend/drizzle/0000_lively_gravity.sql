CREATE TABLE "memos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"images" text[],
	"user_id" uuid,
	"guest_name" text,
	"guest_email" text,
	"parent_id" uuid,
	"quote_id" uuid,
	"path" text DEFAULT '/',
	"visibility" text DEFAULT 'public' NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"is_pinned" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"username" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"bio" text,
	"is_admin" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "memos" ADD CONSTRAINT "memos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memos" ADD CONSTRAINT "memos_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."memos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memos" ADD CONSTRAINT "memos_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."memos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_memos_user" ON "memos" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_memos_parent" ON "memos" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_memos_quote" ON "memos" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "idx_memos_path" ON "memos" USING btree ("path");