-- CreateEnum
CREATE TYPE "VolunteerRole" AS ENUM ('entry', 'checkpoint');

-- CreateEnum
CREATE TYPE "VolunteerStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "SupplyLevel" AS ENUM ('urgent', 'low', 'enough');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('super', 'checkpoint');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "Volunteer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photo_url" TEXT,
    "role" "VolunteerRole" NOT NULL,
    "checkpoint_id" TEXT,
    "telegram_handle" TEXT NOT NULL,
    "consent_given" BOOLEAN NOT NULL DEFAULT false,
    "status" "VolunteerStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "Volunteer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checkpoint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entry_point_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Checkpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryPoint" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "volunteer_id" TEXT,

    CONSTRAINT "EntryPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyStatus" (
    "id" TEXT NOT NULL,
    "checkpoint_id" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "status" "SupplyLevel" NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplyStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "telegram_handle" TEXT NOT NULL,
    "message" TEXT,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'pending',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VolunteerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- AddForeignKey
ALTER TABLE "Volunteer" ADD CONSTRAINT "Volunteer_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "Checkpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkpoint" ADD CONSTRAINT "Checkpoint_entry_point_id_fkey" FOREIGN KEY ("entry_point_id") REFERENCES "EntryPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyStatus" ADD CONSTRAINT "SupplyStatus_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "Checkpoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
