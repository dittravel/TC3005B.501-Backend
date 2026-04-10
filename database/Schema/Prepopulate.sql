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

-- ============================================================================
-- Permissions Catalogue
-- ============================================================================

INSERT INTO Permission (permission_key, permission_name, module, action, description) VALUES

-- Users
('users:view',          'Ver usuario',                 'users', 'view',           'View user profiles and list'),
('users:create',        'Crear usuario',               'users', 'create',         'Create new user accounts'),
('users:edit',          'Editar usuario',              'users', 'edit',           'Modify existing user data'),
('users:delete',        'Eliminar usuario',            'users', 'delete',         'Deactivate or remove users'),

-- Travel requests
('travel:view',         'Ver solicitud',               'travel_requests', 'view',           'View travel requests'),
('travel:create',       'Crear solicitud',             'travel_requests', 'create',         'Submit new travel requests'),
('travel:edit',         'Editar solicitud',            'travel_requests', 'edit',           'Modify pending travel requests'),
('travel:delete',       'Eliminar solicitud',          'travel_requests', 'delete',         'Remove travel requests'),
('travel:approve',      'Aprobar/Rechazar solicitud',  'travel_requests', 'approve_reject', 'Approve or reject travel requests'),
('travel:def_amount',   'Definir monto a autorizar',   'travel_requests', 'define_amount',  'Set the authorized monetary amount'),
('travel:view_flights', 'Ver opciones de vuelos',      'travel_requests', 'view_flights',   'View available flight options'),
('travel:view_hotels',  'Ver opciones de hoteles',     'travel_requests', 'view_hotels',    'View available hotel options'),
('travel:finalize',     'Finalizar viaje',             'travel_requests', 'finalize',       'Mark a trip as completed'),
('travel:cancel',       'Cancelar viaje',              'travel_requests', 'cancel',         'Cancel an approved trip'),
('travel:reject',       'Rechazar viaje',              'travel_requests', 'reject',         'Reject a travel request'),

-- Receipts
('receipts:view',       'Ver comprobantes',             'receipts', 'view',           'View expense receipts'),
('receipts:create',     'Crear comprobantes',           'receipts', 'create',         'Upload new receipts'),
('receipts:edit',       'Editar comprobantes',          'receipts', 'edit',           'Modify submitted receipts'),
('receipts:delete',     'Eliminar comprobantes',        'receipts', 'delete',         'Remove receipts'),
('receipts:approve',    'Aprobar/Rechazar comprobantes','receipts', 'approve_reject', 'Approve or reject expense receipts'),

-- Refunds
('refunds:request',     'Solicitar reembolso',          'refunds', 'request',        'Submit a refund request'),
('refunds:budget',      'Asignar presupuesto impuesto', 'refunds', 'assign_budget',  'Assign tax budget to a refund'),
('refunds:approve',     'Aprobar/Rechazar reembolso',   'refunds', 'approve_reject', 'Approve or reject refund requests'),
('refunds:override',    'Hacer override a reglas',      'refunds', 'override_rules', 'Bypass business rules for refunds');

-- ============================================================================
-- Default Role Permissions
-- ============================================================================

-- Admin: all permissions
INSERT INTO Role_Permission (role_id, permission_id)
    SELECT r.role_id, p.permission_id
    FROM Role r CROSS JOIN Permission p
    WHERE r.role_name = 'Administrador';

-- Solicitante: submit and track own trips
INSERT INTO Role_Permission (role_id, permission_id)
    SELECT r.role_id, p.permission_id
    FROM Role r JOIN Permission p ON p.permission_key IN (
        'travel:view', 'travel:create', 'travel:edit',
        'travel:view_flights', 'travel:view_hotels',
        'receipts:view', 'receipts:create', 'receipts:edit',
        'refunds:request'
    ) WHERE r.role_name = 'Solicitante';

-- Autorizador: approvals and oversight
INSERT INTO Role_Permission (role_id, permission_id)
    SELECT r.role_id, p.permission_id
    FROM Role r JOIN Permission p ON p.permission_key IN (
        'travel:view', 'travel:approve', 'travel:def_amount',
        'travel:finalize', 'travel:cancel', 'travel:reject',
        'receipts:view', 'receipts:approve',
        'refunds:approve', 'refunds:override',
        'users:view'
    ) WHERE r.role_name = 'Autorizador';

