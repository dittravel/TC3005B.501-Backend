-- AlterTable
ALTER TABLE `Society` ADD COLUMN `is_default` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `SocietyGroup` ADD COLUMN `is_default` BOOLEAN NOT NULL DEFAULT false;
