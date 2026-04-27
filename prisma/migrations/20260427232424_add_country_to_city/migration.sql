-- AlterTable
ALTER TABLE `City` ADD COLUMN `country_id` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `City` ADD CONSTRAINT `City_country_id_fkey` FOREIGN KEY (`country_id`) REFERENCES `Country`(`country_id`) ON DELETE SET NULL ON UPDATE CASCADE;
