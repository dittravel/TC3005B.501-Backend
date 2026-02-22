/**
 * MongoDB Sanitization Middleware
 * 
 * This module provides input sanitization middleware to prevent MongoDB
 * injection attacks. It sanitizes request parameters, query strings, and
 * request bodies to remove potentially malicious MongoDB operators.
 */
import sanitize from 'mongo-sanitize';

// Middleware to sanitize request parameters, query, and body
export const sanitizeMongoInputs = (req, res, next) => {
  // Sanitize request parameters
  if (req.params) {
    req.params = sanitize(req.params);
  }

  // Sanitize request query
  if (req.query) {
    req.query = sanitize(req.query);
  }

  // Sanitize request body
  if (req.body) {
    req.body = sanitize(req.body);
  }

  next();
};
