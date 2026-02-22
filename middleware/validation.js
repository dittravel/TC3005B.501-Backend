/**
 * Validation Middleware
 * 
 * This module provides comprehensive input validation and sanitization
 * middleware for the travel request system. It validates parameters,
 * request bodies, and ensures data integrity using express-validator.
 */

import { body, param, validationResult } from 'express-validator';

// Validate and sanitize ID parameters in endpoints
export const validateId = [
  param('id')
    .optional()
    .isInt()
    .toInt()
    .withMessage('The ID needs to be a valid number'),
  param('request_id')
    .optional()
    .isInt()
    .toInt()
    .withMessage('Request ID must be a valid number'),
  param('user_id')
    .optional()
    .isInt()
    .toInt()
    .withMessage('User ID must be a valid number'),
  param('receipt_id')
    .optional()
    .isInt()
    .toInt()
    .withMessage('Receipt ID must be a valid number'),
  (req, res, next) => {
    if (!req.params.id && !req.params.user_id && !req.params.request_id && !req.params.receipt_id) {
      return res.status(400).json({ error: "At least one ID needs to be provided" });
    }
    next();
  }
];

// Validate department, status ID and pagination parameters
export const validateDeptStatus = [
  param('dept_id')
    .isInt()
    .toInt()
    .withMessage('Department cannot be empty.'),
  param('status_id')
    .isInt()
    .toInt()
    .withMessage('Status cannot be empty.'),
  param('n')
    .optional()
    .isInt()
    .toInt()
    .withMessage('N must be a valid number')
];

// Validate travel request form fields and data
export const validateTravelRequest = [
  // Basic request information
  body('router_index')
    .isInt({ min: 0 })
    .withMessage('Router index must be a valid number')
    .bail(),
  body('notes')
    .isString()
    .trim()
    .escape()
    .stripLow()
    .withMessage('Notes have to be a string')
    .bail(),

  // Financial information
  body('requested_fee')
    .isFloat({min: 0})
    .exists()
    .withMessage('The minimum requested fee is 0')
    .bail(),
  body('imposed_fee')
    .isFloat({min: 0})
    .exists()
    .withMessage('The minimum imposed fee is 0')
    .bail(),
  
  // Main route locations
  body('origin_country_name')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Origin country cannot be empty.')
    .bail(),
  body('origin_city_name')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Origin city cannot be left empty.')
    .bail(),
  body('destination_country_name')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Destination country cannot be left empty.')
    .bail(),
  body('destination_city_name')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Destination city cannot be left empty.')
    .bail(),

  // Main route dates and times
  body('beginning_date')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Trip start date cannot be empty.')
    .bail(),
  body('beginning_time')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Trip start time cannot be empty.')
    .bail(),
  body('ending_date')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Trip end date cannot be empty.')
    .bail(),
  body('ending_time')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Trip end time cannot be empty.')
    .bail(),

  // Transportation and accommodation requirements
  body('plane_needed')
    .isBoolean()
    .toBoolean()
    .exists()
    .withMessage('Please select if plane reservation is required or not.')
    .bail(),
  body('hotel_needed')
    .isBoolean()
    .toBoolean()
    .exists()
    .withMessage('Please select if hotel reservation is required or not.')
    .bail(),

  // Additional routes validation
  body('additionalRoutes')
    .optional()
    .isArray()
    .withMessage('Additional routes must be an array')
    .bail(),
    
  // Additional routes - basic information
  body('additionalRoutes.*.router_index')
    .isInt()
    .exists()
    .withMessage("Router index must be a valid number")
    .bail(),
    
  // Additional routes - locations
  body('additionalRoutes.*.origin_country_name')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Origin country cannot be empty.')
    .bail(),
  body('additionalRoutes.*.origin_city_name')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Origin city cannot be left empty.')
    .bail(),
  body('additionalRoutes.*.destination_country_name')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Destination country cannot be left empty.')
    .bail(),
  body('additionalRoutes.*.destination_city_name')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Destination city cannot be left empty.')
    .bail(),

  // Additional routes - dates and times
  body('additionalRoutes.*.beginning_date')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Trip start date cannot be empty.')
    .bail(),
  body('additionalRoutes.*.beginning_time')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Trip start time cannot be empty.')
    .bail(),
  body('additionalRoutes.*.ending_date')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Trip end date cannot be empty.')
    .bail(),
  body('additionalRoutes.*.ending_time')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Trip end time cannot be empty.')
    .bail(),

  // Additional routes - transportation and accommodation
  body('additionalRoutes.*.plane_needed')
    .isBoolean()
    .toBoolean()
    .exists()
    .withMessage('Please select if plane reservation is required or not.')
    .bail(),
  body('additionalRoutes.*.hotel_needed')
    .isBoolean()
    .toBoolean()
    .exists()
    .withMessage('Please select if hotel reservation is required or not.')
    .bail(),
];

