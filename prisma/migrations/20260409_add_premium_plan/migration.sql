-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('FREE', 'BASIC', 'PREMIUM');

-- AlterTable
ALTER TABLE "Professional" ADD COLUMN "planType" "PlanType" NOT NULL DEFAULT 'FREE';
ALTER TABLE "Professional" ADD COLUMN "planExpiresAt" TIMESTAMP(3);
ALTER TABLE "Professional" ADD COLUMN "isPriority" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Professional" ADD COLUMN "profileViews" INTEGER NOT NULL DEFAULT 0;
