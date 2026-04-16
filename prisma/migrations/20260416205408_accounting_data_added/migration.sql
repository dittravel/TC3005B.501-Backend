-- AlterTable
ALTER TABLE `Request` ADD COLUMN `document_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Request_status` ADD COLUMN `is_exported` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `supplier` BIGINT NULL;

-- CreateTable
CREATE TABLE `Document` (
    `document_id` VARCHAR(191) NOT NULL,
    `description` VARCHAR(20) NOT NULL,

    INDEX `Document_document_id_idx`(`document_id`),
    PRIMARY KEY (`document_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `fk_request_document` ON `Request`(`document_id`);

-- AddForeignKey
ALTER TABLE `Request` ADD CONSTRAINT `fk_request_document` FOREIGN KEY (`document_id`) REFERENCES `Document`(`document_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
