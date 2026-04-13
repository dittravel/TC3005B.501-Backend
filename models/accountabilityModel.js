/**
 * Accountability Model
 *
 * Handles the queries to the database for the 
 * accounting export of policies
 */

import { prisma } from "../lib/prisma.js";

const Accountability = {

  /**
   * Obtains the advance payment data of a travel request filtering by ID.
   * @param {number} request_id
   * @returns {Promise<Object>}
   **/
  async getAnticipoById(request_id) {
  try {
    const request = await prisma.request.findFirst({
      where: {
        request_id,
        active: true,
      },
      include: {
        requester: {
          include: {
            department: {
              include: {
                CostCenter: true,
              },
            },
          },
        },
        Request_status: true,
      },
    });

    if (!request) return null;

    return {
      request_id: request.request_id,
      amount: request.requested_fee,
      creation_date: request.creation_date,
      notes: request.notes,

      user_id: request.requester.user_id,
      traveler_name: request.requester.user_name,
      traveler_email: request.requester.email,

      department_name: request.requester.department.department_name,
      cost_center_id: request.requester.department.CostCenter.cost_center_id,
      cost_center_name: request.requester.department.CostCenter.cost_center_name,

      request_status: request.Request_status.status,
    };

  } catch (error) {
    console.error('Error finding advance payment:', error);
    throw error;
  }
},

  /**
   * Obtains the verified expenses (receipts) of a travel request filtering by ID.
   * @param {number} request_id
   * @returns {Promise<Array>}
   **/
  async getGastosById(request_id) {
  try {
    const receipts = await prisma.receipt.findMany({
      where: {
        request_id,
      },
      include: {
        Receipt_Type: {
          include: {
            ReceiptType_Account: {
              include: {
                Account: true,
              },
            },
          },
        },
        Request: {
          include: {
            Route_Request: {
              include: {
                Route: true,
              },
            },
          },
        },
      },
      orderBy: {
        receipt_id: 'asc',
      },
    });

    return receipts.map((rec) => {
      const accountRel = rec.receipt_Type.receiptType_Account[0]; // default
      const route = rec.request.route_Request[0]?.route;

      return {
        receipt_id: rec.receipt_id,
        amount: rec.amount,
        validation: rec.validation,
        submission_date: rec.submission_date,
        refund: rec.refund,

        receipt_type_id: rec.receipt_Type.receipt_type_id,
        receipt_type_name: rec.receipt_Type.receipt_type_name,

        account_id: accountRel?.account?.account_id,
        account_code: accountRel?.account?.account_code,
        account_name: accountRel?.account?.account_name,
        account_type: accountRel?.account?.account_type,

        beginning_date: route?.beginning_date,
        ending_date: route?.ending_date,
      };
    });

  } catch (error) {
    console.error('Error finding expenses:', error);
    throw error;
  }
},

  /**
   * Obtains the accounting account by type.
   * @param {string} account_type
   * @returns {Promise<Object>}
   **/
  async getAccountByType(account_type) {
  try {
    return await prisma.account.findFirst({
      where: { account_type },
      select: {
        account_id: true,
        account_code: true,
        account_name: true,
        account_type: true,
      },
    });
  } catch (error) {
    console.error(`Error finding account type ${account_type}:`, error);
    throw error;
  }
},

  /**
   * Obtains all active travel requests within an optional date range.
   * @param {string|null} dateFrom  YYYY-MM-DD
   * @param {string|null} dateTo    YYYY-MM-DD
   * @returns {Promise<Array>}
   **/
  async getRequestsByDateRange(dateFrom = null, dateTo = null, societyId = null) {
  try {
    const where = {
      active: true,
      ...(societyId && { society_id: Number(societyId) }),
      ...(dateFrom || dateTo
        ? {
            creation_date: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo + 'T23:59:59') }),
            },
          }
        : {}),
    };

    const requests = await prisma.request.findMany({
      where,
      include: {
        requester: {
          include: {
            department: {
              include: {
                CostCenter: true,
              },
            },
          },
        },
        Request_status: true,
      },
      orderBy: {
        creation_date: 'asc',
      },
    });

    return requests.map((r) => ({
    request_id: r.request_id,
    amount: r.requested_fee,
    creation_date: r.creation_date,
    notes: r.notes,

    user_id: r.requester?.user_id,
    traveler_name: r.requester?.user_name,
    traveler_email: r.requester?.email,

    department_name: r.requester?.department?.department_name,
    cost_center_id: r.requester?.department?.costCenter?.cost_center_id,
    cost_center_name: r.requester?.department?.costCenter?.cost_center_name,

    request_status: r.Request_status?.status,
  }));

  } catch (error) {
    console.error('Error finding requests by date range:', error);
    throw error;
  }
},

};

export default Accountability;