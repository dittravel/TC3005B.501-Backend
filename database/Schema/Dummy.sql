-- ============================================================================
-- CocoScheme Test Data (Dummy Data)
-- ============================================================================
-- Populates database with sample data for development and testing purposes
-- WARNING: This file contains test data only - do not use in production!
-- ============================================================================

USE CocoScheme;

-- ============================================================================
-- Cost Center Test Data
-- ============================================================================
INSERT INTO CostCenter (cost_center_name) VALUES
  ('CC-001'),
  ('CC-002'),
  ('CC-003'),
  ('CC-004'),
  ('CC-005'),
  ('CC-006');

-- ============================================================================
-- Department Test Data
-- ============================================================================
INSERT INTO Department (department_name, cost_center_id, active) VALUES
  ('Finanzas', 1, TRUE),
  ('Recursos Humanos', 2, TRUE),
  ('Tecnología', 3, TRUE),
  ('Marketing', 4, TRUE),
  ('Operaciones', 5, FALSE),  -- Inactive for testing
  ('Admin', 6, TRUE);

-- ============================================================================
-- Travel Request Test Data
-- ============================================================================
-- Sample travel requests in various workflow statuses
-- Covers all status IDs (1-10) for testing each workflow stage
-- Note: user_id references must exist in User table (populated by init_db.js)

-- User requests (one per status for comprehensive testing)
INSERT INTO Request (user_id, request_status_id, assigned_to, authorization_level, notes, requested_fee, imposed_fee, request_days, active) VALUES
  (3, 1, NULL, 0, 'Solicito viáticos para viaje a conferencia en Barcelona.', 1500.00, NULL, 3.0, TRUE),
  (3, 2, 2, 1, 'Reembolso por gastos médicos durante viaje.', 800.00, NULL, 1.0, TRUE),
  (3, 3, 5, 2, 'Solicitud de apoyo económico para capacitación online.', 500.00, NULL, 0.0, TRUE),
  (3, 4, 4, 2, 'Viáticos para taller de liderazgo en Madrid.', 1200.00, NULL, 2.0, TRUE),
  (3, 5, 5, 2, 'Reembolso de transporte.', 300.00, 250.00, 0.5, TRUE),
  (3, 6, 5, 2, 'Apoyo para participación en congreso internacional.', 2000.00, 1800.00, 4.0, TRUE),
  (3, 7, 5, 2, 'Gastos operativos extraordinarios.', 650.00, 600.00, 0.0, TRUE),
  (3, 8, 5, 2, 'Viaje urgente por representación institucional.', 1750.00, 1500.00, 3.5, TRUE),
  (3, 9, 5, 2, 'Solicito anticipo para misión técnica en el extranjero.', 2200.00, 2000.00, 5.0, TRUE);

-- ============================================================================
-- Geographic Reference Data
-- ============================================================================

-- Country data: 15 countries covering major travel destinations
INSERT INTO Country (country_name) VALUES
  ('México'),
  ('Estados Unidos'),
  ('Canadá'),
  ('Brásil'),
  ('Argentina'),
  ('Chile'),
  ('Colombia'),
  ('España'),
  ('Francia'),
  ('Reino Unido'),
  ('Alemania'),
  ('Italia'),  
  ('Japón'),
  ('China'),
  ('India');

-- City data: Major cities in each country for route planning
INSERT INTO City (city_name) VALUES
-- Mexican Cities
  ('CDMX'),
  ('Guadalajara'),
  ('Monterrey'),
  ('Cancún'),
  ('Mérida'),
-- US Cities
  ('Nueva York'),
  ('Los Ángeles'),
  ('San Francisco'),
  ('Chicago'),
  ('Las Vegas'),
-- Canadian Cities
  ('Toronto'),
  ('Vancouver'),
-- Brazilian Cities
  ('Rio de Janeiro'),
  ('Sao Paulo'),
-- Argentine Cities
  ('Buenos Aires'),
  ('Cordoba'),
-- Chilean Cities
  ('Santiago'),
  ('Valparaíso'),
-- Colombian Cities
  ('Bogotá'),
  ('Barranquilla'),
