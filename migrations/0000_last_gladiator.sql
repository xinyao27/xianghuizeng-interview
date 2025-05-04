-- Drop existing tables if they exist
DROP TABLE IF EXISTS "chat_history";
DROP TABLE IF EXISTS "conversations";
DROP TABLE IF EXISTS "messages";
DROP TABLE IF EXISTS "topics";
DROP TABLE IF EXISTS "users";

-- Create the users table
CREATE TABLE IF NOT EXISTS "users" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"username" TEXT UNIQUE NOT NULL,
	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create the topics table
CREATE TABLE IF NOT EXISTS "topics" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"title" TEXT NOT NULL,
	"description" TEXT,
	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
	"updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
	"last_message_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create the messages table
CREATE TABLE IF NOT EXISTS "messages" (
	"id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	"topic_id" UUID NOT NULL REFERENCES "topics"("id") ON DELETE CASCADE,
	"user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"content" TEXT NOT NULL,
	"role" TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
	"created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
	"metadata" TEXT
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "topics_user_id_idx" ON "topics"("user_id");
CREATE INDEX IF NOT EXISTS "topics_last_message_at_idx" ON "topics"("last_message_at");
CREATE INDEX IF NOT EXISTS "messages_topic_id_idx" ON "messages"("topic_id");
CREATE INDEX IF NOT EXISTS "messages_user_id_idx" ON "messages"("user_id");
CREATE INDEX IF NOT EXISTS "messages_role_idx" ON "messages"("role");
CREATE INDEX IF NOT EXISTS "messages_created_at_idx" ON "messages"("created_at");