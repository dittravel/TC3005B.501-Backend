/*
  Warnings:

  - You are about to drop the column `society_group_id` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `society_group_id` on the `AuthorizationRule` table. All the data in the column will be lost.
  - You are about to drop the column `society_group_id` on the `CostCenter` table. All the data in the column will be lost.
  - You are about to drop the column `society_group_id` on the `Department` table. All the data in the column will be lost.
  - You are about to drop the column `society_group_id` on the `Permission` table. All the data in the column will be lost.
  - You are about to drop the column `society_group_id` on the `RefundPolicy` table. All the data in the column will be lost.
  - You are about to drop the column `society_group_id` on the `Role` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[cost_center_name,society_id]` on the table `CostCenter` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[department_name,society_id]` on the table `Department` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[permission_key,society_id]` on the table `Permission` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[role_name,society_id]` on the table `Role` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `society_id` to the `RefundPolicy` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Account` DROP FOREIGN KEY `fk_account_societygroup`;

-- DropForeignKey
ALTER TABLE `AuthorizationRule` DROP FOREIGN KEY `AuthorizationRule_society_group_id_fkey`;

-- DropForeignKey
ALTER TABLE `CostCenter` DROP FOREIGN KEY `fk_costcenter_societygroup`;

-- DropForeignKey
ALTER TABLE `Department` DROP FOREIGN KEY `fk_department_societygroup`;

-- DropForeignKey
ALTER TABLE `Permission` DROP FOREIGN KEY `fk_permission_societygroup`;

-- DropForeignKey
ALTER TABLE `RefundPolicy` DROP FOREIGN KEY `fk_refund_policy_societygroup`;

-- DropForeignKey
ALTER TABLE `Role` DROP FOREIGN KEY `fk_role_societygroup`;

-- DropIndex
DROP INDEX `Account_society_group_id_idx` ON `Account`;

-- DropIndex
DROP INDEX `AuthorizationRule_society_group_id_idx` ON `AuthorizationRule`;

-- DropIndex
DROP INDEX `CostCenter_cost_center_name_society_group_id_key` ON `CostCenter`;

-- DropIndex
DROP INDEX `CostCenter_society_group_id_idx` ON `CostCenter`;

-- DropIndex
DROP INDEX `Department_department_name_society_group_id_key` ON `Department`;

-- DropIndex
DROP INDEX `Department_society_group_id_idx` ON `Department`;

-- DropIndex
DROP INDEX `Permission_permission_key_society_group_id_key` ON `Permission`;

-- DropIndex
DROP INDEX `Permission_society_group_id_idx` ON `Permission`;

-- DropIndex
DROP INDEX `RefundPolicy_society_group_id_idx` ON `RefundPolicy`;

-- DropIndex
DROP INDEX `Role_role_name_society_group_id_key` ON `Role`;

-- DropIndex
DROP INDEX `Role_society_group_id_idx` ON `Role`;

-- AlterTable
ALTER TABLE `Account` DROP COLUMN `society_group_id`,
    ADD COLUMN `society_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `AuthorizationRule` DROP COLUMN `society_group_id`,
    ADD COLUMN `society_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `CostCenter` DROP COLUMN `society_group_id`,
    ADD COLUMN `society_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `Department` DROP COLUMN `society_group_id`,
    ADD COLUMN `society_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `Permission` DROP COLUMN `society_group_id`,
    ADD COLUMN `society_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `RefundPolicy` DROP COLUMN `society_group_id`,
    ADD COLUMN `society_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Role` DROP COLUMN `society_group_id`;

-- CreateIndex
CREATE INDEX `Account_society_id_idx` ON `Account`(`society_id`);

-- CreateIndex
CREATE INDEX `AuthorizationRule_society_id_idx` ON `AuthorizationRule`(`society_id`);

-- CreateIndex
CREATE INDEX `CostCenter_society_id_idx` ON `CostCenter`(`society_id`);

-- CreateIndex
CREATE UNIQUE INDEX `CostCenter_cost_center_name_society_id_key` ON `CostCenter`(`cost_center_name`, `society_id`);

-- CreateIndex
CREATE INDEX `Department_society_id_idx` ON `Department`(`society_id`);

-- CreateIndex
CREATE UNIQUE INDEX `Department_department_name_society_id_key` ON `Department`(`department_name`, `society_id`);

-- CreateIndex
CREATE INDEX `Permission_society_id_idx` ON `Permission`(`society_id`);

-- CreateIndex
CREATE UNIQUE INDEX `Permission_permission_key_society_id_key` ON `Permission`(`permission_key`, `society_id`);

-- CreateIndex
CREATE INDEX `RefundPolicy_society_id_idx` ON `RefundPolicy`(`society_id`);

-- CreateIndex
CREATE UNIQUE INDEX `Role_role_name_society_id_key` ON `Role`(`role_name`, `society_id`);

-- AddForeignKey
ALTER TABLE `AuthorizationRule` ADD CONSTRAINT `AuthorizationRule_society_id_fkey` FOREIGN KEY (`society_id`) REFERENCES `Society`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CostCenter` ADD CONSTRAINT `fk_costcenter_society` FOREIGN KEY (`society_id`) REFERENCES `Society`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Department` ADD CONSTRAINT `fk_department_society` FOREIGN KEY (`society_id`) REFERENCES `Society`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Permission` ADD CONSTRAINT `fk_permission_society` FOREIGN KEY (`society_id`) REFERENCES `Society`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundPolicy` ADD CONSTRAINT `fk_refund_policy_society` FOREIGN KEY (`society_id`) REFERENCES `Society`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Role` ADD CONSTRAINT `fk_role_society` FOREIGN KEY (`society_id`) REFERENCES `Society`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `fk_account_society` FOREIGN KEY (`society_id`) REFERENCES `Society`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
