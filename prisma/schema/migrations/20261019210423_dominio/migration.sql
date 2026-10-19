-- CreateEnum
CREATE TYPE "initiative_status" AS ENUM ('draft', 'rolling', 'ordered', 'active', 'finished');

-- CreateEnum
CREATE TYPE "participant_type" AS ENUM ('character', 'temp_npc');

-- CreateEnum
CREATE TYPE "added_mode" AS ENUM ('roll', 'append');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('your_turn', 'you_are_next', 'timer_warning', 'room_destroyed', 'member_joined');

-- CreateEnum
CREATE TYPE "room_status" AS ENUM ('lobby', 'active', 'finished', 'destroyed');

-- CreateEnum
CREATE TYPE "member_role" AS ENUM ('master', 'player');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "characters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "is_npc" BOOLEAN NOT NULL DEFAULT false,
    "is_visible_to_master" BOOLEAN NOT NULL DEFAULT true,
    "species_id" UUID,
    "class_id" UUID NOT NULL,
    "subclass_id" UUID,
    "background_id" UUID,
    "strength" INTEGER NOT NULL,
    "dexterity" INTEGER NOT NULL,
    "constitution" INTEGER NOT NULL,
    "intelligence" INTEGER NOT NULL,
    "wisdom" INTEGER NOT NULL,
    "charisma" INTEGER NOT NULL,
    "hp_max" INTEGER NOT NULL,
    "hp_current" INTEGER NOT NULL,
    "armor_class" INTEGER NOT NULL,
    "initiative_mod" INTEGER NOT NULL,
    "proficiency_bonus" INTEGER NOT NULL,
    "skill_proficiencies" JSONB NOT NULL,
    "prepared_spells" JSONB,
    "equipment" JSONB NOT NULL,
    "feats" JSONB NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "npc_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "hp_max" INTEGER NOT NULL,
    "hp_current" INTEGER NOT NULL,
    "armor_class" INTEGER NOT NULL,
    "initiative_mod" INTEGER NOT NULL,
    "statblock" JSONB NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "npc_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "initiatives" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "status" "initiative_status" NOT NULL DEFAULT 'draft',
    "current_position" INTEGER NOT NULL DEFAULT 0,
    "turn_started_at" TIMESTAMPTZ(6),
    "paused_at" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "initiatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "initiative_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "initiative_id" UUID NOT NULL,
    "participant_type" "participant_type" NOT NULL,
    "character_id" UUID,
    "temp_npc_id" UUID,
    "label" TEXT NOT NULL,
    "user_id_responsible" UUID,
    "initiative_mod" INTEGER NOT NULL DEFAULT 0,
    "roll_result" INTEGER,
    "position" INTEGER,
    "has_rolled" BOOLEAN NOT NULL DEFAULT false,
    "has_played" BOOLEAN NOT NULL DEFAULT false,
    "added_mode" "added_mode" NOT NULL DEFAULT 'roll',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "initiative_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "room_id" UUID,
    "type" "notification_type" NOT NULL,
    "payload" JSONB,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_rolls" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "user_id" UUID,
    "character_id" UUID,
    "dice_type" TEXT NOT NULL DEFAULT 'd20',
    "result" INTEGER NOT NULL,
    "modifier" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_rolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_id" UUID,
    "payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "master_user_id" UUID,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "room_status" NOT NULL DEFAULT 'lobby',
    "turn_seconds" INTEGER NOT NULL DEFAULT 120,
    "custom_sound_url" TEXT,
    "is_paused" BOOLEAN NOT NULL DEFAULT false,
    "destroyed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_members" (
    "room_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "member_role" NOT NULL DEFAULT 'player',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_members_pkey" PRIMARY KEY ("room_id","user_id")
);

