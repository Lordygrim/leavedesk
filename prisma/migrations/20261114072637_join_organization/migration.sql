-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "requireApproval" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "joinPending" BOOLEAN NOT NULL DEFAULT false;
