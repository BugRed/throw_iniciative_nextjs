-- CreateEnum
CREATE TYPE "roll_mode" AS ENUM ('normal', 'advantage', 'disadvantage');

-- CreateEnum
CREATE TYPE "audit_roll_kind" AS ENUM ('initiative', 'inspiration', 'tiebreak');

-- AlterEnum
ALTER TYPE "initiative_status" ADD VALUE 'cancelled';

-- AlterTable
ALTER TABLE "audit_rolls" ADD COLUMN     "discarded_result" INTEGER,
ADD COLUMN     "initiative_id" UUID,
ADD COLUMN     "kind" "audit_roll_kind" NOT NULL DEFAULT 'initiative',
ADD COLUMN     "participant_id" UUID;

-- AlterTable
ALTER TABLE "initiative_participants" ADD COLUMN     "has_inspiration" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "removed_at" TIMESTAMPTZ(6),
ADD COLUMN     "roll_mode" "roll_mode" NOT NULL DEFAULT 'normal',
ADD COLUMN     "tiebreak_rolls" INTEGER[];
