-- AlterTable
ALTER TABLE "register" ADD COLUMN     "linked_template_version_id" UUID;

-- AddForeignKey
ALTER TABLE "register" ADD CONSTRAINT "register_linked_template_version_id_fkey" FOREIGN KEY ("linked_template_version_id") REFERENCES "register_template_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;
