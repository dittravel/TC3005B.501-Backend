/**
 * Receipt File Service
 * 
 * This service provides functions to handle receipt file operations, including:
 * - Uploading PDF and XML files for a receipt
 * - Retrieving receipt files
 * - Getting metadata for receipt files
 * - Deleting receipt files from MongoDB when a receipt is deleted
 * 
 * The service interacts with the fileStorage service for handling file uploads and retrievals,
 * and it uses the database connection pool to update receipt records with file information.
 * 
 * Note: Ensure that the MONGO_URI environment variable is set to connect to MongoDB for file storage.
 * Example: MONGO_URI=mongodb://localhost:27017
 */

import { ObjectId } from 'mongodb';
import { uploadFile, getFile, db, bucket } from './fileStorage.js';
import pool from "../database/config/db.js";

// XML parsing functions
import { parseXmlData, extractXmlData } from './xmlParserService.js';

// Upload both PDF and XML files for a receipt
export async function uploadReceiptFiles(receiptId, pdfFile, xmlFile, existingConn = null) {
  try {
    // Convert BigInt to regular number if needed
    const safeReceiptId = typeof receiptId === 'bigint' ? Number(receiptId) : receiptId;
    
    // Upload PDF file
    const pdfResult = await uploadFile(
      pdfFile.buffer,
      pdfFile.originalname,
      pdfFile.mimetype,
      { receiptId: safeReceiptId, fileType: 'pdf' }
    );

    // Upload XML file only if provided
    let xmlResult = null;
    if (xmlFile) {
      xmlResult = await uploadFile(
        xmlFile.buffer,
        xmlFile.originalname,
        xmlFile.mimetype,
        { receiptId: safeReceiptId, fileType: 'xml' }
      );
    }

    // Parse CFDI data from XML file only if it exists
    let cfdiData = {};
    if (xmlFile) {
      try {
        // Convert XML buffer to string
        const xmlString = xmlFile.buffer.toString('utf8');
        const parsedXml = await parseXmlData(xmlString);
        cfdiData = extractXmlData(parsedXml);
      } catch (err) {
        console.warn('Error parsing XML file:', err);
      }
    }

    // Update the receipt record with file IDs
    // Use existing connection if provided (for transactions), otherwise get a new one
    const conn = existingConn || (await pool.getConnection());
    const shouldReleaseConn = !existingConn; // Only release if we got our own connection
    
    try {
      await conn.query(`
        UPDATE Receipt
        SET 
          pdf_file_id = ?, pdf_file_name = ?,
          xml_file_id = ?, xml_file_name = ?,
          xml_uuid = ?, xml_rfc_emisor = ?, xml_rfc_receptor = ?,
          xml_nombre_emisor = ?, xml_fecha = ?, xml_total = ?, 
          xml_subtotal = ?, xml_impuestos = ?, xml_moneda = ?
        WHERE receipt_id = ?
        `,
        [
          pdfResult.fileId, pdfResult.fileName,
          xmlResult ? xmlResult.fileId : null, xmlResult ? xmlResult.fileName : null,
          cfdiData.uuid || null,
          cfdiData.rfcEmisor || null,
          cfdiData.rfcReceptor || null,
          cfdiData.nombreEmisor || null,
          cfdiData.fecha || null,
          cfdiData.total || null,
          cfdiData.subtotal || null,
          cfdiData.impuestos || null,
          cfdiData.moneda || null,
          safeReceiptId
        ]
      );

      return {
        pdf: pdfResult,
        xml: xmlResult,
        cfdiData: cfdiData
      };
    } catch (dbError) {
      // Check for duplicate UUID error (MySQL error 1062)
      if (dbError.code === 'ER_DUP_ENTRY' || (dbError.message && dbError.message.includes('Duplicate entry') && dbError.message.includes('xml_uuid'))) {
        const error = new Error('Este comprobante ya existe en el sistema');
        error.code = 'DUPLICATE_UUID';
        throw error;
      }
      throw dbError;
    } finally {
      // Only release connection if we created it
      if (shouldReleaseConn) {
        conn.release();
      }
    }
  } catch (error) {
    console.error('Error uploading receipt files:', error);
    throw error;
  }
}

// Get receipt file (PDF or XML)
export async function getReceiptFile(fileId) {
  try {
    return await getFile(fileId);
  } catch (error) {
    console.error('Error getting receipt file:', error);
    throw error;
  }
}

// Get receipt files metadata
export async function getReceiptFilesMetadata(receiptId) {
  const conn = await pool.getConnection();
  try {
    const [receipt] = await conn.query(
      `SELECT pdf_file_id, pdf_file_name, xml_file_id, xml_file_name
       FROM Receipt
       WHERE receipt_id = ?`,
      [receiptId]
    );

    if (!receipt) {
      throw new Error('Receipt not found');
    }

    return {
      pdf: {
        fileId: receipt.pdf_file_id,
        fileName: receipt.pdf_file_name
      },
      xml: {
        fileId: receipt.xml_file_id,
        fileName: receipt.xml_file_name
      }
    };
  } finally {
    conn.release();
  }
}

// Delete receipt files from MongoDB
export async function deleteReceiptFiles(receiptId) {
  const conn = await pool.getConnection();
  try {
    // Get file IDs before deleting the receipt
    const [receipt] = await conn.query(
      `SELECT pdf_file_id, xml_file_id
       FROM Receipt
       WHERE receipt_id = ?`,
      [receiptId]
    );

    if (!receipt) {
      throw new Error('Receipt not found');
    }

    // Delete files from MongoDB if they exist
    if (receipt.pdf_file_id) {
      try {
        await bucket.delete(new ObjectId(receipt.pdf_file_id));
      } catch (err) {
        console.error(`Error deleting PDF file ${receipt.pdf_file_id}:`, err);
      }
    }

    if (receipt.xml_file_id) {
      try {
        await bucket.delete(new ObjectId(receipt.xml_file_id));
      } catch (err) {
        console.error(`Error deleting XML file ${receipt.xml_file_id}:`, err);
      }
    }

    return true;
  } catch (error) {
    console.error('Error deleting receipt files:', error);
    throw error;
  } finally {
    conn.release();
  }
}
