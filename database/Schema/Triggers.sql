-- ============================================================================
-- CocoScheme Database Triggers
-- ============================================================================
-- Automated business logic for managing workflow alerts, request lifecycle,
-- and financial transactions (wallet deductions and reimbursements)
-- ============================================================================

USE CocoScheme;

-- ============================================================================
-- Request Lifecycle Management
-- ============================================================================

-- DeactivateRequest: Automatically deactivates requests when finalized
-- Triggers when: Request status changes to Cancelled (9) or Rejected (10)
-- Purpose: Soft-delete completed/cancelled requests from active workflow
CREATE OR REPLACE TRIGGER DeactivateRequest
BEFORE UPDATE ON Request
FOR EACH ROW
BEGIN
    IF NEW.request_status_id IN (9, 10) THEN
        SET NEW.active = FALSE;
    END IF;
END;

-- ============================================================================
-- Alert Management
-- ============================================================================

-- CreateAlert: Creates notification when new request is submitted
-- Triggers when: New request is inserted into Request table
-- Purpose: Notify appropriate users (N1, Travel Agent, etc.) of new request
CREATE OR REPLACE TRIGGER CreateAlert
AFTER INSERT ON Request
FOR EACH ROW
BEGIN
    IF EXISTS (SELECT 1 FROM AlertMessage WHERE message_id = NEW.request_status_id) THEN
        INSERT INTO Alert (request_id, message_id) VALUES
            (NEW.request_id, NEW.request_status_id);
    END IF;
END;

-- ManageAlertAfterRequestUpdate: Updates or removes alerts based on status changes
-- Triggers when: Request status is updated
-- Purpose: Clear alerts for finalized requests, update alerts when status changes
-- Logic: Deletes alerts for finalized/cancelled/rejected requests,
--        updates alert message for status transitions
CREATE OR REPLACE TRIGGER ManageAlertAfterRequestUpdate
AFTER UPDATE ON Request
FOR EACH ROW
BEGIN
    -- Remove alerts for completed workflow states (Finalized, Cancelled, Rejected)
    IF NEW.request_status_id IN (8, 9, 10) THEN
        DELETE FROM Alert
        WHERE request_id = NEW.request_id;
    -- Update alert message when status changes (still in active workflow)
    ELSEIF OLD.request_status_id <> NEW.request_status_id THEN
        UPDATE Alert
        SET message_id = NEW.request_status_id
        WHERE request_id = NEW.request_id;
    END IF;
END;

-- ============================================================================
-- Financial Transaction Management
-- ============================================================================

-- DeductFromWalletOnFeeImposed: Deducts approved travel fee from user's wallet
-- Triggers when: Authorizer sets or updates the imposed_fee on a request
-- Purpose: Pre-deduct approved travel allowance from wallet as advance payment
-- Note: This creates a negative balance that gets replenished when receipts are approved
CREATE OR REPLACE TRIGGER DeductFromWalletOnFeeImposed
AFTER UPDATE ON Request
FOR EACH ROW
BEGIN
    -- Check if imposed_fee was newly set or changed
    IF NEW.imposed_fee IS NOT NULL AND (OLD.imposed_fee IS NULL OR NEW.imposed_fee != OLD.imposed_fee) THEN
        UPDATE `User`
        SET wallet = wallet - (NEW.imposed_fee - IFNULL(OLD.imposed_fee, 0))
        WHERE user_id = NEW.user_id;
    END IF;
END;

-- AddToWalletOnReceiptApproved: Adds approved receipt amount to user's wallet
-- Triggers when: Accounts Payable approves a receipt (validation = 'Aprobado')
-- Purpose: Reimburse user for validated travel expenses
-- Note: This increases the wallet balance to compensate for actual expenses
CREATE OR REPLACE TRIGGER AddToWalletOnReceiptApproved
AFTER UPDATE ON Receipt
FOR EACH ROW
BEGIN
    -- Check if receipt was newly approved
    IF NEW.validation = 'Aprobado' AND OLD.validation != 'Aprobado' THEN
        UPDATE `User` u
        JOIN Request r ON r.request_id = NEW.request_id
        SET u.wallet = u.wallet + NEW.amount
        WHERE u.user_id = r.user_id;
    END IF;
END;

-- ============================================================================
-- Disabled Triggers (kept for reference)
-- ============================================================================

/*
-- ResetRejectedReceipts: Would reset rejected receipts back to pending status
-- Currently disabled: Business logic changed to require new receipt submissions
-- instead of allowing rejected receipts to be resubmitted
CREATE OR REPLACE TRIGGER ResetRejectedReceipts
AFTER UPDATE ON Request
FOR EACH ROW
BEGIN
    -- When request moves from validation (7) back to receipt submission (6)
    IF OLD.request_status_id = 7 AND NEW.request_status_id = 6 THEN
        UPDATE Receipt
        SET validation = 'Pendiente'
        WHERE request_id = NEW.request_id
        AND validation = 'Rechazado';
    END IF;
END;
*/