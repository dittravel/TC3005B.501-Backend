-- ============================================================================
-- Modify existing database tables to include necessary fields for accounting data integration.
--
-- Includes tables like Account, Tax, Currency, CostCenter, ReceiptType_Account.
-- ============================================================================

USE CocoScheme;

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