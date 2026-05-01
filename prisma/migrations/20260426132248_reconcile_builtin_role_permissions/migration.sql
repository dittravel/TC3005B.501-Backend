-- Reconcile built-in role permission baselines and add missing refund permissions.
-- This keeps existing databases aligned with the seeded starter roles.

INSERT IGNORE INTO `Permission` (`permission_key`, `permission_name`, `module`, `action`, `description`, `society_group_id`)
SELECT 'refunds:request', 'Solicitar reembolso', 'refunds', 'request', 'Submit a refund request', sg.`id`
FROM `SocietyGroup` sg;

INSERT IGNORE INTO `Permission` (`permission_key`, `permission_name`, `module`, `action`, `description`, `society_group_id`)
SELECT 'refunds:budget', 'Asignar presupuesto impuesto', 'refunds', 'assign_budget', 'Assign tax budget to a refund', sg.`id`
FROM `SocietyGroup` sg;

INSERT IGNORE INTO `Permission` (`permission_key`, `permission_name`, `module`, `action`, `description`, `society_group_id`)
SELECT 'refunds:approve', 'Aprobar/Rechazar reembolso', 'refunds', 'approve_reject', 'Approve or reject refund requests', sg.`id`
FROM `SocietyGroup` sg;

DELETE rp
FROM `Role_Permission` rp
JOIN `Role` r ON r.`role_id` = rp.`role_id`
JOIN `Permission` p ON p.`permission_id` = rp.`permission_id`
WHERE p.`society_group_id` <=> r.`society_group_id`
  AND r.`role_name` IN ('Solicitante', 'Agencia de viajes', 'Cuentas por pagar', 'Autorizador', 'Administrador', 'Superadministrador')
  AND (
    (r.`role_name` = 'Solicitante' AND p.`permission_key` NOT IN (
      'travel:view', 'travel:create', 'travel:edit', 'travel:view_flights', 'travel:view_hotels',
      'receipts:create', 'receipts:edit', 'refunds:request'
    ))
    OR
    (r.`role_name` = 'Agencia de viajes' AND p.`permission_key` NOT IN (
      'travel:view', 'travel:edit', 'travel:approve', 'travel:view_flights', 'travel:view_hotels', 'travel:finalize', 'travel:cancel'
    ))
    OR
    (r.`role_name` = 'Cuentas por pagar' AND p.`permission_key` NOT IN (
      'travel:view', 'receipts:view', 'receipts:create', 'receipts:edit', 'receipts:delete', 'receipts:approve', 'refunds:request', 'refunds:approve'
    ))
    OR
    (r.`role_name` = 'Autorizador' AND p.`permission_key` NOT IN (
      'users:view', 'travel:view', 'travel:create', 'travel:edit', 'travel:delete', 'travel:approve', 'travel:def_amount',
      'travel:finalize', 'travel:cancel', 'travel:reject', 'receipts:view', 'receipts:create', 'receipts:edit', 'receipts:approve',
      'refunds:request', 'refunds:approve'
    ))
    OR
    (r.`role_name` = 'Administrador' AND p.`permission_key` NOT IN (
      'users:view', 'users:create', 'users:edit', 'users:delete',
      'travel:def_amount', 'system:audit_log', 'system:import_data', 'system:export_accounting'
    ))
    OR
    (r.`role_name` = 'Superadministrador' AND p.`permission_key` NOT IN (
      'superadmin:manage_groups', 'superadmin:manage_master_admins', 'superadmin:view_group_audit_log'
    ))
  );

INSERT IGNORE INTO `Role_Permission` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `Role` r
JOIN `Permission` p ON p.`society_group_id` <=> r.`society_group_id`
WHERE (
  r.`role_name` = 'Solicitante' AND p.`permission_key` IN (
    'travel:view', 'travel:create', 'travel:edit', 'travel:view_flights', 'travel:view_hotels',
    'receipts:create', 'receipts:edit', 'refunds:request'
  )
) OR (
  r.`role_name` = 'Agencia de viajes' AND p.`permission_key` IN (
    'travel:view', 'travel:edit', 'travel:approve', 'travel:view_flights', 'travel:view_hotels', 'travel:finalize', 'travel:cancel'
  )
) OR (
  r.`role_name` = 'Cuentas por pagar' AND p.`permission_key` IN (
    'travel:view', 'receipts:view', 'receipts:create', 'receipts:edit', 'receipts:delete', 'receipts:approve', 'refunds:request', 'refunds:approve'
  )
) OR (
  r.`role_name` = 'Autorizador' AND p.`permission_key` IN (
    'users:view', 'travel:view', 'travel:create', 'travel:edit', 'travel:delete', 'travel:approve', 'travel:def_amount',
    'travel:finalize', 'travel:cancel', 'travel:reject', 'receipts:view', 'receipts:create', 'receipts:edit', 'receipts:approve',
    'refunds:request', 'refunds:approve'
  )
) OR (
  r.`role_name` = 'Administrador' AND p.`permission_key` IN (
    'users:view', 'users:create', 'users:edit', 'users:delete',
    'travel:def_amount', 'system:audit_log', 'system:import_data', 'system:export_accounting'
  )
) OR (
  r.`role_name` = 'Superadministrador' AND p.`permission_key` IN (
    'superadmin:manage_groups', 'superadmin:manage_master_admins', 'superadmin:view_group_audit_log'
  )
);
