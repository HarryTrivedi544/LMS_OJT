CREATE TABLE "phase_promotion_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"candidate_id" uuid NOT NULL,
	"prepared_by" uuid NOT NULL,
	"prepared_date" date NOT NULL,
	"current_phase" text NOT NULL,
	"current_designation" text NOT NULL,
	"proposed_next_phase" text NOT NULL,
	"proposed_next_designation" text NOT NULL,
	"current_monthly_fee" integer,
	"proposed_monthly_fee" integer,
	"current_phase_start_date" date,
	"months_in_current_phase" integer,
	"promotion_effective_date" date NOT NULL,
	"promotion_cycle_type" text NOT NULL,
	"case_type" text NOT NULL,
	"exception_reason" text,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"eligibility_checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lead_recommendation" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"program_admin_review" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"super_admin_decision" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"candidate_acknowledged_at" timestamp with time zone,
	"candidate_acknowledged_by" uuid,
	"status" "workflow_status" DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"program_admin_reviewed_at" timestamp with time zone,
	"program_admin_reviewed_by" uuid,
	"super_admin_reviewed_at" timestamp with time zone,
	"super_admin_reviewed_by" uuid,
	"review_note" text
);
--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "current_phase" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "current_designation" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "current_monthly_fee" integer;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "current_phase_start_date" date;--> statement-breakpoint
ALTER TABLE "phase_promotion_reviews" ADD CONSTRAINT "phase_promotion_reviews_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_promotion_reviews" ADD CONSTRAINT "phase_promotion_reviews_prepared_by_users_id_fk" FOREIGN KEY ("prepared_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_promotion_reviews" ADD CONSTRAINT "phase_promotion_reviews_candidate_acknowledged_by_users_id_fk" FOREIGN KEY ("candidate_acknowledged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_promotion_reviews" ADD CONSTRAINT "phase_promotion_reviews_program_admin_reviewed_by_users_id_fk" FOREIGN KEY ("program_admin_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_promotion_reviews" ADD CONSTRAINT "phase_promotion_reviews_super_admin_reviewed_by_users_id_fk" FOREIGN KEY ("super_admin_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "phase_promotion_reviews_candidate_id_idx" ON "phase_promotion_reviews" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "phase_promotion_reviews_prepared_by_idx" ON "phase_promotion_reviews" USING btree ("prepared_by");--> statement-breakpoint
CREATE INDEX "phase_promotion_reviews_status_idx" ON "phase_promotion_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "phase_promotion_reviews_effective_date_idx" ON "phase_promotion_reviews" USING btree ("promotion_effective_date");--> statement-breakpoint
CREATE INDEX "phase_promotion_reviews_deleted_at_idx" ON "phase_promotion_reviews" USING btree ("deleted_at");