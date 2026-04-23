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
   *   - requested_fee > 0  (has an advance payment)
   *   - Event: 'advance_given' (anticipo fue otorgado)
   *   - NO tiene receipts validados (those go to comprobacion instead)
   *   - IS_EXPORTED = false
   *
   * @returns {Promise<Array>}
   */
  async getAnticipoPolicies() {
    try {
      const where = {
        active: true,
        requested_fee: { gt: 0 },

        // Exclude requests that already have validated receipts
        Receipt: {
          none: {
            validation: 'Aprobado'
          }
        },

        // [IS_EXPORTED]
        NOT: {
          policyExports: {
            some: {
              is_exported: true
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
          /*Document: {
            select: {
              document_id: true,
              description: true,
            },
          },*/
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
                      /*Account: {
                        select: {
                          account_id: true,
                          account_code: true,
                          account_name: true,
                          account_type: true,
                        },
                      },*/
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
   *   - requested_fee > 0 (had an advance)
   *   - Has validated receipts (comprobación)
   *   - Event: 'receipt_uploaded'
   *   - IS_EXPORTED = false
   *
   * @returns {Promise<Array>}
   */
  async getComprobacionPolicies() {
    try {
      const where = {
        active: true,
        requested_fee: { gt: 0 },
        Receipt: {
          some: {
            validation: 'Aprobado',
          },
        },

        // [IS_EXPORTED]
        NOT: {
          policyExports: {
            some: {
              is_exported: true
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
          /*Document: {
            select: {
              document_id: true,
              description: true,
            },
          },*/
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
                      /*Account: {
                        select: {
                          account_id: true,
                          account_code: true,
                          account_name: true,
                          account_type: true,
                        },
                      },*/
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
   *   - requested_fee = 0 or null (no advance)
   *   - Has validated receipts
   *   - Event: 'receipt_uploaded'
   *   - IS_EXPORTED = false
   *
   * @returns {Promise<Array>}
   */
  async getSinAnticipoPolicies() {
    try {
      const where = {
        active: true,
        OR: [
          { requested_fee: 0 },
          { requested_fee: null },
        ],
        Receipt: {
          some: {
            validation: 'Aprobado',
          },
        },

        // [IS_EXPORTED]
        NOT: {
          policyExports: {
            some: {
              is_exported: true
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
          /*Document: {
            select: {
              document_id: true,
              description: true,
            },
          },*/
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
                      /*Account: {
                        select: {
                          account_id: true,
                          account_code: true,
                          account_name: true,
                          account_type: true,
                        },
                      },*/
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
  async markAsExported(request_id) {
    return prisma.policyExport.upsert({
      where: { request_id },
      update: { is_exported: true, exported_at: new Date() },
      create: { request_id, is_exported: true, exported_at: new Date() },
    });
  },
};

export default Accountability;