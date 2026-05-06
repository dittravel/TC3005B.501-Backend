/**
 * Accountability Model
 *
 * Handles the queries to the database for the
 * accounting export of policies.
 *
 * Export Logic:
 *   if (hasAdvance) {
 *     if (event === 'advance_given')      → Póliza de Anticipos
 *     if (event === 'receipt_uploaded')   → Póliza de Comprobación de viaje
 *   } else {
 *     if (event === 'receipt_uploaded')   → Póliza de Gastos de viaje
 *   }
 */

import { prisma } from '../lib/prisma.js';

const Accountability = {

  /**
   * Returns all active Requests that qualify as "Póliza de Anticipo de Viaje".
   *
   * A Request qualifies as an anticipo when:
   *   - active = true
   *   - imposed_fee > 0  (has an advance payment)
   *   - Event: 'advance_given' (anticipo fue otorgado)
   *   - Does not have validated receipts (those go to comprobacion instead)
   *   - IS_EXPORTED = false
   *   - Belongs to the specified society group
   *
   * @param {number} societyGroupId - Filter by society group
   * @returns {Promise<Array>}
   */
  async getAnticipoPolicies(societyGroupId) {
    try {
      const where = {
        active: true,
        imposed_fee: { gt: 0 },
        Society: {
          society_group_id: societyGroupId,
        },

        // [IS_EXPORTED]
        NOT: {
          policyExports: {
            some: {
              is_exported: true,
              policy_type: 'anticipo',
            }
          }
        }
      };

      const requests = await prisma.request.findMany({
        where,
        include: {
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
          Society: {
            select: { id: true, description: true, local_currency: true },
          },
          Receipt: {
            select: {
              receipt_id: true,
              amount: true,
              validation: true,
              currency: true,
              exch_rate: true,
              xml_total: true,
              xml_moneda: true,
              xml_subtotal: true,
              xml_impuestos: true,
              Receipt_Type: {
                select: {
                  receipt_type_id: true,
                  receipt_type_name: true,
                  ReceiptType_Account: {
                    where: { active: true },
                    select: {
                      receipttype_account_id: true,
                      is_default: true,
                    },
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

      return requests;
    } catch (error) {
      console.error('Error fetching "Anticipo" policies:', error);
      throw error;
    }
  },

  /**
   * Returns all Requests that qualify as "Póliza de Comprobación de Viaje".
   *
   * A Request qualifies when:
   *   - active = true
   *   - imposed_fee > 0 (had an advance)
   *   - Has validated receipts (comprobación)
   *   - Event: 'receipt_uploaded'
   *   - IS_EXPORTED = false
   *   - Belongs to the specified society group
   *
   * @param {number} societyGroupId - Filter by society group
   * @returns {Promise<Array>}
   */
  async getComprobacionPolicies(societyGroupId) {
    try {
      const where = {
        active: true,
        imposed_fee: { gt: 0 },
        Society: {
          society_group_id: societyGroupId,
        },
        Receipt: {
          some: {
            validation: 'Aprobado',
          },
        },

        // [IS_EXPORTED]
        NOT: {
          policyExports: {
            some: {
              is_exported: true,
              policy_type: 'comprobacion',
            }
          }
        }
      };

      const requests = await prisma.request.findMany({
        where,
        include: {
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
          Society: {
            select: { id: true, description: true, local_currency: true },
          },
          Receipt: {
            where: {
              validation: 'Aprobado',
            },
            select: {
              receipt_id: true,
              amount: true,
              validation: true,
              currency: true,
              exch_rate: true,
              xml_total: true,
              xml_moneda: true,
              xml_subtotal: true,
              xml_impuestos: true,
              Receipt_Type: {
                select: {
                  receipt_type_id: true,
                  receipt_type_name: true,
                  ReceiptType_Account: {
                    where: { active: true },
                    select: {
                      receipttype_account_id: true,
                      is_default: true,
                    },
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

      return requests;
    } catch (error) {
      console.error('Error fetching "Comprobación" policies:', error);
      throw error;
    }
  },

  /**
   * Returns all Requests that qualify as "Póliza de Gasto sin Anticipo".
   *
   * A Request qualifies when:
   *   - active = true
   *   - imposed_fee = 0 or null (no advance assigned)
   *   - Has validated receipts
   *   - Event: 'receipt_uploaded'
   *   - IS_EXPORTED = false
   *   - Belongs to the specified society group
   *
   * @param {number} societyGroupId - Filter by society group
   * @returns {Promise<Array>}
   */
  async getSinAnticipoPolicies(societyGroupId) {
    try {
      const where = {
        active: true,
        OR: [
          { imposed_fee: 0 },
          { imposed_fee: null },
        ],
        Society: {
          society_group_id: societyGroupId,
        },
        Receipt: {
          some: {
            validation: 'Aprobado',
          },
        },

        // [IS_EXPORTED]
        NOT: {
          policyExports: {
            some: {
              is_exported: true,
              policy_type: 'sin_anticipo',
            }
          }
        }
      };

      const requests = await prisma.request.findMany({
        where,
        include: {
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
          Society: {
            select: { id: true, description: true, local_currency: true },
          },
          Receipt: {
            where: {
              validation: 'Aprobado',
            },
            select: {
              receipt_id: true,
              amount: true,
              validation: true,
              currency: true,
              exch_rate: true,
              xml_total: true,
              xml_moneda: true,
              xml_subtotal: true,
              xml_impuestos: true,
              Receipt_Type: {
                select: {
                  receipt_type_id: true,
                  receipt_type_name: true,
                  ReceiptType_Account: {
                    where: { active: true },
                    select: {
                      receipttype_account_id: true,
                      is_default: true,
                    },
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
      return requests;
    } catch (error) {
      console.error('Error fetching "Sin Anticipo" policies:', error);
      throw error;
    }
  },

  /**
   * Obtain all accounts
   *
   */
  async getAccounts(){
    try {
      const accounts = await prisma.account.findMany({
        where: { active: true },
        select: {
          account_id: true, 
          account_code: true, 
          account_name: true
        }
      });
      return accounts;
    } catch (error) {
      console.error('Error fetching "Accounts"', error);
      throw error;
    }
  },

  /**
   * Obtain all document types
   *
   */
  async getDocuments(){
    try {
      const documents = await prisma.document.findMany({
        select: {
          document_id: true, 
          description: true, 
        }
      });
      return documents;
    } catch (error) {
      console.error('Error fetching "Documents"', error);
      throw error;
    }
  },

  /**
   * Mark a policy as exported by upserting a policyExports record.
   *
   * @param {number} request_id
   */
  async markAsExported(request_id, policy_type) {
    return prisma.policyExport.upsert({
      where: { request_id_policy_type: { request_id, policy_type } },
      update: { is_exported: true, exported_at: new Date() },
      create: { request_id, policy_type, is_exported: true, exported_at: new Date() },
    });
  },
};

export default Accountability;