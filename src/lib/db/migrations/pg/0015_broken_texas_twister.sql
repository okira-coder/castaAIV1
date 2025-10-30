CREATE TABLE "knowledge_base_collection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"file_count" text DEFAULT '0' NOT NULL,
	"user_id" uuid NOT NULL,
	"visibility" varchar DEFAULT 'shared' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "knowledge_base_collection_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "knowledge_base_file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_identifier" text NOT NULL,
	"name" text NOT NULL,
	"filename" text NOT NULL,
	"size" text NOT NULL,
	"type" text NOT NULL,
	"collection_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"added_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_base_collection" ADD CONSTRAINT "knowledge_base_collection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_file" ADD CONSTRAINT "knowledge_base_file_collection_id_knowledge_base_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."knowledge_base_collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_file" ADD CONSTRAINT "knowledge_base_file_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;