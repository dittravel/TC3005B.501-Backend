-- CreateTable
CREATE TABLE `Alert` (
    `alert_id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_id` INTEGER NULL,
    `message_id` INTEGER NULL,
    `alert_date` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_alert_message`(`message_id`),
    INDEX `fk_alert_request`(`request_id`),
    PRIMARY KEY (`alert_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AlertMessage` (
    `message_id` INTEGER NOT NULL AUTO_INCREMENT,
    `message_text` VARCHAR(60) NOT NULL,

    PRIMARY KEY (`message_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Audit_Log` (
    `audit_log_id` INTEGER NOT NULL AUTO_INCREMENT,
    `actor_user_id` INTEGER NULL,
    `action_type` VARCHAR(80) NOT NULL,
    `entity_type` VARCHAR(80) NOT NULL,
    `entity_id` VARCHAR(64) NULL,
    `source_ip` VARCHAR(45) NULL,
    `metadata` LONGTEXT NULL,
    `event_timestamp` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_audit_action`(`action_type`),
    INDEX `idx_audit_actor`(`actor_user_id`),
    INDEX `idx_audit_entity`(`entity_type`, `entity_id`),
    INDEX `idx_audit_timestamp`(`event_timestamp`),
    PRIMARY KEY (`audit_log_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuthorizationRule` (
    `rule_id` INTEGER NOT NULL AUTO_INCREMENT,
    `rule_name` VARCHAR(50) NOT NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `num_levels` INTEGER NOT NULL,
    `automatic` BOOLEAN NOT NULL DEFAULT true,
    `travel_type` ENUM('Nacional', 'Internacional', 'Todos') NULL,
    `min_duration` INTEGER NULL,
    `max_duration` INTEGER NULL,
    `min_amount` FLOAT NULL,
    `max_amount` FLOAT NULL,

    PRIMARY KEY (`rule_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuthorizationRuleLevel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rule_id` INTEGER NOT NULL,
    `level_number` INTEGER NOT NULL,
    `level_type` ENUM('Jefe', 'Aleatorio', 'Nivel Superior') NOT NULL,
    `superior_level_number` INTEGER NULL,

    INDEX `fk_authorization_rule`(`rule_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `City` (
    `city_id` INTEGER NOT NULL AUTO_INCREMENT,
    `city_name` VARCHAR(200) NOT NULL,

    UNIQUE INDEX `city_name`(`city_name`),
    PRIMARY KEY (`city_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CostCenter` (
    `cost_center_id` INTEGER NOT NULL AUTO_INCREMENT,
    `cost_center_name` VARCHAR(20) NOT NULL,

    UNIQUE INDEX `cost_center_name`(`cost_center_name`),
    PRIMARY KEY (`cost_center_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Country` (
    `country_id` INTEGER NOT NULL AUTO_INCREMENT,
    `country_name` VARCHAR(60) NOT NULL,

    UNIQUE INDEX `country_name`(`country_name`),
    PRIMARY KEY (`country_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Currency` (
    `currency_id` INTEGER NOT NULL AUTO_INCREMENT,
    `currency_code` VARCHAR(6) NOT NULL,
    `currency_name` VARCHAR(100) NOT NULL,
    `country` VARCHAR(100) NULL,
    `banxico_series_id` VARCHAR(20) NULL,
    `frequency` ENUM('daily', 'monthly') NULL DEFAULT 'monthly',
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `currency_code`(`currency_code`),
    PRIMARY KEY (`currency_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Department` (
    `department_id` INTEGER NOT NULL AUTO_INCREMENT,
    `department_name` VARCHAR(20) NOT NULL,
    `cost_center_id` INTEGER NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `department_name`(`department_name`),
    INDEX `fk_department_costcenter`(`cost_center_id`),
    PRIMARY KEY (`department_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permission` (
    `permission_id` INTEGER NOT NULL AUTO_INCREMENT,
    `permission_key` VARCHAR(50) NOT NULL,
    `permission_name` VARCHAR(100) NOT NULL,
    `module` VARCHAR(50) NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `description` VARCHAR(100) NULL,

    UNIQUE INDEX `permission_key`(`permission_key`),
    PRIMARY KEY (`permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Receipt` (
    `receipt_id` INTEGER NOT NULL AUTO_INCREMENT,
    `receipt_type_id` INTEGER NULL,
    `request_id` INTEGER NULL,
    `route_id` INTEGER NULL,
    `validation` ENUM('Pendiente', 'Aprobado', 'Rechazado') NULL DEFAULT 'Pendiente',
    `amount` FLOAT NOT NULL,
    `currency` VARCHAR(6) NULL,
    `refund` BOOLEAN NULL DEFAULT true,
    `submission_date` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `validation_date` TIMESTAMP(0) NULL,
    `pdf_file_id` VARCHAR(24) NULL,
    `pdf_file_name` VARCHAR(255) NULL,
    `xml_file_id` VARCHAR(24) NULL,
    `xml_file_name` VARCHAR(255) NULL,
    `xml_uuid` VARCHAR(36) NULL,
    `xml_rfc_emisor` VARCHAR(13) NULL,
    `xml_rfc_receptor` VARCHAR(13) NULL,
    `xml_nombre_emisor` VARCHAR(255) NULL,
    `xml_fecha` DATETIME(0) NULL,
    `xml_total` DECIMAL(15, 2) NULL,
    `xml_subtotal` DECIMAL(15, 2) NULL,
    `xml_impuestos` DECIMAL(15, 2) NULL,
    `xml_moneda` VARCHAR(6) NULL,

    UNIQUE INDEX `xml_uuid`(`xml_uuid`),
    INDEX `fk_receipt_request`(`request_id`),
    INDEX `fk_receipt_route`(`route_id`),
    INDEX `fk_receipt_type`(`receipt_type_id`),
    PRIMARY KEY (`receipt_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Receipt_Type` (
    `receipt_type_id` INTEGER NOT NULL AUTO_INCREMENT,
    `receipt_type_name` VARCHAR(20) NOT NULL,

    UNIQUE INDEX `receipt_type_name`(`receipt_type_name`),
    PRIMARY KEY (`receipt_type_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reimbursement_Policy` (
    `policy_id` INTEGER NOT NULL AUTO_INCREMENT,
    `policy_code` VARCHAR(40) NOT NULL,
    `policy_name` VARCHAR(120) NOT NULL,
    `description` LONGTEXT NULL,
    `base_currency` VARCHAR(6) NOT NULL DEFAULT 'MXN',
    `effective_from` DATE NOT NULL,
    `effective_to` DATE NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_by` INTEGER NULL,
    `creation_date` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `last_mod_date` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `policy_code`(`policy_code`),
    INDEX `fk_reimbursement_policy_user`(`created_by`),
    PRIMARY KEY (`policy_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reimbursement_Policy_Assignment` (
    `assignment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `policy_id` INTEGER NOT NULL,
    `department_id` INTEGER NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `creation_date` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_policy_assignment_department`(`department_id`),
    INDEX `fk_policy_assignment_policy`(`policy_id`),
    PRIMARY KEY (`assignment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reimbursement_Policy_Rule` (
    `rule_id` INTEGER NOT NULL AUTO_INCREMENT,
    `policy_id` INTEGER NOT NULL,
    `receipt_type_id` INTEGER NOT NULL,
    `trip_scope` ENUM('NACIONAL', 'INTERNACIONAL', 'TODOS') NOT NULL DEFAULT 'TODOS',
    `max_amount_mxn` DECIMAL(15, 2) NOT NULL,
    `submission_deadline_days` INTEGER NULL,
    `requires_xml` BOOLEAN NOT NULL DEFAULT false,
    `allow_foreign_without_xml` BOOLEAN NOT NULL DEFAULT true,
    `refundable` BOOLEAN NOT NULL DEFAULT true,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `creation_date` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `last_mod_date` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_policy_rule_policy`(`policy_id`),
    INDEX `fk_policy_rule_receipt_type`(`receipt_type_id`),
    PRIMARY KEY (`rule_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Request` (
    `request_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `request_status_id` INTEGER NULL DEFAULT 1,
    `assigned_to` INTEGER NULL,
    `authorization_level` INTEGER NULL DEFAULT 0,
    `authorization_rule_id` INTEGER NULL,
    `notes` LONGTEXT NULL,
    `requested_fee` FLOAT NULL,
    `imposed_fee` FLOAT NULL,
    `request_days` FLOAT NULL,
    `creation_date` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `last_mod_date` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `active` BOOLEAN NOT NULL DEFAULT true,

    INDEX `fk_request_assigned_user`(`assigned_to`),
    INDEX `fk_request_auth_rule`(`authorization_rule_id`),
    INDEX `fk_request_status`(`request_status_id`),
    INDEX `fk_request_user`(`user_id`),
    PRIMARY KEY (`request_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Request_status` (
    `request_status_id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` VARCHAR(30) NOT NULL,

    UNIQUE INDEX `status`(`status`),
    PRIMARY KEY (`request_status_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `role_id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_name` VARCHAR(60) NOT NULL,
    `description` VARCHAR(60) NULL,
    `active` BOOLEAN NULL DEFAULT true,
    `updated_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `role_name`(`role_name`),
    INDEX `idx_role_active`(`active`),
    PRIMARY KEY (`role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role_Permission` (
    `role_permission_id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_id` INTEGER NOT NULL,
    `permission_id` INTEGER NOT NULL,
    `granted_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_role_permission_permission`(`permission_id`),
    UNIQUE INDEX `uq_role_permission`(`role_id`, `permission_id`),
    PRIMARY KEY (`role_permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Route` (
    `route_id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_origin_country` INTEGER NULL,
    `id_origin_city` INTEGER NULL,
    `id_destination_country` INTEGER NULL,
    `id_destination_city` INTEGER NULL,
    `router_index` INTEGER NULL,
    `plane_needed` BOOLEAN NOT NULL DEFAULT false,
    `hotel_needed` BOOLEAN NOT NULL DEFAULT false,
    `beginning_date` DATE NULL,
    `beginning_time` TIME(0) NULL,
    `ending_date` DATE NULL,
    `ending_time` TIME(0) NULL,

    INDEX `fk_route_destination_city`(`id_destination_city`),
    INDEX `fk_route_destination_country`(`id_destination_country`),
    INDEX `fk_route_origin_city`(`id_origin_city`),
    INDEX `fk_route_origin_country`(`id_origin_country`),
    PRIMARY KEY (`route_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Route_Request` (
    `route_request_id` INTEGER NOT NULL AUTO_INCREMENT,
    `request_id` INTEGER NULL,
    `route_id` INTEGER NULL,

    INDEX `fk_route_request_request`(`request_id`),
    INDEX `fk_route_request_route`(`route_id`),
    PRIMARY KEY (`route_request_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_id` INTEGER NULL,
    `department_id` INTEGER NULL,
    `boss_id` INTEGER NULL,
    `substitute_id` INTEGER NULL,
    `out_of_office_start_date` DATE NULL,
    `out_of_office_end_date` DATE NULL,
    `user_name` VARCHAR(60) NOT NULL,
    `password` VARCHAR(60) NOT NULL,
    `workstation` VARCHAR(20) NULL,
    `email` VARCHAR(254) NOT NULL,
    `phone_number` VARCHAR(254) NULL,
    `wallet` FLOAT NULL DEFAULT 0,
    `creation_date` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `last_mod_date` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `active` BOOLEAN NOT NULL DEFAULT true,
    `password_reset_token` VARCHAR(64) NULL,
    `password_reset_expires` DATETIME(0) NULL,

    UNIQUE INDEX `user_name`(`user_name`),
    UNIQUE INDEX `email`(`email`),
    INDEX `fk_user_boss`(`boss_id`),
    INDEX `fk_user_department`(`department_id`),
    INDEX `fk_user_role`(`role_id`),
    INDEX `fk_user_substitute`(`substitute_id`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Alert` ADD CONSTRAINT `fk_alert_message` FOREIGN KEY (`message_id`) REFERENCES `AlertMessage`(`message_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Alert` ADD CONSTRAINT `fk_alert_request` FOREIGN KEY (`request_id`) REFERENCES `Request`(`request_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Audit_Log` ADD CONSTRAINT `fk_audit_actor_user` FOREIGN KEY (`actor_user_id`) REFERENCES `User`(`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `AuthorizationRuleLevel` ADD CONSTRAINT `fk_authorization_rule` FOREIGN KEY (`rule_id`) REFERENCES `AuthorizationRule`(`rule_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Department` ADD CONSTRAINT `fk_department_costcenter` FOREIGN KEY (`cost_center_id`) REFERENCES `CostCenter`(`cost_center_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Receipt` ADD CONSTRAINT `fk_receipt_request` FOREIGN KEY (`request_id`) REFERENCES `Request`(`request_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Receipt` ADD CONSTRAINT `fk_receipt_route` FOREIGN KEY (`route_id`) REFERENCES `Route`(`route_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Receipt` ADD CONSTRAINT `fk_receipt_type` FOREIGN KEY (`receipt_type_id`) REFERENCES `Receipt_Type`(`receipt_type_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Reimbursement_Policy` ADD CONSTRAINT `fk_reimbursement_policy_user` FOREIGN KEY (`created_by`) REFERENCES `User`(`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Reimbursement_Policy_Assignment` ADD CONSTRAINT `fk_policy_assignment_department` FOREIGN KEY (`department_id`) REFERENCES `Department`(`department_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Reimbursement_Policy_Assignment` ADD CONSTRAINT `fk_policy_assignment_policy` FOREIGN KEY (`policy_id`) REFERENCES `Reimbursement_Policy`(`policy_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Reimbursement_Policy_Rule` ADD CONSTRAINT `fk_policy_rule_policy` FOREIGN KEY (`policy_id`) REFERENCES `Reimbursement_Policy`(`policy_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Reimbursement_Policy_Rule` ADD CONSTRAINT `fk_policy_rule_receipt_type` FOREIGN KEY (`receipt_type_id`) REFERENCES `Receipt_Type`(`receipt_type_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Request` ADD CONSTRAINT `fk_request_assigned_user` FOREIGN KEY (`assigned_to`) REFERENCES `User`(`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Request` ADD CONSTRAINT `fk_request_auth_rule` FOREIGN KEY (`authorization_rule_id`) REFERENCES `AuthorizationRule`(`rule_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Request` ADD CONSTRAINT `fk_request_status` FOREIGN KEY (`request_status_id`) REFERENCES `Request_status`(`request_status_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Request` ADD CONSTRAINT `fk_request_user` FOREIGN KEY (`user_id`) REFERENCES `User`(`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Role_Permission` ADD CONSTRAINT `fk_role_permission_permission` FOREIGN KEY (`permission_id`) REFERENCES `Permission`(`permission_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Role_Permission` ADD CONSTRAINT `fk_role_permission_role` FOREIGN KEY (`role_id`) REFERENCES `Role`(`role_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Route` ADD CONSTRAINT `fk_route_destination_city` FOREIGN KEY (`id_destination_city`) REFERENCES `City`(`city_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Route` ADD CONSTRAINT `fk_route_destination_country` FOREIGN KEY (`id_destination_country`) REFERENCES `Country`(`country_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Route` ADD CONSTRAINT `fk_route_origin_city` FOREIGN KEY (`id_origin_city`) REFERENCES `City`(`city_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Route` ADD CONSTRAINT `fk_route_origin_country` FOREIGN KEY (`id_origin_country`) REFERENCES `Country`(`country_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Route_Request` ADD CONSTRAINT `fk_route_request_request` FOREIGN KEY (`request_id`) REFERENCES `Request`(`request_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Route_Request` ADD CONSTRAINT `fk_route_request_route` FOREIGN KEY (`route_id`) REFERENCES `Route`(`route_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `fk_user_boss` FOREIGN KEY (`boss_id`) REFERENCES `User`(`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `fk_user_department` FOREIGN KEY (`department_id`) REFERENCES `Department`(`department_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `fk_user_role` FOREIGN KEY (`role_id`) REFERENCES `Role`(`role_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `fk_user_substitute` FOREIGN KEY (`substitute_id`) REFERENCES `User`(`user_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- ============================================================================
-- Add Database Views
-- ============================================================================

-- UserRequestHistory: Simplified request history for user dashboard
CREATE OR REPLACE VIEW UserRequestHistory AS
    SELECT
        Request.request_id,
        Request.user_id,
        Request.creation_date,
        Request_status.status,
        GROUP_CONCAT(DISTINCT Country_origin.country_name ORDER BY Route.router_index SEPARATOR ', ') AS trip_origins,
        GROUP_CONCAT(DISTINCT Country_destination.country_name ORDER BY Route.router_index SEPARATOR ', ') AS trip_destinations
    FROM
        Request
        INNER JOIN Request_status
            ON Request.request_status_id = Request_status.request_status_id
        LEFT JOIN Route_Request
            ON Request.request_id = Route_Request.request_id
        LEFT JOIN Route
            ON Route_Request.route_id = Route.route_id
        LEFT JOIN Country AS Country_origin
            ON Route.id_origin_country = Country_origin.country_id
        LEFT JOIN Country AS Country_destination
            ON Route.id_destination_country = Country_destination.country_id
    GROUP BY
        Request.request_id,
        Request.user_id,
        Request.last_mod_date,
        Request_status.status;

-- RequestWithRouteDetails: Complete request information with all route segments
CREATE OR REPLACE VIEW RequestWithRouteDetails AS
    SELECT
        Request.request_id,
        Request.user_id,
        Request.request_status_id,
        Request.notes,
        Request.requested_fee,
        Request.imposed_fee,
        Request.request_days,
        Request.creation_date,
        Request.last_mod_date,
        Request.active,
        `User`.user_name,
        `User`.email AS user_email,
        `User`.phone_number AS user_phone_number,
        Request_status.status,
        Department.department_name,
        Department.department_id,
        GROUP_CONCAT(DISTINCT Country_origin.country_name ORDER BY Route.router_index SEPARATOR ', ') AS origin_countries,
        GROUP_CONCAT(DISTINCT City_origin.city_name ORDER BY Route.router_index SEPARATOR ', ') AS origin_cities,
        GROUP_CONCAT(DISTINCT Country_destination.country_name ORDER BY Route.router_index SEPARATOR ', ') AS destination_countries,
        GROUP_CONCAT(DISTINCT City_destination.city_name ORDER BY Route.router_index SEPARATOR ', ') AS destination_cities,
        GROUP_CONCAT(DISTINCT Route.beginning_date ORDER BY Route.router_index SEPARATOR ', ') AS beginning_dates,
        GROUP_CONCAT(DISTINCT Route.beginning_time ORDER BY Route.router_index SEPARATOR ', ') AS beginning_times,
        GROUP_CONCAT(DISTINCT Route.ending_date ORDER BY Route.router_index SEPARATOR ', ') AS ending_dates,
        GROUP_CONCAT(DISTINCT Route.ending_time ORDER BY Route.router_index SEPARATOR ', ') AS ending_times,
        GROUP_CONCAT(DISTINCT Route.hotel_needed ORDER BY Route.router_index SEPARATOR ', ') AS hotel_needed_list,
        GROUP_CONCAT(DISTINCT Route.plane_needed ORDER BY Route.router_index SEPARATOR ', ') AS plane_needed_list
    FROM
        Request
        LEFT JOIN `User`
            ON Request.user_id = `User`.user_id
        LEFT JOIN Request_status
            ON Request.request_status_id = Request_status.request_status_id
        LEFT JOIN Department
            ON `User`.department_id = Department.department_id
        LEFT JOIN Route_Request
            ON Request.request_id = Route_Request.request_id
        LEFT JOIN Route
            ON Route_Request.route_id = Route.route_id
        LEFT JOIN Country AS Country_origin
            ON Route.id_origin_country = Country_origin.country_id
        LEFT JOIN City AS City_origin
            ON Route.id_origin_city = City_origin.city_id
        LEFT JOIN Country AS Country_destination
            ON Route.id_destination_country = Country_destination.country_id
        LEFT JOIN City AS City_destination
            ON Route.id_destination_city = City_destination.city_id
    GROUP BY
        Request.request_id,
        Request.user_id,
        Request.request_status_id,
        Request.notes,
        Request.requested_fee,
        Request.imposed_fee,
        Request.request_days,
        Request.creation_date,
        Request.last_mod_date,
        Request.active,
        `User`.user_name,
        `User`.email,
        `User`.phone_number,
        Request_status.status,
        Department.department_name,
        Department.department_id;

-- UserFullInfo: User profile with role and department information
CREATE OR REPLACE VIEW UserFullInfo AS
    SELECT
        u.user_id,
        u.user_name,
        u.email,
        u.active,
        r.role_name,
        d.department_name,
        d.department_id
    FROM
        `User` u
        LEFT JOIN `Role` r ON u.role_id = r.role_id
        LEFT JOIN Department d ON u.department_id = d.department_id;

-- ============================================================================
-- Add Database Triggers
-- ============================================================================

-- DeactivateRequest: Automatically deactivates requests when finalized
CREATE TRIGGER DeactivateRequest
BEFORE UPDATE ON Request
FOR EACH ROW
BEGIN
    IF NEW.request_status_id IN (9, 10) THEN
        SET NEW.active = FALSE;
    END IF;
END;

-- CreateAlert: Creates notification when new request is submitted
CREATE TRIGGER CreateAlert
AFTER INSERT ON Request
FOR EACH ROW
BEGIN
    IF EXISTS (SELECT 1 FROM AlertMessage WHERE message_id = NEW.request_status_id) THEN
        INSERT INTO Alert (request_id, message_id) VALUES
            (NEW.request_id, NEW.request_status_id);
    END IF;
END;

-- ManageAlertAfterRequestUpdate: Updates or removes alerts based on status changes
CREATE TRIGGER ManageAlertAfterRequestUpdate
AFTER UPDATE ON Request
FOR EACH ROW
BEGIN
    IF NEW.request_status_id IN (8, 9, 10) THEN
        DELETE FROM Alert
        WHERE request_id = NEW.request_id;
    ELSEIF OLD.request_status_id <> NEW.request_status_id THEN
        UPDATE Alert
        SET message_id = NEW.request_status_id
        WHERE request_id = NEW.request_id;
    END IF;
END;

-- DeductFromWalletOnFeeImposed: Deducts approved travel fee from user's wallet
CREATE TRIGGER DeductFromWalletOnFeeImposed
AFTER UPDATE ON Request
FOR EACH ROW
BEGIN
    IF NEW.imposed_fee IS NOT NULL AND (OLD.imposed_fee IS NULL OR NEW.imposed_fee != OLD.imposed_fee) THEN
        UPDATE `User`
        SET wallet = wallet - (NEW.imposed_fee - IFNULL(OLD.imposed_fee, 0))
        WHERE user_id = NEW.user_id;
    END IF;
END;

-- AddToWalletOnReceiptApproved: Adds approved receipt amount to user's wallet
CREATE TRIGGER AddToWalletOnReceiptApproved
AFTER UPDATE ON Receipt
FOR EACH ROW
BEGIN
    IF NEW.validation = 'Aprobado' AND OLD.validation != 'Aprobado' THEN
        UPDATE `User` u
        JOIN Request r ON r.request_id = NEW.request_id
        SET u.wallet = u.wallet + NEW.amount
        WHERE u.user_id = r.user_id;
    END IF;
END;
