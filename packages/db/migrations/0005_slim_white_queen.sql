CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TABLE "task_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"candidate_id" uuid NOT NULL,
	"assigned_by" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"task_reference" text,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"due_date" date,
	"status" "workflow_status" DEFAULT 'draft' NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"submission_summary" text,
	"submission_deliverables" text,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"review_note" text
);
--> statement-breakpoint
ALTER TABLE "task_briefs" ADD CONSTRAINT "task_briefs_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_briefs" ADD CONSTRAINT "task_briefs_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_briefs" ADD CONSTRAINT "task_briefs_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_briefs_candidate_id_idx" ON "task_briefs" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "task_briefs_assigned_by_idx" ON "task_briefs" USING btree ("assigned_by");--> statement-breakpoint
CREATE INDEX "task_briefs_status_idx" ON "task_briefs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "task_briefs_due_date_idx" ON "task_briefs" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "task_briefs_deleted_at_idx" ON "task_briefs" USING btree ("deleted_at");