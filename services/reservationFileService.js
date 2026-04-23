/**
 * Reservation File Service
 * 
 * This service provides functions to handle reservation file operations, including:
 * - Uploading PDF files for a reservation
 * - Retrieving reservation files
 * - Getting metadata for reservation files
 * - Deleting reservation files from MongoDB when a reservation is deleted
 * 
 * The service interacts with the fileStorage service for handling file uploads and retrievals,
 * and it uses the database connection pool to update reservation records with file information.
 * 
 * Note: Ensure that the MONGO_URI environment variable is set to connect to MongoDB for file storage.
 * Example: MONGO_URI=mongodb://localhost:27017
 */

import { ObjectId } from 'mongodb';
import { uploadFile, getFile, bucket } from './fileStorage.js';
import { prisma } from '../lib/prisma.js';


// Upload both PDF and XML files for a reservation
export async function uploadReservationFiles(routeId, flightPdfFile, hotelPdfFile, existingConn = null) {
  try {
    // Convert BigInt to regular number if needed
    const safeRouteId = typeof routeId === 'bigint' ? Number(routeId) : routeId;
    
    // Upload Flight PDF file
    let flightPdfResult = null;
    if (flightPdfFile) {
      flightPdfResult = await uploadFile(
        flightPdfFile.buffer,
        flightPdfFile.originalname,
        flightPdfFile.mimetype,
        { routeId: safeRouteId, fileType: 'pdf' }
      );
    }

    // Upload Hotel PDF file 
    let hotelPdfResult = null;
    if (hotelPdfFile) {
      hotelPdfResult = await uploadFile(
        hotelPdfFile.buffer,
        hotelPdfFile.originalname,
        hotelPdfFile.mimetype,
        { routeId: safeRouteId, fileType: 'pdf' }
      );
    }

    try {
      const tx = existingConn || prisma;
      const updateData = {
        flight_pdf_file_id: flightPdfResult ? flightPdfResult.fileId : null,
        flight_pdf_file_name: flightPdfResult ? flightPdfResult.fileName : null,
        hotel_pdf_file_id: hotelPdfResult ? hotelPdfResult.fileId : null,
        hotel_pdf_file_name: hotelPdfResult ? hotelPdfResult.fileName : null,
      };

      console.log("Attempting route update with route_id:", Number(safeRouteId), typeof safeRouteId);

      await tx.route.update({
        where: { route_id: Number(safeRouteId) },
        data: updateData,
      });

      return {
        flightPdf: flightPdfResult,
        hotelPdf: hotelPdfResult
      };
    } catch (dbError) {
      throw dbError;
    }
  } catch (error) {
    console.error('Error uploading reservation files:', error);
    throw error;
  }
}

// Get reservation file (PDF)
export async function getReservationFile(fileId) {
  try {
    return await getFile(fileId);
  } catch (error) {
    console.error('Error getting reservation file:', error);
    throw error;
  }
}

// Get reservation files metadata
export async function getReservationFilesMetadata(routeId) {
  const route = await prisma.route.findUnique({
    where: { route_id: Number(routeId) },
    select: {
      flight_pdf_file_id: true,
      flight_pdf_file_name: true,
      hotel_pdf_file_id: true,
      hotel_pdf_file_name: true,
    },
  });

  if (!route) {
    throw new Error('Route not found');
  }

  return {
    pdf: {
      flightFileId: route.flight_pdf_file_id,
      flightFileName: route.flight_pdf_file_name,
      hotelFileId: route.hotel_pdf_file_id,
      hotelFileName: route.hotel_pdf_file_name
    },
  };
}

// Delete reservation files from MongoDB
export async function deleteReservationFiles(routeId) {
  try {
    const route = await prisma.route.findUnique({
      where: { route_id: Number(routeId) },
      select: {
        flight_pdf_file_id: true,
        hotel_pdf_file_id: true,
      },
    });

    if (!route) {
      throw new Error('Route not found');
    }

    // Delete files from MongoDB if they exist
    if (route.flight_pdf_file_id) {
      try {
        await bucket.delete(new ObjectId(route.flight_pdf_file_id));
      } catch (err) {
        console.error(`Error deleting PDF file ${route.flight_pdf_file_id}:`, err);
      }
    }

    if (route.hotel_pdf_file_id) {
      try {
        await bucket.delete(new ObjectId(route.hotel_pdf_file_id));
      } catch (err) {
        console.error(`Error deleting PDF file ${route.hotel_pdf_file_id}:`, err);
      }
    }

    return true;
  } catch (error) {
    console.error('Error deleting reservation files:', error);
    throw error;
  }
}
