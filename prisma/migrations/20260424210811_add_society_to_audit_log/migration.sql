-- AlterTable
ALTER TABLE `Audit_Log` ADD COLUMN `society_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `idx_audit_society` ON `Audit_Log`(`society_id`);

-- AddForeignKey
ALTER TABLE `Audit_Log` ADD CONSTRAINT `fk_audit_society` FOREIGN KEY (`society_id`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
