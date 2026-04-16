/**
 * Accountability Model
 *
 * Handles the queries to the database for the
 * accounting export of policies.
 *
 */

import { prisma } from '../lib/prisma.js';

const Accountability = {

  /**
   * Returns all active Requests that qualify as "Póliza de Anticipo de Viaje".
   *
   * A Request qualifies as an anticipo when:
   *   - active = true
   *   - requested_fee > 0  (has an advance payment)
   *   - Has no validated receipts yet (no comprobación)
   *
   * Filters that are ready to be enabled once the schema supports them:
   *   [IS_EXPORTED]  Add `PolicyExport` relation filter here to exclude
   *                  already-exported anticipo policies:
   *                    PolicyExport: { none: { policy_type: 'ANTICIPO', is_exported: true } }
   *
   *   [STATUS]       Uncomment the `request_status_id` filter once the allowed
   *                  statuses for anticipo export are defined. Example:
   *                    request_status_id: { in: [ALLOWED_STATUS_IDS] }
   *
   * @param {number|null} societyId   Optional — filter by society
   * @param {string|null} dateFrom    Optional — YYYY-MM-DD
   * @param {string|null} dateTo      Optional — YYYY-MM-DD
   * @returns {Promise<Array>}
   */
  async getAnticipoPolicies(societyId = null, dateFrom = null, dateTo = null) {
    try {
      const where = {
        active: true,

        // Only requests with a positive advance payment
        requested_fee: { gt: 0 },

        // [IS_EXPORTED] — Uncomment once PolicyExport table is migrated:
        // PolicyExport: {
        //   none: { policy_type: 'ANTICIPO', is_exported: true }
        // },

        // [STATUS] — Uncomment and adjust IDs once export statuses are defined:
        // request_status_id: { in: [ALLOWED_STATUS_IDS] },

        ...(societyId && { society_id: Number(societyId) }),

        ...(dateFrom || dateTo
          ? {
              creation_date: {
                ...(dateFrom && { gte: new Date(dateFrom) }),
                ...(dateTo && { lte: new Date(`${dateTo}T23:59:59`) }),
              },
            }
          : {}),
      };

      const requests = await prisma.request.findMany({
        where,
        include: {
          // Requester + department + cost center
          requester: {
            select: {
              user_id: true,
              user_name: true,
              email: true,
              supplier: true,
              department: {
                select: {
                  department_name: true,
                  CostCenter: {
                    select: {
                      cost_center_id: true,
                      cost_center_name: true,
                    },
                  },
                },
              },
            },
          },

          // Society
          Society: {
            select: { id: true, description: true, local_currency: true },
          },

          // Document
          Document: {                 
            select: {
              document_id: true,
              description: true
            }
          },

          // Receipts
          Receipt: {
            select: {
              receipt_id: true,
              amount: true,
              validation: true,
              currency: true,
              xml_total: true,
              Receipt_Type: {
                select: {
                  receipt_type_id: true,
                  receipt_type_name: true,
                  ReceiptType_Account: {
                    where: { active: true },
                    select: {
                      receipttype_account_id: true,
                      is_default: true,
                      Account: {
                        select: {
                          account_id: true,
                          account_code: true,
                          account_name: true,
                          account_type: true,
                        },
                      },
                    },
                    // orderBy: { item_role: 'asc' },
                  },
                },
              },
            },
            orderBy: { receipt_id: 'asc' },
          },

          Request_status: {
            select: { request_status_id: true, status: true },
          },
        },
        orderBy: { request_id: 'asc' },
      });

      return requests.map((r) => {
        // Use the first receipt as the source for EXCH_RATE
        const firstReceipt = r.Receipt[0] ?? null;

        // Document attached to this request (take the first one)
        const document = r.Document ?? null;

        const accounts =
          firstReceipt?.Receipt_Type?.ReceiptType_Account?.map((rta) => ({
            receipttype_account_id: rta.receipttype_account_id,
            is_default: rta.is_default,
            account_id: rta.Account?.account_id ?? null,
            account_code: rta.Account?.account_code ?? null,
            account_name: rta.Account?.account_name ?? null,
            account_type: rta.Account?.account_type ?? null,
            // item_role: rta.item_role,   // ← enable once field is migrated
          })) ?? [];

        return {
          // Request
          request_id: r.request_id,
          xml_total: firstReceipt?.xml_total ?? null,
          currency: firstReceipt?.currency ?? null,
          notes: r.notes,
          creation_date: r.creation_date,

          // Requester
          user_id: r.requester?.user_id ?? null,
          supplier: r.requester?.supplier ?? null,
          traveler_name: r.requester?.user_name ?? null,
          traveler_email: r.requester?.email ?? null,

          // Cost center
          department_name: r.requester?.department?.department_name ?? null,
          cost_center_id: r.requester?.department?.CostCenter?.cost_center_id ?? null,
          cost_center_name: r.requester?.department?.CostCenter?.cost_center_name ?? null,

          // Society
          society_id: r.Society?.id ?? null,
          society_description: r.Society?.description ?? null,
          local_currency: r.Society?.local_currency ?? null,

          // Document
          document_id: document?.document_id ?? null, 
          document_description: document?.description ?? null,

          // Accounts
          accounts,

          // Status
          request_status_id: r.Request_status?.request_status_id ?? null,
          request_status: r.Request_status?.status ?? null,

          // [IS_EXPORTED] — will come from PolicyExport once migrated
          // is_exported: false,
        };
      });

    } catch (error) {
      console.error('Error fetching anticipo policies:', error);
      throw error;
    }
  },


  /**
   * Returns all Requests that qualify as "Póliza de Comprobación de Viaje".
   * A Request qualifies when: requested_fee > 0 AND has validated receipts.
   */
  // async getComprobacionPolicies(societyId, dateFrom, dateTo) { ... },

  /**
   * Returns all Requests that qualify as "Póliza de Gasto sin Anticipo".
   * A Request qualifies when: requested_fee = 0 or null AND has validated receipts.
   */
  // async getSinAnticipoolicies(societyId, dateFrom, dateTo) { ... },

  /**
   * Mark a policy as exported by upserting a PolicyExport record.
   * [IS_EXPORTED] — Uncomment once PolicyExport table is migrated.
   *
   * @param {number} request_id
   * @param {'ANTICIPO'|'COMPROBACION'|'SIN_ANTICIPO'} policy_type
   */
  // async markAsExported(request_id, policy_type) {
  //   return prisma.policyExport.upsert({
  //     where: { request_id_policy_type: { request_id, policy_type } },
  //     update: { is_exported: true, exported_at: new Date() },
  //     create: { request_id, policy_type, is_exported: true, exported_at: new Date() },
  //   });
  // },
};

export default Accountability;