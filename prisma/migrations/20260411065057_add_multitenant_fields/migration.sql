/*
  Warnings:

  - A unique constraint covering the columns `[cost_center_name,society_group_id]` on the table `CostCenter` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[department_name,society_group_id]` on the table `Department` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[permission_key,society_group_id]` on the table `Permission` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[role_name,society_group_id]` on the table `Role` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `cost_center_name` ON `CostCenter`;

-- DropIndex
DROP INDEX `department_name` ON `Department`;

-- DropIndex
DROP INDEX `permission_key` ON `Permission`;

-- DropIndex
DROP INDEX `role_name` ON `Role`;

-- AlterTable
ALTER TABLE `Account` ADD COLUMN `cost_center_id` INTEGER NULL,
    ADD COLUMN `society_group_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `AuthorizationRule` ADD COLUMN `society_group_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `CostCenter` ADD COLUMN `society_group_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `Department` ADD COLUMN `society_group_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `Permission` ADD COLUMN `society_group_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `Receipt` ADD COLUMN `society_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `Reimbursement_Policy` ADD COLUMN `society_group_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `Request` ADD COLUMN `society_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `Role` ADD COLUMN `society_group_id` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Account_society_group_id_idx` ON `Account`(`society_group_id`);

-- CreateIndex
CREATE INDEX `Account_cost_center_id_idx` ON `Account`(`cost_center_id`);

-- CreateIndex
CREATE INDEX `AuthorizationRule_society_group_id_idx` ON `AuthorizationRule`(`society_group_id`);

-- CreateIndex
CREATE INDEX `CostCenter_society_group_id_idx` ON `CostCenter`(`society_group_id`);

-- CreateIndex
CREATE UNIQUE INDEX `CostCenter_cost_center_name_society_group_id_key` ON `CostCenter`(`cost_center_name`, `society_group_id`);

-- CreateIndex
CREATE INDEX `Department_society_group_id_idx` ON `Department`(`society_group_id`);

-- CreateIndex
CREATE UNIQUE INDEX `Department_department_name_society_group_id_key` ON `Department`(`department_name`, `society_group_id`);

-- CreateIndex
CREATE INDEX `Permission_society_group_id_idx` ON `Permission`(`society_group_id`);

-- CreateIndex
CREATE UNIQUE INDEX `Permission_permission_key_society_group_id_key` ON `Permission`(`permission_key`, `society_group_id`);

-- CreateIndex
CREATE INDEX `Receipt_society_id_idx` ON `Receipt`(`society_id`);

-- CreateIndex
CREATE INDEX `Reimbursement_Policy_society_group_id_idx` ON `Reimbursement_Policy`(`society_group_id`);

-- CreateIndex
CREATE INDEX `Request_society_id_idx` ON `Request`(`society_id`);

-- CreateIndex
CREATE INDEX `Role_society_group_id_idx` ON `Role`(`society_group_id`);

-- CreateIndex
CREATE UNIQUE INDEX `Role_role_name_society_group_id_key` ON `Role`(`role_name`, `society_group_id`);

-- AddForeignKey
ALTER TABLE `AuthorizationRule` ADD CONSTRAINT `AuthorizationRule_society_group_id_fkey` FOREIGN KEY (`society_group_id`) REFERENCES `SocietyGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CostCenter` ADD CONSTRAINT `fk_costcenter_societygroup` FOREIGN KEY (`society_group_id`) REFERENCES `SocietyGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Department` ADD CONSTRAINT `fk_department_societygroup` FOREIGN KEY (`society_group_id`) REFERENCES `SocietyGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Permission` ADD CONSTRAINT `fk_permission_societygroup` FOREIGN KEY (`society_group_id`) REFERENCES `SocietyGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Receipt` ADD CONSTRAINT `fk_receipt_society` FOREIGN KEY (`society_id`) REFERENCES `Society`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reimbursement_Policy` ADD CONSTRAINT `fk_reimbursement_policy_societygroup` FOREIGN KEY (`society_group_id`) REFERENCES `SocietyGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Request` ADD CONSTRAINT `fk_request_society` FOREIGN KEY (`society_id`) REFERENCES `Society`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Role` ADD CONSTRAINT `fk_role_societygroup` FOREIGN KEY (`society_group_id`) REFERENCES `SocietyGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `fk_account_societygroup` FOREIGN KEY (`society_group_id`) REFERENCES `SocietyGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `fk_account_costcenter` FOREIGN KEY (`cost_center_id`) REFERENCES `CostCenter`(`cost_center_id`) ON DELETE SET NULL ON UPDATE CASCADE;
