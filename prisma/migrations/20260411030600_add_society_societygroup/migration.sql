-- AlterTable
ALTER TABLE `User` ADD COLUMN `society_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `SocietyGroup` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `description` VARCHAR(255) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Society` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `description` VARCHAR(20) NOT NULL,
    `local_currency` VARCHAR(6) NOT NULL,
    `society_group_id` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_society_id_fkey` FOREIGN KEY (`society_id`) REFERENCES `Society`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Society` ADD CONSTRAINT `Society_society_group_id_fkey` FOREIGN KEY (`society_group_id`) REFERENCES `SocietyGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
