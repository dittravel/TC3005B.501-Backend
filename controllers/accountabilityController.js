/**
 * Accountability Controller
 *
 * Handles the export of accounting data as JSON.
 *
 * Current scope: Advance payment policies (Póliza de Anticipo de Viaje)
 *
 * JSON structure:
 * {
 *   polizas_anticipo:     { total, polizas: [ { header, details } ] },
 *   polizas_comprobacion: { total, polizas: [ { header, details } ] },
 *   polizas_sin_anticipo: { total, polizas: [ { header, details } ] },
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
BigInt.prototype.toJSON = function() {
  return this.toString(); 
};

// ─── Policy builder ───────────────────────────────────────────────────────────

/**
 * Builds a single "Póliza de Anticipo de Viaje" object.
 * @param {Object} request  — shaped by Accountability.getAnticipoPolicies()
 * @returns {Object}
 */
const buildAnticipo = (request) => {
  const exportDate = formatDate(new Date());
  const headerTxt  = `${request.document_description ?? ''} # ${request.request_id}`;
  const itemText   = `${request.document_description ?? ''} # ${request.request_id} #Emp${request.user_id ?? ''}`;

  //const cargoAccount = request.accounts.find((a) =>  a.is_default) ?? request.accounts[0] ?? null;
  //const abonoAccount = request.accounts.find((a) => !a.is_default) ?? request.accounts[1] ?? null;

  return {
    header: {
      ID_VIAJE:   request.request_id,
      DOC_TYPE:   request.document_id || null,
      HEADER_TXT: headerTxt,
      COMP_CODE:  request.society_id,
      PSTNG_DATE: exportDate,
      CURRENCY:   request.currency,
      EXCH_RATE:  "** Por definir **",
    },
    details: [
      {
        ITEMNO_ACC: 1,
        SHKZG:      'S',
        GL_ACCOUNT: "** Por definir **",
        VENDOR_NO:  request.supplier,
        ITEM_TEXT:  itemText,
        AMT_DOCCUR: request.xml_total,
      },
      {
        ITEMNO_ACC: 2,
        SHKZG:      'H',
        GL_ACCOUNT: "** Por definir **",
        VENDOR_NO:  request.supplier,
        ITEM_TEXT:  itemText,
        AMT_DOCCUR: request.xml_total,
      },
    ],
  };
};

// ─── Controller ───────────────────────────────────────────────────────────────

/**
 * Returns ALL anticipo policies regardless of export status.
 */
export const exportAllPolicies = async (req, res) => {
  try {
    const rawAnticipos = await Accountability.getAnticipoPolicies();

    if (rawAnticipos.length === 0)
      return res.status(404).json({ error: 'No anticipo policies found.' });

    const polizasAnticipo = rawAnticipos.map(buildAnticipo);

    // [IS_EXPORTED] Marcar como exportadas una vez que PolicyExport esté migrada:
    // await Promise.all(
    //   rawAnticipos.map((r) => Accountability.markAsExported(r.request_id, 'ANTICIPO'))
    // );

    return res.status(200).json({
      polizas_anticipo: {
        total:   polizasAnticipo.length,
        polizas: polizasAnticipo,
      },

      // [FUTURE] Póliza de Comprobación — requested_fee > 0 AND receipts validados
      polizas_comprobacion: {
        total:   0,
        polizas: [],
      },

      // [FUTURE] Póliza sin Anticipo — requested_fee = 0/null AND receipts validados
      polizas_sin_anticipo: {
        total:   0,
        polizas: [],
      },
    });

  } catch (error) {
    console.error('Error exporting accounting policies:', error);
    return res.status(500).json({ error: 'Internal error when generating the accounting report.' });
  }
};

export default { exportAllPolicies };