-- Cuentas por pagar: financial management
INSERT INTO Role_Permission (role_id, permission_id)
    SELECT r.role_id, p.permission_id
    FROM `Role` r JOIN Permission p ON p.permission_key IN (
        'receipts:view', 'receipts:create', 'receipts:edit',
        'receipts:delete', 'receipts:approve',
        'refunds:request', 'refunds:budget', 'refunds:approve'
    ) WHERE r.role_name = 'Cuentas por pagar';

-- Agencia de viajes: travel logistics
INSERT INTO Role_Permission (role_id, permission_id)
    SELECT r.role_id, p.permission_id
    FROM `Role` r JOIN Permission p ON p.permission_key IN (
        'travel:view', 'travel:edit',
        'travel:view_flights', 'travel:view_hotels',
        'travel:finalize', 'travel:cancel'
    ) WHERE r.role_name = 'Agencia de viajes';

-- ============================================================================
-- Authorization Rules
-- ============================================================================

INSERT INTO AuthorizationRule (rule_name, is_default, num_levels, automatic, travel_type, min_duration, max_duration, min_amount, max_amount) VALUES
    ('Regla predeterminada', TRUE, 3, FALSE, 'Todos', NULL, NULL, NULL, NULL);

INSERT INTO AuthorizationRuleLevel (rule_id, level_number, level_type, superior_level_number) VALUES
    (1, 1, 'Jefe', NULL),
    (1, 2, 'Aleatorio', NULL),
    (1, 3, 'Nivel Superior', 1);

