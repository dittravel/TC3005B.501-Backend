USE CocoScheme;

CREATE TABLE IF NOT EXISTS Audit_Log (
    audit_log_id INT PRIMARY KEY AUTO_INCREMENT,
    actor_user_id INT NULL,
    action_type VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id VARCHAR(64) NULL,
    source_ip VARCHAR(45) NULL,
    metadata LONGTEXT NULL,
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (actor_user_id) REFERENCES User(user_id),
    INDEX idx_audit_actor (actor_user_id),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_action (action_type),
    INDEX idx_audit_timestamp (event_timestamp)
);
