/**
 * Accountability Controller
 *
 * Handles the export of accounting data as JSON.
 *
 * Exports three types of policies:
 *   1. Póliza de Anticipo de Viaje (advance_given event)
 *   2. Póliza de Comprobación de Viaje (receipt_uploaded with advance - HAS validated receipts)
 *   3. Póliza de Gasto sin Anticipo (receipt_uploaded without advance)
 *
 * JSON structure:
 * {
 *   export_info: { export_date },
 *   polizas_anticipo:     { total, polizas: [ { header, details } ] },
 *   polizas_comprobacion: { total, polizas: [ { header, details } ] },
 *   polizas_sin_anticipo: { total, polizas: [ { header, details } ] },
 *   summary: { ... }
 * }
 */

import Accountability from '../models/accountabilityModel.js';

/**
 * Formats a Date as "YYYY-MM-DD HH:mm:ss"
 * @param {Date|string|null} date
 * @returns {string|null}
 */
const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
};

/**
 * Formats BigInt as a String for exporting to JSON
 */
BigInt.prototype.toJSON = function () {
  return this.toString();
};

/**
 * Gets the default account
 * @param {Array} accounts 
 * @param {boolean} isDefault
 * @returns {Object|null}
 */
const getAccount = (accounts, isDefault = true) => {
  if (!accounts || accounts.length === 0) return null;
  
  if (isDefault) {
    const defaultAccount = accounts.find((a) => a.is_default);
    if (defaultAccount) return defaultAccount.Account;
  }
  
  return accounts[0]?.Account ?? null;
};

// ***** Policy Builders ******

/**
 * Builds a single "Póliza de Anticipo de Viaje" object.
 * 
 * @param {Object} request - Raw request from Accountability.getAnticipoPolicies()
 * @returns {Object}
 */
const buildAnticipo = (request) => {
  const exportDate = formatDate(new Date());
  const document = request.Document;
  const society = request.Society;
  const requester = request.requester;
  const firstReceipt = request.Receipt?.[0];

  // Get accounts from first receipt type
  const accounts = firstReceipt?.Receipt_Type?.ReceiptType_Account || [];
  const account1 = accounts[0]?.Account?.account_code || null;
  const account2 = accounts[1]?.Account?.account_code || account1;

  // Build text fields
  const headerText = `${document?.description ?? 'N/A'} # ${request.request_id}`;
  const itemText = `${document?.description ?? 'N/A'} # ${request.request_id} #Emp${requester?.user_id ?? ''}`;

  // Get currency and exchange rate
  const currency = firstReceipt?.xml_moneda || firstReceipt?.currency || society?.local_currency || 'MXN';
  const exchRate = firstReceipt?.xml_total ? Number(firstReceipt.xml_total) : null;
  const amount = request.requested_fee || 0;

  return {
    header: {
      ID_VIAJE: request.request_id,
      DOC_TYPE: document?.document_id || null,
      HEADER_TXT: headerText,
      COMP_CODE: society?.id || null,
      PSTNG_DATE: exportDate,
      CURRENCY: currency,
      EXCH_RATE: exchRate,
    },
    details: [
      {
        ITEMNO_ACC: 1,
        SHKZG: 'S', // Debe
        GL_ACCOUNT: account1,
        VENDOR_NO: requester?.supplier?.toString() || null,
        ITEM_TEXT: itemText,
        AMT_DOCCUR: amount,
      },
      {
        ITEMNO_ACC: 2,
        SHKZG: 'H', // Haber
        GL_ACCOUNT: account2,
        VENDOR_NO: requester?.supplier?.toString() || null,
        ITEM_TEXT: itemText,
        AMT_DOCCUR: amount,
      },
    ],
  };
};

/**
 * Builds a single "Póliza de Comprobación de Viaje" object.
 * 
 * @param {Object} request - Raw request from Accountability.getComprobacionPolicies()
 * @returns {Object}
 */