-- ============================================================================
-- Currency Catalog (all currencies supported by Banxico's SIE API)
-- ============================================================================
-- The 4 daily series (USD, EUR, CAD, JPY) use official daily FIX series IDs.
-- This is essential data for the reimbursement system.

INSERT IGNORE INTO Currency (currency_code, currency_name, country, banxico_series_id, frequency) VALUES

-- Moneda base (no requiere serie de Banxico)
    ('MXN', 'Peso Mexicano', 'México', NULL, 'daily'),

-- Series diarias (Banxico publica estas cada día hábil)
    ('USD', 'Dólar Estadounidense', 'Estados Unidos', 'SF43718', 'daily'),
    ('EUR', 'Euro', 'Unión Monetaria Europea', 'SF46410', 'daily'),
    ('CAD', 'Dólar Canadiense', 'Canadá', 'SF60632', 'daily'),
    ('JPY', 'Yen Japonés', 'Japón', 'SF46406', 'daily'),

-- América del Norte
    ('PHP', 'Peso Filipino', 'Filipinas', 'SF57811', 'monthly'),

-- América Central
    ('GTQ', 'Quetzal Guatemalteco', 'Guatemala', 'SF57817', 'monthly'),
    ('HTG', 'Gourde Haitiano', 'Haití', 'SF57823', 'monthly'),
    ('NIC', 'Córdoba Nicaragüense', 'Nicaragua', 'SF57859', 'monthly'),
    ('PAB', 'Balboa Panameño', 'Panamá', 'SF57871', 'monthly'),
    ('BZD', 'Dólar de Belice', 'Belice', 'SF57761', 'monthly'),
    ('SVC', 'Colón Salvadoreño', 'El Salvador', 'SF57793', 'monthly'),
    ('CRC', 'Colón Costarricense', 'Costa Rica', 'SF57781', 'monthly'),

-- América del Sur
    ('ARS', 'Peso Argentino', 'Argentina', 'SF57731', 'monthly'),
    ('BOB', 'Boliviano', 'Bolivia', 'SF57763', 'monthly'),
    ('BRL', 'Real Brasileño', 'Brasil', 'SF57765', 'monthly'),
    ('CLP', 'Peso Chileno', 'Chile', 'SF57751', 'monthly'),
    ('COP', 'Peso Colombiano', 'Colombia', 'SF57775', 'monthly'),
    ('PEN', 'Sol Peruano', 'Perú', 'SF57875', 'monthly'),
    ('PYG', 'Guaraní Paraguayo', 'Paraguay', 'SF57873', 'monthly'),
    ('UYP', 'Peso Uruguayo', 'Uruguay', 'SF57921', 'monthly'),
    ('VES', 'Bolívar Digital Venezolano', 'Venezuela', 'SF57925', 'monthly'),

-- Caribe
    ('BSD', 'Dólar Bahameño', 'Bahamas', 'SF57755', 'monthly'),
    ('BBD', 'Dólar de Barbados', 'Barbados', 'SF57759', 'monthly'),
    ('CUP', 'Peso Cubano', 'Cuba', 'SF57785', 'monthly'),
    ('JMD', 'Dólar Jamaicano', 'Jamaica', 'SF57837', 'monthly'),
    ('TTD', 'Dólar de Trinidad y Tobago', 'Trinidad y Tobago', 'SF57915', 'monthly'),
    ('GYD', 'Dólar Guyanés', 'Guyana', 'SF57819', 'monthly'),

-- Europa
    ('GBP', 'Libra Esterlina', 'Gran Bretaña', 'SF57815', 'monthly'),
    ('CHF', 'Franco Suizo', 'Suiza', 'SF57905', 'monthly'),
    ('DKK', 'Corona Danesa', 'Dinamarca', 'SF57789', 'monthly'),
    ('NOK', 'Corona Noruega', 'Noruega', 'SF57863', 'monthly'),
    ('SEK', 'Corona Sueca', 'Suecia', 'SF57903', 'monthly'),
    ('HUF', 'Forinto Húngaro', 'Hungría', 'SF57827', 'monthly'),
    ('CZK', 'Corona Checa', 'República Checa', 'SF57881', 'monthly'),
    ('PLN', 'Esloti Polaco', 'Polonia', 'SF57877', 'monthly'),
    ('RON', 'Leu Rumano', 'Rumanía', 'SF57893', 'monthly'),
    ('TRY', 'Lira Turca', 'Turquía', 'SF57917', 'monthly'),
    ('RUB', 'Rublo Ruso', 'Federación Rusa', 'SF57807', 'monthly'),
    ('UAH', 'Grivna Ucraniana', 'Ucrania', 'SF57919', 'monthly'),
    ('XDR', 'Derechos Especiales de Giro', 'FMI', 'SF57787', 'monthly'),

-- Asia Oriental
    ('CNY', 'Yuan Chino Continental', 'China', 'SF57773', 'monthly'),
    ('CNH', 'Yuan Chino Offshore', 'China', 'SF229267', 'monthly'),
    ('KRW', 'Won Surcoreano', 'Corea del Sur', 'SF57783', 'monthly'),
    ('TWD', 'Nuevo Dólar Taiwanés', 'Taiwán', 'SF57911', 'monthly'),

-- Asia del Sur y Sureste
    ('IDR', 'Rupia Indonesia', 'Indonesia', 'SF57831', 'monthly'),
    ('INR', 'Rupia India', 'India', 'SF57829', 'monthly'),
    ('MYR', 'Ringgit Malayo', 'Malasia', 'SF57847', 'monthly'),
    ('SGD', 'Dólar de Singapur', 'Singapur', 'SF57897', 'monthly'),
    ('THB', 'Baht Tailandés', 'Tailandia', 'SF57909', 'monthly'),
    ('VND', 'Dong Vietnamita', 'Vietnam', 'SF57927', 'monthly'),

-- Medio Oriente
    ('KWD', 'Dinar Kuwaití', 'Kuwait', 'SF57845', 'monthly'),
    ('SAR', 'Riyal Saudí', 'Arabia Saudita', 'SF57747', 'monthly'),
    ('AED', 'Dírham Emiratí', 'Emiratos Árabes Unidos', 'SF57795', 'monthly'),
    ('ILS', 'Séquel Israelí', 'Israel', 'SF57835', 'monthly'),
    ('IQD', 'Dinar Iraquí', 'Irak', 'SF57833', 'monthly'),

-- África
    ('MAD', 'Dírham Marroquí', 'Marruecos', 'SF57855', 'monthly'),
    ('EGP', 'Libra Egipcia', 'Egipto', 'SF57791', 'monthly'),
    ('DZD', 'Dinar Argelino', 'Argelia', 'SF57749', 'monthly'),
    ('KES', 'Chelín Keniano', 'Kenia', 'SF57841', 'monthly'),
    ('NGN', 'Naira Nigeriana', 'Nigeria', 'SF57861', 'monthly'),
    ('ZAR', 'Rand Sudafricano', 'Sudáfrica', 'SF57883', 'monthly'),

-- Oceanía
    ('AUD', 'Dólar Australiano', 'Australia', 'SF57753', 'monthly'),
    ('NZD', 'Dólar Neozelandés', 'Nueva Zelanda', 'SF57867', 'monthly'),
    ('FJD', 'Dólar Fiyiano', 'Fiyi', 'SF57809', 'monthly'); 
