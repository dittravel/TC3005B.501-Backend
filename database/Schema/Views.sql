-- ============================================================================
-- CocoScheme Database Views
-- ============================================================================
-- Pre-computed views for efficient querying of complex request data
-- with route details and user information
-- ============================================================================

USE CocoScheme;

-- ============================================================================
-- UserRequestHistory: Simplified request history for user dashboard
-- ============================================================================
-- Purpose: Shows all requests for a user with trip origins and destinations
-- Use case: User dashboard showing their travel request history
-- Performance: Aggregates route countries into comma-separated lists
CREATE OR REPLACE VIEW UserRequestHistory AS
    SELECT
        Request.request_id,
        Request.user_id,
        Request.creation_date,
        Request_status.status,

        -- Aggregate all origin countries (e.g., "México, Estados Unidos")
        GROUP_CONCAT(DISTINCT Country_origin.country_name ORDER BY Route.router_index SEPARATOR ', ') AS trip_origins,
        -- Aggregate all destination countries (e.g., "España, Francia")
        GROUP_CONCAT(DISTINCT Country_destination.country_name ORDER BY Route.router_index SEPARATOR ', ') AS trip_destinations
    FROM
        Request
        INNER JOIN Request_status
            ON Request.request_status_id = Request_status.request_status_id
        LEFT JOIN Route_Request
            ON Request.request_id = Route_Request.request_id
        LEFT JOIN Route
            ON Route_Request.route_id = Route.route_id
        LEFT JOIN Country AS Country_origin
            ON Route.id_origin_country = Country_origin.country_id
        LEFT JOIN Country AS Country_destination
            ON Route.id_destination_country = Country_destination.country_id
    GROUP BY
        Request.request_id,
        Request.user_id,
        Request.last_mod_date,
        Request_status.status;




-- ============================================================================
-- RequestWithRouteDetails: Complete request information with all route segments
-- ============================================================================
-- Purpose: Comprehensive view of requests including user info and detailed route data
-- Use case: Request detail pages, authorizer review screens, travel agent quote generation
-- Performance: Aggregates multi-segment routes into comma-separated lists for easy display
-- Note: Each field is ordered by router_index to maintain route sequence
CREATE OR REPLACE VIEW RequestWithRouteDetails AS
    SELECT
        -- Request basic information
        Request.request_id,
        Request.user_id,
        Request.request_status_id,
        Request.notes,
        Request.requested_fee,
        Request.imposed_fee,
        Request.request_days,
        Request.creation_date,
        Request.last_mod_date,
        Request.active,

        -- User contact information
        `User`.user_name,
        `User`.email AS user_email,
        `User`.phone_number AS user_phone_number,

        -- Current workflow status
        Request_status.status,

        -- Department information for cost center tracking
        Department.department_name,
        Department.department_id,

        -- Aggregated route details (ordered by route segment sequence)
        -- Origins (e.g., "México, Francia, Italia")
        GROUP_CONCAT(DISTINCT Country_origin.country_name ORDER BY Route.router_index SEPARATOR ', ') AS origin_countries,
        GROUP_CONCAT(DISTINCT City_origin.city_name ORDER BY Route.router_index SEPARATOR ', ') AS origin_cities,
        -- Destinations (e.g., "Francia, Italia, España")
        GROUP_CONCAT(DISTINCT Country_destination.country_name ORDER BY Route.router_index SEPARATOR ', ') AS destination_countries,
        GROUP_CONCAT(DISTINCT City_destination.city_name ORDER BY Route.router_index SEPARATOR ', ') AS destination_cities,
        -- Dates and times (e.g., "2025-05-01, 2025-05-03, 2025-05-05")
        GROUP_CONCAT(DISTINCT Route.beginning_date ORDER BY Route.router_index SEPARATOR ', ') AS beginning_dates,
        GROUP_CONCAT(DISTINCT Route.beginning_time ORDER BY Route.router_index SEPARATOR ', ') AS beginning_times,
        GROUP_CONCAT(DISTINCT Route.ending_date ORDER BY Route.router_index SEPARATOR ', ') AS ending_dates,
        GROUP_CONCAT(DISTINCT Route.ending_time ORDER BY Route.router_index SEPARATOR ', ') AS ending_times,
        -- Service requirements (e.g., "1, 0, 1" for hotel needed flags)
        GROUP_CONCAT(DISTINCT Route.hotel_needed ORDER BY Route.router_index SEPARATOR ', ') AS hotel_needed_list,
        GROUP_CONCAT(DISTINCT Route.plane_needed ORDER BY Route.router_index SEPARATOR ', ') AS plane_needed_list
    FROM
        Request
        LEFT JOIN `User`
            ON Request.user_id = `User`.user_id
        LEFT JOIN Request_status
            ON Request.request_status_id = Request_status.request_status_id
        LEFT JOIN Department
            ON `User`.department_id = Department.department_id
        LEFT JOIN Route_Request
            ON Request.request_id = Route_Request.request_id
        LEFT JOIN Route
            ON Route_Request.route_id = Route.route_id
        LEFT JOIN Country AS Country_origin
            ON Route.id_origin_country = Country_origin.country_id
        LEFT JOIN City AS City_origin
            ON Route.id_origin_city = City_origin.city_id
        LEFT JOIN Country AS Country_destination
            ON Route.id_destination_country = Country_destination.country_id
        LEFT JOIN City AS City_destination
            ON Route.id_destination_city = City_destination.city_id
    GROUP BY
        Request.request_id,
        Request.user_id,
        Request.request_status_id,
        Request.notes,
        Request.requested_fee,
        Request.imposed_fee,
        Request.request_days,
        Request.creation_date,
        Request.last_mod_date,
        Request.active,

        `User`.user_name,
        `User`.email,
        `User`.phone_number,

        Request_status.status,
        
        Department.department_name,
        Department.department_id;




-- ============================================================================
-- UserFullInfo: User profile with role and department information
-- ============================================================================
-- Purpose: Complete user information for admin user management screens
-- Use case: User list displays, profile pages, access control verification
-- Performance: Simple joins, no aggregation needed
CREATE OR REPLACE VIEW UserFullInfo AS
    SELECT
        u.user_id,
        u.user_name,
        u.email,
        u.active,              -- User account status
        r.role_name,           -- Access level (Solicitante, N1, Admin, etc.)
        d.department_name,     -- Department name
        d.department_id        -- Department ID for filtering
    FROM
        `User` u
        LEFT JOIN `Role` r ON u.role_id = r.role_id
        LEFT JOIN Department d ON u.department_id = d.department_id;