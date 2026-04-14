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
import { uploadFile, getFile, bucket } from './fileStorage.js';
import { prisma } from '../lib/prisma.js';

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

    try {
      const tx = existingConn || prisma;
      const updateData = {
        pdf_file_id: pdfResult.fileId,
        pdf_file_name: pdfResult.fileName,
        xml_file_id: xmlResult ? xmlResult.fileId : null,
        xml_file_name: xmlResult ? xmlResult.fileName : null,
        xml_uuid: cfdiData.uuid || null,
        xml_rfc_emisor: cfdiData.rfcEmisor || null,
        xml_rfc_receptor: cfdiData.rfcReceptor || null,
        xml_nombre_emisor: cfdiData.nombreEmisor || null,
        xml_fecha: cfdiData.fecha ? new Date(cfdiData.fecha) : null,
        xml_total: cfdiData.total ?? null,
        xml_subtotal: cfdiData.subtotal ?? null,
        xml_impuestos: cfdiData.impuestos ?? null,
        xml_moneda: cfdiData.moneda || null,
      };

      // If XML exists and has a date, and receipt_date is not yet set, use XML date
      if (cfdiData.fecha) {
        // Temporarily set receipt_date from XML if it hasn't been set manually
        // This will be overridden if user provided a manual receipt_date
        updateData.receipt_date = new Date(cfdiData.fecha);
      }

      await tx.receipt.update({
        where: { receipt_id: Number(safeReceiptId) },
        data: updateData,
      });

      return {
        pdf: pdfResult,
        xml: xmlResult,
        cfdiData: cfdiData
      };
    } catch (dbError) {
      // Check for duplicate UUID error (MySQL error 1062)
      if (dbError.code === 'ER_DUP_ENTRY' || (dbError.message?.includes('Duplicate entry') && dbError.message?.includes('xml_uuid'))) {
        const error = new Error('Este comprobante XML ya existe');
        error.code = 'DUPLICATE_UUID';
        throw error;
      }
      throw dbError;
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
  const receipt = await prisma.receipt.findUnique({
    where: { receipt_id: Number(receiptId) },
    select: {
      pdf_file_id: true,
      pdf_file_name: true,
      xml_file_id: true,
      xml_file_name: true,
    },
  });

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
}

// Delete receipt files from MongoDB
export async function deleteReceiptFiles(receiptId) {
  try {
    const receipt = await prisma.receipt.findUnique({
      where: { receipt_id: Number(receiptId) },
      select: {
        pdf_file_id: true,
        xml_file_id: true,
      },
    });

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
  }
}
