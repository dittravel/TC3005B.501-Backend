# Routes Directory

This directory contains all the route definitions for the API.
Routes define the endpoints that clients can access.
They delegate the business logic to controllers.

## Files

### User & Authentication
- `userRoutes.js`: Routes for general user management, including authentication and profile information.
- `applicantRoutes.js`: Routes for applicant-related operations, such as submitting and managing travel requests.
- `authorizerRoutes.js`: Routes for authorizer operations, including approving or rejecting travel requests.
- `emailActionsRoutes.js`: Handles user actions triggered from email links (approvals, notifications, etc.).

### Travel Request Management
- `requestRoutes.js`: Endpoints for travel request operations.
- `refundRoutes.js`: Routes for managing and retrieving refunds related to travel expenses.
- `travelAgentRoutes.js`: Routes for travel agent functionalities, such as managing travel itineraries and bookings.
- `countryCityRoutes.js`: Endpoints for querying and managing country and city location data for travel requests.

### Financial & Policy Management
- `accountsPayableRoutes.js`: Routes related to accounts payable operations.
- `refundPolicyRoutes.js`: Administrative endpoints for refund policy management and request evaluation.
- `accountabilityRoutes.js`: Routes related to the export of accountability data.

### System Administration
- `adminRoutes.js`: Routes for administrative functions.
- `societyRoutes.js`: Endpoints for managing societies (individual companies).
- `societyGroupRoutes.js`: Endpoints for managing society groups (multitenancy support).
- `systemRoutes.js`: Routes for system-level health and version metadata checks.

### Integration & Data Management
- `fileRoutes.js`: Routes for file upload and download functionalities.
- `integrationRoutes.js`: Endpoints for internal system integrations (e.g., ERP employee synchronization).
- `exchangeRateRoutes.js`: Endpoints for querying exchange rates from Banxico currency catalog.
- `cfdiRoutes.js`: Routes for CFDI (Comprobante Fiscal Digital por Internet) validation against SAT.

### Audit & Monitoring
- `auditLogRoutes.js`: Read-only audit endpoints for retrieving system logs and administrative activities.