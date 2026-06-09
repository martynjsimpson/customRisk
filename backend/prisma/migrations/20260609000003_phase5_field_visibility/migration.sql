ALTER TABLE "custom_field_definition"
  ADD COLUMN IF NOT EXISTS "visible_to_roles" TEXT[] NOT NULL DEFAULT '{}';
