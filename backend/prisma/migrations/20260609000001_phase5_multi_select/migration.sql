ALTER TYPE "CustomFieldType" ADD VALUE IF NOT EXISTS 'MULTI_SELECT';

CREATE TABLE IF NOT EXISTS "risk_custom_field_multi_select_value" (
  "id"                        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "risk_id"                   UUID         NOT NULL,
  "register_id"               UUID         NOT NULL,
  "custom_field_definition_id" UUID        NOT NULL,
  "option_id"                 UUID         NOT NULL,
  "created_at"                TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "risk_custom_field_multi_select_value_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "risk_custom_field_multi_select_value_risk_id_fkey"
    FOREIGN KEY ("risk_id") REFERENCES "risk"("id") ON DELETE CASCADE,
  CONSTRAINT "risk_custom_field_multi_select_value_register_id_fkey"
    FOREIGN KEY ("register_id") REFERENCES "register"("id") ON DELETE CASCADE,
  CONSTRAINT "risk_custom_field_multi_select_value_custom_field_definition_id_fkey"
    FOREIGN KEY ("custom_field_definition_id") REFERENCES "custom_field_definition"("id") ON DELETE CASCADE,
  CONSTRAINT "risk_custom_field_multi_select_value_option_id_fkey"
    FOREIGN KEY ("option_id") REFERENCES "custom_field_option"("id") ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS "risk_custom_field_multi_select_value_risk_id_custom_field_definition_id_option_id_key"
  ON "risk_custom_field_multi_select_value"("risk_id", "custom_field_definition_id", "option_id");

CREATE INDEX IF NOT EXISTS "risk_custom_field_multi_select_value_risk_id_custom_field_definition_id_idx"
  ON "risk_custom_field_multi_select_value"("risk_id", "custom_field_definition_id");

CREATE INDEX IF NOT EXISTS "risk_custom_field_multi_select_value_register_id_idx"
  ON "risk_custom_field_multi_select_value"("register_id");
