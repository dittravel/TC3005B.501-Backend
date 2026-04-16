/**
 * ValidaCFDI Service
 *
 * Handles CFDI validation against the SAT using the ValidaCFDI REST API.
 * No session management or login required — authentication is done via
 * a static API key sent in the X-API-Key header on every request.
 *
 * API docs: https://valida-cfdi.com.mx/docs/api
 * API key is read from the environment variable VALIDA_CFDI_API_KEY.
 */

import axios from 'axios';

const BASE_URL = 'https://api.valida-cfdi.com.mx/v1';

/**
 * Validate a CFDI against the SAT using the ValidaCFDI API.
 *
 * Sends UUID, RFC emisor, RFC receptor, and total to the validation
 * endpoint and returns the SAT status result.
 *
 * Endpoint and request format recovered from:
 * https://valida-cfdi.com.mx/docs/api
 *
 * @param {string} uuid        - CFDI UUID (folio fiscal).
 * @param {string} rfcEmisor   - RFC of the invoice issuer.
 * @param {string} rfcReceptor - RFC of the invoice receiver.
 * @param {string} total       - Total amount as it appears in the CFDI.
 * @returns {Promise<Object>} Validation result from ValidaCFDI.
 * @throws {Error} If the request fails.
 */
export async function validateCFDI(uuid, rfcEmisor, rfcReceptor, total) {
  const payload = {
    uuid,
    rfc_emisor: rfcEmisor,
    rfc_receptor: rfcReceptor,
    total: parseFloat(total),
  };

  const response = await axios.post(
    `${BASE_URL}/validate`,
    payload,
    {
      headers: {
        'X-API-Key': process.env.VALIDA_CFDI_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
}
