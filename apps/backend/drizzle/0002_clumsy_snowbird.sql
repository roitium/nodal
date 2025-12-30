ALTER TABLE "resources" ADD COLUMN "memo_id" uuid;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_memo_id_memos_id_fk" FOREIGN KEY ("memo_id") REFERENCES "public"."memos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memos" DROP COLUMN "images";