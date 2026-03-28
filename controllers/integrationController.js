/**
 * Integration Controller
 *
 * HTTP handlers for integration-facing endpoints.
 */

import IntegrationService from '../services/integrationService.js';

export async function getERPEmployees(req, res) {
  try {
    const response = await IntegrationService.getERPEmployees(req.query);
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error getting ERP employee data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default {
  getERPEmployees,
};
