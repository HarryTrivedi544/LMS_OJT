CREATE TABLE "candidate_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"candidate_id" uuid NOT NULL,
	"log_date" date NOT NULL,
	"minutes_spent" integer DEFAULT 0 NOT NULL,
	"summary" text NOT NULL,
	"blockers" text,
	"status" "workflow_status" DEFAULT 'submitted' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"review_note" text
);
--> statement-breakpoint
ALTER TABLE "candidate_logs" ADD CONSTRAINT "candidate_logs_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_logs" ADD CONSTRAINT "candidate_logs_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_logs_candidate_log_date_unique_idx" ON "candidate_logs" USING btree ("candidate_id","log_date");--> statement-breakpoint
CREATE INDEX "candidate_logs_candidate_id_idx" ON "candidate_logs" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "candidate_logs_log_date_idx" ON "candidate_logs" USING btree ("log_date");--> statement-breakpoint
CREATE INDEX "candidate_logs_status_idx" ON "candidate_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "candidate_logs_deleted_at_idx" ON "candidate_logs" USING btree ("deleted_at");