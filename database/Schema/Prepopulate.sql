USE CocoScheme;

INSERT INTO Role (role_name) VALUES
    ('Solicitante'),
    ('Agencia de viajes'),
    ('Cuentas por pagar'),
    ('N1'),
    ('N2'),
    ('Administrador');

INSERT INTO AlertMessage (message_text) VALUES
    ('Se ha abierto una solicitud.'),
    ('Se requiere tu revisión para Primera Revisión.'),
    ('Se requiere tu revisión para Segunda Revisión.'),
    ('La solicitud está lista para generar su cotización de viaje.'),
    ('Se deben asignar los servicios del viaje para la solicitud.'),
    ('Se requiere validar comprobantes de los gastos del viaje.'),
    ('Los comprobantes están listos para validación.');

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

INSERT INTO Receipt_Type (receipt_type_name) VALUES
    ('Hospedaje'),
    ('Comida'),
    ('Transporte'),
    ('Caseta'),
    ('Autobús'),
    ('Vuelo'),
    ('Otro');

-- Dummy data para DEV
INSERT INTO Department (department_name, costs_center, active) VALUES
  ('Finanzas', 'CC001', TRUE),
  ('Recursos Humanos', 'CC002', TRUE),
  ('IT', 'CC003', TRUE),
  ('Marketing', 'CC004', TRUE),
  ('Operaciones', 'CC005', FALSE),
  ('Admin', 'ADMIN', TRUE);

-- Insert Users de CSV
INSERT INTO `User` (role_id, department_id, user_name, password, workstation, email, phone_number) VALUES
  (1, 1, 'andres.gomez', 'andres123', 'WS101', 'andres.gomez@empresa.com', '555-1001'),
  (2, 1, 'paula.martinez', 'paula456', 'WS102', 'paula.martinez@empresa.com', '555-1002'),
  (3, 1, 'carlos.ramos', 'carlos789', 'WS103', 'carlos.ramos@empresa.com', '555-1003'),
  (4, 1, 'laura.flores', 'laura321', 'WS104', 'laura.flores@empresa.com', '555-1004'),
  (5, 1, 'diego.hernandez', 'diego654', 'WS105', 'diego.hernandez@empresa.com', '555-1005'),
  (1, 2, 'adminX_special', 'sup3rS3cret!', 'HACK001', 'adminx@empresaxd.com', '000-0000'),
  (2, 2, 'xx_m4nu_xx', 'qwerty123', 'WS???', 'manuel@empresa.com', '1234567890'),
  (3, 2, 'el_ch4p0', 'p4sSw0rd', 'SOFIA-PC', 'chapo@correo.com', NULL),
  (4, 2, 'sofia_r', 'm1cor4zon', 'SOFIA-PC', 'sofia_random@mail.com', '555-ABCD'),
  (5, 2, 'miguel.de.cervantes', 'donquixote2023', 'DON-QUI', 'miguel@delamancha.com', '555-0000'),
  (1, 3, 'jose.perez', 'jose123', 'WS106', 'jose.perez@empresa.com', '555-1006'),
  (2, 3, 'lucia.garcia', 'lucia456', 'WS107', 'lucia.garcia@empresa.com', '555-1007'),
  (3, 3, 'pedro.sanchez', 'pedro789', 'WS108', 'pedro.sanchez@empresa.com', '555-1008'),
  (4, 3, 'marta.lopez', 'marta321', 'WS109', 'marta.lopez@empresa.com', '555-1009'),
  (5, 3, 'rafael.morales', 'rafael654', 'WS110', 'rafael.morales@empresa.com', '555-1010'),
  (1, 4, 'clara.silva', 'claraS3cret!', 'WS111', 'clara.silva@empresa.com', '555-1011'),
  (2, 4, 'luis.palomino', 'luisqwerty123', 'WS112', 'luis.palomino@empresa.com', '1234567891'),
  (3, 4, 'sandra.martinez', 'sandraP4ssw0rd', 'SOFIA-PC2', 'sandra.martinez@empresa.com', '555-1012'),
  (4, 4, 'juan.gonzalez', 'juan_m1cor4zon', 'SOFIA-PC3', 'juan.gonzalez@empresa.com', '555-1013'),
  (5, 4, 'laura.cortes', 'lauraDonquixote2023', 'DON-QUI2', 'laura.cortes@empresa.com', '555-1014'),
  (6, 6, 'admin', 'admin123', 'ADMIN-WS', 'ksjdjsk@sjkdjsk', '555');

