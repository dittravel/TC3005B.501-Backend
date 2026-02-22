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
-- 4. N1: First-level authorizer (initial review)
-- 5. N2: Second-level authorizer (final approval)
-- 6. Administrador: System administrator with full access
INSERT INTO Role (role_name) VALUES
    ('Solicitante'),
    ('Agencia de viajes'),
    ('Cuentas por pagar'),
    ('N1'),
    ('N2'),
    ('Administrador');

-- ============================================================================
-- Alert Messages (notification templates for workflow events)
-- ============================================================================
-- Messages are triggered automatically based on request status changes
INSERT INTO AlertMessage (message_text) VALUES
    ('Se ha abierto una solicitud.'),                              -- Status 1: New request created
    ('Se requiere tu revisión para Primera Revisión.'),            -- Status 2: Needs N1 review
    ('Se requiere tu revisión para Segunda Revisión.'),            -- Status 3: Needs N2 review
    ('La solicitud está lista para generar su cotización de viaje.'),  -- Status 4: Ready for quote
    ('Se deben asignar los servicios del viaje para la solicitud.'),   -- Status 5: Book travel services
    ('Se requiere validar comprobantes de los gastos del viaje.'), -- Status 6: Submit receipts
    ('Los comprobantes están listos para validación.');            -- Status 7: Validate receipts

-- ============================================================================
-- Request Workflow Statuses (defines the approval workflow stages)
-- ============================================================================
-- Workflow: Draft → N1 Review → N2 Review → Quote → Travel Agent → 
--           Receipt Submission → Receipt Validation → Finalized
-- Alternative endings: Cancelled, Rejected
INSERT INTO Request_status (status) VALUES
    ('Borrador'),                          -- 1: Initial draft state
    ('Primera Revisión'),                  -- 2: N1 authorizer review
    ('Segunda Revisión'),                  -- 3: N2 authorizer review
    ('Cotización del Viaje'),              -- 4: Travel agent creates quote
    ('Atención Agencia de Viajes'),        -- 5: Travel agent books services
    ('Comprobación gastos del viaje'),     -- 6: Applicant submits receipts
    ('Validación de comprobantes'),        -- 7: Accounts payable validates receipts
    ('Finalizado'),                        -- 8: Completed successfully
    ('Cancelado'),                         -- 9: Cancelled by user/admin
    ('Rechazado');                         -- 10: Rejected by authorizer

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