-- PM11-01: Saved View Data Model
-- Additive migration — creates the saved_view table and its indexes.
-- No existing table is altered. Rollback is a single DROP TABLE.

-- CreateTable: saved_view
CREATE TABLE "saved_view" (
    "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
    "user_id"     UUID        NOT NULL,
    "register_id" UUID,
    "name"        TEXT        NOT NULL,
    "filter_json"  JSONB,
    "sort_json"    JSONB,
    "columns_json" JSONB,
    "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "saved_view_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique name per user per scope (register-scoped or global)
CREATE UNIQUE INDEX "saved_view_user_id_register_id_name_key"
    ON "saved_view"("user_id", "register_id", "name");

-- CreateIndex: list views by owner
CREATE INDEX "saved_view_user_id_idx" ON "saved_view"("user_id");

-- CreateIndex: list views by register
CREATE INDEX "saved_view_register_id_idx" ON "saved_view"("register_id");

-- AddForeignKey: saved_view.user_id -> user.id  (cascade delete)
ALTER TABLE "saved_view"
    ADD CONSTRAINT "saved_view_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: saved_view.register_id -> register.id  (cascade delete, nullable)
ALTER TABLE "saved_view"
    ADD CONSTRAINT "saved_view_register_id_fkey"
    FOREIGN KEY ("register_id") REFERENCES "register"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
