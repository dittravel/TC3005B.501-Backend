/**
 * Accounts Payable Service
 * 
 * Business logic for expense validation and receipt processing.
 * Handles the validation workflow for travel request receipts and
 * manages status transitions based on receipt approval states.
 */

import AccountsPayable from '../models/accountsPayableModel.js';

const AccountsPayableService = {
  /**
   * Validate all receipts for a travel request and update request status accordingly.
   * @param {number} requestId - The ID of the travel request
   * @returns {Promise<Object>} Object containing updatedStatus and descriptive message
   * @property {number|null} updatedStatus - The new status ID (6, 8, or null if no change)
   * @property {string} message - Description of the status change
   */
  async validateReceiptsAndUpdateStatus(requestId) {
    const statuses = await AccountsPayable.getReceiptStatusesForRequest(requestId);

    // If any receipt is rejected, move request back to travel status verification (step 6)
    if (statuses.includes('Rechazado')) {
      await AccountsPayable.updateRequestStatus(requestId, 6);
      return {
        updatedStatus: 6,
        message: 'Some receipts were rejected. Request moved back to step 6.'
      };
    }

    // If all receipts are approved, finalize the request (step 8)
    const allApproved = statuses.every(status => status === 'Aprobado');
    if (allApproved) {
      await AccountsPayable.updateRequestStatus(requestId, 8);
      return {
        updatedStatus: 8,
        message: 'All receipts approved. Request finalized.'
      };
    }

    // Receipts still pending review, no status change needed
    return {
      updatedStatus: null,
      message: 'Receipts still pending. No status change applied.'
    };
  }
};

export default AccountsPayableService;