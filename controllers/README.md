# Controllers Directory

This directory contains all the controllers for the travel management API. Controllers handle  the business logic of the application. They receive requests from routes and interact with the database models.

## Controller Overview

### userController.js
**General user operations and authentication**
- `getUserData()` - Retrieve user information by ID
- `login()` - User authentication with JWT (Jason Web Token) cookie management
- `logout()` - User session termination
- `getTravelRequestsByDeptStatus()` - Query travel requests by department and status
- `getTravelRequestById()` - Retrieve specific travel request details
- `getUserWallet()` - Access user's financial wallet information

### applicantController.js
**Travel request lifecycle management for employees**
- `getApplicantById()` - Retrieve applicant profile information
- `getApplicantRequests()` - List all travel requests for a specific applicant
- `createTravelRequest()` - Submit new travel request with validation
- `cancelTravelRequest()` - Cancel pending travel requests
- `createExpenseValidationBatch()` - Submit expenses for validation
- `sendReceiptsForValidation()` - Upload and link receipts to expenses

### authorizerController.js
**Department-level authorization workflow**
- `getAlerts()` - Retrieve pending requests requiring authorization by department
- `authorizeTravelRequest()` - Approve travel requests and trigger email notifications
- `declineTravelRequest()` - Reject travel requests with automated notifications

### accountsPayableController.js
**Financial processing and expense validation**
- `attendTravelRequest()` - Process authorized requests, calculate fees, route to travel agency if needed
- `validateReceiptsHandler()` - Batch validation of multiple expense receipts
- `validateReceipt()` - Individual receipt validation with business rule checks
- `getExpenseValidations()` - Retrieve validation status and history for expenses

### travelAgentController.js
**Travel arrangement services**
- `attendTravelRequest()` - Process requests requiring hotel/flight bookings
- Updates request status to travel verification phase after arrangements

### adminController.js
**System administration and user management**
- `getUserList()` - Retrieve formatted list of all system users
- `createMultipleUsers()` - Bulk user creation via CSV file import
- `createUser()` - Individual user account creation

### fileController.js
**Document management and secure file storage**
- `uploadReceiptFilesController()` - Upload PDF and XML receipt files with sanitization
- `getReceiptFileController()` - Retrieve stored receipt files from MongoDB GridFS
- `getReceiptFilesMetadataController()` - Access file metadata and storage information