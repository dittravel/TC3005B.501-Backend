-- CreateTable
CREATE TABLE `PolicyExport` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_id` INTEGER NOT NULL,
    `is_exported` BOOLEAN NOT NULL DEFAULT false,
    `exported_at` DATETIME(3) NULL,

    UNIQUE INDEX `PolicyExport_request_id_key`(`request_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PolicyExport` ADD CONSTRAINT `PolicyExport_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `Request`(`request_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
