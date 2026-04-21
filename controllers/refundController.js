/**
 * Refund Controller
 *
 * Handles refund-related HTTP requests
 */

import RefundService from '../services/refundService.js';
import RefundModel from '../models/refundModel.js';

export const getUserRefunds = async (req, res) => {
  const userId = req.params.user_id;

  try {
    const refunds = await RefundModel.findByUserId(userId);

    if (!refunds || refunds.length === 0) {
      return res.status(200).json({
        refunds: [],
        summary: {
          totalReembolsos: 0,
          totalDeducciones: 0,
          refundCount: 0,
        },
      });
    }

    const summary = await RefundService.getUserRefundSummary(userId);

    res.status(200).json({
      refunds,
      summary,
    });
  } catch (error) {
    console.error('Error getting user refunds:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  getUserRefunds,
};
