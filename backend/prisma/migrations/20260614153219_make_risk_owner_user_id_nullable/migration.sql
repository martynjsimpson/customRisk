-- DropForeignKey
ALTER TABLE "risk" DROP CONSTRAINT "risk_owner_user_id_fkey";

-- AlterTable
ALTER TABLE "risk" ALTER COLUMN "owner_user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "risk" ADD CONSTRAINT "risk_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
