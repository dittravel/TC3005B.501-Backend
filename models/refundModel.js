/**
 * Refund Model
 *
 * Handles database operations for refunds and balance adjustments
 */

import { prisma } from "../lib/prisma.js";

const Refund = {
  // Create a new refund
  async create(data) {
    try {
      const refund = await prisma.refund.create({
        data,
      });
      return refund;
    } catch (error) {
      console.error("Error creating refund:", error);
      throw error;
    }
  },

  // Get refund by ID
  async findById(refundId) {
    try {
      const refund = await prisma.refund.findUnique({
        where: { refund_id: refundId },
      });
      return refund;
    } catch (error) {
      console.error("Error finding refund by ID:", error);
      throw error;
    }
  },

  // Get all refunds for a user
  async findByUserId(userId) {
    try {
      const refunds = await prisma.refund.findMany({
        where: { user_id: userId },
        orderBy: { created_at: "desc" },
      });
      return refunds;
    } catch (error) {
      console.error("Error getting refunds by user:", error);
      throw error;
    }
  },

  // Update refund
  async update(refundId, data) {
    try {
      const refund = await prisma.refund.update({
        where: { refund_id: refundId },
        data,
      });
      return refund;
    } catch (error) {
      console.error("Error updating refund:", error);
      throw error;
    }
  },

  // Delete refund
  async delete(refundId) {
    try {
      const refund = await prisma.refund.delete({
        where: { refund_id: refundId },
      });
      return refund;
    } catch (error) {
      console.error("Error deleting refund:", error);
      throw error;
    }
  },
};

export default Refund;
