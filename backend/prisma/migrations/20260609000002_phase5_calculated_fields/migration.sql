ALTER TYPE "CustomFieldType" ADD VALUE IF NOT EXISTS 'CALCULATED';

ALTER TABLE "custom_field_definition"
  ADD COLUMN IF NOT EXISTS "formula" TEXT,
  ADD COLUMN IF NOT EXISTS "formula_dependencies" UUID[] NOT NULL DEFAULT '{}';
