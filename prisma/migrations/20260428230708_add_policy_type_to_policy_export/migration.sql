-- 1. Drop el foreign key primero
ALTER TABLE `PolicyExport` DROP FOREIGN KEY `PolicyExport_request_id_fkey`;

-- 2. Ahora sí puedes drop el índice único
ALTER TABLE `PolicyExport` DROP INDEX `PolicyExport_request_id_key`;

-- 3. Agrega la columna
ALTER TABLE `PolicyExport` ADD COLUMN `policy_type` VARCHAR(20) NOT NULL DEFAULT 'anticipo';

-- 4. Nuevo índice único compuesto
ALTER TABLE `PolicyExport` ADD UNIQUE INDEX `PolicyExport_request_id_policy_type_key`(`request_id`, `policy_type`);

-- 5. Re-agrega el foreign key con el mismo nombre
ALTER TABLE `PolicyExport` ADD CONSTRAINT `PolicyExport_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `Request`(`request_id`) ON DELETE RESTRICT ON UPDATE CASCADE;