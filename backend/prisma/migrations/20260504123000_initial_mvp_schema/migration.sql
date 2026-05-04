-- Enable UUID generation via gen_random_uuid().
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateEnum
CREATE TYPE "RegisterPermissionRole" AS ENUM ('REGISTER_ADMIN', 'REGISTER_VIEWER');

-- CreateEnum
CREATE TYPE "RiskState" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'MULTILINE_TEXT', 'BOOLEAN', 'NUMBER', 'DATE', 'DROPDOWN', 'PERSON_PICKER');

-- CreateEnum
CREATE TYPE "AuditScopeType" AS ENUM ('SYSTEM', 'REGISTER', 'RISK');

-- CreateEnum
CREATE TYPE "AuditObjectType" AS ENUM ('USER', 'REGISTER', 'REGISTER_PERMISSION', 'RISK', 'RISK_REVIEW', 'CUSTOM_FIELD', 'CUSTOM_FIELD_OPTION', 'LIKELIHOOD_VALUE', 'IMPACT_VALUE', 'RISK_LEVEL', 'RISK_MATRIX', 'RESPONSE_STRATEGY', 'EXPORT', 'AUTH', 'API_KEY');

-- CreateEnum
CREATE TYPE "AuditValueType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'JSON', 'USER', 'UUID');

