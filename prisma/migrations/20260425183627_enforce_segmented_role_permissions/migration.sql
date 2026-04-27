DELETE rp
FROM `Role_Permission` rp
JOIN `Role` r ON r.`role_id` = rp.`role_id`
JOIN `Permission` p ON p.`permission_id` = rp.`permission_id`
WHERE p.`society_group_id` <=> r.`society_group_id`
  AND (
    (r.`role_name` <> 'Superadministrador' AND (
      p.`permission_key` LIKE 'superadmin:%'
      OR p.`permission_key` LIKE 'society_groups:%'
    ))
    OR
    (r.`role_name` = 'Administrador' AND p.`permission_key` LIKE 'societies:%')
    OR
    (r.`role_name` = 'Administrador' AND p.`permission_key` IN (
      'travel:approve',
      'travel:reject',
      'travel:finalize',
      'travel:cancel',
      'receipts:approve'
    ))
  );

INSERT IGNORE INTO `Role_Permission` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `Role` r
JOIN `Permission` p
  ON p.`society_group_id` <=> r.`society_group_id`
WHERE r.`role_name` = 'Superadministrador'
  AND p.`permission_key` IN (
    'superadmin:manage_groups',
    'superadmin:manage_master_admins',
    'superadmin:view_group_audit_log'
  );
