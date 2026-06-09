-- Phase 5: Add ValidationMode enum and validationMode column to custom_field_definition
-- Backfill: run scripts/backfill-phase5-validation-mode.ts after applying this migration

CREATE TYPE "ValidationMode" AS ENUM ('ALLOW', 'WARN', 'BLOCK');

ALTER TABLE "custom_field_definition" ADD COLUMN "validation_mode" "ValidationMode" NOT NULL DEFAULT 'ALLOW';
