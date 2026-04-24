-- AlterTable
ALTER TABLE `Route` ADD COLUMN `flight_pdf_file_id` VARCHAR(24) NULL,
    ADD COLUMN `flight_pdf_file_name` VARCHAR(255) NULL,
    ADD COLUMN `hotel_pdf_file_id` VARCHAR(24) NULL,
    ADD COLUMN `hotel_pdf_file_name` VARCHAR(255) NULL;