-- CreateTable
CREATE TABLE "room_characters" (
    "room_id" UUID NOT NULL,
    "character_id" UUID NOT NULL,
    "is_npc" BOOLEAN NOT NULL DEFAULT false,
    "active_for_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_characters_pkey" PRIMARY KEY ("room_id","character_id")
);

-- CreateTable
CREATE TABLE "room_temp_npcs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "npc_template_id" UUID,
    "label" TEXT NOT NULL,
    "instance_number" INTEGER NOT NULL,
    "hp_current" INTEGER NOT NULL,
    "hp_max" INTEGER NOT NULL,
    "armor_class" INTEGER NOT NULL,
    "initiative_mod" INTEGER NOT NULL,
    "statblock" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_temp_npcs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "srd_species" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "srd_species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "srd_classes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hit_die" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "srd_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "srd_subclasses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level_gained" INTEGER,
    "payload" JSONB NOT NULL,
    "srd_class_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "srd_subclasses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "srd_class_features" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "srd_class_id" UUID NOT NULL,
    "srd_subclass_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "srd_class_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "srd_backgrounds" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "srd_backgrounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "srd_feats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "srd_feats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "srd_spells" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "school" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "srd_spells_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "srd_equipment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "srd_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "srd_monsters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "challenge_rating" DOUBLE PRECISION,
    "type" TEXT,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "srd_monsters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "characters_owner_user_id_idx" ON "characters"("owner_user_id");

-- CreateIndex
CREATE INDEX "characters_class_id_idx" ON "characters"("class_id");

-- CreateIndex
CREATE INDEX "characters_species_id_idx" ON "characters"("species_id");

-- CreateIndex
CREATE INDEX "npc_templates_owner_user_id_idx" ON "npc_templates"("owner_user_id");

-- CreateIndex
CREATE INDEX "npc_templates_is_public_idx" ON "npc_templates"("is_public");

-- CreateIndex
CREATE INDEX "initiatives_room_id_status_idx" ON "initiatives"("room_id", "status");

-- CreateIndex
CREATE INDEX "initiative_participants_initiative_id_idx" ON "initiative_participants"("initiative_id");

-- CreateIndex
CREATE INDEX "initiative_participants_character_id_idx" ON "initiative_participants"("character_id");