-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('REQUESTED', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "user" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_system_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_failed_login_at" TIMESTAMPTZ(6),
    "locked_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by_user_id" UUID,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "token_family_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "replaced_by_token_id" UUID,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_key" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "last_used_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" UUID,

    CONSTRAINT "api_key_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "register" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "risk_id_prefix" TEXT,
    "risk_id_zero_padding_enabled" BOOLEAN NOT NULL DEFAULT false,
    "risk_id_zero_padding_width" INTEGER NOT NULL DEFAULT 4,
    "next_risk_sequence" INTEGER NOT NULL DEFAULT 1,
    "default_new_risk_state" "RiskState" NOT NULL DEFAULT 'DRAFT',
    "reviews_enabled" BOOLEAN NOT NULL DEFAULT true,
    "default_review_frequency_months" INTEGER NOT NULL DEFAULT 12,
    "review_attestation_text" TEXT NOT NULL DEFAULT 'I confirm that I have reviewed this risk and the recorded details remain accurate or have been updated.',
    "allow_viewer_export" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by_user_id" UUID NOT NULL,

    CONSTRAINT "register_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "register_permission" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "register_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "RegisterPermissionRole" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" UUID NOT NULL,

    CONSTRAINT "register_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "register_id" UUID NOT NULL,
    "display_risk_id" TEXT NOT NULL,
    "risk_sequence" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "state" "RiskState" NOT NULL DEFAULT 'DRAFT',
    "owner_user_id" UUID NOT NULL,
    "created_date" DATE NOT NULL,
    "likelihood_value_id" UUID NOT NULL,
    "impact_value_id" UUID NOT NULL,
    "risk_score" DECIMAL(12,4) NOT NULL,
    "risk_level_id" UUID NOT NULL,
    "response_strategy_id" UUID NOT NULL,
    "response_action" TEXT,
    "last_reviewed_at" TIMESTAMPTZ(6),
    "last_reviewed_by_user_id" UUID,
    "next_review_date" DATE,
    "system_created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "system_created_by_user_id" UUID NOT NULL,
    "system_updated_at" TIMESTAMPTZ(6) NOT NULL,
    "system_updated_by_user_id" UUID NOT NULL,

    CONSTRAINT "risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_review" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "risk_id" UUID NOT NULL,
    "register_id" UUID NOT NULL,
    "reviewed_by_user_id" UUID NOT NULL,
    "reviewed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,
    "attestation_text" TEXT NOT NULL,
    "calculated_next_review_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "likelihood_value" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "register_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "numeric_value" DECIMAL(12,4) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "likelihood_value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impact_value" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "register_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "numeric_value" DECIMAL(12,4) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "impact_value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_level" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "register_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "risk_level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_matrix_cell" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "register_id" UUID NOT NULL,
    "likelihood_value_id" UUID NOT NULL,
    "impact_value_id" UUID NOT NULL,
    "risk_level_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "risk_matrix_cell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "response_strategy" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "register_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "response_strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_definition" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "register_id" UUID NOT NULL,
    "field_name" TEXT NOT NULL,
    "field_type" "CustomFieldType" NOT NULL,
    "help_text" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by_user_id" UUID NOT NULL,

    CONSTRAINT "custom_field_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_option" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "custom_field_definition_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "custom_field_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_custom_field_value" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "risk_id" UUID NOT NULL,
    "register_id" UUID NOT NULL,
    "custom_field_definition_id" UUID NOT NULL,
    "text_value" TEXT,
    "number_value" DECIMAL(18,6),
    "boolean_value" BOOLEAN,
    "date_value" DATE,
    "person_user_id" UUID,
    "person_email" TEXT,
    "dropdown_option_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "risk_custom_field_value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_user_id" UUID,
    "actor_display_name" TEXT,
    "actor_email" TEXT,
    "action" TEXT NOT NULL,
    "object_type" "AuditObjectType" NOT NULL,
    "object_id" TEXT NOT NULL,
    "object_display_name" TEXT,
    "scope_type" "AuditScopeType" NOT NULL,
    "register_id" UUID,
    "risk_id" UUID,
    "display_risk_id" TEXT,
    "summary" TEXT NOT NULL,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_field_change" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "audit_event_id" UUID NOT NULL,
    "field_name" TEXT NOT NULL,
    "field_label" TEXT,
    "previous_value" JSONB,
    "new_value" JSONB,
    "value_type" "AuditValueType",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_field_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_risk_snapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "audit_event_id" UUID NOT NULL,
    "risk_internal_id" UUID NOT NULL,
    "register_id" UUID NOT NULL,
    "display_risk_id" TEXT NOT NULL,
    "snapshot_json" JSONB NOT NULL,
    "deletion_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_risk_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_job" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "register_id" UUID NOT NULL,
    "requested_by_user_id" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filter_json" JSONB,
    "included_closed_risks" BOOLEAN NOT NULL DEFAULT false,
    "row_count" INTEGER,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'REQUESTED',
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "export_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_is_active_idx" ON "user"("is_active");

-- CreateIndex
CREATE INDEX "user_is_system_admin_idx" ON "user"("is_system_admin");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_token_hash_key" ON "refresh_token"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_token_replaced_by_token_id_key" ON "refresh_token"("replaced_by_token_id");

-- CreateIndex
CREATE INDEX "refresh_token_user_id_idx" ON "refresh_token"("user_id");

-- CreateIndex
CREATE INDEX "refresh_token_token_family_id_idx" ON "refresh_token"("token_family_id");

-- CreateIndex
CREATE INDEX "refresh_token_expires_at_idx" ON "refresh_token"("expires_at");

-- CreateIndex
CREATE INDEX "refresh_token_revoked_at_idx" ON "refresh_token"("revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "api_key_key_prefix_key" ON "api_key"("key_prefix");

-- CreateIndex
CREATE UNIQUE INDEX "api_key_key_hash_key" ON "api_key"("key_hash");

-- CreateIndex
CREATE INDEX "api_key_user_id_idx" ON "api_key"("user_id");

-- CreateIndex
CREATE INDEX "api_key_revoked_at_idx" ON "api_key"("revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "register_name_key" ON "register"("name");

-- CreateIndex
CREATE INDEX "register_name_idx" ON "register"("name");

-- CreateIndex
CREATE INDEX "register_permission_user_id_role_idx" ON "register_permission"("user_id", "role");

-- CreateIndex
CREATE INDEX "register_permission_register_id_role_idx" ON "register_permission"("register_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "register_permission_register_id_user_id_role_key" ON "register_permission"("register_id", "user_id", "role");

-- CreateIndex
CREATE INDEX "risk_register_id_state_idx" ON "risk"("register_id", "state");

-- CreateIndex
CREATE INDEX "risk_register_id_owner_user_id_idx" ON "risk"("register_id", "owner_user_id");

-- CreateIndex
CREATE INDEX "risk_register_id_risk_level_id_idx" ON "risk"("register_id", "risk_level_id");

-- CreateIndex
CREATE INDEX "risk_register_id_next_review_date_idx" ON "risk"("register_id", "next_review_date");

-- CreateIndex
CREATE INDEX "risk_system_updated_at_idx" ON "risk"("system_updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "risk_register_id_display_risk_id_key" ON "risk"("register_id", "display_risk_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_register_id_risk_sequence_key" ON "risk"("register_id", "risk_sequence");

-- CreateIndex
CREATE INDEX "risk_review_risk_id_reviewed_at_idx" ON "risk_review"("risk_id", "reviewed_at");

-- CreateIndex
CREATE INDEX "risk_review_register_id_reviewed_at_idx" ON "risk_review"("register_id", "reviewed_at");

-- CreateIndex
CREATE INDEX "risk_review_reviewed_by_user_id_idx" ON "risk_review"("reviewed_by_user_id");

-- CreateIndex
CREATE INDEX "likelihood_value_register_id_is_active_idx" ON "likelihood_value"("register_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "likelihood_value_register_id_name_key" ON "likelihood_value"("register_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "likelihood_value_register_id_numeric_value_key" ON "likelihood_value"("register_id", "numeric_value");

-- CreateIndex
CREATE UNIQUE INDEX "likelihood_value_register_id_display_order_key" ON "likelihood_value"("register_id", "display_order");

-- CreateIndex
CREATE INDEX "impact_value_register_id_is_active_idx" ON "impact_value"("register_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "impact_value_register_id_name_key" ON "impact_value"("register_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "impact_value_register_id_numeric_value_key" ON "impact_value"("register_id", "numeric_value");

-- CreateIndex
CREATE UNIQUE INDEX "impact_value_register_id_display_order_key" ON "impact_value"("register_id", "display_order");

-- CreateIndex
CREATE INDEX "risk_level_register_id_is_active_idx" ON "risk_level"("register_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "risk_level_register_id_name_key" ON "risk_level"("register_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "risk_level_register_id_display_order_key" ON "risk_level"("register_id", "display_order");

-- CreateIndex
CREATE INDEX "risk_matrix_cell_register_id_risk_level_id_idx" ON "risk_matrix_cell"("register_id", "risk_level_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_matrix_cell_register_id_likelihood_value_id_impact_val_key" ON "risk_matrix_cell"("register_id", "likelihood_value_id", "impact_value_id");

-- CreateIndex
CREATE INDEX "response_strategy_register_id_is_active_idx" ON "response_strategy"("register_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "response_strategy_register_id_name_key" ON "response_strategy"("register_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "response_strategy_register_id_display_order_key" ON "response_strategy"("register_id", "display_order");

-- CreateIndex
CREATE INDEX "custom_field_definition_register_id_is_active_idx" ON "custom_field_definition"("register_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_definition_register_id_field_name_key" ON "custom_field_definition"("register_id", "field_name");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_definition_register_id_display_order_key" ON "custom_field_definition"("register_id", "display_order");

-- CreateIndex
CREATE INDEX "custom_field_option_custom_field_definition_id_is_active_idx" ON "custom_field_option"("custom_field_definition_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_option_custom_field_definition_id_label_key" ON "custom_field_option"("custom_field_definition_id", "label");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_option_custom_field_definition_id_display_orde_key" ON "custom_field_option"("custom_field_definition_id", "display_order");

-- CreateIndex
CREATE INDEX "risk_custom_field_value_register_id_custom_field_definition_idx" ON "risk_custom_field_value"("register_id", "custom_field_definition_id");

-- CreateIndex
CREATE INDEX "risk_custom_field_value_dropdown_option_id_idx" ON "risk_custom_field_value"("dropdown_option_id");

-- CreateIndex
CREATE INDEX "risk_custom_field_value_person_user_id_idx" ON "risk_custom_field_value"("person_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_custom_field_value_risk_id_custom_field_definition_id_key" ON "risk_custom_field_value"("risk_id", "custom_field_definition_id");

-- CreateIndex
CREATE INDEX "audit_event_occurred_at_idx" ON "audit_event"("occurred_at");

-- CreateIndex
CREATE INDEX "audit_event_actor_user_id_idx" ON "audit_event"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_event_scope_type_occurred_at_idx" ON "audit_event"("scope_type", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_event_register_id_occurred_at_idx" ON "audit_event"("register_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_event_risk_id_occurred_at_idx" ON "audit_event"("risk_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_event_display_risk_id_occurred_at_idx" ON "audit_event"("display_risk_id", "occurred_at");

-- CreateIndex
CREATE INDEX "audit_event_object_type_object_id_idx" ON "audit_event"("object_type", "object_id");

-- CreateIndex
CREATE INDEX "audit_event_action_idx" ON "audit_event"("action");

-- CreateIndex
CREATE INDEX "audit_field_change_audit_event_id_idx" ON "audit_field_change"("audit_event_id");

-- CreateIndex
CREATE INDEX "audit_field_change_field_name_idx" ON "audit_field_change"("field_name");

-- CreateIndex
CREATE UNIQUE INDEX "audit_risk_snapshot_audit_event_id_key" ON "audit_risk_snapshot"("audit_event_id");

-- CreateIndex
CREATE INDEX "audit_risk_snapshot_register_id_display_risk_id_idx" ON "audit_risk_snapshot"("register_id", "display_risk_id");

-- CreateIndex
CREATE INDEX "audit_risk_snapshot_risk_internal_id_idx" ON "audit_risk_snapshot"("risk_internal_id");

-- CreateIndex
CREATE INDEX "export_job_register_id_requested_at_idx" ON "export_job"("register_id", "requested_at");

-- CreateIndex
CREATE INDEX "export_job_requested_by_user_id_requested_at_idx" ON "export_job"("requested_by_user_id", "requested_at");

-- CreateIndex
CREATE INDEX "export_job_status_idx" ON "export_job"("status");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_replaced_by_token_id_fkey" FOREIGN KEY ("replaced_by_token_id") REFERENCES "refresh_token"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "register" ADD CONSTRAINT "register_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "register" ADD CONSTRAINT "register_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "register_permission" ADD CONSTRAINT "register_permission_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "register"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "register_permission" ADD CONSTRAINT "register_permission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "register_permission" ADD CONSTRAINT "register_permission_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk" ADD CONSTRAINT "risk_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "register"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk" ADD CONSTRAINT "risk_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk" ADD CONSTRAINT "risk_likelihood_value_id_fkey" FOREIGN KEY ("likelihood_value_id") REFERENCES "likelihood_value"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk" ADD CONSTRAINT "risk_impact_value_id_fkey" FOREIGN KEY ("impact_value_id") REFERENCES "impact_value"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk" ADD CONSTRAINT "risk_risk_level_id_fkey" FOREIGN KEY ("risk_level_id") REFERENCES "risk_level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk" ADD CONSTRAINT "risk_response_strategy_id_fkey" FOREIGN KEY ("response_strategy_id") REFERENCES "response_strategy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk" ADD CONSTRAINT "risk_system_created_by_user_id_fkey" FOREIGN KEY ("system_created_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk" ADD CONSTRAINT "risk_system_updated_by_user_id_fkey" FOREIGN KEY ("system_updated_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk" ADD CONSTRAINT "risk_last_reviewed_by_user_id_fkey" FOREIGN KEY ("last_reviewed_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_review" ADD CONSTRAINT "risk_review_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_review" ADD CONSTRAINT "risk_review_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "register"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_review" ADD CONSTRAINT "risk_review_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likelihood_value" ADD CONSTRAINT "likelihood_value_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "register"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impact_value" ADD CONSTRAINT "impact_value_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "register"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_level" ADD CONSTRAINT "risk_level_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "register"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_matrix_cell" ADD CONSTRAINT "risk_matrix_cell_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "register"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_matrix_cell" ADD CONSTRAINT "risk_matrix_cell_likelihood_value_id_fkey" FOREIGN KEY ("likelihood_value_id") REFERENCES "likelihood_value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_matrix_cell" ADD CONSTRAINT "risk_matrix_cell_impact_value_id_fkey" FOREIGN KEY ("impact_value_id") REFERENCES "impact_value"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_matrix_cell" ADD CONSTRAINT "risk_matrix_cell_risk_level_id_fkey" FOREIGN KEY ("risk_level_id") REFERENCES "risk_level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "response_strategy" ADD CONSTRAINT "response_strategy_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "register"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_definition" ADD CONSTRAINT "custom_field_definition_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "register"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_definition" ADD CONSTRAINT "custom_field_definition_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_definition" ADD CONSTRAINT "custom_field_definition_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_option" ADD CONSTRAINT "custom_field_option_custom_field_definition_id_fkey" FOREIGN KEY ("custom_field_definition_id") REFERENCES "custom_field_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_custom_field_value" ADD CONSTRAINT "risk_custom_field_value_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_custom_field_value" ADD CONSTRAINT "risk_custom_field_value_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "register"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_custom_field_value" ADD CONSTRAINT "risk_custom_field_value_custom_field_definition_id_fkey" FOREIGN KEY ("custom_field_definition_id") REFERENCES "custom_field_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_custom_field_value" ADD CONSTRAINT "risk_custom_field_value_person_user_id_fkey" FOREIGN KEY ("person_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_custom_field_value" ADD CONSTRAINT "risk_custom_field_value_dropdown_option_id_fkey" FOREIGN KEY ("dropdown_option_id") REFERENCES "custom_field_option"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "register"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "risk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_field_change" ADD CONSTRAINT "audit_field_change_audit_event_id_fkey" FOREIGN KEY ("audit_event_id") REFERENCES "audit_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_risk_snapshot" ADD CONSTRAINT "audit_risk_snapshot_audit_event_id_fkey" FOREIGN KEY ("audit_event_id") REFERENCES "audit_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_risk_snapshot" ADD CONSTRAINT "audit_risk_snapshot_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "register"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_job" ADD CONSTRAINT "export_job_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "register"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_job" ADD CONSTRAINT "export_job_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
