-- DropForeignKey
ALTER TABLE "risk_custom_field_multi_select_value" DROP CONSTRAINT "risk_custom_field_multi_select_value_custom_field_definition_id";

-- DropForeignKey
ALTER TABLE "risk_custom_field_multi_select_value" DROP CONSTRAINT "risk_custom_field_multi_select_value_option_id_fkey";

-- DropForeignKey
ALTER TABLE "risk_custom_field_multi_select_value" DROP CONSTRAINT "risk_custom_field_multi_select_value_register_id_fkey";

-- DropForeignKey
ALTER TABLE "risk_custom_field_multi_select_value" DROP CONSTRAINT "risk_custom_field_multi_select_value_risk_id_fkey";

-- AlterTable
ALTER TABLE "custom_field_definition" ALTER COLUMN "formula_dependencies" DROP DEFAULT,
ALTER COLUMN "visible_to_roles" DROP DEFAULT;

-- AlterTable
ALTER TABLE "register" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "risk_custom_field_multi_select_value_risk_id_custom_field_d_idx" ON "risk_custom_field_multi_select_value"("risk_id", "custom_field_definition_id");

-- AddForeignKey
ALTER TABLE "risk_custom_field_multi_select_value" ADD CONSTRAINT "risk_custom_field_multi_select_value_risk_id_fkey" FOREIGN KEY ("risk_id") REFERENCES "risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_custom_field_multi_select_value" ADD CONSTRAINT "risk_custom_field_multi_select_value_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "register"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_custom_field_multi_select_value" ADD CONSTRAINT "risk_custom_field_multi_select_value_custom_field_definiti_fkey" FOREIGN KEY ("custom_field_definition_id") REFERENCES "custom_field_definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_custom_field_multi_select_value" ADD CONSTRAINT "risk_custom_field_multi_select_value_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "custom_field_option"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "risk_custom_field_multi_select_value_risk_id_custom_field_defin" RENAME TO "risk_custom_field_multi_select_value_risk_id_custom_field_d_key";
