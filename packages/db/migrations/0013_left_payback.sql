CREATE TABLE "evidence_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"parent_entity_type" text NOT NULL,
	"parent_entity_id" uuid NOT NULL,
	"child_entity_type" text NOT NULL,
	"child_entity_id" uuid NOT NULL,
	"link_source" text DEFAULT 'auto_derived' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "evidence_links_parent_idx" ON "evidence_links" USING btree ("parent_entity_type","parent_entity_id");--> statement-breakpoint
CREATE INDEX "evidence_links_child_idx" ON "evidence_links" USING btree ("child_entity_type","child_entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_links_parent_child_unique_idx" ON "evidence_links" USING btree ("parent_entity_type","parent_entity_id","child_entity_type","child_entity_id");--> statement-breakpoint
CREATE INDEX "evidence_links_deleted_at_idx" ON "evidence_links" USING btree ("deleted_at");