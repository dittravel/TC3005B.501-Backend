/**
 * Finkok Service
 *
 * Handles all communication with the Finkok PDF/CFDI REST API.
 * Manages session authentication via cookies and exposes a single
 * function to validate a CFDI against the SAT through Finkok.
 *
 * Finkok API base URL: https://pdf.finkok.com/api
 * Credentials are read from environment variables FINKOK_USERNAME and FINKOK_PASSWORD.
 */

import axios from 'axios';

const FINKOK_BASE_URL = 'https://pdf.finkok.com/api';

// Stores the session cookie returned by Finkok after a successful login.
// All subsequent requests must include this cookie.
let sessionCookie = null;

/**
 * Authenticate with the Finkok API and store the session cookie.
 *
 * Makes a POST request to the Finkok login endpoint using credentials
 * stored in environment variables. On success, extracts and stores the
 * session cookie from the Set-Cookie response header for reuse.
 *
 * Endpoint and request format recovered from:
 * https://wiki.finkok.com/home/Api_PDF/login
 *
 * @throws {Error} If login fails or credentials are rejected.
 */
async function login() {
  const response = await axios.post(
    `${FINKOK_BASE_URL}/login/`,
    {
      username: process.env.FINKOK_USERNAME,
      password: process.env.FINKOK_PASSWORD,
    },
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  // Extract session cookie from the Set-Cookie header.
  // Each cookie entry has the form "name=value; Path=/; ..." — we only keep
  // the "name=value" part and join multiple cookies with "; ".
  const setCookieHeader = response.headers['set-cookie'];
  if (!setCookieHeader || setCookieHeader.length === 0) {
    throw new Error('Finkok login did not return a session cookie');
  }

  sessionCookie = setCookieHeader.map((c) => c.split(';')[0]).join('; ');
}

/**
 * Call the Finkok CFDI validation endpoint.
 *
 * Sends the CFDI fields to Finkok and returns their validation response.
 * If the session has expired (HTTP 401/403), re-authenticates automatically
 * and retries the request once.
 *
 * NOTE: Update FINKOK_VALIDATE_PATH once you have confirmed the exact
 * validation endpoint from your Finkok account documentation.
 *
 * @param {string} uuid        - CFDI UUID (folio fiscal).
 * @param {string} rfcEmisor   - RFC of the invoice issuer.
 * @param {string} rfcReceptor - RFC of the invoice receiver.
 * @param {string} total       - Total amount as it appears in the CFDI.
 * @param {string} fecha       - Invoice date (ISO format).
 * @returns {Promise<Object>} Raw response data from Finkok.
 * @throws {Error} If the request fails after one retry.
 */
async function callValidate(uuid, rfcEmisor, rfcReceptor, total, fecha) {
  // TODO: Confirm the exact path for CFDI status validation in your
  // Finkok account docs. Common paths are /validate/ or /cfdi/status/.
  const FINKOK_VALIDATE_PATH = '/validate/';

  const payload = {
    uuid,
    rfc_emisor: rfcEmisor,
    rfc_receptor: rfcReceptor,
    total,
    fecha,
  };

  const response = await axios.post(
    `${FINKOK_BASE_URL}${FINKOK_VALIDATE_PATH}`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
    }
  );

  return response.data;
}

/**
 * Validate a CFDI against the SAT through the Finkok API.
 *
 * Ensures the service is authenticated before calling the validation
 * endpoint. If the session is expired, re-authenticates and retries once.
 *
 * @param {string} uuid        - CFDI UUID (folio fiscal).
 * @param {string} rfcEmisor   - RFC of the invoice issuer.
 * @param {string} rfcReceptor - RFC of the invoice receiver.
 * @param {string} total       - Total amount as it appears in the CFDI.
 * @param {string} fecha       - Invoice date (ISO format).
 * @returns {Promise<Object>} Validation result from Finkok.
 * @throws {Error} If authentication or validation fails.
 */
export async function validateCFDI(uuid, rfcEmisor, rfcReceptor, total, fecha) {
  // Log in if we have no session yet
  if (!sessionCookie) {
    await login();
  }

  try {
    return await callValidate(uuid, rfcEmisor, rfcReceptor, total, fecha);
  } catch (error) {
    // If Finkok rejects the session, re-authenticate and retry once
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      sessionCookie = null;
      await login();
      return await callValidate(uuid, rfcEmisor, rfcReceptor, total, fecha);
    }
    throw new Error(`Finkok validation request failed: ${error.message}`);
  }
}
