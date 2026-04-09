-- ============================================================================
-- CocoScheme Database Schema
-- ============================================================================
-- Travel Request Management System Database
-- Manages users, travel requests, routes, receipts, and workflow alerts
-- ============================================================================

DROP DATABASE IF EXISTS CocoScheme;
CREATE DATABASE CocoScheme CHARACTER SET utf8 COLLATE utf8_general_ci;
USE CocoScheme;

-- ============================================================================
-- User Management Tables
-- ============================================================================

-- Role: Defines user roles (Applicant, Travel Agent, Accounts Payable, etc.) with configurable permissions
CREATE TABLE IF NOT EXISTS Role (
    role_id     INT          PRIMARY KEY AUTO_INCREMENT,
    role_name   VARCHAR(60)  UNIQUE NOT NULL,
    description VARCHAR(60)  DEFAULT NULL,       -- Short description shown in config UI
    active      BOOL         DEFAULT TRUE,  -- Soft delete flag
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_role_active ON Role (active);

-- CostCenter
CREATE TABLE IF NOT EXISTS CostCenter (
    cost_center_id INT PRIMARY KEY AUTO_INCREMENT,
    cost_center_name VARCHAR(20) UNIQUE NOT NULL
);

-- Department: Company departments with cost centers for travel expense tracking
CREATE TABLE IF NOT EXISTS Department (
    department_id INT PRIMARY KEY AUTO_INCREMENT,
    department_name VARCHAR(20) UNIQUE NOT NULL,
    cost_center_id INT,
    active BOOL NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_department_costcenter FOREIGN KEY (cost_center_id) REFERENCES CostCenter(cost_center_id)
);

-- Currency: Global currency catalog with Banxico integration
CREATE TABLE IF NOT EXISTS Currency (
    currency_id INT PRIMARY KEY AUTO_INCREMENT,
    currency_code VARCHAR(6) UNIQUE NOT NULL,
    currency_name VARCHAR(100) NOT NULL,
    country VARCHAR(100),
    banxico_series_id VARCHAR(20) NULL,
    frequency ENUM('daily', 'monthly') DEFAULT 'monthly',
    active BOOL NOT NULL DEFAULT TRUE
);

-- AlertMessage: Predefined alert messages for request status notifications
CREATE TABLE IF NOT EXISTS AlertMessage (
    message_id INT PRIMARY KEY AUTO_INCREMENT,
    message_text VARCHAR(60) NOT NULL        -- Message template for alerts
);

-- User: System users with role-based access and wallet for travel reimbursements
CREATE TABLE IF NOT EXISTS User (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    role_id INT,                             -- User's role (Applicant, Agent, etc.)
    department_id INT,                       -- User's department

    boss_id INT NULL,                        -- Direct boss for authorization
    substitute_id INT NULL,                  -- Substitute user for delegation
    out_of_office_start_date DATE NULL,
    out_of_office_end_date DATE NULL,

    user_name VARCHAR(60) UNIQUE NOT NULL,   -- Unique username for login
    password VARCHAR(60) NOT NULL,           -- Hashed password
    workstation VARCHAR(20) NOT NULL,        -- User's work location/office
    email VARCHAR(254) UNIQUE NOT NULL,      -- Contact email
    phone_number VARCHAR(254),               -- Contact phone number
    wallet FLOAT DEFAULT 0.00,               -- Balance for approved reimbursements
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_mod_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    active BOOL NOT NULL DEFAULT TRUE,       -- Soft delete flag
    password_reset_token VARCHAR(64) NULL,   -- Token for password reset flow (64-char hex)
    password_reset_expires DATETIME NULL,    -- Expiry for password reset token (1 hour)

    CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES Role(role_id),
    CONSTRAINT fk_user_department FOREIGN KEY (department_id) REFERENCES Department(department_id),
    CONSTRAINT fk_user_boss FOREIGN KEY (boss_id) REFERENCES User(user_id),
    CONSTRAINT fk_user_substitute FOREIGN KEY (substitute_id) REFERENCES User(user_id)
);

-- Audit_Log: Critical action trail for administrative and workflow events
CREATE TABLE IF NOT EXISTS Audit_Log (
    audit_log_id INT PRIMARY KEY AUTO_INCREMENT,
    actor_user_id INT NULL,                  -- Authenticated user who executed the action
    action_type VARCHAR(80) NOT NULL,        -- Action performed (e.g., USER_CREATED)
    entity_type VARCHAR(80) NOT NULL,        -- Entity affected (e.g., User, Request, Receipt)
    entity_id VARCHAR(64) NULL,              -- Generic identifier for the affected entity
    source_ip VARCHAR(45) NULL,              -- Request IP address (IPv4/IPv6)
    metadata LONGTEXT NULL,                  -- Sanitized contextual payload serialized as JSON
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_actor_user FOREIGN KEY (actor_user_id) REFERENCES User(user_id),
    INDEX idx_audit_actor (actor_user_id),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_action (action_type),
    INDEX idx_audit_timestamp (event_timestamp)
);

-- ============================================================================
-- Authorization Rules
-- ============================================================================

-- AuthorizationRule: Defines authorization rules based on trip parameters
CREATE TABLE IF NOT EXISTS AuthorizationRule (
    rule_id INT PRIMARY KEY AUTO_INCREMENT,
    rule_name VARCHAR(50) NOT NULL,

    -- Default rule indicator
    is_default BOOL NOT NULL DEFAULT FALSE,

    -- Authorization levels
    num_levels INT NOT NULL,
    automatic BOOL NOT NULL DEFAULT TRUE,
    travel_type ENUM('Nacional', 'Internacional', 'Todos'),

    -- Duration
    min_duration INT,
    max_duration INT,

    -- Amount of requested fee
    min_amount FLOAT,
    max_amount FLOAT
);

-- AuthorizationRuleLevel: Defines approval levels within a rule
CREATE TABLE IF NOT EXISTS AuthorizationRuleLevel (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rule_id INT NOT NULL,
    level_number INT NOT NULL,
    level_type ENUM('Jefe', 'Aleatorio', 'Nivel Superior') NOT NULL,
    superior_level_number INT NULL,  -- For "Nivel Superior", indicates how many levels above the requester to go

    CONSTRAINT fk_authorization_rule FOREIGN KEY (rule_id) REFERENCES AuthorizationRule(rule_id)
);

-- ============================================================================
-- Request Management Tables
-- ============================================================================

-- Request_status: Workflow statuses (Draft, Review, Approved, etc.)
CREATE TABLE IF NOT EXISTS Request_status (
    request_status_id INT PRIMARY KEY AUTO_INCREMENT,
    status VARCHAR(30) UNIQUE NOT NULL       -- Status name (e.g., "Primera Revisión")
);

-- Request: Travel requests with fees, notes, and workflow status
CREATE TABLE IF NOT EXISTS Request (
    request_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,                             -- Requester (applicant)
    request_status_id INT DEFAULT 1,         -- Current workflow status
    assigned_to INT NULL,                    -- User who must handle the request next
    authorization_level INT DEFAULT 0,       -- Current level in authorization (0 = not yet assigned, 1 = first level, etc.)
    authorization_rule_id INT NULL,          -- Authorization rule applied to this request

    notes LONGTEXT,                          -- Justification and additional details
    requested_fee FLOAT,                     -- Amount requested by applicant
    imposed_fee FLOAT,                       -- Amount approved by authorizer
    request_days FLOAT,                      -- Duration of travel in days
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_mod_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    active BOOL NOT NULL DEFAULT TRUE,       -- Deactivated when finalized/cancelled

    CONSTRAINT fk_request_user FOREIGN KEY (user_id) REFERENCES User(user_id),
    CONSTRAINT fk_request_status FOREIGN KEY (request_status_id) REFERENCES Request_status(request_status_id),
    CONSTRAINT fk_request_assigned_user FOREIGN KEY (assigned_to) REFERENCES User(user_id),
    CONSTRAINT fk_request_auth_rule FOREIGN KEY (authorization_rule_id) REFERENCES AuthorizationRule(rule_id)
);

-- Alert: Notifications for users based on request status changes
CREATE TABLE IF NOT EXISTS Alert (
    alert_id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT,                          -- Related travel request
    message_id INT,                          -- Alert message template

    alert_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_alert_request FOREIGN KEY (request_id) REFERENCES Request(request_id),
    CONSTRAINT fk_alert_message FOREIGN KEY (message_id) REFERENCES AlertMessage(message_id)
);

-- ============================================================================
-- Geographic Tables
-- ============================================================================

-- Country: Countries for travel routes
CREATE TABLE IF NOT EXISTS Country (
    country_id INT PRIMARY KEY AUTO_INCREMENT,
    country_name VARCHAR(60) UNIQUE NOT NULL
);

-- City: Cities for detailed route planning
CREATE TABLE IF NOT EXISTS City (
    city_id INT PRIMARY KEY AUTO_INCREMENT,
    city_name VARCHAR(200) UNIQUE NOT NULL
);

-- ============================================================================
-- Route Management Tables
-- ============================================================================

-- Route: Individual travel route segments with transportation needs
CREATE TABLE IF NOT EXISTS Route (
    route_id INT PRIMARY KEY AUTO_INCREMENT,
    id_origin_country INT,                   -- Starting country
    id_origin_city INT,                      -- Starting city
    id_destination_country INT,              -- Destination country
    id_destination_city INT,                 -- Destination city

    router_index INT,                        -- Order in multi-segment trips
    plane_needed BOOL NOT NULL DEFAULT FALSE,  -- Flight required
    hotel_needed BOOL NOT NULL DEFAULT FALSE,  -- Accommodation required
    beginning_date DATE,                     -- Departure date
    beginning_time TIME,                     -- Departure time
    ending_date DATE,                        -- Arrival date
    ending_time TIME,                        -- Arrival time

    CONSTRAINT fk_route_origin_country FOREIGN KEY (id_origin_country) REFERENCES Country(country_id),
    CONSTRAINT fk_route_origin_city FOREIGN KEY (id_origin_city) REFERENCES City(city_id),
    CONSTRAINT fk_route_destination_country FOREIGN KEY (id_destination_country) REFERENCES Country(country_id),
    CONSTRAINT fk_route_destination_city FOREIGN KEY (id_destination_city) REFERENCES City(city_id)
);

-- Route_Request: Junction table linking requests to their route segments
CREATE TABLE IF NOT EXISTS Route_Request (
    route_request_id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT,                          -- Travel request
    route_id INT,                            -- Route segment

    CONSTRAINT fk_route_request_request FOREIGN KEY (request_id) REFERENCES Request(request_id),
    CONSTRAINT fk_route_request_route FOREIGN KEY (route_id) REFERENCES Route(route_id)
);

-- ============================================================================
-- Receipt Management Tables
-- ============================================================================

-- Receipt_Type: Categories of expenses (Lodging, Food, Transport, etc.)
CREATE TABLE IF NOT EXISTS Receipt_Type (
    receipt_type_id INT PRIMARY KEY AUTO_INCREMENT,
    receipt_type_name VARCHAR(20) UNIQUE NOT NULL
);

-- ============================================================================
-- Reimbursement Policy Tables
-- ============================================================================

-- Reimbursement_Policy: Configurable reimbursement policy headers
CREATE TABLE IF NOT EXISTS Reimbursement_Policy (
    policy_id INT PRIMARY KEY AUTO_INCREMENT,
    policy_code VARCHAR(40) UNIQUE NOT NULL,
    policy_name VARCHAR(120) NOT NULL,
    description LONGTEXT NULL,
    base_currency VARCHAR(6) NOT NULL DEFAULT 'MXN',
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    active BOOL NOT NULL DEFAULT TRUE,
    created_by INT NULL,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_mod_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_reimbursement_policy_user FOREIGN KEY (created_by) REFERENCES User(user_id)
);

-- Reimbursement_Policy_Assignment: Policy assignment by department or global fallback
CREATE TABLE IF NOT EXISTS Reimbursement_Policy_Assignment (
    assignment_id INT PRIMARY KEY AUTO_INCREMENT,
    policy_id INT NOT NULL,
    department_id INT NULL,
    active BOOL NOT NULL DEFAULT TRUE,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_policy_assignment_policy FOREIGN KEY (policy_id) REFERENCES Reimbursement_Policy(policy_id),
    CONSTRAINT fk_policy_assignment_department FOREIGN KEY (department_id) REFERENCES Department(department_id)
);

-- Reimbursement_Policy_Rule: Rule matrix by expense type and trip scope
CREATE TABLE IF NOT EXISTS Reimbursement_Policy_Rule (
    rule_id INT PRIMARY KEY AUTO_INCREMENT,
    policy_id INT NOT NULL,
    receipt_type_id INT NOT NULL,
    trip_scope ENUM('NACIONAL', 'INTERNACIONAL', 'TODOS') NOT NULL DEFAULT 'TODOS',
    max_amount_mxn DECIMAL(15,2) NOT NULL,
    submission_deadline_days INT NULL,
    requires_xml BOOL NOT NULL DEFAULT FALSE,
    allow_foreign_without_xml BOOL NOT NULL DEFAULT TRUE,
    refundable BOOL NOT NULL DEFAULT TRUE,
    active BOOL NOT NULL DEFAULT TRUE,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_mod_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_policy_rule_policy FOREIGN KEY (policy_id) REFERENCES Reimbursement_Policy(policy_id),
    CONSTRAINT fk_policy_rule_receipt_type FOREIGN KEY (receipt_type_id) REFERENCES Receipt_Type(receipt_type_id)
);

-- Receipt: Expense receipts for validation and reimbursement
CREATE TABLE IF NOT EXISTS Receipt (
    receipt_id INT PRIMARY KEY AUTO_INCREMENT,
    receipt_type_id INT,                     -- Type of expense
    request_id INT,                          -- Related travel request
    route_id INT,                            -- Related route segment

    validation ENUM('Pendiente', 'Aprobado', 'Rechazado') DEFAULT 'Pendiente',
    amount FLOAT NOT NULL,                   -- Receipt amount
    currency VARCHAR(6) NULL,            -- Currency code (e.g., MXN, USD)
    refund BOOL DEFAULT TRUE,                -- Eligible for reimbursement

    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validation_date TIMESTAMP,               -- When validated by Accounts Payable

    pdf_file_id VARCHAR(24) NULL,            -- MongoDB file ID for PDF receipt
    pdf_file_name VARCHAR(255) NULL,         -- Original PDF filename
    xml_file_id VARCHAR(24) NULL,            -- MongoDB file ID for XML receipt
    xml_file_name VARCHAR(255) NULL,         -- Original XML filename

    -- CFDI fields from XML parsing
    xml_uuid VARCHAR(36) UNIQUE NULL,
    xml_rfc_emisor VARCHAR(13),
    xml_rfc_receptor VARCHAR(13),
    xml_nombre_emisor VARCHAR(255),
    xml_fecha DATETIME,
    xml_total DECIMAL(15,2),
    xml_subtotal DECIMAL(15,2),
    xml_impuestos DECIMAL(15,2),
    xml_moneda VARCHAR(6),

    CONSTRAINT fk_receipt_type FOREIGN KEY (receipt_type_id) REFERENCES Receipt_Type(receipt_type_id),
    CONSTRAINT fk_receipt_request FOREIGN KEY (request_id) REFERENCES Request(request_id),
    CONSTRAINT fk_receipt_route FOREIGN KEY (route_id) REFERENCES Route(route_id)
);

-- ============================================================================
-- Role-Based Access Control Tables
-- ============================================================================

-- Permission: Catalogue of all actions available in the system
CREATE TABLE IF NOT EXISTS Permission (
    permission_id   INT          PRIMARY KEY AUTO_INCREMENT,
    permission_key  VARCHAR(50)  UNIQUE NOT NULL,   -- Unique key, format module:action (e.g. travel:approve)
    permission_name VARCHAR(100) NOT NULL,          -- Label shown in config UI
    module          VARCHAR(50)  NOT NULL,          -- Groups permissions by section (users, travel_requests, etc.)
    action          VARCHAR(50)  NOT NULL,          -- Verb category (view, create, approve_reject, etc.)
    description     VARCHAR(100) DEFAULT NULL       -- Optional detail about the permission
);

-- Role_Permission: Many-to-many pivot between Role and Permission
-- Each row means "role X has permission Y"
-- Inserting a row grants a permission; deleting it revokes it
CREATE TABLE IF NOT EXISTS Role_Permission (
    role_permission_id  INT        PRIMARY KEY AUTO_INCREMENT,
    role_id             INT        NOT NULL,   -- Role receiving the permission
    permission_id       INT        NOT NULL,   -- Permission being granted
    granted_at          TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_role_permission (role_id, permission_id),  -- Prevents duplicate grants

    CONSTRAINT fk_role_permission_role FOREIGN KEY (role_id)       REFERENCES Role(role_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_role_permission_permission FOREIGN KEY (permission_id) REFERENCES Permission(permission_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================================================
-- Accountability Tables
-- ============================================================================

-- Accounting Account table
CREATE TABLE IF NOT EXISTS Account (
    account_id INT PRIMARY KEY AUTO_INCREMENT,
    account_code VARCHAR(20) NOT NULL,      -- Account code (e.g. 1001, 1111, 1000, etc.)
    account_name VARCHAR(100) NOT NULL,     -- Account name (e.g. Gasto de Viaje)
    account_type VARCHAR(100) NOT NULL      -- Account type (e.g. Gasto, Recurso, etc.)
);

-- Tax table
CREATE TABLE IF NOT EXISTS Tax (
    tax_id INT PRIMARY KEY AUTO_INCREMENT,
    tax_code VARCHAR(20) NOT NULL,      -- Tax code (e.g VAT16 (16% de IVA), Excento, etc.)
    tax_rate DECIMAL(15,2) NOT NULL     -- Tax rate
);

-- Receipt Type Account table: Link table between Receipt_Type table and Account table
CREATE TABLE IF NOT EXISTS ReceiptType_Account (
    id INT PRIMARY KEY AUTO_INCREMENT,
    receipt_type_id INT NOT NULL,   -- Receipt type linked to the account
    account_id INT NOT NULL,         -- Account linked to the receipt type

    FOREIGN KEY (receipt_type_id) REFERENCES Receipt_Type(receipt_type_id),
    FOREIGN KEY (account_id) REFERENCES Account(account_id)
);