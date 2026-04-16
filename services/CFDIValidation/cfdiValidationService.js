/**
 * CFDI Validation Service
 *
 * Orchestrates the full CFDI validation flow:
 *   1. Parses the uploaded XML buffer using the existing xmlParserService.
 *   2. Extracts the required fields (UUID, RFCs, total, date).
 *   3. Sends those fields to ValidaCFDI for SAT status validation.
 *   4. If ValidaCFDI returns a rate limit error (429), falls back to the
 *      SAT's official SOAP service via SATCfdiService.
 *   5. Returns a structured validation result to the caller.
 *
 * Validation is split across three services, each with a single responsibility:
 *   - validaCfdiService.js  → communicates with the ValidaCFDI REST API (primary)
 *   - SATCfdiService.js     → communicates with the SAT SOAP service (fallback)
 *   - cfdiValidationService.js → orchestrates both: parses the XML and decides which service to call (this file)
 *
 * This service is the single entry point for the /api/cfdi/validate endpoint.
 */

import { parseXmlData, extractXmlData } from '../xmlParserService.js';
import { validateCFDI } from './validaCfdiService.js';
import { validateCFDIviaSAT } from './SATCfdiService.js';

/**
 * Validate a CFDI from a raw XML buffer.
 *
 * Parses the XML, extracts CFDI fields, and forwards them to ValidaCFDI for
 * SAT validation. Returns a structured object containing both the extracted
 * CFDI data and the validation result.
 *
 * @param {Buffer} xmlBuffer - Raw buffer of the uploaded XML file.
 * @returns {Promise<Object>} Object with cfdiData and validationResult fields.
 * @throws {Error} If the XML cannot be parsed or validation returns an error.
 */
export async function validateCFDIFromXml(xmlBuffer) {
  // Convert the file buffer to a UTF-8 string for the XML parser
  const xmlString = xmlBuffer.toString('utf-8');

  // Parse the XML string into a JavaScript object
  const parsedXml = await parseXmlData(xmlString);

  // Extract the CFDI fields we need for validation and display
  const cfdiData = extractXmlData(parsedXml);

  // Try ValidaCFDI first; if the monthly limit is reached (429), fall back to the SAT SOAP service
  let validationResult;
  try {
    validationResult = await validateCFDI(
      cfdiData.uuid,
      cfdiData.rfcEmisor,
      cfdiData.rfcReceptor,
      cfdiData.total
    );
  } catch (err) {
    if (err?.response?.status === 429) {
      // Primary API rate limit reached — fall back to SAT SOAP service
      validationResult = await validateCFDIviaSAT(
        cfdiData.uuid,
        cfdiData.rfcEmisor,
        cfdiData.rfcReceptor,
        cfdiData.total
      );
    } else {
      throw err;
    }
  }


  return {
    cfdiData,
    validationResult,
  };
}
