-- Align default role-permission matrix with current seedShared defaults.
-- This migration is idempotent and safe to run multiple times.

-- 1) Remove stale/default-drift permissions from hardcoded roles.
DELETE rp
FROM `Role_Permission` rp
JOIN `Role` r ON r.`role_id` = rp.`role_id`
JOIN `Permission` p ON p.`permission_id` = rp.`permission_id`
WHERE p.`society_group_id` <=> r.`society_group_id`
  AND (
    (r.`role_name` = 'Solicitante' AND p.`permission_key` IN ('travel:view_flights', 'travel:view_hotels'))
    OR
    (r.`role_name` = 'Agencia de viajes' AND p.`permission_key` IN ('travel:finalize', 'travel:cancel'))
    OR
    (r.`role_name` = 'Cuentas por pagar' AND p.`permission_key` IN ('travel:view', 'receipts:create', 'receipts:edit', 'receipts:delete'))
    OR
    (r.`role_name` = 'Autorizador' AND p.`permission_key` IN (
      'users:view',
      'travel:delete',
      'travel:def_amount',
      'travel:finalize',
      'travel:cancel',
      'receipts:view',
      'receipts:approve'
    ))
  );

-- 2) Ensure Solicitante exact baseline.
INSERT IGNORE INTO `Role_Permission` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `Role` r
JOIN `Permission` p ON p.`society_group_id` <=> r.`society_group_id`
WHERE r.`role_name` = 'Solicitante'
  AND p.`permission_key` IN (
    'travel:view',
    'travel:create',
    'travel:edit',
    'receipts:create',
    'receipts:edit'
  );

-- 3) Ensure Agencia de viajes exact baseline.
INSERT IGNORE INTO `Role_Permission` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `Role` r
JOIN `Permission` p ON p.`society_group_id` <=> r.`society_group_id`
WHERE r.`role_name` = 'Agencia de viajes'
  AND p.`permission_key` IN (
    'travel:view',
    'travel:edit',
    'travel:view_flights',
    'travel:view_hotels',
    'travel:approve'
  );

-- 4) Ensure Cuentas por pagar exact baseline.
INSERT IGNORE INTO `Role_Permission` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `Role` r
JOIN `Permission` p ON p.`society_group_id` <=> r.`society_group_id`
WHERE r.`role_name` = 'Cuentas por pagar'
  AND p.`permission_key` IN (
    'receipts:view',
    'receipts:approve'
  );

-- 5) Ensure Autorizador exact baseline.
INSERT IGNORE INTO `Role_Permission` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `Role` r
JOIN `Permission` p ON p.`society_group_id` <=> r.`society_group_id`
WHERE r.`role_name` = 'Autorizador'
  AND p.`permission_key` IN (
    'travel:view',
    'travel:create',
    'travel:edit',
    'travel:approve',
    'travel:reject',
    'receipts:create',
    'receipts:edit'
  );

-- 6) Ensure Administrador has all permissions from its own society group.
INSERT IGNORE INTO `Role_Permission` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `Role` r
JOIN `Permission` p ON p.`society_group_id` <=> r.`society_group_id`
WHERE r.`role_name` = 'Administrador';
