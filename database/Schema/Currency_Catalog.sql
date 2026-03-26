-- ============================================================================
-- Currency Catalog
-- ============================================================================
-- Creates the Currency table and populates it with all currencies supported
-- by Banxico's SIE API. Run this script once to set up the currency catalog.
--
-- Usage: mysql -u <user> -p <database> < Currency_Catalog.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS Currency (
    currency_id INT PRIMARY KEY AUTO_INCREMENT,
    currency_code VARCHAR(6) UNIQUE NOT NULL,
    currency_name VARCHAR(100) NOT NULL,
    country VARCHAR(100),
    banxico_series_id VARCHAR(20) NULL,
    frequency ENUM('daily', 'monthly') DEFAULT 'monthly',
    active BOOL NOT NULL DEFAULT TRUE
);

-- ============================================================================
-- Seed data — all currencies from the Banxico SIE catalog
-- The 4 daily series (USD, EUR, CAD, JPY) use official daily FIX series IDs.
-- ============================================================================

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