const buildComprobacion = (request) => {
  const exportDate = formatDate(new Date());
  const document = request.Document;
  const society = request.Society;
  const requester = request.requester;
  const costCenter = requester?.department?.CostCenter;
  

  // Filter only approved receipts
  const validatedReceipts = request.Receipt?.filter((r) => r.validation === 'Aprobado') || [];
  const firstReceipt = validatedReceipts[0];

  // Build header text
  const headerText = `${document?.description ?? 'N/A'} # ${request.request_id}`;
  const currency = firstReceipt?.xml_moneda || firstReceipt?.currency || society?.local_currency || 'MXN';
  const exchRate = firstReceipt?.xml_total ? Number(firstReceipt.xml_total) : null;

  // Build details from all validated receipts
  const details = [];
  let itemCounter = 1;

  validatedReceipts.forEach((receipt) => {
    // Get accounts from first receipt type
    const accounts = firstReceipt?.Receipt_Type?.ReceiptType_Account || [];
    const account1 = accounts[0]?.Account?.account_code || null;
    const account2 = accounts[1]?.Account?.account_code || account1;

    const receipt_type = receipt.Receipt_Type?.receipt_type_name ?? ''

    const subtotal = receipt.xml_subtotal ? Number(receipt.xml_subtotal) : receipt.amount;
    const taxes = receipt.xml_impuestos ? Number(receipt.xml_impuestos) : 0;
    const total = receipt.xml_total ? Number(receipt.xml_total) : receipt.amount;

    // Build item text for this receipt
    const itemText = `${document?.description ?? 'N/A'} # ${request.request_id} #${requester?.user_id ?? ''}`;

    // Item 1: Gasto (EXPENSE)
    details.push({
      ITEMNO_ACC: itemCounter++,
      SHKZG: 'S',
      GL_ACCOUNT: account1,
      COSTCENTER: costCenter?.cost_center_id || null,
      ITEM_TEXT: `Combrobación ${receipt_type}`,
      AMT_DOCCUR: subtotal,
    });

    // Item 2: IVA (TAX)
    details.push({
      ITEMNO_ACC: itemCounter++,
      SHKZG: 'S',
      GL_ACCOUNT: account2,
      ITEM_TEXT: `Combrobación ${receipt_type}`,
      AMT_DOCCUR: taxes,
    });

    // Item 3: Total (PAYABLE)
    details.push({
      ITEMNO_ACC: itemCounter++,
      SHKZG: 'H',
      GL_ACCOUNT: account1,
      VENDOR_NO: requester?.supplier?.toString() || null,
      ITEM_TEXT: `Combrobación ${receipt_type}`,
      AMT_DOCCUR: total,
    });
  });

  return {
    header: {
      ID_VIAJE: request.request_id,
      DOC_TYPE: document?.document_id || null,
      HEADER_TXT: headerText,
      COMP_CODE: society?.id || null,
      PSTNG_DATE: exportDate,
      CURRENCY: currency,
      EXCH_RATE: exchRate,
    },
    details,
  };
};

/**
 * Builds a single "Póliza de Gasto sin Anticipo" object.

 * 
 * @param {Object} request - Raw request from Accountability.getSinAnticipoPolicies()
 * @returns {Object}
 */
