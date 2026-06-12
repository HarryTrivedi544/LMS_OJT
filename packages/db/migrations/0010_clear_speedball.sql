ALTER TABLE "kpi_reviews" ADD COLUMN "review_date" date;--> statement-breakpoint
ALTER TABLE "kpi_reviews" ADD COLUMN "current_phase" text;--> statement-breakpoint
ALTER TABLE "kpi_reviews" ADD COLUMN "current_designation" text;--> statement-breakpoint
ALTER TABLE "kpi_reviews" ADD COLUMN "program_start_date" date;--> statement-breakpoint
ALTER TABLE "kpi_reviews" ADD COLUMN "months_in_current_phase" integer;--> statement-breakpoint
ALTER TABLE "kpi_reviews" ADD COLUMN "attendance_summary" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "kpi_reviews" ADD COLUMN "summary" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "kpi_reviews" ADD COLUMN "improvement_plan" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "kpi_reviews" ADD COLUMN "promotion_signal" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "kpi_reviews" ADD COLUMN "fee_recommendation" jsonb;