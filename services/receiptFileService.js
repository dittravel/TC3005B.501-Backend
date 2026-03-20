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
export async function uploadReceiptFiles(receiptId, pdfFile, xmlFile) {
  try {
    // Upload PDF file
    const pdfResult = await uploadFile(
      pdfFile.buffer,
      pdfFile.originalname,
      pdfFile.mimetype,
      { receiptId, fileType: 'pdf' }
    );

    // Upload XML file
    const xmlResult = await uploadFile(
      xmlFile.buffer,
      xmlFile.originalname,
      xmlFile.mimetype,
      { receiptId, fileType: 'xml' }
    );

    // Parse CFDI data from XML file
    let cfdiData = {};
    try {
      // Convert XML buffer to string
      const xmlString = xmlFile.buffer.toString('utf8');
      const parsedXml = await parseXmlData(xmlString);
      cfdiData = extractXmlData(parsedXml);
    } catch (err) {
      console.warn('Error parsing XML file:', err);
    }

    // Update the receipt record with both file IDs
    const conn = await pool.getConnection();
    try {
      await conn.query(
        `UPDATE Receipt
         SET pdf_file_id = ?, pdf_file_name = ?,
            xml_file_id = ?, xml_file_name = ?,
            xml_uuid = ?, xml_rfc_emisor = ?, xml_rfc_receptor = ?,
            xml_nombre_emisor = ?, xml_fecha = ?, xml_total = ?, 
            xml_subtotal = ?, xml_impuestos = ?, xml_moneda = ?
         WHERE receipt_id = ?`,
        [
          pdfResult.fileId, pdfResult.fileName,
          xmlResult.fileId, xmlResult.fileName,
          cfdiData.uuid || null,
          cfdiData.rfcEmisor || null,
          cfdiData.rfcReceptor || null,
          cfdiData.nombreEmisor || null,
          cfdiData.fecha || null,
          cfdiData.total || null,
          cfdiData.subtotal || null,
          cfdiData.impuestos || null,
          cfdiData.moneda || null,
          receiptId
        ]
      );

      return {
        pdf: pdfResult,
        xml: xmlResult,
        cfdiData: cfdiData
      };
    } finally {
      conn.release();
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
