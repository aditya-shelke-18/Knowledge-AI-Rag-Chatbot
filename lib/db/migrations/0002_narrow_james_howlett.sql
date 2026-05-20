-- Clear existing data that has no owner (can't be assigned to a user)
DELETE FROM "files";
DELETE FROM "conversations";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "user_id" varchar(191) NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "user_id" varchar(191) NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "user_id" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "user_id" DROP DEFAULT;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
