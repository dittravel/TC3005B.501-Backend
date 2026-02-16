# Middleware

This directory contains middleware functions for the travel request system. Middleware functions have access to the request and response objects, and can execute code, modify request and response objects, end the request-response cycle, or call the next middleware function in the stack.

## Middleware Overview

### auth.js
**Authentication and authorization middleware**
- `authenticateToken()` - Validates JWT tokens and verifies user identity with IP checking
- `authorizeRole()` - Ensures users have appropriate role permissions for accessing resources

### validation.js
**Input validation and sanitization middleware**
- `validateId()` - Validate and sanitize ID parameters in endpoints
- `validateDeptStatus()` - Validate department, status ID and pagination parameters  
- `validateTravelRequest()` - Validate travel request form fields and data
- `validateExpenseReceipts()` - Validate expense receipt submissions and amounts
- `validateDraftTravelRequest()` - Validate draft travel request parameters
- `validateCreateUser()` - Validate user creation form data
- `validateInputs()` - Generic input validation error handler

### rateLimiters.js
**Rate limiting middleware for API protection**
- `generalRateLimiter` - General API endpoint protection (100 requests per 15 minutes)
- `loginRateLimiter` - Enhanced protection for authentication endpoints (5 attempts per minute)

### decryption.js
**Data decryption utilities**
- `decrypt()` - Decrypts AES-256-CBC encrypted data with proper error handling

### mongoSanitize.js
**MongoDB input sanitization middleware**
- `sanitizeMongoInputs()` - Sanitizes all incoming request data to prevent MongoDB injection attacks
