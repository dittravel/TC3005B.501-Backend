USE CocoScheme;

ALTER TABLE Receipt
    ADD COLUMN IF NOT EXISTS route_id INT NULL AFTER request_id,
    ADD COLUMN IF NOT EXISTS currency VARCHAR(6) NULL AFTER amount,
    ADD COLUMN IF NOT EXISTS xml_uuid VARCHAR(36) UNIQUE NULL AFTER xml_file_name,
    ADD COLUMN IF NOT EXISTS xml_rfc_emisor VARCHAR(13) NULL AFTER xml_uuid,
    ADD COLUMN IF NOT EXISTS xml_rfc_receptor VARCHAR(13) NULL AFTER xml_rfc_emisor,
    ADD COLUMN IF NOT EXISTS xml_nombre_emisor VARCHAR(255) NULL AFTER xml_rfc_receptor,
    ADD COLUMN IF NOT EXISTS xml_fecha DATETIME NULL AFTER xml_nombre_emisor,
    ADD COLUMN IF NOT EXISTS xml_total DECIMAL(15,2) NULL AFTER xml_fecha,
    ADD COLUMN IF NOT EXISTS xml_subtotal DECIMAL(15,2) NULL AFTER xml_total,
    ADD COLUMN IF NOT EXISTS xml_impuestos DECIMAL(15,2) NULL AFTER xml_subtotal,
    ADD COLUMN IF NOT EXISTS xml_moneda VARCHAR(6) NULL AFTER xml_impuestos;

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

    FOREIGN KEY (created_by) REFERENCES User(user_id)
);

CREATE TABLE IF NOT EXISTS Reimbursement_Policy_Assignment (
    assignment_id INT PRIMARY KEY AUTO_INCREMENT,
    policy_id INT NOT NULL,
    department_id INT NULL,
    active BOOL NOT NULL DEFAULT TRUE,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (policy_id) REFERENCES Reimbursement_Policy(policy_id),
    FOREIGN KEY (department_id) REFERENCES Department(department_id)
);

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

    FOREIGN KEY (policy_id) REFERENCES Reimbursement_Policy(policy_id),
    FOREIGN KEY (receipt_type_id) REFERENCES Receipt_Type(receipt_type_id)
);
