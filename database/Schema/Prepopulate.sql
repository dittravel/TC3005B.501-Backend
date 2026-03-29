-- ============================================================================
-- CocoScheme Initial Data Population
-- ============================================================================
-- Populates essential lookup tables with initial values required for
-- the travel request workflow system to function properly
-- ============================================================================

USE CocoScheme;

-- ============================================================================
-- User Roles (defines access levels and permissions)
-- ============================================================================
-- 1. Solicitante: Creates and submits travel requests
-- 2. Agencia de viajes: Handles travel bookings and quotes
-- 3. Cuentas por pagar: Validates receipts and processes reimbursements
-- 4. Autorizador: Approves or rejects requests at different review levels
-- 6. Administrador: System administrator with full access
INSERT INTO Role (role_name) VALUES
    ('Solicitante'),
    ('Agencia de viajes'),
    ('Cuentas por pagar'),
    ('Autorizador'),
    ('Administrador');

-- ============================================================================
-- Alert Messages (notification templates for workflow events)
-- ============================================================================
-- Messages are triggered automatically based on request status changes
INSERT INTO AlertMessage (message_text) VALUES
    ('Se ha abierto una solicitud.'),                                   -- Status 1: New request created
    ('Se requiere tu revisión.'),                                       -- Status 2: Needs review
    ('La solicitud está lista para generar su cotización de viaje.'),   -- Status 3: Ready for quote
    ('Se deben asignar los servicios del viaje para la solicitud.'),    -- Status 4: Book travel services
    ('Se requiere validar comprobantes de los gastos del viaje.'),      -- Status 5: Submit receipts
    ('Los comprobantes están listos para validación.'),                 -- Status 6: Validate receipts
    ('La solicitud ha sido finalizada exitosamente.'),                  -- Status 7: Request completed
    ('La solicitud ha sido cancelada.'),                                -- Status 8: Request cancelled
    ('La solicitud ha sido rechazada.');                                -- Status 9: Request rejected

-- ============================================================================
-- Request Workflow Statuses (defines the approval workflow stages)
-- ============================================================================
-- Workflow: Draft → Authorizer Review → Quote → Travel Agent → Receipt Submission → Receipt Validation → Finalized
-- Alternative endings: Cancelled, Rejected
INSERT INTO Request_status (status) VALUES
    ('Borrador'),                          -- 1: Initial draft state
    ('Revisión'),                          -- 2: Review stage
    ('Cotización del Viaje'),              -- 3: Travel agent creates quote
    ('Atención Agencia de Viajes'),        -- 4: Travel agent books services
    ('Comprobación gastos del viaje'),     -- 5: Applicant submits receipts
    ('Validación de comprobantes'),        -- 6: Accounts payable validates receipts
    ('Finalizado'),                        -- 7: Completed successfully
    ('Cancelado'),                         -- 8: Cancelled by user/admin
    ('Rechazado');                         -- 9: Rejected by authorizer

-- ============================================================================
-- Receipt Types (expense categories for travel reimbursements)
-- ============================================================================
INSERT INTO Receipt_Type (receipt_type_name) VALUES
    ('Hospedaje'),      -- Hotel/accommodation expenses
    ('Comida'),         -- Meal expenses
    ('Transporte'),     -- General transportation
    ('Caseta'),         -- Toll fees
    ('Autobús'),        -- Bus tickets
    ('Vuelo'),          -- Flight tickets
    ('Otro');           -- Miscellaneous expenses