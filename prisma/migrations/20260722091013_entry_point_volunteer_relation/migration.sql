-- AlterTable
ALTER TABLE "EntryPoint" DROP COLUMN "volunteer_id";

-- AlterTable
ALTER TABLE "Volunteer" ADD COLUMN     "entry_point_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Volunteer_entry_point_id_key" ON "Volunteer"("entry_point_id");

-- AddForeignKey
ALTER TABLE "Volunteer" ADD CONSTRAINT "Volunteer_entry_point_id_fkey" FOREIGN KEY ("entry_point_id") REFERENCES "EntryPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

