-- CreateTable
CREATE TABLE `Account` (
    `account_id` INTEGER NOT NULL AUTO_INCREMENT,
    `account_code` VARCHAR(20) NOT NULL,
    `account_name` VARCHAR(100) NOT NULL,
    `account_type` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_mod_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Account_account_code_key`(`account_code`),
    PRIMARY KEY (`account_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReceiptType_Account` (
    `receipttype_account_id` INTEGER NOT NULL AUTO_INCREMENT,
    `receipt_type_id` INTEGER NOT NULL,
    `account_id` INTEGER NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `receiptReceipt_id` INTEGER NULL,
    `taxTax_id` INTEGER NULL,

    INDEX `ReceiptType_Account_account_id_fkey`(`account_id`),
    INDEX `ReceiptType_Account_receiptReceipt_id_fkey`(`receiptReceipt_id`),
    INDEX `ReceiptType_Account_taxTax_id_fkey`(`taxTax_id`),
    UNIQUE INDEX `ReceiptType_Account_receipt_type_id_account_id_key`(`receipt_type_id`, `account_id`),
    PRIMARY KEY (`receipttype_account_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tax` (
    `tax_id` INTEGER NOT NULL AUTO_INCREMENT,
    `tax_code` VARCHAR(30) NOT NULL,
    `tax_name` VARCHAR(100) NOT NULL,
    `tax_rate` DECIMAL(10, 4) NOT NULL,
    `description` VARCHAR(255) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_mod_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Tax_tax_code_key`(`tax_code`),
    PRIMARY KEY (`tax_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ReceiptType_Account` ADD CONSTRAINT `ReceiptType_Account_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `Account`(`account_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReceiptType_Account` ADD CONSTRAINT `ReceiptType_Account_receiptReceipt_id_fkey` FOREIGN KEY (`receiptReceipt_id`) REFERENCES `Receipt`(`receipt_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReceiptType_Account` ADD CONSTRAINT `ReceiptType_Account_receipt_type_id_fkey` FOREIGN KEY (`receipt_type_id`) REFERENCES `Receipt_Type`(`receipt_type_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReceiptType_Account` ADD CONSTRAINT `ReceiptType_Account_taxTax_id_fkey` FOREIGN KEY (`taxTax_id`) REFERENCES `Tax`(`tax_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RedefineIndex
CREATE UNIQUE INDEX `Receipt_Type_receipt_type_name_key` ON `Receipt_Type`(`receipt_type_name`);
DROP INDEX `receipt_type_name` ON `Receipt_Type`;