-- CreateIndex
CREATE INDEX "initiative_participants_temp_npc_id_idx" ON "initiative_participants"("temp_npc_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_room_id_idx" ON "notifications"("room_id");

-- CreateIndex
CREATE INDEX "audit_rolls_room_id_created_at_idx" ON "audit_rolls"("room_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_rolls_user_id_idx" ON "audit_rolls"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_room_id_created_at_idx" ON "audit_logs"("room_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_code_key" ON "rooms"("code");

-- CreateIndex
CREATE INDEX "rooms_master_user_id_idx" ON "rooms"("master_user_id");

-- CreateIndex
CREATE INDEX "room_members_user_id_idx" ON "room_members"("user_id");

-- CreateIndex
CREATE INDEX "room_characters_character_id_idx" ON "room_characters"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_characters_room_id_active_for_user_id_key" ON "room_characters"("room_id", "active_for_user_id");

-- CreateIndex
CREATE INDEX "room_temp_npcs_room_id_idx" ON "room_temp_npcs"("room_id");

-- CreateIndex
CREATE INDEX "room_temp_npcs_npc_template_id_idx" ON "room_temp_npcs"("npc_template_id");

-- CreateIndex
CREATE UNIQUE INDEX "srd_species_slug_key" ON "srd_species"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "srd_classes_slug_key" ON "srd_classes"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "srd_subclasses_slug_key" ON "srd_subclasses"("slug");

-- CreateIndex
CREATE INDEX "srd_subclasses_srd_class_id_idx" ON "srd_subclasses"("srd_class_id");

-- CreateIndex
CREATE UNIQUE INDEX "srd_class_features_slug_key" ON "srd_class_features"("slug");

-- CreateIndex
CREATE INDEX "srd_class_features_srd_class_id_idx" ON "srd_class_features"("srd_class_id");

-- CreateIndex
CREATE INDEX "srd_class_features_srd_subclass_id_idx" ON "srd_class_features"("srd_subclass_id");

-- CreateIndex
CREATE UNIQUE INDEX "srd_backgrounds_slug_key" ON "srd_backgrounds"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "srd_feats_slug_key" ON "srd_feats"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "srd_spells_slug_key" ON "srd_spells"("slug");

-- CreateIndex
CREATE INDEX "srd_spells_level_idx" ON "srd_spells"("level");

-- CreateIndex
CREATE INDEX "srd_spells_school_idx" ON "srd_spells"("school");

-- CreateIndex
CREATE UNIQUE INDEX "srd_equipment_slug_key" ON "srd_equipment"("slug");

-- CreateIndex
CREATE INDEX "srd_equipment_category_idx" ON "srd_equipment"("category");

-- CreateIndex
CREATE UNIQUE INDEX "srd_monsters_slug_key" ON "srd_monsters"("slug");

-- CreateIndex
CREATE INDEX "srd_monsters_challenge_rating_idx" ON "srd_monsters"("challenge_rating");

-- CreateIndex
CREATE INDEX "srd_monsters_type_idx" ON "srd_monsters"("type");

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "srd_species"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "srd_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_subclass_id_fkey" FOREIGN KEY ("subclass_id") REFERENCES "srd_subclasses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_background_id_fkey" FOREIGN KEY ("background_id") REFERENCES "srd_backgrounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "npc_templates" ADD CONSTRAINT "npc_templates_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initiatives" ADD CONSTRAINT "initiatives_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initiative_participants" ADD CONSTRAINT "initiative_participants_initiative_id_fkey" FOREIGN KEY ("initiative_id") REFERENCES "initiatives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initiative_participants" ADD CONSTRAINT "initiative_participants_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initiative_participants" ADD CONSTRAINT "initiative_participants_temp_npc_id_fkey" FOREIGN KEY ("temp_npc_id") REFERENCES "room_temp_npcs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initiative_participants" ADD CONSTRAINT "initiative_participants_user_id_responsible_fkey" FOREIGN KEY ("user_id_responsible") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_rolls" ADD CONSTRAINT "audit_rolls_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_rolls" ADD CONSTRAINT "audit_rolls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_master_user_id_fkey" FOREIGN KEY ("master_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_characters" ADD CONSTRAINT "room_characters_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_characters" ADD CONSTRAINT "room_characters_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_characters" ADD CONSTRAINT "room_characters_active_for_user_id_fkey" FOREIGN KEY ("active_for_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_temp_npcs" ADD CONSTRAINT "room_temp_npcs_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_temp_npcs" ADD CONSTRAINT "room_temp_npcs_npc_template_id_fkey" FOREIGN KEY ("npc_template_id") REFERENCES "npc_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srd_subclasses" ADD CONSTRAINT "srd_subclasses_srd_class_id_fkey" FOREIGN KEY ("srd_class_id") REFERENCES "srd_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srd_class_features" ADD CONSTRAINT "srd_class_features_srd_class_id_fkey" FOREIGN KEY ("srd_class_id") REFERENCES "srd_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srd_class_features" ADD CONSTRAINT "srd_class_features_srd_subclass_id_fkey" FOREIGN KEY ("srd_subclass_id") REFERENCES "srd_subclasses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CHECK XOR (character_id/temp_npc_id): um participante é exatamente um dos
-- dois — nunca ambos, nunca nenhum. Prisma não tem CHECK nativo; este bloco é
-- escrito à mão e testado por integração (insert inválido deve falhar).
ALTER TABLE "initiative_participants"
  ADD CONSTRAINT "initiative_participants_xor_check"
  CHECK ((("character_id" IS NOT NULL)::int + ("temp_npc_id" IS NOT NULL)::int) = 1);
