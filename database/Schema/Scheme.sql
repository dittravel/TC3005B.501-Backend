-- ============================================================================
-- CocoScheme Database Schema
-- Travel Request Management System
-- ============================================================================
-- This database manages travel requests, approvals, receipts, and user roles
-- for an organizational travel management system.
-- ============================================================================

DROP DATABASE IF EXISTS CocoScheme;
CREATE DATABASE CocoScheme CHARACTER SET utf8 COLLATE utf8_general_ci;
USE CocoScheme;

-- ============================================================================
-- CORE REFERENCE TABLES
-- ============================================================================

-- User roles define permissions and workflow responsibilities
-- (Applicant, Travel Agent, Accounts Payable, Authorizers, Admin)
CREATE TABLE IF NOT EXISTS `Role` (
    role_id INT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(20) UNIQUE NOT NULL
);

-- Organizational departments with associated cost centers
-- Used for budget tracking and expense allocation
CREATE TABLE IF NOT EXISTS Department (
    department_id INT PRIMARY KEY AUTO_INCREMENT,
    department_name VARCHAR(20) UNIQUE NOT NULL,
    costs_center VARCHAR(20),  -- Cost center code for accounting
    active BOOL NOT NULL DEFAULT TRUE  -- Soft delete flag
);

-- Alert message templates for workflow notifications
-- Messages are triggered by request status changes
CREATE TABLE IF NOT EXISTS AlertMessage (
    message_id INT PRIMARY KEY AUTO_INCREMENT,
    message_text VARCHAR(60) NOT NULL  -- Notification message text
);

-- ============================================================================
-- USER MANAGEMENT
-- ============================================================================

-- System users with roles, departments, and wallet for expense tracking
-- Wallet tracks advance payments and reimbursements
CREATE TABLE IF NOT EXISTS `User`(
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    role_id INT,  -- References Role table
    department_id INT,  -- References Department table

    user_name VARCHAR(60) UNIQUE NOT NULL,
    password VARCHAR(60) NOT NULL,  -- Hashed password
    workstation VARCHAR(20) NOT NULL,  -- Job title/position
    email VARCHAR(254) UNIQUE NOT NULL,
    phone_number VARCHAR(254),
    wallet FLOAT DEFAULT 0.00,  -- Current balance (advances - expenses)
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_mod_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    active BOOL NOT NULL DEFAULT TRUE,  -- Soft delete flag

    FOREIGN KEY (role_id) REFERENCES `Role`(role_id),
    FOREIGN KEY (department_id) REFERENCES Department(department_id)
);

-- ============================================================================
-- TRAVEL REQUEST WORKFLOW
-- ============================================================================

-- Request status workflow stages
-- (Draft, Review Levels, Quotation, Service Assignment, Expense Validation, etc.)
CREATE TABLE IF NOT EXISTS Request_status (
    request_status_id INT PRIMARY KEY AUTO_INCREMENT,
    status VARCHAR(30) UNIQUE NOT NULL
);

-- Core travel request entity
-- Tracks the full lifecycle of a travel request from draft to completion
CREATE TABLE IF NOT EXISTS Request (
    request_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,  -- Employee requesting travel
    request_status_id INT DEFAULT 1,  -- Current workflow status

    notes LONGTEXT,  -- Request justification and details
    requested_fee FLOAT,  -- Amount requested by applicant
    imposed_fee FLOAT,  -- Amount approved/allocated by management
    request_days FLOAT,  -- Duration of trip in days
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_mod_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    active BOOL NOT NULL DEFAULT TRUE,  -- Deactivated when cancelled/rejected

    FOREIGN KEY (user_id) REFERENCES `User`(user_id),
    FOREIGN KEY (request_status_id) REFERENCES Request_status(request_status_id)
);

