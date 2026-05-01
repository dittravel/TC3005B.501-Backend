ALTER TABLE `PolicyExport` DROP FOREIGN KEY `PolicyExport_request_id_fkey`;

ALTER TABLE `PolicyExport` DROP INDEX `PolicyExport_request_id_key`;

ALTER TABLE `PolicyExport` ADD COLUMN `policy_type` VARCHAR(20) NOT NULL DEFAULT 'anticipo';

ALTER TABLE `PolicyExport` ADD UNIQUE INDEX `PolicyExport_request_id_policy_type_key`(`request_id`, `policy_type`);

ALTER TABLE `PolicyExport` ADD CONSTRAINT `PolicyExport_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `Request`(`request_id`) ON DELETE RESTRICT ON UPDATE CASCADE;