-- CreateEnum
CREATE TYPE "ReviewCommentMode" AS ENUM ('DISABLED', 'OPTIONAL', 'MANDATORY');

-- AlterTable
ALTER TABLE "register" ADD COLUMN     "review_comment_mode" "ReviewCommentMode" NOT NULL DEFAULT 'OPTIONAL';
