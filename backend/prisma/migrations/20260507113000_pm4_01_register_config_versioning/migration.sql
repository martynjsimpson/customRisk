-- PM4-01 register configuration versioning foundation.
--
-- Rollback approach:
-- 1. Disable any post-PM4 application code before rollback.
-- 2. Clear register.current_config_version_id and config_version_id values if the
--    pre-PM4 code path must be restored against this schema.
-- 3. Only then remove the Phase 4 structures in a dedicated rollback migration.
--
-- The version pointer columns remain nullable to preserve that rollback window.

-- CreateEnum
CREATE TYPE "RegisterConfigVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "register"
ADD COLUMN "current_config_version_id" UUID;

-- CreateTable
CREATE TABLE "register_config_version" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "register_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "RegisterConfigVersionStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "published_by_user_id" UUID,

    CONSTRAINT "register_config_version_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "likelihood_value"
ADD COLUMN "config_version_id" UUID;

-- AlterTable
ALTER TABLE "impact_value"
ADD COLUMN "config_version_id" UUID;

-- AlterTable
ALTER TABLE "risk_level"
ADD COLUMN "config_version_id" UUID;

-- AlterTable
ALTER TABLE "risk_matrix_cell"
ADD COLUMN "config_version_id" UUID;

-- AlterTable
ALTER TABLE "response_strategy"
ADD COLUMN "config_version_id" UUID;

-- AlterTable
ALTER TABLE "custom_field_definition"
ADD COLUMN "config_version_id" UUID;

-- DropIndex
DROP INDEX "likelihood_value_register_id_name_key";
DROP INDEX "likelihood_value_register_id_numeric_value_key";
DROP INDEX "likelihood_value_register_id_display_order_key";
DROP INDEX "impact_value_register_id_name_key";
DROP INDEX "impact_value_register_id_numeric_value_key";
DROP INDEX "impact_value_register_id_display_order_key";
DROP INDEX "risk_level_register_id_name_key";
DROP INDEX "risk_level_register_id_display_order_key";
DROP INDEX "risk_matrix_cell_register_id_likelihood_value_id_impact_val_key";
DROP INDEX "response_strategy_register_id_name_key";
DROP INDEX "response_strategy_register_id_display_order_key";
DROP INDEX "custom_field_definition_register_id_field_name_key";
DROP INDEX "custom_field_definition_register_id_display_order_key";

-- CreateIndex
CREATE UNIQUE INDEX "register_current_config_version_id_key" ON "register"("current_config_version_id");
CREATE UNIQUE INDEX "register_config_version_register_id_version_number_key" ON "register_config_version"("register_id", "version_number");
CREATE INDEX "register_config_version_register_id_status_idx" ON "register_config_version"("register_id", "status");

CREATE UNIQUE INDEX "likelihood_value_register_id_config_version_id_name_key" ON "likelihood_value"("register_id", "config_version_id", "name");
CREATE UNIQUE INDEX "likelihood_value_register_id_config_version_id_numeric_value_key" ON "likelihood_value"("register_id", "config_version_id", "numeric_value");
CREATE UNIQUE INDEX "likelihood_value_register_id_config_version_id_display_ord_key" ON "likelihood_value"("register_id", "config_version_id", "display_order");
CREATE INDEX "likelihood_value_register_id_config_version_id_idx" ON "likelihood_value"("register_id", "config_version_id");

CREATE UNIQUE INDEX "impact_value_register_id_config_version_id_name_key" ON "impact_value"("register_id", "config_version_id", "name");
CREATE UNIQUE INDEX "impact_value_register_id_config_version_id_numeric_value_key" ON "impact_value"("register_id", "config_version_id", "numeric_value");
CREATE UNIQUE INDEX "impact_value_register_id_config_version_id_display_order_key" ON "impact_value"("register_id", "config_version_id", "display_order");
CREATE INDEX "impact_value_register_id_config_version_id_idx" ON "impact_value"("register_id", "config_version_id");

CREATE UNIQUE INDEX "risk_level_register_id_config_version_id_name_key" ON "risk_level"("register_id", "config_version_id", "name");
CREATE UNIQUE INDEX "risk_level_register_id_config_version_id_display_order_key" ON "risk_level"("register_id", "config_version_id", "display_order");
CREATE INDEX "risk_level_register_id_config_version_id_idx" ON "risk_level"("register_id", "config_version_id");

CREATE UNIQUE INDEX "risk_matrix_cell_register_id_config_version_id_lookup_key" ON "risk_matrix_cell"("register_id", "config_version_id", "likelihood_value_id", "impact_value_id");
CREATE INDEX "risk_matrix_cell_register_id_config_version_id_idx" ON "risk_matrix_cell"("register_id", "config_version_id");

CREATE UNIQUE INDEX "response_strategy_register_id_config_version_id_name_key" ON "response_strategy"("register_id", "config_version_id", "name");
CREATE UNIQUE INDEX "response_strategy_register_id_config_version_id_display_order_key" ON "response_strategy"("register_id", "config_version_id", "display_order");
CREATE INDEX "response_strategy_register_id_config_version_id_idx" ON "response_strategy"("register_id", "config_version_id");

CREATE UNIQUE INDEX "custom_field_definition_register_id_config_version_id_field_n_key" ON "custom_field_definition"("register_id", "config_version_id", "field_name");
CREATE UNIQUE INDEX "custom_field_definition_register_id_config_version_id_display_key" ON "custom_field_definition"("register_id", "config_version_id", "display_order");
CREATE INDEX "custom_field_definition_register_id_config_version_id_idx" ON "custom_field_definition"("register_id", "config_version_id");

-- AddForeignKey
ALTER TABLE "register"
ADD CONSTRAINT "register_current_config_version_id_fkey"
FOREIGN KEY ("current_config_version_id") REFERENCES "register_config_version"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "register_config_version"
ADD CONSTRAINT "register_config_version_register_id_fkey"
FOREIGN KEY ("register_id") REFERENCES "register"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "register_config_version"
ADD CONSTRAINT "register_config_version_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "register_config_version"
ADD CONSTRAINT "register_config_version_published_by_user_id_fkey"
FOREIGN KEY ("published_by_user_id") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "likelihood_value"
ADD CONSTRAINT "likelihood_value_config_version_id_fkey"
FOREIGN KEY ("config_version_id") REFERENCES "register_config_version"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "impact_value"
ADD CONSTRAINT "impact_value_config_version_id_fkey"
FOREIGN KEY ("config_version_id") REFERENCES "register_config_version"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "risk_level"
ADD CONSTRAINT "risk_level_config_version_id_fkey"
FOREIGN KEY ("config_version_id") REFERENCES "register_config_version"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "risk_matrix_cell"
ADD CONSTRAINT "risk_matrix_cell_config_version_id_fkey"
FOREIGN KEY ("config_version_id") REFERENCES "register_config_version"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "response_strategy"
ADD CONSTRAINT "response_strategy_config_version_id_fkey"
FOREIGN KEY ("config_version_id") REFERENCES "register_config_version"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "custom_field_definition"
ADD CONSTRAINT "custom_field_definition_config_version_id_fkey"
FOREIGN KEY ("config_version_id") REFERENCES "register_config_version"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
