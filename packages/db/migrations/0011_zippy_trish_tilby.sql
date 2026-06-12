CREATE TABLE "quarterly_kpi_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"candidate_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"review_year" integer NOT NULL,
	"review_quarter" integer NOT NULL,
	"review_date" date,
	"review_period_start" date NOT NULL,
	"review_period_end" date NOT NULL,
	"current_phase" text,
	"current_designation" text,
	"rollup" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"assessment" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"action_plan" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"outcome" text,
	"feedback" text,
	"status" "workflow_status" DEFAULT 'draft' NOT NULL,
	"completed_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"review_note" text
);
--> statement-breakpoint
ALTER TABLE "quarterly_kpi_summaries" ADD CONSTRAINT "quarterly_kpi_summaries_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quarterly_kpi_summaries" ADD CONSTRAINT "quarterly_kpi_summaries_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quarterly_kpi_summaries" ADD CONSTRAINT "quarterly_kpi_summaries_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quarterly_kpi_summaries_candidate_period_unique_idx" ON "quarterly_kpi_summaries" USING btree ("candidate_id","review_year","review_quarter");--> statement-breakpoint
CREATE INDEX "quarterly_kpi_summaries_candidate_id_idx" ON "quarterly_kpi_summaries" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "quarterly_kpi_summaries_reviewer_id_idx" ON "quarterly_kpi_summaries" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "quarterly_kpi_summaries_status_idx" ON "quarterly_kpi_summaries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quarterly_kpi_summaries_deleted_at_idx" ON "quarterly_kpi_summaries" USING btree ("deleted_at");