-- Spanish Cities
  ('Madrid'),
  ('Barcelona'),
-- French Cities
  ('Paris'),
  ('Lyon'),
-- UK Cities
  ('Londres'),
  ('Manchester'),
-- German Cities
  ('Berlín'),
  ('Munich'),
-- Italian Cities
  ('Roma'),
  ('Venecia'),
-- Japanese Cities
  ('Tokyo'),
  ('Kyoto'),
-- Chinese Cities
  ('Pekín'),
  ('Hong Kong'),
-- Indian Cities
  ('Bombay'),
  ('Nueva Delhi');

-- ============================================================================
-- Route Test Data
-- ============================================================================
-- Sample travel routes with various combinations of transportation needs
-- router_index: Sequence number for multi-segment trips (0 = single segment or first segment)
-- plane_needed/hotel_needed: Boolean flags for service requirements
-- Includes both domestic (within Mexico) and international routes

INSERT INTO Route (id_origin_country, id_origin_city, id_destination_country, id_destination_city, router_index,
                     plane_needed, hotel_needed, beginning_date, beginning_time, ending_date, ending_time) VALUES
  -- Domestic routes (Mexico)
  (1, 1, 1, 2, 0, TRUE, FALSE, '2025-05-01', '08:00:00', '2025-05-01', '11:00:00'),
  (1, 3, 1, 5, 0, TRUE, TRUE,  '2025-05-02', '10:30:00', '2025-05-02', '14:30:00'),
  (1, 2, 1, 1, 0, FALSE, TRUE, '2025-05-03', '12:00:00', '2025-05-03', '15:00:00'),
  (1, 3, 1, 2, 0, TRUE, FALSE, '2025-05-04', '06:00:00', '2025-05-04', '09:00:00'),
  
  -- International routes (Mexico to/from other countries)
  (1, 1, 2, 1, 0, TRUE, TRUE, '2025-05-05', '14:00:00', '2025-05-05', '18:00:00'),
  (2, 1, 1, 1, 0, FALSE, FALSE, '2025-05-06', '11:00:00', '2025-05-06', '13:00:00'),
  (1, 1, 8, 31, 0, TRUE, FALSE, '2025-05-07', '09:30:00', '2025-05-07', '12:30:00'),
  (10, 36, 2, 7, 0, TRUE, TRUE, '2025-05-08', '15:00:00', '2025-05-08', '18:30:00'),
  (1, 1, 8, 31, 0, TRUE, TRUE, '2025-05-09', '08:00:00', '2025-05-09', '11:15:00'),
  (10, 25, 7, 29, 0, TRUE, FALSE, '2025-05-10', '07:00:00', '2025-05-10', '09:00:00'),
  
  -- European routes (country to country within Europe)
  (11, 27, 12, 29, 0, TRUE, FALSE, '2025-05-11', '12:00:00', '2025-05-11', '15:00:00'),
  (12, 29, 11, 27, 0, TRUE, TRUE, '2025-05-12', '13:00:00', '2025-05-12', '17:00:00'),
  
  -- Asian routes
  (13, 31, 14, 33, 0, TRUE, FALSE, '2025-05-13', '06:00:00', '2025-05-13', '08:30:00'),
  (14, 33, 13, 31, 0, TRUE, TRUE, '2025-05-14', '14:00:00', '2025-05-14', '17:00:00'),
  
  -- India to Mexico route
  (15, 35, 1, 1, 0, TRUE, TRUE, '2025-05-15', '10:00:00', '2025-05-15', '13:00:00'),
  
  -- Americas circuits (testing various route combinations)
  (1, 2, 2, 6, 0, TRUE, FALSE, '2025-05-16', '11:00:00', '2025-05-16', '13:45:00'),
  (2, 6, 3, 11, 0, TRUE, FALSE, '2025-05-17', '07:15:00', '2025-05-17', '09:45:00'),
  (3, 11, 4, 13, 0, TRUE, TRUE, '2025-05-18', '16:00:00', '2025-05-18', '19:00:00'),
  (4, 13, 5, 15, 0, TRUE, TRUE, '2025-05-19', '12:30:00', '2025-05-19', '16:00:00'),
  (5, 15, 6, 17, 0, TRUE, FALSE, '2025-05-20', '06:00:00', '2025-05-20', '08:00:00'),
  (6, 17, 7, 19, 0, TRUE, TRUE, '2025-05-21', '13:30:00', '2025-05-21', '15:30:00'),
  (7, 19, 8, 21, 0, TRUE, TRUE, '2025-05-22', '09:00:00', '2025-05-22', '11:45:00'),
  (8, 21, 9, 23, 0, TRUE, FALSE, '2025-05-23', '10:00:00', '2025-05-23', '13:00:00'),
  (9, 23, 10, 25, 0, TRUE, TRUE, '2025-05-24', '11:00:00', '2025-05-24', '13:30:00'),
  (10, 25, 15, 35, 0, TRUE, FALSE, '2025-05-25', '12:00:00', '2025-05-25', '14:30:00'),
  (1, 1, 15, 35, 0, TRUE, TRUE, '2025-05-26', '13:00:00', '2025-05-26', '15:30:00'),
  (2, 6, 14, 33, 0, TRUE, FALSE, '2025-05-27', '14:00:00', '2025-05-27', '16:30:00'),
  (3, 11, 13, 31, 0, TRUE, FALSE, '2025-05-28', '15:00:00', '2025-05-28', '17:30:00'),
  (4, 13, 12, 29, 0, TRUE, TRUE, '2025-05-29', '16:00:00', '2025-05-29', '18:30:00'),
  (5, 15, 11, 27, 0, TRUE, TRUE, '2025-05-30', '17:00:00', '2025-05-30', '19:30:00'),
  (6, 17, 10, 25, 0, TRUE, FALSE, '2025-05-31', '18:00:00', '2025-05-31', '20:30:00'),
  (7, 19, 9, 23, 0, TRUE, TRUE, '2025-06-01', '08:00:00', '2025-06-01', '10:30:00'),
  (8, 21, 8, 21, 0, FALSE, FALSE, '2025-06-02', '09:00:00', '2025-06-02', '11:30:00'),
  (9, 23, 7, 19, 0, TRUE, TRUE, '2025-06-03', '10:00:00', '2025-06-03', '12:30:00'),
  (10, 25, 6, 17, 0, TRUE, TRUE, '2025-06-04', '11:00:00', '2025-06-04', '13:30:00'),
  (11, 27, 5, 15, 0, TRUE, FALSE, '2025-06-05', '12:00:00', '2025-06-05', '14:30:00'),
  (12, 29, 4, 13, 0, TRUE, TRUE, '2025-06-06', '13:00:00', '2025-06-06', '15:30:00'),
  (13, 31, 3, 11, 0, TRUE, FALSE, '2025-06-07', '14:00:00', '2025-06-07', '16:30:00'),
  (14, 33, 2, 6, 0, TRUE, TRUE, '2025-06-08', '15:00:00', '2025-06-08', '17:30:00'),
  (15, 35, 1, 1, 0, FALSE, TRUE, '2025-06-09', '16:00:00', '2025-06-09', '18:30:00'),
  
  -- Historical routes (2024 dates for testing past travel)
  (1, 1, 1, 2, 0, FALSE, TRUE, '2024-03-18', '10:23:41', '2024-03-22', '18:05:19'),
  (2, 6, 2, 9, 0, TRUE, TRUE, '2024-11-10', '06:19:07', '2024-11-13', '14:47:55'),
  (3, 11, 3, 12, 0, FALSE, FALSE, '2024-07-05', '09:55:11', '2024-07-07', '11:41:06'),
  (4, 13, 4, 14, 0, TRUE, FALSE, '2024-06-28', '13:15:44', '2024-07-01', '10:13:32'),
  (5, 15, 5, 16, 0, TRUE, FALSE, '2024-01-12', '17:36:48', '2024-01-14', '23:21:49'),
  (6, 17, 6, 18, 0, FALSE, TRUE, '2024-09-02', '00:34:27', '2024-09-05', '16:57:15'),
  (7, 19, 7, 20, 0, TRUE, FALSE, '2024-05-20', '08:09:03', '2024-05-23', '12:03:27'),
  (8, 21, 8, 22, 0, FALSE, FALSE, '2024-04-08', '21:51:36', '2024-04-11', '07:20:59'),
  (9, 23, 9, 24, 0, TRUE, TRUE, '2024-08-30', '11:18:23', '2024-09-01', '13:22:45'),
  (10, 25, 10, 26, 0, FALSE, TRUE, '2024-10-15', '03:26:02', '2024-10-18', '20:12:38'),
  (11, 27, 11, 28, 0, TRUE, FALSE, '2024-02-06', '14:07:12', '2024-02-08', '22:31:04'),
  (12, 29, 12, 30, 0, FALSE, FALSE, '2024-12-01', '09:46:59', '2024-12-03', '17:40:20'),
  (13, 31, 13, 32, 0, TRUE, TRUE, '2024-03-25', '05:59:35', '2024-03-27', '18:19:02'),
  (14, 33, 14, 34, 0, TRUE, FALSE, '2024-07-17', '16:13:08', '2024-07-20', '12:44:10'),
  (15, 35, 15, 36, 0, FALSE, TRUE, '2024-06-03', '11:24:56', '2024-06-06', '14:12:17'),
  (1, 3, 1, 4, 0, TRUE, TRUE, '2024-09-10', '23:30:14', '2024-09-12', '08:55:22'),
  (2, 7, 2, 10, 0, FALSE, FALSE, '2024-11-23', '10:05:30', '2024-11-26', '21:39:07'),
  (3, 11, 3, 12, 0, TRUE, FALSE, '2024-05-09', '06:44:48', '2024-05-11', '15:28:55'),
  (4, 14, 4, 13, 0, FALSE, TRUE, '2024-10-01', '15:02:19', '2024-10-03', '12:38:55'),
  (5, 15, 5, 16, 0, TRUE, FALSE, '2024-06-12', '07:30:00', '2024-06-14', '17:15:20'),
  (6, 17, 6, 18, 0, FALSE, TRUE, '2024-03-03', '12:45:50', '2024-03-06', '09:05:43'),
  
  -- Multi-segment routes (router_index > 0 indicates continuation of previous route)
  (5, 1, 1, 3, 1, TRUE, TRUE, '2025-05-02', '14:30:00', '2025-05-10', '12:00:33'),  -- Segment 2 of trip
  (1, 1, 3, 11, 1, TRUE, TRUE, '2025-05-03', '15:00:00', '2025-05-13', '14:35:00'),  -- Segment 2 of trip
  (3, 11, 3, 12, 2, TRUE, TRUE, '2025-05-13', '14:35:00', '2025-05-23', '12:45:00'); -- Segment 3 of trip

