/**
 * File Routes
 *
 * This module defines the routes for handling file uploads and retrievals
 * related to receipts in the travel request system.
 * It includes routes for uploading receipt files (PDF and XML), retrieving a specific receipt file,
 * and getting metadata for all receipt files associated with a specific receipt.
 */

import express from 'express';
import multer from 'multer';
import { generalRateLimiter } from '../middleware/rateLimiters.js';
import { sanitizeMongoInputs } from '../middleware/mongoSanitize.js';
import {
  uploadReceiptFilesController,
  getReceiptFileController,
  getReceiptFilesMetadataController
} from '../controllers/fileController.js';
import { parseXmlData, extractXmlData } from '../services/xmlParserService.js';

const router = express.Router();
const upload = multer();

// Apply sanitization middleware to all routes
router.use(sanitizeMongoInputs);

// Upload both PDF and XML files for a receipt
router.post('/upload-receipt-files/:receipt_id',
  upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'xml', maxCount: 1 }
  ]),
  uploadReceiptFilesController
);

// Get receipt file (PDF or XML)
router.get('/receipt-file/:file_id', generalRateLimiter, getReceiptFileController);

// Get receipt files metadata (filenames and object ids)
router.get('/receipt-files/:receipt_id', getReceiptFilesMetadataController);

// Get data from XML file to display in the UI
// This route is used to parse the XML file and extract CFDI data for preview in the frontend.
router.post('/parse-xml-preview',
  // Only accept uploading one XML file
  upload.fields([
    { name: 'xml', maxCount: 1 }
  ]),
  async (req, res) => {

  try {
    // Validate that the XML file is present
    if (!req.files || !req.files.xml) {
      return res.status(400).json({ error: 'XML file required' });
    }

    // Get the uploaded XML file and convert it to a string
    const xmlFile = req.files.xml[0];
    const xmlString = xmlFile.buffer.toString('utf-8');

    // Parse XML and extract data
    const parsedXml = await parseXmlData(xmlString);
    const cfdiData = extractXmlData(parsedXml);

    res.json({ success: true, cfdiData });
  } catch (error) {
    console.error('Error parsing XML preview:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
