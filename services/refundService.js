/**
 * Refund Service
 *
 * Handles business logic for processing refunds and balance adjustments
 */

import { prisma } from "../lib/prisma.js";
import Refund from "../models/refundModel.js";
import User from "../models/userModel.js";

const RefundService = {
  /**
   * Process refund for a finalized request
   * Calculates refund amount based on anticipo vs comprobantes
   * Creates refund record and updates user wallet
   */
  async processRefund(requestId, userId) {
    try {
      // Get request with imposed_fee
      const request = await prisma.request.findUnique({
        where: { request_id: requestId },
        select: { imposed_fee: true },
      });

      if (!request) {
        throw new Error("Request not found");
      }

      // Get approved receipts for this request
      const approvedReceipts = await prisma.receipt.findMany({
        where: {
          request_id: requestId,
          validation: "Aprobado",
        },
        select: { local_amount: true },
      });

      // Calculate total of approved receipts
      const totalApproved = approvedReceipts.reduce((sum, receipt) => sum + (receipt.local_amount || 0), 0);

      const hasAdvance = request.imposed_fee && request.imposed_fee > 0;
      const refundAmount = totalApproved;

      // Deduction: approved amount <= advance (deducted from advance)
      // Reimbursement: approved amount > advance OR no advance given
      let refundType;
      if (hasAdvance && totalApproved <= request.imposed_fee) {
        refundType = "Deducción";
      } else {
        refundType = "Reembolso";
      }

      // Create refund record
      const refund = await Refund.create({
        request_id: requestId,
        user_id: userId,
        refund_amount: refundAmount,
        refund_type: refundType,
      });

      // Update user wallet
      await User.updateWallet(userId, refundAmount);

      return {
        refund,
        refundAmount,
        refundType,
        totalApproved,
        hasAdvance,
      };
    } catch (error) {
      console.error("Error processing refund:", error);
      throw error;
    }
  },

  /**
   * Get refund summary for a user
   */
  async getUserRefundSummary(userId) {
    try {
      const refunds = await Refund.findByUserId(userId);

      const totalReembolsos = refunds
        .filter(r => r.refund_type === "Reembolso")
        .reduce((sum, r) => sum + r.refund_amount, 0);

      const totalDeducciones = refunds
        .filter(r => r.refund_type === "Deducción")
        .reduce((sum, r) => sum + r.refund_amount, 0);

      return {
        totalReembolsos,
        totalDeducciones,
        refundCount: refunds.length,
        refunds,
      };
    } catch (error) {
      console.error("Error getting refund summary:", error);
      throw error;
    }
  },
};

export default RefundService;
