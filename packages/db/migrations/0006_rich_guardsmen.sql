CREATE TABLE "kpi_reviews" (
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
	"review_period" text NOT NULL,
	"scores" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"overall_score" integer,
	"feedback" text,
	"status" "workflow_status" DEFAULT 'draft' NOT NULL,
	"completed_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"review_note" text
);
--> statement-breakpoint
ALTER TABLE "kpi_reviews" ADD CONSTRAINT "kpi_reviews_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_reviews" ADD CONSTRAINT "kpi_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_reviews" ADD CONSTRAINT "kpi_reviews_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "kpi_reviews_candidate_period_unique_idx" ON "kpi_reviews" USING btree ("candidate_id","review_period");--> statement-breakpoint
CREATE INDEX "kpi_reviews_candidate_id_idx" ON "kpi_reviews" USING btree ("candidate_id");--> statement-breakpoint
CREATE INDEX "kpi_reviews_reviewer_id_idx" ON "kpi_reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "kpi_reviews_status_idx" ON "kpi_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "kpi_reviews_deleted_at_idx" ON "kpi_reviews" USING btree ("deleted_at");