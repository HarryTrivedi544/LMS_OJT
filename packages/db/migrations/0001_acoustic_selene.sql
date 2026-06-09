CREATE TABLE "batch_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"user_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"role" "role" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"program_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"status" "workflow_status" DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"user_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"role" "role" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "role" NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "batch_id" uuid;--> statement-breakpoint
ALTER TABLE "batch_assignments" ADD CONSTRAINT "batch_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_assignments" ADD CONSTRAINT "batch_assignments_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_assignments" ADD CONSTRAINT "program_assignments_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "batch_assignments_user_batch_role_unique_idx" ON "batch_assignments" USING btree ("user_id","batch_id","role");--> statement-breakpoint
CREATE INDEX "batch_assignments_user_id_idx" ON "batch_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "batch_assignments_batch_id_idx" ON "batch_assignments" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "batch_assignments_role_idx" ON "batch_assignments" USING btree ("role");--> statement-breakpoint
CREATE INDEX "batch_assignments_deleted_at_idx" ON "batch_assignments" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "batches_code_unique_idx" ON "batches" USING btree ("code");--> statement-breakpoint
CREATE INDEX "batches_program_id_idx" ON "batches" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "batches_status_idx" ON "batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "batches_deleted_at_idx" ON "batches" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_name_unique_idx" ON "permissions" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "program_assignments_user_program_role_unique_idx" ON "program_assignments" USING btree ("user_id","program_id","role");--> statement-breakpoint
CREATE INDEX "program_assignments_user_id_idx" ON "program_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "program_assignments_program_id_idx" ON "program_assignments" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "program_assignments_role_idx" ON "program_assignments" USING btree ("role");--> statement-breakpoint
CREATE INDEX "program_assignments_deleted_at_idx" ON "program_assignments" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_role_permission_unique_idx" ON "role_permissions" USING btree ("role","permission_id");--> statement-breakpoint
CREATE INDEX "role_permissions_role_idx" ON "role_permissions" USING btree ("role");--> statement-breakpoint
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidates_batch_id_idx" ON "candidates" USING btree ("batch_id");