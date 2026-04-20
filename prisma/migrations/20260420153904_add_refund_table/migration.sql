-- CreateTable
CREATE TABLE `Refund` (
    `refund_id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_id` INTEGER NULL,
    `user_id` INTEGER NULL,
    `refund_amount` FLOAT NOT NULL,
    `refund_type` ENUM('Reembolso', 'Deducción') NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_refund_request`(`request_id`),
    INDEX `fk_refund_user`(`user_id`),
    PRIMARY KEY (`refund_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Refund` ADD CONSTRAINT `fk_refund_request` FOREIGN KEY (`request_id`) REFERENCES `Request`(`request_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Refund` ADD CONSTRAINT `fk_refund_user` FOREIGN KEY (`user_id`) REFERENCES `User`(`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Drop wallet triggers - wallet management now handled in application code
DROP TRIGGER IF EXISTS `DeductFromWalletOnFeeImposed`;
DROP TRIGGER IF EXISTS `AddToWalletOnReceiptApproved`;
