CREATE TABLE IF NOT EXISTS "chatbots" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"name" text DEFAULT 'My Chatbot' NOT NULL,
	"api_key" varchar(64) NOT NULL,
	"settings" jsonb DEFAULT '{"primaryColor":"#7c3aed","botName":"AI Assistant","welcomeMessage":"Hi! How can I help you today?","placeholder":"Ask me anything..."}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chatbots" ADD CONSTRAINT "chatbots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
