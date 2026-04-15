/**
 * Validation Middleware
 * 
 * This module provides comprehensive input validation and sanitization
 * middleware for the travel request system. It validates parameters,
 * request bodies, and ensures data integrity using express-validator.
 */

import { body, param, query, validationResult } from 'express-validator';

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
  param('policy_id')
    .optional()
    .isInt()
    .toInt()
    .withMessage('Policy ID must be a valid number'),
  param('department_id')
    .optional()
    .isInt()
    .toInt()
    .withMessage('Department ID must be a valid number'),
  (req, res, next) => {
    if (
      !req.params.id &&
      !req.params.user_id &&
      !req.params.request_id &&
      !req.params.receipt_id &&
      !req.params.policy_id &&
      !req.params.department_id
    ) {
      return res.status(400).json({ error: "At least one ID needs to be provided" });
    }
    next();
  }
];

// Validate department, status ID and pagination parameters
export const validateDeptStatus = [
  param('user_id')
    .isInt()
    .toInt()
    .withMessage('User ID cannot be empty.'),
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
  body('receipts.*.route_id')
    .isInt({ min: 0 })
    .toInt()
    .withMessage('Route ID must be a valid number'),
  body('receipts.*.amount')
    .isFloat({ min: 0 })
    .toFloat()
    .withMessage('Amounts needs to be a valid number'),
  body('receipts.*.currency')
    .isString()
    .trim()
    .isLength({ min: 1, max: 6 })
    .withMessage('Currency must be a valid currency code (e.g., MXN, USD)'),
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

// Validate out-of-office dates and substitute selection
export const validateOutOfOffice = [
  param('user_id')
    .isInt({ min: 1 })
    .toInt()
    .withMessage('User ID must be a valid number'),
  body('out_of_office_start_date')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  body('out_of_office_end_date')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  body('substitute_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .toInt()
    .withMessage('Substitute ID must be a valid number'),
];

// Validate reimbursement policy create/update payloads
export const validateReimbursementPolicyPayload = [
  body('policy_code')
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 40 })
    .withMessage('Policy code is required and must be 40 characters or fewer')
    .bail(),
  body('policy_name')
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 120 })
    .withMessage('Policy name is required and must be 120 characters or fewer')
    .bail(),
  body('description')
    .optional({ nullable: true })
    .isString()
    .trim()
    .withMessage('Description must be a string')
    .bail(),
  body('base_currency')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 6 })
    .withMessage('Base currency must be a valid currency code')
    .bail(),
  body('effective_from')
    .isISO8601()
    .withMessage('effective_from must be a valid date')
    .bail(),
  body('effective_to')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('effective_to must be a valid date')
    .bail()
    .custom((value, { req }) => {
      if (!value || !req.body.effective_from) {
        return true;
      }

      return value >= req.body.effective_from;
    })
    .withMessage('effective_to cannot be earlier than effective_from'),
  body('active')
    .optional()
    .isBoolean()
    .toBoolean()
    .withMessage('active must be a boolean value'),
  body('assignments')
    .isArray({ min: 1 })
    .bail()
    .withMessage('At least one policy assignment is required'),
  body('assignments')
    .custom((assignments) => {
      const seen = new Set();

      for (const assignment of assignments) {
        const key =
          assignment.department_id === null || assignment.department_id === undefined
            ? 'GLOBAL'
            : `DEPT:${assignment.department_id}`;

        if (seen.has(key)) {
          throw new Error(`Duplicate assignment detected for ${key}`);
        }

        seen.add(key);
      }

      return true;
    }),
  body('assignments.*.department_id')
    .optional({ nullable: true })
    .custom((value) => value === null || (Number.isInteger(Number(value)) && Number(value) > 0))
    .withMessage('Assignment department_id must be null or a valid positive integer'),
  body('assignments.*.active')
    .optional()
    .isBoolean()
    .toBoolean()
    .withMessage('Assignment active must be a boolean value'),
  body('rules')
    .isArray({ min: 1 })
    .bail()
    .withMessage('At least one reimbursement policy rule is required'),
  body('rules')
    .custom((rules) => {
      const seen = new Set();

      for (const rule of rules) {
        const key = `${rule.receipt_type_id}:${String(rule.trip_scope || '').toUpperCase()}`;
        if (seen.has(key)) {
          throw new Error(`Duplicate rule detected for ${key}`);
        }

        seen.add(key);
      }

      return true;
    }),
  body('rules.*.receipt_type_id')
    .isInt({ min: 1 })
    .toInt()
    .withMessage('Rule receipt_type_id must be a valid positive integer'),
  body('rules.*.trip_scope')
    .isIn(['NACIONAL', 'INTERNACIONAL', 'TODOS'])
    .withMessage('Rule trip_scope must be NACIONAL, INTERNACIONAL, or TODOS'),
  body('rules.*.max_amount_mxn')
    .isFloat({ min: 0 })
    .toFloat()
    .withMessage('Rule max_amount_mxn must be a valid non-negative amount'),
  body('rules.*.submission_deadline_days')
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .toInt()
    .withMessage('Rule submission_deadline_days must be a non-negative integer'),
  body('rules.*.requires_xml')
    .isBoolean()
    .toBoolean()
    .withMessage('Rule requires_xml must be a boolean value'),
  body('rules.*.allow_foreign_without_xml')
    .isBoolean()
    .toBoolean()
    .withMessage('Rule allow_foreign_without_xml must be a boolean value'),
  body('rules.*.refundable')
    .isBoolean()
    .toBoolean()
    .withMessage('Rule refundable must be a boolean value'),
  body('rules.*.active')
    .optional()
    .isBoolean()
    .toBoolean()
    .withMessage('Rule active must be a boolean value'),
];

