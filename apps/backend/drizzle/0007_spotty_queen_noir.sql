ALTER TABLE "memos" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "memos" DROP COLUMN "guest_name";--> statement-breakpoint
ALTER TABLE "memos" DROP COLUMN "guest_email";