-- CreateEnum
CREATE TYPE "membership_status" AS ENUM ('pending', 'active', 'left', 'banned', 'rejected');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "notification_type" ADD VALUE 'join_requested';
ALTER TYPE "notification_type" ADD VALUE 'join_rejected';
ALTER TYPE "notification_type" ADD VALUE 'pause_requested';

-- AlterEnum
ALTER TYPE "room_status" ADD VALUE 'paused';

-- AlterTable
ALTER TABLE "room_characters" ADD COLUMN     "died_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "room_members" ADD COLUMN     "rejection_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "membership_status" NOT NULL DEFAULT 'pending',
ADD COLUMN     "status_changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
