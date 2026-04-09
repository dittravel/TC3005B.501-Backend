/**
 * Accountability Controller
 *
 * This module handles the export of accounting data to a JSON
 */

import Accountability from '../models/accountabilityModel.js';

/**
 * Date format "YYYY-MM-DD HH:mm:ss"
 */
const formatDate = (date) => {
  if (!date) return null;
  
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Date format for the data range
 */
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Policy format
 */
const buildPolicy = (anticipo, gastos, cuentaBancos, cuentaAcreedores) => {
  const totalGastos = gastos.reduce((sum, g) => sum + parseFloat(g.amount), 0);

  const policy = {
    request_id:  anticipo.request_id,
    export_date: formatDate(new Date()),
    status:      anticipo.request_status,
    notes:       anticipo.notes,

    traveler: {
      user_id:     anticipo.user_id,
      name:        anticipo.traveler_name,
      email:       anticipo.traveler_email,
      department:  anticipo.department_name,
      cost_center: anticipo.cost_center_name,
    },

    entries: [
      {
        type:        'anticipo',
        description: `Anticipo de viaje — ${anticipo.traveler_name}`,
        date:        formatDate(anticipo.creation_date),
        movements: [
          {
            movement:     'cargo',
            account_name: `${cuentaAcreedores.account_name} — ${anticipo.traveler_name}`,
            amount:       parseFloat(anticipo.amount),
          },
          {
            movement:     'abono',
            account_code: cuentaBancos.account_code,
            account_name: cuentaBancos.account_name,
            amount:       parseFloat(anticipo.amount),
          },
        ],
      },
    ],
  };

  if (gastos.length > 0) {
    policy.entries.push({
      type:        'gasto',
      description: `Comprobación de viaje — ${anticipo.traveler_name}`,
      movements: [
        ...gastos.map(g => ({
          movement:     'cargo',
          account_name: g.account_name,
          amount:       parseFloat(g.amount || 0),
        })),
        {
          movement:     'abono',
          account_code: cuentaAcreedores.account_code,
          account_name: `${cuentaAcreedores.account_name} — ${anticipo.traveler_name}`,
          amount:       totalGastos,
        },
      ],
      totals: {
        total_gastos: totalGastos,
        anticipo:     parseFloat(anticipo.amount || 0),
        diferencia:   totalGastos - parseFloat(anticipo.amount || 0),
      },
    });
  }

  return policy;
};

/**
 * Important validations
 */

const validateDates = (date_from, date_to) => {
  if (date_from && !dateRegex.test(date_from))
    return 'Invalid date_from format. Use YYYY-MM-DD';
  if (date_to && !dateRegex.test(date_to))
    return 'Invalid date_to format. Use YYYY-MM-DD';
  if (date_from && date_to && date_from > date_to)
    return 'date_from cannot be greater than date_to';
  return null;
};

const estadosPermitidos = ['Comprobación gastos del viaje', 'Validación de comprobantes', 'Finalizado'];

/**
 * Export accounting report from an specific travel request (filtering by ID)
 */

export const exportById = async (req, res) => {
  const { request_id } = req.params;

  if (!request_id || isNaN(request_id)) {
    return res.status(400).json({ error: 'Invalid request_id' });
  }

  try {
    // Advance payment data
    const anticipo = await Accountability.getAnticipoById(Number(request_id));

    if (!anticipo)
      return res.status(404).json({ error: `Invalid request with id ${request_id}.` });

    if (!estadosPermitidos.includes(anticipo.request_status))
      return res.status(400).json({ error: `Status not allowed: ${anticipo.request_status}` });

    if (parseFloat(anticipo.amount || 0) <= 0)
      return res.status(400).json({ error: 'The advance payment must be greater than zero' });

    const [cuentaBancos, cuentaAcreedores] = await Promise.all([
      Accountability.getAccountByType('Activo'),
      Accountability.getAccountByType('Pasivo'),
    ]);

    if (!cuentaBancos || !cuentaAcreedores)
      return res.status(500).json({ error: 'Missing account information in the database.' });

    // Expenses
    const gastos = await Accountability.getGastosById(Number(request_id));

    if (gastos.length > 0) {
      if (gastos.some(g => parseFloat(g.amount || 0) <= 0))
        return res.status(400).json({ error: 'Expenses with invalid amount' });
      if (gastos.every(g => g.validation === 'Pendiente'))
        return res.status(400).json({ error: 'Some receipts are still under approval' });
    }

    return res.status(200).json(buildPolicy(anticipo, gastos, cuentaBancos, cuentaAcreedores));

  } catch (error) {
    console.error('Error exporting accountability data:', error);
    return res.status(500).json({ error: 'Internal error when generating the accounting report' });
  }
};

/**
 * Export accounting report from an specific travel request (filtering by ID)
 */
export const exportByDateRange = async (req, res) => {
  const { date_from, date_to } = req.query;

  if (!date_from && !date_to)
    return res.status(400).json({ error: 'At least one of date_from or date_to is required' });

  const dateError = validateDates(date_from, date_to);
  if (dateError)
    return res.status(400).json({ error: dateError });

  try {
    const [solicitudes, cuentaBancos, cuentaAcreedores] = await Promise.all([
      Accountability.getRequestsByDateRange(date_from, date_to),
      Accountability.getAccountByType('Activo'),
      Accountability.getAccountByType('Pasivo'),
    ]);

    if (!cuentaBancos || !cuentaAcreedores)
      return res.status(500).json({ error: 'Missing account information in the database.' });

    if (solicitudes.length === 0)
      return res.status(404).json({ error: 'No requests found for the given date range' });

    // Filtra solo los estados permitidos y construye cada póliza
    const policies = await Promise.all(
      solicitudes
        .filter(a => estadosPermitidos.includes(a.request_status))
        .map(async (anticipo) => {
          const gastos = await Accountability.getGastosById(anticipo.request_id);
          return buildPolicy(anticipo, gastos, cuentaBancos, cuentaAcreedores);
        })
    );

    return res.status(200).json({
      export_date: formatDate(new Date()),
      date_from:   date_from || null,
      date_to:     date_to   || null,
      total:       policies.length,
      policies,
    });

  } catch (error) {
    console.error('Error exporting accountability by date range:', error);
    return res.status(500).json({ error: 'Internal error when generating the accounting report' });
  }
};


export default {
    exportById,
    exportByDateRange
};
