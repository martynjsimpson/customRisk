-- CreateEnum
CREATE TYPE "ResponseActionMode" AS ENUM ('SIMPLE', 'CHILD_RECORDS');

-- CreateEnum
CREATE TYPE "ResponseActionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'IMPLEMENTED', 'DEFERRED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditObjectType" ADD VALUE 'RESPONSE_ACTION';
ALTER TYPE "AuditObjectType" ADD VALUE 'RISK_RESPONSE_ACTION';

-- AlterTable
ALTER TABLE "register" ADD COLUMN     "response_action_mode" "ResponseActionMode" NOT NULL DEFAULT 'SIMPLE';

-- CreateTable
CREATE TABLE "response_action" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "response" TEXT NOT NULL,
    "status" "ResponseActionStatus" NOT NULL DEFAULT 'PLANNED',
    "owner_person_id" UUID,
    "owner_user_id" UUID,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_by_user_id" UUID NOT NULL,

    CONSTRAINT "response_action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_response_action" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "risk_id" UUID NOT NULL,
    "register_id" UUID NOT NULL,
    "response_action_id" UUID NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" UUID NOT NULL,

    CONSTRAINT "risk_response_action_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "response_action_owner_user_id_idx" ON "response_action"("owner_user_id");

-- CreateIndex
CREATE INDEX "response_action_owner_person_id_idx" ON "response_action"("owner_person_id");

-- CreateIndex
CREATE INDEX "response_action_is_deleted_idx" ON "response_action"("is_deleted");

-- CreateIndex
CREATE INDEX "risk_response_action_risk_id_display_order_idx" ON "risk_response_action"("risk_id", "display_order");

-- CreateIndex
CREATE INDEX "risk_response_action_register_id_idx" ON "risk_response_action"("register_id");

-- CreateIndex
CREATE INDEX "risk_response_action_response_action_id_idx" ON "risk_response_action"("response_action_id");

-- CreateIndex
CREATE UNIQUE INDEX "risk_response_action_risk_id_response_action_id_key" ON "risk_response_action"("risk_id", "response_action_id");

-- AddForeignKey
ALTER TABLE "response_action" ADD CONSTRAINT "response_action_owner_person_id_fkey" FOREIGN KEY ("owner_person_id") REFERENCES "person_reference"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "response_action" ADD CONSTRAINT "response_action_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "response_action" ADD CONSTRAINT "response_action_deleted_by_user_id_fkey" FOREIGN KEY ("deleted_by_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "response_action" ADD CONSTRAINT "response_action_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "response_action" ADD CONSTRAINT "response_action_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_response_action" ADD CONSTRAINT "risk_response_action_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_response_action" ADD CONSTRAINT "risk_response_action_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "register"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_response_action" ADD CONSTRAINT "risk_response_action_response_action_id_fkey" FOREIGN KEY ("response_action_id") REFERENCES "response_action"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_response_action" ADD CONSTRAINT "risk_response_action_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