const buildSinAnticipo = (request) => {
  const exportDate = formatDate(new Date());
  const document = request.Document;
  const society = request.Society;
  const requester = request.requester;
  const costCenter = requester?.department?.CostCenter;

  // Filter only approved receipts
  const validatedReceipts = request.Receipt?.filter((r) => r.validation === 'Aprobado') || [];
  const firstReceipt = validatedReceipts[0];

  // Build header text
  const headerText = `${document?.description ?? 'N/A'} # ${request.request_id}`;
  const currency = firstReceipt?.xml_moneda || firstReceipt?.currency || society?.local_currency || 'MXN';
  const exchRate = firstReceipt?.xml_total ? Number(firstReceipt.xml_total) : null;

  // Build details from all validated receipts
  const details = [];
  let itemCounter = 1;

  validatedReceipts.forEach((receipt) => {
    // Get accounts from first receipt type
    const accounts = firstReceipt?.Receipt_Type?.ReceiptType_Account || [];
    const account1 = accounts[0]?.Account?.account_code || null;
    const account2 = accounts[1]?.Account?.account_code || account1;

    const subtotal = receipt.xml_subtotal ? Number(receipt.xml_subtotal) : receipt.amount;
    const taxes = receipt.xml_impuestos ? Number(receipt.xml_impuestos) : 0;
    const total = receipt.xml_total ? Number(receipt.xml_total) : receipt.amount;

    // Build item text for this receipt
    const itemText = `${document?.description ?? 'N/A'} # ${request.request_id} #${requester?.user_id ?? ''}`;

    // Item 1: Gasto (EXPENSE)
    details.push({
      ITEMNO_ACC: itemCounter++,
      SHKZG: 'S',
      GL_ACCOUNT: account1,
      COSTCENTER: costCenter?.cost_center_id || null,
      ITEM_TEXT: itemText,
      AMT_DOCCUR: subtotal,
    });

    // Item 2: IVA (TAX)
    details.push({
      ITEMNO_ACC: itemCounter++,
      SHKZG: 'S',
      GL_ACCOUNT: account2,
      ITEM_TEXT: itemText,
      AMT_DOCCUR: taxes,
    });

    // Item 3: Total (PAYABLE)
    details.push({
      ITEMNO_ACC: itemCounter++,
      SHKZG: 'H',
      GL_ACCOUNT: account1,
      VENDOR_NO: requester?.supplier?.toString() || null,
      ITEM_TEXT: itemText,
      AMT_DOCCUR: total,
    });
  });

  return {
    header: {
      ID_VIAJE: request.request_id,
      DOC_TYPE: document?.document_id || null,
      HEADER_TXT: headerText,
      COMP_CODE: society?.id || null,
      PSTNG_DATE: exportDate,
      CURRENCY: currency,
      EXCH_RATE: exchRate,
    },
    details,
  };
};

/**
 * GET /api/accountability/export
 * 
 * Exports ALL three types of policies.
 * 
 * @returns {Object} Complete export with all three policy types
 */
export const exportAllPolicies = async (req, res) => {
  try {
    // Fetch all three policy types in parallel
    const [rawAnticipos, rawComprobaciones, rawSinAnticipo] = await Promise.all([
      Accountability.getAnticipoPolicies(),
      Accountability.getComprobacionPolicies(),
      Accountability.getSinAnticipoPolicies(),
    ]);

    // Build the formatted policies
    const polizasAnticipo = rawAnticipos.map(buildAnticipo);
    const polizasComprobacion = rawComprobaciones.map(buildComprobacion);
    const polizasSinAnticipo = rawSinAnticipo.map(buildSinAnticipo);

    // Calculate totals
    const totalPolicies = polizasAnticipo.length + polizasComprobacion.length + polizasSinAnticipo.length;

    // [IS_EXPORTED] Mark as exported
    await Promise.all([
      ...rawAnticipos.map((r) => Accountability.markAsExported(r.request_id)),
      ...rawComprobaciones.map((r) => Accountability.markAsExported(r.request_id)),
      ...rawSinAnticipo.map((r) => Accountability.markAsExported(r.request_id)),
    ]);

    return res.status(200).json({
      export_info: {
        export_date: formatDate(new Date()),
      },
      polizas_anticipo: {
        total: polizasAnticipo.length,
        polizas: polizasAnticipo,
      },
      polizas_comprobacion: {
        total: polizasComprobacion.length,
        polizas: polizasComprobacion,
      },
      polizas_sin_anticipo: {
        total: polizasSinAnticipo.length,
        polizas: polizasSinAnticipo,
      },
      summary: {
        total_anticipo: polizasAnticipo.length,
        total_comprobacion: polizasComprobacion.length,
        total_sin_anticipo: polizasSinAnticipo.length,
        grand_total: totalPolicies,
      },
    });
  } catch (error) {
    console.error('Error exporting accounting policies:', error);
    return res.status(500).json({ 
      error: 'Internal error when generating the accounting report.',
      details: error.message 
    });
  }
};

export default {
  exportAllPolicies,
};