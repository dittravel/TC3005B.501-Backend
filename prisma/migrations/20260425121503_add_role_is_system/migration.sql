-- AlterTable
ALTER TABLE `Role`
  ADD COLUMN `is_system` BOOLEAN NOT NULL DEFAULT false;