-- Alert notifications for pending actions
-- Created by triggers when requests change status
CREATE TABLE IF NOT EXISTS Alert (
    alert_id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT,  -- Related travel request
    message_id INT,  -- Alert message template

    alert_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (request_id) REFERENCES Request(request_id),
    FOREIGN KEY (message_id) REFERENCES AlertMessage(message_id)
);

-- ============================================================================
-- GEOGRAPHIC AND ROUTE INFORMATION
-- ============================================================================

-- Countries for travel destinations and origins
CREATE TABLE IF NOT EXISTS Country (
    country_id INT PRIMARY KEY AUTO_INCREMENT,
    country_name VARCHAR(60) UNIQUE NOT NULL
);

-- Cities for more specific location tracking
CREATE TABLE IF NOT EXISTS City (
    city_id INT PRIMARY KEY AUTO_INCREMENT,
    city_name VARCHAR(200) UNIQUE NOT NULL
);

-- Individual route segments for multi-leg trips
-- A request can have multiple routes (e.g., City A -> B -> C -> A)
CREATE TABLE IF NOT EXISTS `Route` (
    route_id INT PRIMARY KEY AUTO_INCREMENT,
    id_origin_country INT,
    id_origin_city INT,
    id_destination_country INT,
    id_destination_city INT,

    router_index INT,  -- Order of route in multi-leg journey (0, 1, 2...)
    plane_needed BOOL NOT NULL DEFAULT FALSE,  -- Flight required
    hotel_needed BOOL NOT NULL DEFAULT FALSE,  -- Accommodation required
    beginning_date DATE,
    beginning_time TIME,
    ending_date DATE,
    ending_time TIME,

    FOREIGN KEY (id_origin_country) REFERENCES Country(country_id),
    FOREIGN KEY (id_origin_city) REFERENCES City(city_id),
    FOREIGN KEY (id_destination_country) REFERENCES Country(country_id),
    FOREIGN KEY (id_destination_city) REFERENCES City(city_id)
);

-- Junction table linking requests to their route segments
-- Many-to-many relationship: one request can have multiple routes
CREATE TABLE IF NOT EXISTS Route_Request (
    route_request_id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT,
    route_id INT,

    FOREIGN KEY (request_id) REFERENCES Request(request_id),
    FOREIGN KEY (route_id) REFERENCES `Route`(route_id)
);

-- ============================================================================
-- EXPENSE RECEIPT MANAGEMENT
-- ============================================================================

-- Categories for different types of expenses
-- (Lodging, Meals, Transportation, Tolls, Bus, Flight, Other)
CREATE TABLE IF NOT EXISTS Receipt_Type (
    receipt_type_id INT PRIMARY KEY AUTO_INCREMENT,
    receipt_type_name VARCHAR(20) UNIQUE NOT NULL
);

-- Expense receipts submitted after travel completion
-- Supports PDF and XML attachments stored in MongoDB
CREATE TABLE IF NOT EXISTS Receipt (
    receipt_id INT PRIMARY KEY AUTO_INCREMENT,
    receipt_type_id INT,  -- Type of expense
    request_id INT,  -- Related travel request

    validation ENUM('Pendiente', 'Aprobado', 'Rechazado') DEFAULT 'Pendiente',
    amount FLOAT NOT NULL,  -- Receipt amount to be reimbursed
    refund BOOL DEFAULT TRUE,  -- Whether this qualifies for reimbursement

    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validation_date TIMESTAMP,  -- When approved/rejected

    -- File references (stored in MongoDB GridFS)
    pdf_file_id VARCHAR(24) NULL,  -- MongoDB ObjectId for PDF
    pdf_file_name VARCHAR(255) NULL,
    xml_file_id VARCHAR(24) NULL,  -- MongoDB ObjectId for XML (Mexican tax receipt)
    xml_file_name VARCHAR(255) NULL,

    FOREIGN KEY (receipt_type_id) REFERENCES Receipt_Type(receipt_type_id),
    FOREIGN KEY (request_id) REFERENCES Request(request_id)
);