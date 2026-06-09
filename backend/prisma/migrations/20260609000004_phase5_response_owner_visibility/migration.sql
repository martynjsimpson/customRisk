ALTER TABLE "custom_field_definition"
  ADD COLUMN IF NOT EXISTS "visible_to_risk_response_owners" BOOLEAN NOT NULL DEFAULT true;
