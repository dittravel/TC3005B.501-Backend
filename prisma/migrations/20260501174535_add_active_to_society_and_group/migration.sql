-- AlterTable
ALTER TABLE `Society` ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `SocietyGroup` ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT true;
