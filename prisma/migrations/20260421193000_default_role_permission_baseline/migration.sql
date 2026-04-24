-- Ensure default role-permission mappings exist for every society group.
-- This migration is additive (INSERT IGNORE) and safe to re-run.

INSERT IGNORE INTO `Role_Permission` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `Role` r
JOIN `Permission` p
  ON p.`society_group_id` <=> r.`society_group_id`
WHERE r.`role_name` = 'Solicitante'
  AND p.`permission_key` IN (
    'travel:view',
    'travel:create',
    'travel:edit',
    'travel:view_flights',
    'travel:view_hotels',
    'receipts:create',
    'receipts:edit'
  );

INSERT IGNORE INTO `Role_Permission` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `Role` r
JOIN `Permission` p
  ON p.`society_group_id` <=> r.`society_group_id`
WHERE r.`role_name` = 'Agencia de viajes'
  AND p.`permission_key` IN (
    'travel:view',
    'travel:edit',
    'travel:view_flights',
    'travel:view_hotels',
    'travel:finalize',
    'travel:cancel'
  );

INSERT IGNORE INTO `Role_Permission` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `Role` r
JOIN `Permission` p
  ON p.`society_group_id` <=> r.`society_group_id`
WHERE r.`role_name` = 'Cuentas por pagar'
  AND p.`permission_key` IN (
    'travel:view',
    'receipts:view',
    'receipts:create',
    'receipts:edit',
    'receipts:delete',
    'receipts:approve'
  );

INSERT IGNORE INTO `Role_Permission` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `Role` r
JOIN `Permission` p
  ON p.`society_group_id` <=> r.`society_group_id`
WHERE r.`role_name` = 'Autorizador'
  AND p.`permission_key` IN (
    'users:view',
    'travel:view',
    'travel:create',
    'travel:edit',
    'travel:delete',
    'travel:approve',
    'travel:def_amount',
    'travel:finalize',
    'travel:cancel',
    'travel:reject',
    'receipts:view',
    'receipts:approve'
  );

INSERT IGNORE INTO `Role_Permission` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `Role` r
JOIN `Permission` p
  ON p.`society_group_id` <=> r.`society_group_id`
WHERE r.`role_name` = 'Administrador';
