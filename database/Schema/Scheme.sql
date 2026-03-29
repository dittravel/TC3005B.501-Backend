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

-- Role: Defines user roles (Applicant, Travel Agent, Accounts Payable, etc.)
CREATE TABLE IF NOT EXISTS Role (
    role_id INT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(20) UNIQUE NOT NULL
);

-- Department: Company departments with cost centers for travel expense tracking
CREATE TABLE IF NOT EXISTS Department (
    department_id INT PRIMARY KEY AUTO_INCREMENT,
    department_name VARCHAR(20) UNIQUE NOT NULL,
    active BOOL NOT NULL DEFAULT TRUE
);

-- CostCenter
CREATE TABLE IF NOT EXISTS CostCenter (
    cost_center_id INT PRIMARY KEY AUTO_INCREMENT,
    cost_center_name VARCHAR(20) UNIQUE NOT NULL,
    department_id INT NOT NULL,

    FOREIGN KEY (department_id) REFERENCES Department(department_id)
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

    FOREIGN KEY (role_id) REFERENCES Role(role_id),
    FOREIGN KEY (department_id) REFERENCES Department(department_id),
    FOREIGN KEY (boss_id) REFERENCES User(user_id)
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

    notes LONGTEXT,                          -- Justification and additional details
    requested_fee FLOAT,                     -- Amount requested by applicant
    imposed_fee FLOAT,                       -- Amount approved by authorizer
    request_days FLOAT,                      -- Duration of travel in days
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_mod_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    active BOOL NOT NULL DEFAULT TRUE,       -- Deactivated when finalized/cancelled

    FOREIGN KEY (user_id) REFERENCES User(user_id),
    FOREIGN KEY (request_status_id) REFERENCES Request_status(request_status_id),
    FOREIGN KEY (assigned_to) REFERENCES User(user_id)
);

-- Alert: Notifications for users based on request status changes
CREATE TABLE IF NOT EXISTS Alert (
    alert_id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT,                          -- Related travel request
    message_id INT,                          -- Alert message template

    alert_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (request_id) REFERENCES Request(request_id),
    FOREIGN KEY (message_id) REFERENCES AlertMessage(message_id)
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

    FOREIGN KEY (id_origin_country) REFERENCES Country(country_id),
    FOREIGN KEY (id_origin_city) REFERENCES City(city_id),
    FOREIGN KEY (id_destination_country) REFERENCES Country(country_id),
    FOREIGN KEY (id_destination_city) REFERENCES City(city_id)
);

-- Route_Request: Junction table linking requests to their route segments
CREATE TABLE IF NOT EXISTS Route_Request (
    route_request_id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT,                          -- Travel request
    route_id INT,                            -- Route segment

    FOREIGN KEY (request_id) REFERENCES Request(request_id),
    FOREIGN KEY (route_id) REFERENCES Route(route_id)
);

-- ============================================================================
-- Receipt Management Tables
-- ============================================================================

-- Receipt_Type: Categories of expenses (Lodging, Food, Transport, etc.)
CREATE TABLE IF NOT EXISTS Receipt_Type (
    receipt_type_id INT PRIMARY KEY AUTO_INCREMENT,
    receipt_type_name VARCHAR(20) UNIQUE NOT NULL
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

    FOREIGN KEY (receipt_type_id) REFERENCES Receipt_Type(receipt_type_id),
    FOREIGN KEY (request_id) REFERENCES Request(request_id),
    FOREIGN KEY (route_id) REFERENCES Route(route_id)
);

-- ============================================================================
-- System configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS AuthorizationRule (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,

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

CREATE TABLE IF NOT EXISTS AuthorizationRuleLevel (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rule_id INT NOT NULL,
    level INT NOT NULL,
    type ENUM('Jefe', 'Departamento', 'Usuario') NOT NULL,
    user_id INT,

    FOREIGN KEY (rule_id) REFERENCES AuthorizationRule(id),
    FOREIGN KEY (user_id) REFERENCES User(user_id)
);