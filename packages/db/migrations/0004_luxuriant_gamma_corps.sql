CREATE TABLE "timesheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"candidate_id" uuid NOT NULL,
	"week_start_date" date NOT NULL,
	"week_end_date" date NOT NULL,
	"total_minutes" integer DEFAULT 0 NOT NULL,
	"entries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "workflow_status" DEFAULT 'submitted' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"review_note" text
);
--> statement-breakpoint
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "timesheets_candidate_week_start_unique_idx" ON "timesheets" USING btree ("candidate_id","week_start_date");--> statement-breakpoint
CREATE INDEX "timesheets_candidate_id_idx" ON "timesheets" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "timesheets_week_start_date_idx" ON "timesheets" USING btree ("week_start_date");--> statement-breakpoint
CREATE INDEX "timesheets_status_idx" ON "timesheets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "timesheets_deleted_at_idx" ON "timesheets" USING btree ("deleted_at");