INSERT INTO Request (user_id, request_status_id, notes, requested_fee, imposed_fee, request_days, active) VALUES
  (1, 1, 'Solicito viáticos para viaje a conferencia en Barcelona.', 1500.00, NULL, 3.0, TRUE),
  (1, 2, 'Reembolso por gastos médicos durante viaje.', 800.00, NULL, 1.0, TRUE),
  (1, 3, 'Solicitud de apoyo económico para capacitación online.', 500.00, NULL, 0.0, TRUE),
  (1, 4, 'Viáticos para taller de liderazgo en Madrid.', 1200.00, NULL, 2.0, TRUE),
  (1, 5, 'Reembolso de transporte.', 300.00, 250.00, 0.5, TRUE),
  (1, 6, 'Apoyo para participación en congreso internacional.', 2000.00, 1800.00, 4.0, TRUE),
  (1, 7, 'Gastos operativos extraordinarios.', 650.00, 600.00, 0.0, TRUE),
  (1, 8, 'Viaje urgente por representación institucional.', 1750.00, 1500.00, 3.5, TRUE),
  (1, 9, 'Solicito anticipo para misión técnica en el extranjero.', 2200.00, 2000.00, 5.0, TRUE),
  (1, 10, 'Solicitud de viáticos por gira de supervisión.', 1300.00, 1200.00, 2.5, TRUE),
  (4, 1, 'Quiero ir a brr brr patapin por favor', 90.00, NULL, 9.0, TRUE),
  (4, 2, 'Yo como cuando', 9999999.00, 10000.0, NULL, TRUE),
  (4, 3, 'Solicito algo para que me den algo porque quiero algo y por eso solicito las cosas, porque el que quiere puede', 10.00, NULL, 3, TRUE),
  (4, 4, 'Momento gastar cuando gastas mucho', 999999999999999999999999999999999999.9999999999999999999, NULL, 33, TRUE),
  (4, 5, 'Cambio de registro para cambiar lo registrado porque se requere cambiar por el nuevo cambio', 80, 0.001, 0.5, TRUE),
  (4, 6, 'anotando anotando anotando anotando anotando anotando anotando', 333333333, 11111111, 80, TRUE),
  (4, 7, 'Llendo al evento de fantasias épicas mayo 2030', 878723, 9823982, 932, TRUE),
  (4, 8, '¿Por qué te vas? Me olvidarás Me olvidarás', 99.99, 88, 3.5, TRUE),
  (4, 9, 'que lento el trafico, ¿por qué no pasa el camion :(?', 100, 100, 100, TRUE),
  (4, 10, 'con el te duele el corazon, conmigo te duelen los pies', 9823, 893, 10, TRUE),
  (5, 1, 'a caminar en el solazo a 40 grados', 3, NULL, 0.8, TRUE),
  (5, 2, '', 32, NULL, 10, TRUE),
  (5, 3, 'imagina hacerte 2 horas en viaje al trabajo, no podria ser yo', 34, NULL, 9, TRUE),
  (5, 4, 'Motivo de solicitud número 43', 93, NULL, 3, TRUE),
  (5, 5, 'Razones: No tengo ninguna razón para estarlo', 3, 93, 01, TRUE),
  (5, 6, 'Evento Vínculo 2025', 2025, 5, 1, TRUE),
  (5, 7, 'Primera línea de notas.\nSegunda línea de notas.', 3, 4, 9, TRUE),
  (5, 8, 'Mensaje: Mensaje', 92, 38, 10, TRUE),
  (5, 9, 'Solicitando para el evento', 9239, 9823, 2, TRUE),
  (5, 10, 'Llenando espacio', 38, 93, 2, TRUE),
  (6, 1, 'Solicitud de ejemplo 1', 100.00, NULL, 5, TRUE),
  (6, 2, 'Solicitud de ejemplo 2', 150.00, NULL, 7, TRUE),
  (6, 3, 'Solicitud de ejemplo 3', 200.00, NULL, 10, TRUE),
  (6, 4, 'Solicitud de ejemplo 4', 50.00, NULL, 3, TRUE),
  (6, 5, 'Solicitud de ejemplo 5', 300.00, 280.00, 15, TRUE),
  (6, 6, 'Solicitud de ejemplo 6', 120.00, 110.00, 6, TRUE),
  (6, 7, 'Solicitud de ejemplo 7', 180.00, 160.00, 8, TRUE),
  (6, 8, 'Solicitud de ejemplo 8', 250.00, 230.00, 12, TRUE),
  (6, 9, 'Solicitud de ejemplo 9', 75.00, 70.00, 4, TRUE),
  (6, 10, 'Solicitud de ejemplo 10', 400.00, 380.00, 20, TRUE),
  (9, 1, 'Hola muy buenas', 423.55, NULL, 12.0, TRUE),
  (9, 2, 'Me voy de aca', 312.40, NULL, 25.0, TRUE),
  (9, 3, 'Ayuda', 267.10, NULL, 9.0, TRUE),
  (9, 4, 'soy', 115.00, NULL, 3.0, TRUE),
  (9, 5, 'mauri', 496.80, 39.99, 15.0, TRUE),
  (9, 6, 'me', 130.75, 25.00, 20.0, TRUE),
  (9, 7, 'estoy', 221.00, 18.30, 7.0, TRUE),
  (9, 8, 'volviendo', 300.00, 95.00, 30.0, TRUE),
  (9, 9, 'locooooooo', 401.25, 10.10, 22.0, TRUE),
  (9, 10, 'hola', 159.99, 0.00, 1.0, TRUE),
  (9, 1, 'E', 450.50, NULL, 18.0, TRUE),
  (10, 1, 'A', 110.20, NULL, 4.0, TRUE),
  (10, 1, 'S', 340.00, NULL, 27.0, TRUE),
  (10, 1, 'T', 205.90, NULL, 13.0, TRUE),
  (10, 1, 'E', 500.00, NULL, 29.0, TRUE),
  (10, 1, 'R', 87.60, NULL, 2.0, TRUE),
  (10, 1, '_', 375.00, NULL, 26.0, TRUE),
  (10, 1, 'E', 285.40, NULL, 8.0, TRUE),
  (10, 1, 'G', 330.00, NULL, 16.0, TRUE),
  (10, 1, 'G', 165.75, NULL, 6.0, TRUE),
  (10, 1, '_', 91.00, NULL, 5.0, TRUE);

INSERT INTO Country (country_name) VALUES
  ('México'), ('Estados Unidos'), ('Canadá'), ('Brásil'), ('Argentina'),
  ('Chile'), ('Colombia'), ('España'), ('Francia'), ('Reino Unido'),
  ('Alemania'), ('Italia'), ('Japón'), ('China'), ('India');

INSERT INTO City (city_name) VALUES
  ('CDMX'), ('Guadalajara'), ('Monterrey'), ('Cancún'), ('Mérida'),
  ('Nueva York'), ('Los Ángeles'), ('San Francisco'), ('Chicago'), ('Las Vegas'),
  ('Toronto'), ('Vancouver'), ('Rio de Janeiro'), ('Sao Paulo'), ('Buenos Aires'),
  ('Cordoba'), ('Santiago'), ('Valparaíso'), ('Bogotá'), ('Barranquilla'),
  ('Madrid'), ('Barcelona'), ('Paris'), ('Lyon'), ('Londres'),
  ('Manchester'), ('Berlín'), ('Munich'), ('Roma'), ('Venecia'),
  ('Tokyo'), ('Kyoto'), ('Pekín'), ('Hong Kong'), ('Bombay'), ('Nueva Delhi');
