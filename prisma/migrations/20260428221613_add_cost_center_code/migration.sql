/*
  Warnings:

  - Added the required column `cost_center_code` to the `CostCenter` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `CostCenter` ADD COLUMN `cost_center_code` INT NOT NULL;