// Validate ERP employee integration query parameters
export const validateERPEmployeeQuery = [
  query('updated_since')
    .optional()
    .isISO8601()
    .withMessage('updated_since must be a valid ISO 8601 date'),
  query('department_id')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('department_id must be a valid positive integer'),
  query('active_only')
    .optional()
    .isBoolean()
    .toBoolean()
    .withMessage('active_only must be a boolean value'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .toInt()
    .withMessage('limit must be an integer between 1 and 200'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .toInt()
    .withMessage('offset must be a non-negative integer'),
];

// Validate audit log query parameters
export const validateAuditLogQuery = [
  query('actor_user_id')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('actor_user_id must be a valid positive integer'),
  query('action_type')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 80 })
    .withMessage('action_type must be a non-empty string up to 80 characters'),
  query('entity_type')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 80 })
    .withMessage('entity_type must be a non-empty string up to 80 characters'),
  query('entity_id')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 64 })
    .withMessage('entity_id must be a non-empty string up to 64 characters'),
  query('include_metadata')
    .optional()
    .isBoolean()
    .toBoolean()
    .withMessage('include_metadata must be a boolean value'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .toInt()
    .withMessage('limit must be an integer between 1 and 200'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .toInt()
    .withMessage('offset must be a non-negative integer'),
];

/**
 * Validate Duffel flight search request payload
 * Ensures required fields are present, properly formatted, and logically consistent.
 * Validates IATA codes, date formats, and trip type constraints.
 */
export const validateFlightSearch = [
  body('tripType')
    .isIn(['one_way', 'round'])
    .withMessage('tripType must be "one_way" or "round"'),
  body('returnDate')
    .optional({ nullable: true })
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('returnDate must be in YYYY-MM-DD format'),
  body('origin')
    .isString()
    .trim()
    .isLength({ min: 3, max: 3 })
    .matches(/^[A-Za-z]{3}$/)
    .withMessage('origin must be a 3-letter IATA code (e.g., MEX, JFK)'),
  body('destination')
    .isString()
    .trim()
    .isLength({ min: 3, max: 3 })
    .matches(/^[A-Za-z]{3}$/)
    .withMessage('destination must be a 3-letter IATA code (e.g., CUN, ATL)'),
  body('departureDate')
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage('departureDate must be in YYYY-MM-DD format'),
  body('cabinClass')
    .optional()
    .isIn(['economy', 'premium_economy', 'business', 'first'])
    .withMessage('cabinClass must be economy, premium_economy, business, or first'),
  body('page')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('page must be an integer greater than 0'),
  body('pageSize')
    .optional()
    .isInt({ min: 1, max: 50 })
    .toInt()
    .withMessage('pageSize must be an integer between 1 and 50'),
  // Custom validation: ensure round trips have return date and one-way trips do not
  body().custom((value) => {
    if (!value || !value.tripType) {
      return true;
    }

    if (value.tripType === 'round' && !value.returnDate) {
      throw new Error('returnDate is required when tripType is "round"');
    }

    if (value.tripType === 'one_way' && value.returnDate !== undefined && value.returnDate !== null && value.returnDate !== '') {
      throw new Error('returnDate must not be sent when tripType is "one_way"');
    }

    return true;
  })
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
  validateCreateUser,
  validateOutOfOffice,
  validateReimbursementPolicyPayload,
  validateERPEmployeeQuery,
  validateAuditLogQuery,
  validateFlightSearch
};