-- ============================================================================
-- Route-Request Junction Data
-- ============================================================================
-- Links requests to their corresponding route segments
-- One-to-one for simple routes, one-to-many for multi-segment trips
INSERT INTO Route_Request (request_id, route_id) VALUES
  (1, 1),
  (2, 2),
  (3, 3),
  (4, 4),
  (5, 5),
  (6, 6),
  (7, 7),
  (8, 8),
  (9, 9);

-- ============================================================================
-- Receipt Test Data
-- ============================================================================
-- Sample expense receipts with various validation statuses
-- Tests all three validation states: Pendiente, Aprobado, Rechazado
-- Includes edge cases: future dates, NULL validation dates, various amounts

INSERT INTO Receipt (receipt_type_id, request_id, validation, amount, validation_date) VALUES
  -- Pending receipts (awaiting accounts payable review)
  (1, 1, 'Pendiente', 300.00, '2025-04-19 09:00:00');

-- ============================================================================
-- Auth Rules
-- ============================================================================

INSERT INTO AuthorizationRule (rule_name, is_default, num_levels, automatic, travel_type, min_duration, max_duration, min_amount, max_amount) VALUES
  ('Viajes internacionales cortos', FALSE, 3, TRUE, 'Internacional', 0, 5, 0, 5000.00);

INSERT INTO AuthorizationRuleLevel (rule_id, level_number, level_type, superior_level_number) VALUES
  (2, 1, 'Jefe', NULL),
  (2, 2, 'Aleatorio', 1);