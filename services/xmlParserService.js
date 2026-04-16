/**
* XML Parser Service
* 
* This service provides functions to parse XML files, specifically for handling receipt data.
*/

// Import the xml2js library for parsing XML data into JavaScript objects.
// Documentation ref: https://www.npmjs.com/package/xml2js
import xml2js from 'xml2js';

/**
* Parse XML data into a JavaScript object.
* @param {string} xmlData - String containing the XML data to be parsed.
*/
export async function parseXmlData(xmlData) {
  try {
    const parser = new xml2js.Parser({
      explicitArray: false, // Do not wrap single elements in an array
      tagNameProcessors: [xml2js.processors.stripPrefix], // Remove namespace prefixes from tags
    });
    const result = await parser.parseStringPromise(xmlData);
    return result;
  } catch (error) {
    const errorMessage = 'Error al parsear los datos XML: ' + error.message;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

/**
* Extract data from a parsed XML object
*/
export function extractXmlData(xmlObj) {
  try {
    const cfdi = xmlObj.Comprobante;

    const data = {
      version: cfdi.$.Version,
      fecha: cfdi.$.Fecha,
      total: cfdi.$.Total,
      subtotal: cfdi.$.SubTotal,
      moneda: cfdi.$.Moneda,
      rfcEmisor: cfdi.Emisor.$.Rfc,
      nombreEmisor: cfdi.Emisor.$.Nombre,
      rfcReceptor: cfdi.Receptor.$.Rfc,
      impuestos: cfdi.Impuestos?.$.TotalImpuestosTrasladados ?? null,
      uuid: cfdi.Complemento.TimbreFiscalDigital.$.UUID,
    };
    return data;
  } catch (error) {
    const errorMessage = 'Error al extraer los datos del XML: ' + error.message;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}