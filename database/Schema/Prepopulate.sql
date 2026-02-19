-- ============================================================================
-- CocoScheme Database - Initial Reference Data
-- ============================================================================
-- This file populates essential reference tables with predefined values
-- required for the system to function properly.
-- ============================================================================

USE CocoScheme;

-- ============================================================================
-- USER ROLES
-- ============================================================================
-- Defines the six main user types in the travel request workflow:
-- 1. Solicitante (Applicant) - Creates and submits travel requests
-- 2. Agencia de viajes (Travel Agent) - Provides quotes and books services
-- 3. Cuentas por pagar (Accounts Payable) - Validates expense receipts
-- 4. N1 (First Level Authorizer) - First approval level
-- 5. N2 (Second Level Authorizer) - Second approval level
-- 6. Administrador (Administrator) - System administration
INSERT INTO Role (role_name) VALUES
    ('Solicitante'),
    ('Agencia de viajes'),
    ('Cuentas por pagar'),
    ('N1'),
    ('N2'),
    ('Administrador');

-- ============================================================================
-- ALERT MESSAGE TEMPLATES
-- ============================================================================
-- Predefined notification messages triggered by request status changes
-- Message IDs correspond to request status IDs for automatic alert creation
INSERT INTO AlertMessage (message_text) VALUES
    ('Se ha abierto una solicitud.'),  -- Status 1: Draft opened
    ('Se requiere tu revisión para Primera Revisión.'),  -- Status 2: First review
    ('Se requiere tu revisión para Segunda Revisión.'),  -- Status 3: Second review
    ('La solicitud está lista para generar su cotización de viaje.'),  -- Status 4: Quote
    ('Se deben asignar los servicios del viaje para la solicitud.'),  -- Status 5: Service assignment
    ('Se requiere validar comprobantes de los gastos del viaje.'),  -- Status 6: Expense validation
    ('Los comprobantes están listos para validación.');  -- Status 7: Receipt validation

-- ============================================================================
-- REQUEST STATUS WORKFLOW
-- ============================================================================
-- The complete lifecycle of a travel request from creation to completion:
-- 1. Borrador - Initial draft state
-- 2. Primera Revisión - First level authorization review
-- 3. Segunda Revisión - Second level authorization review
-- 4. Cotización del Viaje - Travel agent creates quote
-- 5. Atención Agencia de Viajes - Travel agent assigns services
-- 6. Comprobación gastos del viaje - Applicant submits expense receipts
-- 7. Validación de comprobantes - Accounts payable validates receipts
-- 8. Finalizado - Request completed successfully
-- 9. Cancelado - Request cancelled by applicant
-- 10. Rechazado - Request rejected by authorizer
INSERT INTO Request_status (status) VALUES
    ('Borrador'),
    ('Primera Revisión'),
    ('Segunda Revisión'),
    ('Cotización del Viaje'),
    ('Atención Agencia de Viajes'),
    ('Comprobación gastos del viaje'),
    ('Validación de comprobantes'),
    ('Finalizado'),
    ('Cancelado'),
    ('Rechazado');

-- ============================================================================
-- RECEIPT EXPENSE TYPES
-- ============================================================================
-- Categories for classifying travel expenses:
-- - Hospedaje: Hotel/lodging expenses
-- - Comida: Meal expenses
-- - Transporte: General transportation
-- - Caseta: Toll booth fees
-- - Autobús: Bus tickets
-- - Vuelo: Flight tickets
-- - Otro: Miscellaneous expenses
INSERT INTO Receipt_Type (receipt_type_name) VALUES
    ('Hospedaje'),
    ('Comida'),
    ('Transporte'),
    ('Caseta'),
    ('Autobús'),
    ('Vuelo'),
    ('Otro');