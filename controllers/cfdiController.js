/**
 * CFDI Controller
 *
 * Handles HTTP requests for the CFDI validation endpoint.
 * Receives an uploaded XML file, delegates validation to the
 * cfdiValidationService, and returns a structured JSON response.
 */

import { validateCFDIFromXml } from '../services/cfdiValidationService.js';

/**
 * Validate a CFDI from an uploaded XML file.
 *
 * Expects a multipart/form-data request with a single file field named "xml".
 * Extracts the file buffer, calls the validation service, and responds with
 * the CFDI data and the Finkok validation result.
 *
 * POST /api/cfdi/validate
 *
 * @param {import('express').Request}  req - Express request object.
 * @param {import('express').Response} res - Express response object.
 */
export const validateCFDIController = async (req, res) => {
  console.log('[CFDI Controller] Petición recibida en POST /api/cfdi/validate');

  // Verify that the XML file was included in the request
  if (!req.files || !req.files.xml) {
    console.log('[CFDI Controller] Error: no se recibió archivo XML');
    return res.status(400).json({ error: 'XML file is required' });
  }

  console.log('[CFDI Controller] Archivo XML recibido:', req.files.xml[0].originalname);

  try {
    const xmlBuffer = req.files.xml[0].buffer;

    const { cfdiData, finkokResult } = await validateCFDIFromXml(xmlBuffer);

    console.log('[CFDI Controller] Validación exitosa, respondiendo al cliente');
    return res.status(200).json({
      success: true,
      cfdiData,
      finkokResult,
    });
  } catch (error) {
    console.error('[CFDI Controller] Error durante la validación:', error.message);

    // Surface XML parsing or data extraction errors as 400 (bad request)
    if (
      error.message.includes('parsear') ||
      error.message.includes('extraer')
    ) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
};