// Validate expense receipt submissions and amounts
export const validateExpenseReceipts = [
  body('receipts')
    .isArray()
    .notEmpty()
    .withMessage('Receipts must be a non-empty array.'),
  body('receipts.*.receipt_type_id')
    .isInt({ min: 0 })
    .toInt()
    .withMessage('Receipt type ID must be a valid number'),
  body('receipts.*.request_id')
    .isInt({ min: 0 })
    .toInt()
    .withMessage('Request ID must be a valid number'),
  body('receipts.*.amount')
    .isFloat({ min: 0 })
    .toFloat()
    .withMessage('Amounts needs to be a valid number'),
];

// Validate draft travel request parameters
export const validateDraftTravelRequest = [
  // Basic request information 
  body('router_index')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Router index must be a valid number')
    .bail(),
  body('notes')
    .optional()
    .isString()
    .trim()
    .escape()
    .stripLow()
    .withMessage('Notes have to be a string')
    .bail(),

  // Financial information 
  body('requested_fee')
    .optional()
    .isFloat({min: 0})
    .exists()
    .withMessage('The minimum requested fee is 0')
    .bail(),
  body('imposed_fee')
    .optional()
    .isFloat({min: 0})
    .exists()
    .withMessage('The minimum imposed fee is 0')
    .bail(),
  
  // Main route locations 
  body('origin_country_name')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Origin country cannot be empty.')
    .bail(),
  body('origin_city_name')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Origin city cannot be left empty.')
    .bail(),
  body('destination_country_name')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Destination country cannot be left empty.')
    .bail(),
  body('destination_city_name')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Destination city cannot be left empty.')
    .bail(),

  // Main route dates and times 
  body('beginning_date')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Trip start date cannot be empty.')
    .bail(),
  body('beginning_time')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Trip start time cannot be empty.')
    .bail(),
  body('ending_date')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Trip end date cannot be empty.')
    .bail(),
  body('ending_time')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Trip end time cannot be empty.')
    .bail(),

  // Transportation and accommodation requirements
  body('plane_needed')
    .optional()
    .isBoolean()
    .toBoolean()
    .exists()
    .withMessage('Please select if plane reservation is required or not.')
    .bail(),
  body('hotel_needed')
    .optional()
    .isBoolean()
    .toBoolean()
    .exists()
    .withMessage('Please select if hotel reservation is required or not.')
    .bail(),

  // Additional routes validation
  body('additionalRoutes')
    .optional()
    .isArray()
    .withMessage('Additional routes must be an array')
    .bail(),
    
  // Additional routes - basic information
  body('additionalRoutes.*.router_index')
    .optional()
    .isNumeric()
    .exists()
    .withMessage("Router index must be a valid number")
    .bail(),
    
  // Additional routes - locations
  body('additionalRoutes.*.origin_country_name')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Origin country cannot be empty.')
    .bail(),
  body('additionalRoutes.*.origin_city_name')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Origin city cannot be left empty.')
    .bail(),
  body('additionalRoutes.*.destination_country_name')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Destination country cannot be left empty.')
    .bail(),
  body('additionalRoutes.*.destination_city_name')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Destination city cannot be left empty.')
    .bail(),

  // Additional routes - dates and times
  body('additionalRoutes.*.beginning_date')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Trip start date cannot be empty.')
    .bail(),
  body('additionalRoutes.*.beginning_time')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Trip start time cannot be empty.')
    .bail(),
  body('additionalRoutes.*.ending_date')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Trip end date cannot be empty.')
    .bail(),
  body('additionalRoutes.*.ending_time')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Trip end time cannot be empty.')
    .bail(),

  // Additional routes - transportation and accommodation
  body('additionalRoutes.*.plane_needed')
    .optional()
    .isBoolean()
    .toBoolean()
    .exists()
    .withMessage('Please select if plane reservation is required or not.')
    .bail(),
  body('additionalRoutes.*.hotel_needed')
    .optional()
    .isBoolean()
    .toBoolean()
    .exists()
    .withMessage('Please select if hotel reservation is required or not.')
    .bail(),
];

// Validate user creation form data
export const validateCreateUser = [
  // System identifiers
  body('role_id')
    .isInt({ min: 1 })
    .toInt()
    .withMessage('Role ID must be a valid number'),
  body('department_id')
    .isInt({ min: 1 })
    .toInt()
    .withMessage('Department ID must be a valid number'),
    
  // Authentication credentials
  body('user_name')
    .isString()
    .trim()
    .notEmpty()
    .escape()
    .matches(/^\S+$/)
    .withMessage('Username cannot be empty neither contain spaces.'),
  body('password')
    .isString()
    .trim()
    .notEmpty()
    .escape()
    .matches(/^\S+$/)
    .withMessage('Password cannot be empty neither contain spaces.'),
    
  // User identification and contact information
  body('workstation')
    .isString()
    .trim()
    .notEmpty()
    .escape()
    .withMessage('Workstation cannot be empty.'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .escape()
    .withMessage('Email must be a valid email address'),
  body('phone_number')
    .optional()
    .isString()
    .notEmpty()
    .trim()
    .escape()
    .withMessage('Phone number cannot be empty.')
];

// Generic validation error handler
export const validateInputs = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() }); 
  }
  next();
};

export default {
  validateId,
  validateTravelRequest,
  validateExpenseReceipts,
  validateInputs,
  validateDraftTravelRequest,
  validateCreateUser
};