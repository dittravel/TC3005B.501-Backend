-- ============================================================================
-- CocoScheme Database - Business Logic Triggers
-- ============================================================================
-- This file defines database triggers that automatically enforce business
-- rules and maintain data consistency throughout the request lifecycle.
-- ============================================================================

USE CocoScheme;

-- ============================================================================
-- TRIGGER: DeactivateRequest
-- ============================================================================
-- Purpose: Automatically deactivate requests when they reach terminal states
-- When: Before updating a request
-- Action: Sets active=FALSE when status changes to Cancelled (9) or Rejected (10)
-- Business Rule: Completed/terminated requests should not appear in active lists
CREATE OR REPLACE TRIGGER DeactivateRequest
BEFORE UPDATE ON Request
FOR EACH ROW
BEGIN
    IF NEW.request_status_id IN (9, 10) THEN
        SET NEW.active = FALSE;
    END IF;
END;

-- ============================================================================
-- TRIGGER: CreateAlert
-- ============================================================================
-- Purpose: Create notification alerts when new requests are submitted
-- When: After inserting a new request
-- Action: Creates an alert if a message template exists for the request status
-- Business Rule: Users should be notified of new requests requiring action
CREATE OR REPLACE TRIGGER CreateAlert
AFTER INSERT ON Request
FOR EACH ROW
BEGIN
    -- Only create alert if there's a corresponding alert message for this status
    IF EXISTS (SELECT 1 FROM AlertMessage WHERE message_id = NEW.request_status_id) THEN
        INSERT INTO Alert (request_id, message_id) VALUES
            (NEW.request_id, NEW.request_status_id);
    END IF;
END;

-- ============================================================================
-- TRIGGER: ManageAlertAfterRequestUpdate
-- ============================================================================
-- Purpose: Update or remove alerts when request status changes
-- When: After updating a request
-- Actions:
--   1. Delete alerts for terminal statuses (Finished=8, Cancelled=9, Rejected=10)
--   2. Update alert message when status changes to reflect new workflow stage
-- Business Rule: Keep alerts synchronized with current request status
CREATE OR REPLACE TRIGGER ManageAlertAfterRequestUpdate
AFTER UPDATE ON Request
FOR EACH ROW
BEGIN
    -- Remove alerts for completed/terminated requests
    IF NEW.request_status_id IN (8, 9, 10) THEN
        DELETE FROM Alert
        WHERE request_id = NEW.request_id;
    -- Update alert message when status changes (but not to terminal state)
    ELSEIF OLD.request_status_id <> NEW.request_status_id THEN
        UPDATE Alert
        SET message_id = NEW.request_status_id
        WHERE request_id = NEW.request_id;
    END IF;
END;

-- ============================================================================
-- TRIGGER: DeductFromWalletOnFeeImposed
-- ============================================================================
-- Purpose: Deduct approved travel advance from user's wallet
-- When: After updating a request that sets or changes the imposed_fee
-- Action: Reduces wallet balance by the approved amount (advance payment)
-- Business Rule: When management approves a fee, it's deducted from available funds
-- Note: Wallet represents available balance, decreases with advances
CREATE OR REPLACE TRIGGER DeductFromWalletOnFeeImposed
AFTER UPDATE ON Request
FOR EACH ROW
BEGIN
    -- Only deduct if imposed_fee is newly set or changed
    IF NEW.imposed_fee IS NOT NULL AND (OLD.imposed_fee IS NULL OR NEW.imposed_fee != OLD.imposed_fee) THEN
        UPDATE `User`
        SET wallet = wallet - (NEW.imposed_fee - IFNULL(OLD.imposed_fee, 0))
        WHERE user_id = NEW.user_id;
    END IF;
END;

-- ============================================================================
-- TRIGGER: AddToWalletOnReceiptApproved
-- ============================================================================
-- Purpose: Add approved expense reimbursements to user's wallet
-- When: After updating a receipt to 'Aprobado' status
-- Action: Increases wallet balance by the approved receipt amount
-- Business Rule: Approved expenses are credited back to the user's account
-- Note: This reimburses the employee for validated travel expenses
CREATE OR REPLACE TRIGGER AddToWalletOnReceiptApproved
AFTER UPDATE ON Receipt
FOR EACH ROW
BEGIN
    -- Only add to wallet when status changes from non-approved to approved
    IF NEW.validation = 'Aprobado' AND OLD.validation != 'Aprobado' THEN
        UPDATE `User` u
        JOIN Request r ON r.request_id = NEW.request_id
        SET u.wallet = u.wallet + NEW.amount
        WHERE u.user_id = r.user_id;
    END IF;
END;

-- ============================================================================
-- COMMENTED OUT TRIGGER: ResetRejectedReceipts
-- ============================================================================
-- Purpose: Reset rejected receipts to 'Pendiente' when request returns to validation
-- When: After updating request from receipt validation (7) back to expense submission (6)
-- Action: Would change rejected receipts back to pending for resubmission
-- Status: Disabled - business logic may need refinement
-- Note: If re-enabled, allows users to resubmit corrected receipts
/*
CREATE OR REPLACE TRIGGER ResetRejectedReceipts
AFTER UPDATE ON Request
FOR EACH ROW
BEGIN
    IF OLD.request_status_id = 7 AND NEW.request_status_id = 6 THEN
        UPDATE Receipt
        SET validation = 'Pendiente'
        WHERE request_id = NEW.request_id
        AND validation = 'Rechazado';
    END IF;
END;
*/