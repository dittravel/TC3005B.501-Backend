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

// ***** Policy Builders ******

/**
 * Builds a single "Póliza de Anticipo de Viaje" object.
 * 
 * @param {Object} request - Raw request from Accountability.getAnticipoPolicies()
 * @returns {Object}
 */
const buildAnticipo = (request, accountsCatalog, documentMap) => {
  const exportDate = formatDate(new Date());
  const society = request.Society;
  const requester = request.requester;
  const firstReceipt = request.Receipt?.[0];

  // Get accounts from first receipt type
  const account1 = accountsCatalog['Anticipo'] || null;
  const account2 = accountsCatalog['Cuenta x pagar Empleado'] || null;

  // Build text fields
  const type = 'AV';
  const headerText = `${documentMap[type] ?? 'Tipo desconocido'} # ${request.request_id}`;
  const itemText = `${headerText} #Emp${requester?.user_id ?? ''}`;

  // Get currency and exchange rate
  const currency = firstReceipt?.xml_moneda || firstReceipt?.currency || society?.local_currency;
  const amount = request.requested_fee || 0;

  const isSameCurrency = currency === society?.local_currency;
  const exchRate = isSameCurrency ? 1.0 : parseFloat((firstReceipt?.exch_rate || 0).toFixed(2));

  return {
    header: {
      ID_VIAJE: request.request_id,
      DOC_TYPE: type,
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
const buildComprobacion = (request, accountsCatalog, documentMap) => {
  const exportDate = formatDate(new Date());
  const society = request.Society;
  const requester = request.requester;
  const costCenter = requester?.department?.CostCenter;
  
  // Filter only approved receipts
  const validatedReceipts = request.Receipt?.filter((r) => r.validation === 'Aprobado') || [];
  const firstReceipt = validatedReceipts[0];

  // Build header text
  const type = 'GV';
  const headerText = `Comprobación de viaje # ${request.request_id}`;
  const currency = firstReceipt?.xml_moneda || firstReceipt?.currency || society?.local_currency;

  const isSameCurrency = currency === society?.local_currency;
  const exchRate = isSameCurrency ? 1.0 : parseFloat((firstReceipt?.exch_rate || 0).toFixed(2));

  // Build details from all validated receipts
  const details = [];
  let itemCounter = 1;

  // Get accounts from first receipt type
    const account1 = accountsCatalog['Gasto de Viaje'] || null;
    const account2 = accountsCatalog['Iva Acreditable'] || null;
    const account3 = accountsCatalog['Anticipo'] || null;

  validatedReceipts.forEach((receipt) => {
    const subtotal = receipt.xml_subtotal ? Number(receipt.xml_subtotal) : receipt.amount;
    const taxes = receipt.xml_impuestos ? Number(receipt.xml_impuestos) : 0;
    const total = subtotal + taxes;

    // Build item text for this receipt
    const receipt_type = receipt.Receipt_Type?.receipt_type_name ?? ''
    const itemText = `Combrobación ${receipt_type}`;

    // Item 1: Gasto (EXPENSE)
    details.push({
      ITEMNO_ACC: itemCounter++,
      SHKZG: 'S',
      GL_ACCOUNT: account1,
      COSTCENTER: costCenter?.cost_center_name || null,
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
      GL_ACCOUNT: account3,
      VENDOR_NO: requester?.supplier?.toString() || null,
      ITEM_TEXT: itemText,
      AMT_DOCCUR: total,
    });
  });

  return {
    header: {
      ID_VIAJE: request.request_id,
      DOC_TYPE: type,
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
const buildSinAnticipo = (request, accountsCatalog, documentMap) => {
  const exportDate = formatDate(new Date());
  const society = request.Society;
  const requester = request.requester;
  const costCenter = requester?.department?.CostCenter;

  // Filter only approved receipts
  const validatedReceipts = request.Receipt?.filter((r) => r.validation === 'Aprobado') || [];
  const firstReceipt = validatedReceipts[0];

  // Build header text
  const type = 'GV';
  const headerText = `Comprobación sin anticipo de viaje # ${request.request_id}`;
  const currency = firstReceipt?.xml_moneda || firstReceipt?.currency || society?.local_currency;

  const isSameCurrency = currency === society?.local_currency;
  const exchRate = isSameCurrency ? 1.0 : parseFloat((firstReceipt?.exch_rate || 0).toFixed(2));

  // Build details from all validated receipts
  const details = [];
  let itemCounter = 1;

  // Get accounts from first receipt type
  const account1 = accountsCatalog['Gasto de Viaje'] || null;
  const account2 = accountsCatalog['Iva Acreditable'] || null;
  const account3 = accountsCatalog['Cuenta x pagar Empleado'] || null;


  validatedReceipts.forEach((receipt) => {
    console.log(receipt);
    const subtotal = receipt.xml_subtotal ? Number(receipt.xml_subtotal) : receipt.amount;
    const taxes = receipt.xml_impuestos ? Number(receipt.xml_impuestos) : 0;
    const total = subtotal + taxes; 

    // Build item text for this receipt
    const receipt_type = receipt.Receipt_Type?.receipt_type_name ?? ''
    const itemText = `Combrobación ${receipt_type}`;

    // Item 1: Gasto (EXPENSE)
    details.push({
      ITEMNO_ACC: itemCounter++,
      SHKZG: 'S',
      GL_ACCOUNT: account1,
      COSTCENTER: costCenter?.cost_center_name || null,
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
      GL_ACCOUNT: account3,
      VENDOR_NO: requester?.supplier?.toString() || null,
      ITEM_TEXT: itemText,
      AMT_DOCCUR: total,
    });
  });

  return {
    header: {
      ID_VIAJE: request.request_id,
      DOC_TYPE: type,
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
    const [rawAnticipos, rawComprobaciones, rawSinAnticipo, accounts, documents] = await Promise.all([
      Accountability.getAnticipoPolicies(),
      Accountability.getComprobacionPolicies(),
      Accountability.getSinAnticipoPolicies(),
      Accountability.getAccounts(),
      Accountability.getDocuments(),
    ]);

    // Map all the account and document types
    const accountMap = Object.fromEntries(
      accounts.map(a => [a.account_name, a.account_code])
    );

    const documentMap = Object.fromEntries(
      documents.map(a => [a.document_id, a.description])
    );

    // Build the formatted policies
    const polizasAnticipo = rawAnticipos.map(r => buildAnticipo(r, accountMap, documentMap));
    const polizasComprobacion = rawComprobaciones.map(r => buildComprobacion(r, accountMap, documentMap));
    const polizasSinAnticipo = rawSinAnticipo.map(r => buildSinAnticipo(r, accountMap, documentMap));

    // Calculate totals
    const totalPolicies = polizasAnticipo.length + polizasComprobacion.length + polizasSinAnticipo.length;

    // Mark as exported
    await Promise.all([
      ...rawAnticipos.map(r => Accountability.markAsExported(r.request_id, 'anticipo')),
      ...rawComprobaciones.map(r => Accountability.markAsExported(r.request_id, 'comprobacion')),
      ...rawSinAnticipo.map(r => Accountability.markAsExported(r.request_id, 'sin_anticipo')),
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