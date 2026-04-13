/**
 * CFDI Validation Service
 *
 * Orchestrates the full CFDI validation flow:
 *   1. Parses the uploaded XML buffer using the existing xmlParserService.
 *   2. Extracts the required fields (UUID, RFCs, total, date).
 *   3. Sends those fields to the Finkok API via finkokService.
 *   4. Returns a structured validation result to the caller.
 *
 * This service is the single entry point for the /api/cfdi/validate endpoint.
 */

import { parseXmlData, extractXmlData } from './xmlParserService.js';
import { validateCFDI } from './finkokService.js';

/**
 * Validate a CFDI from a raw XML buffer.
 *
 * Parses the XML, extracts CFDI fields, and forwards them to Finkok for
 * SAT validation. Returns a structured object containing both the extracted
 * CFDI data and the Finkok validation result.
 *
 * @param {Buffer} xmlBuffer - Raw buffer of the uploaded XML file.
 * @returns {Promise<Object>} Object with cfdiData and finkokResult fields.
 * @throws {Error} If the XML cannot be parsed or Finkok returns an error.
 */
export async function validateCFDIFromXml(xmlBuffer) {
  console.log('[CFDI] Iniciando validación...');

  // Convert the file buffer to a UTF-8 string for the XML parser
  const xmlString = xmlBuffer.toString('utf-8');
  console.log('[CFDI] XML recibido, tamaño:', xmlString.length, 'caracteres');

  // Parse the XML string into a JavaScript object
  console.log('[CFDI] Parseando XML...');
  const parsedXml = await parseXmlData(xmlString);

  // Extract the CFDI fields we need for validation and display
  console.log('[CFDI] Extrayendo datos del CFDI...');
  const cfdiData = extractXmlData(parsedXml);
  console.log('[CFDI] Datos extraídos:', cfdiData);

  // Send CFDI fields to Finkok for SAT status validation
  console.log('[CFDI] Enviando a Finkok para validación con el SAT...');
  const finkokResult = await validateCFDI(
    cfdiData.uuid,
    cfdiData.rfcEmisor,
    cfdiData.rfcReceptor,
    cfdiData.total,
    cfdiData.fecha
  );

  console.log('[CFDI] Validación completada. Resultado Finkok:', finkokResult);

  return {
    cfdiData,
    finkokResult,
  };
}
