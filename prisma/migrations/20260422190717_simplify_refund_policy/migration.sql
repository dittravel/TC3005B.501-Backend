/*
  Warnings:

  - You are about to drop the `Reimbursement_Policy` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Reimbursement_Policy_Assignment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Reimbursement_Policy_Rule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Reimbursement_Policy` DROP FOREIGN KEY `fk_reimbursement_policy_societygroup`;

-- DropForeignKey
ALTER TABLE `Reimbursement_Policy` DROP FOREIGN KEY `fk_reimbursement_policy_user`;

-- DropForeignKey
ALTER TABLE `Reimbursement_Policy_Assignment` DROP FOREIGN KEY `fk_policy_assignment_department`;

-- DropForeignKey
ALTER TABLE `Reimbursement_Policy_Assignment` DROP FOREIGN KEY `fk_policy_assignment_policy`;

-- DropForeignKey
ALTER TABLE `Reimbursement_Policy_Rule` DROP FOREIGN KEY `fk_policy_rule_policy`;

-- DropForeignKey
ALTER TABLE `Reimbursement_Policy_Rule` DROP FOREIGN KEY `fk_policy_rule_receipt_type`;

-- DropTable
DROP TABLE `Reimbursement_Policy`;

-- DropTable
DROP TABLE `Reimbursement_Policy_Assignment`;

-- DropTable
DROP TABLE `Reimbursement_Policy_Rule`;

-- CreateTable
CREATE TABLE `RefundPolicy` (
    `policy_id` INTEGER NOT NULL AUTO_INCREMENT,
    `policy_name` VARCHAR(120) NOT NULL,
    `min_amount` DOUBLE NOT NULL,
    `max_amount` DOUBLE NOT NULL,
    `submission_deadline_days` INTEGER NULL,
    `society_group_id` INTEGER NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `RefundPolicy_society_group_id_idx`(`society_group_id`),
    PRIMARY KEY (`policy_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RefundPolicy` ADD CONSTRAINT `fk_refund_policy_societygroup` FOREIGN KEY (`society_group_id`) REFERENCES `SocietyGroup`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddColumn to Receipt
ALTER TABLE `Receipt` ADD COLUMN `exceeds_policy_limit` BOOLEAN NULL DEFAULT false;
