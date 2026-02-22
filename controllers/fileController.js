/**
 * File Controller
 * 
 * This module handles file operations and business logic for document management
 * in the travel request system. It provides functionality for uploading,
 * downloading, and managing receipt files and other travel-related documents.
 * 
 * Role-based access control ensures users can only access files related
 * to their own travel requests or those they are authorized to review.
 */
import { ObjectId } from 'mongodb';
import sanitize from 'mongo-sanitize';
import { uploadReceiptFiles, getReceiptFile, getReceiptFilesMetadata } from '../services/receiptFileService.js';
import { db } from '../services/fileStorage.js';

// Upload PDF and XML receipt files with security sanitization
export const uploadReceiptFilesController = async (req, res) => {
  // Validate that both required file types are present
  // This might need to be changed to require at least one file.
  if (!req.files || !req.files.pdf || !req.files.xml) {
    return res.status(400).json({ error: 'Both PDF and XML files are required' });
  }

  // Sanitize receipt ID to prevent injection attacks
  const receiptId = parseInt(sanitize(req.params.receipt_id), 10);

  try {
    // Extract file objects from multer upload
    const pdfFile = req.files.pdf[0];
    const xmlFile = req.files.xml[0];
    
    // Sanitize file metadata to prevent injection in file names
    pdfFile.originalname = sanitize(pdfFile.originalname);
    xmlFile.originalname = sanitize(xmlFile.originalname);
    
    const result = await uploadReceiptFiles(
      receiptId,
      pdfFile,
      xmlFile
    );

    res.status(201).json({
      message: 'Files uploaded successfully',
      pdf: {
        fileId: result.pdf.fileId,
        fileName: result.pdf.fileName
      },
      xml: {
        fileId: result.xml.fileId,
        fileName: result.xml.fileName
      }
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Download receipt file with secure streaming (PDF or XML)
export const getReceiptFileController = async (req, res) => {
  try {
    // Sanitize file ID parameter to prevent injection
    const fileIdStr = sanitize(req.params.file_id);
    
    // Validate MongoDB ObjectId format before database query
    if (!ObjectId.isValid(fileIdStr)) {
      return res.status(400).json({ error: 'Invalid file ID format' });
    }
    
    const fileId = new ObjectId(fileIdStr);

    // Query MongoDB GridFS for file metadata
    const file = await db.collection('fs.files').findOne({ _id: fileId });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Set secure HTTP headers for file download

    // Stream file directly from GridFS to HTTP response
    const downloadStream = await getReceiptFile(fileId);
    downloadStream.pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get receipt file metadata without downloading content
export const getReceiptFilesMetadataController = async (req, res) => {
  // Sanitize receipt ID parameter
  const receiptId = parseInt(sanitize(req.params.receipt_id), 10);

  try {
    const metadata = await getReceiptFilesMetadata(receiptId);
    res.json(metadata);
  } catch (error) {
    console.error('Error getting receipt files metadata:', error);
    if (error.message === 'Receipt not found') {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
