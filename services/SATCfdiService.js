/**
 * SAT CFDI Service
 *
 * Fallback service for CFDI validation using the SAT's official SOAP web service.
 * Used when the primary ValidaCFDI REST API is unavailable (for example when the rate limit is reached).
 *
 * Validation is split across three services, each with a single responsibility:
 *   - validaCfdiService.js  → communicates with the ValidaCFDI REST API (primary)
 *   - SATCfdiService.js     → communicates with the SAT SOAP service (fallback, this file)
 *   - cfdiValidationService.js → orchestrates both: parses the XML and decides which service to call
 *
 * No authentication required — this is a public SAT endpoint.
 *
 * SAT SOAP endpoint:
 * https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc?WSDL
 */

import axios from 'axios';
import { parseXmlData } from './xmlParserService.js';

// Base URL of the SAT's CFDI consultation SOAP service
const SAT_SOAP_URL = 'https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc';

/**
 * Build the SOAP XML envelope for the SAT Consulta request.
 *
 * The SAT expects a single parameter called `expresionImpresa` which is a
 * query string built from the CFDI fields: RFC emisor, RFC receptor, total, and UUID.
 *
 * @param {string} rfcEmisor   - RFC of the invoice issuer.
 * @param {string} rfcReceptor - RFC of the invoice receiver.
 * @param {string} total       - Total amount exactly as it appears in the CFDI XML.
 * @param {string} uuid        - CFDI UUID (folio fiscal).
 * @returns {string} Full SOAP envelope as an XML string.
 */
function buildSoapEnvelope(rfcEmisor, rfcReceptor, total, uuid) {
  // Build the query string exactly as the SAT expects it
  // & must be escaped as &amp; inside XML
  const expresion = `?re=${rfcEmisor}&amp;rr=${rfcReceptor}&amp;tt=${total}&amp;id=${uuid}`;

  // Return the full SOAP envelope wrapping the expresionImpresa value
  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soapenv:Header/>
  <soapenv:Body>
    <tem:Consulta>
      <tem:expresionImpresa>${expresion}</tem:expresionImpresa>
    </tem:Consulta>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Validate a CFDI against the SAT using their official SOAP web service.
 *
 * Sends the CFDI fields wrapped in a SOAP envelope, parses the XML response,
 * and returns a normalized validation result.
 *
 * Possible values for `estado` in the SAT response:
 *   - "Vigente"      → CFDI is valid and active
 *   - "Cancelado"    → CFDI was cancelled
 *   - "No Encontrado"→ CFDI does not exist in SAT records
 *
 * @param {string} uuid        - CFDI UUID (folio fiscal).
 * @param {string} rfcEmisor   - RFC of the invoice issuer.
 * @param {string} rfcReceptor - RFC of the invoice receiver.
 * @param {string} total       - Total amount exactly as it appears in the CFDI XML.
 * @returns {Promise<Object>} Normalized validation result.
 * @throws {Error} If the SOAP request fails or the response cannot be parsed.
 */
export async function validateCFDIviaSAT(uuid, rfcEmisor, rfcReceptor, total) {
  // Build the SOAP XML body for this request
  const envelope = buildSoapEnvelope(rfcEmisor, rfcReceptor, total, uuid);

  console.log('[SAT SOAP] Iniciando consulta fallback para UUID:', uuid);

  // Send the SOAP request to the SAT endpoint
  // Content-Type must be text/xml
  // SOAPAction tells the server which operation we want to call
  const response = await axios.post(SAT_SOAP_URL, envelope, {
    timeout: 10000, // 10 seconds
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': 'http://tempuri.org/IConsultaCFDIService/Consulta',
    },
  });

  console.log('[SAT SOAP] Respuesta recibida, status:', response.status);

  // The SAT responds with XML — parse it into a JavaScript object
  const parsed = await parseXmlData(response.data);

  // Navigate the parsed XML tree to reach the actual result fields
  // Structure: Envelope > Body > ConsultaResponse > ConsultaResult
  const result = parsed.Envelope.Body.ConsultaResponse.ConsultaResult;

  console.log('[SAT SOAP] Estado CFDI:', result.Estado);
  console.log('[SAT SOAP] Código estatus:', result.CodigoEstatus);

  // CodigoEstatus starts with "S -" when the request was successful
  // Estado tells us the actual CFDI status: Vigente, Cancelado, or No Encontrado
  const estado = result.CodigoEstatus ?? '';
  const esValido = estado.startsWith('S -') && result.Estado === 'Vigente';

  return {
    estado: result.Estado,
    codigoEstatus: result.CodigoEstatus,
    esCancelable: result.EsCancelable,
    valid: esValido, // matches the field name expected by the frontend
    source: 'sat-soap', // indicates this result came from the SAT fallback, not ValidaCFDI
  };
}
