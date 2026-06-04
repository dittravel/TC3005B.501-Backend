/*
  Warnings:

  - A unique constraint covering the columns `[account_code,society_id]` on the table `Account` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `Account_account_code_key` ON `Account`;

-- CreateIndex
CREATE UNIQUE INDEX `Account_account_code_society_id_key` ON `Account`(`account_code`, `society_id`);
