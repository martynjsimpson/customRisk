-- Phase 4: Configuration Lifecycle and Templates
-- PM4-01: Configuration Version Data Model
-- PM4-08: Global Template Data Model

-- CreateEnum
CREATE TYPE "ConfigVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterEnum: Add Phase 4 audit object types
ALTER TYPE "AuditObjectType" ADD VALUE 'CONFIG_VERSION';
ALTER TYPE "AuditObjectType" ADD VALUE 'REGISTER_TEMPLATE';

-- CreateTable: register_config_version (before adding FKs to register to avoid circular dependency issues)
CREATE TABLE "register_config_version" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "register_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "ConfigVersionStatus" NOT NULL,
    "snapshot_json" JSONB NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),

    CONSTRAINT "register_config_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable: register_template
CREATE TABLE "register_template" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "register_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable: register_template_version
CREATE TABLE "register_template_version" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "template_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "status" "ConfigVersionStatus" NOT NULL,
    "snapshot_json" JSONB NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),

    CONSTRAINT "register_template_version_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add nullable FK columns to register (after config version table exists)
ALTER TABLE "register" ADD COLUMN "current_config_version_id" UUID;
ALTER TABLE "register" ADD COLUMN "draft_config_version_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "register_config_version_register_id_version_number_key" ON "register_config_version"("register_id", "version_number");
CREATE INDEX "register_config_version_register_id_status_idx" ON "register_config_version"("register_id", "status");

CREATE UNIQUE INDEX "register_template_name_key" ON "register_template"("name");
CREATE INDEX "register_template_is_active_idx" ON "register_template"("is_active");

CREATE UNIQUE INDEX "register_template_version_template_id_version_number_key" ON "register_template_version"("template_id", "version_number");
CREATE INDEX "register_template_version_template_id_status_idx" ON "register_template_version"("template_id", "status");

-- Unique constraints for the one-to-one FK pointers on register
CREATE UNIQUE INDEX "register_current_config_version_id_key" ON "register"("current_config_version_id");
CREATE UNIQUE INDEX "register_draft_config_version_id_key" ON "register"("draft_config_version_id");

-- AddForeignKey: register_config_version → register
ALTER TABLE "register_config_version" ADD CONSTRAINT "register_config_version_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "register"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: register_config_version → user (created_by)
ALTER TABLE "register_config_version" ADD CONSTRAINT "register_config_version_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: register → register_config_version (current)
ALTER TABLE "register" ADD CONSTRAINT "register_current_config_version_id_fkey" FOREIGN KEY ("current_config_version_id") REFERENCES "register_config_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: register → register_config_version (draft)
ALTER TABLE "register" ADD CONSTRAINT "register_draft_config_version_id_fkey" FOREIGN KEY ("draft_config_version_id") REFERENCES "register_config_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: register_template → user (created_by)
ALTER TABLE "register_template" ADD CONSTRAINT "register_template_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: register_template_version → register_template
ALTER TABLE "register_template_version" ADD CONSTRAINT "register_template_version_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "register_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: register_template_version → user (created_by)
ALTER TABLE "register_template_version" ADD CONSTRAINT "register_template_version_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
