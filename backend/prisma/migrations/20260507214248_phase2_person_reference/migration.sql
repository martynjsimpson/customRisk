-- AlterTable
ALTER TABLE "risk" ADD COLUMN     "owner_person_id" UUID;

-- AlterTable
ALTER TABLE "risk_custom_field_value" ADD COLUMN     "person_id" UUID;

-- CreateTable
CREATE TABLE "person_reference" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "user_id" UUID,
    "display_name" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_reference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "person_reference_email_key" ON "person_reference"("email");

-- CreateIndex
CREATE UNIQUE INDEX "person_reference_user_id_key" ON "person_reference"("user_id");

-- CreateIndex
CREATE INDEX "person_reference_user_id_idx" ON "person_reference"("user_id");

-- CreateIndex
CREATE INDEX "risk_custom_field_value_person_id_idx" ON "risk_custom_field_value"("person_id");

-- AddForeignKey
ALTER TABLE "person_reference" ADD CONSTRAINT "person_reference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk" ADD CONSTRAINT "risk_owner_person_id_fkey" FOREIGN KEY ("owner_person_id") REFERENCES "person_reference"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_custom_field_value" ADD CONSTRAINT "risk_custom_field_value_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "person_reference"("id") ON DELETE SET NULL ON UPDATE CASCADE;
