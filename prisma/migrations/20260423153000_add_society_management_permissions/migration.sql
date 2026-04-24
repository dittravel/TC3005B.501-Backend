-- Add dedicated CRUD permissions for societies and society groups.
-- Also grant them to Administrador roles in every society group.

INSERT IGNORE INTO `Permission` (`permission_key`, `permission_name`, `module`, `action`, `description`, `society_group_id`)
SELECT 'societies:view', 'Ver sociedad', 'societies', 'view', 'View societies and their details', sg.`id`
FROM `SocietyGroup` sg;

INSERT IGNORE INTO `Permission` (`permission_key`, `permission_name`, `module`, `action`, `description`, `society_group_id`)
SELECT 'societies:create', 'Crear sociedad', 'societies', 'create', 'Create new societies', sg.`id`
FROM `SocietyGroup` sg;

INSERT IGNORE INTO `Permission` (`permission_key`, `permission_name`, `module`, `action`, `description`, `society_group_id`)
SELECT 'societies:edit', 'Editar sociedad', 'societies', 'edit', 'Modify existing societies', sg.`id`
FROM `SocietyGroup` sg;

INSERT IGNORE INTO `Permission` (`permission_key`, `permission_name`, `module`, `action`, `description`, `society_group_id`)
SELECT 'societies:delete', 'Eliminar sociedad', 'societies', 'delete', 'Delete societies', sg.`id`
FROM `SocietyGroup` sg;

INSERT IGNORE INTO `Permission` (`permission_key`, `permission_name`, `module`, `action`, `description`, `society_group_id`)
SELECT 'society_groups:view', 'Ver grupo de sociedad', 'society_groups', 'view', 'View society groups and their details', sg.`id`
FROM `SocietyGroup` sg;

INSERT IGNORE INTO `Permission` (`permission_key`, `permission_name`, `module`, `action`, `description`, `society_group_id`)
SELECT 'society_groups:create', 'Crear grupo de sociedad', 'society_groups', 'create', 'Create new society groups', sg.`id`
FROM `SocietyGroup` sg;

INSERT IGNORE INTO `Permission` (`permission_key`, `permission_name`, `module`, `action`, `description`, `society_group_id`)
SELECT 'society_groups:edit', 'Editar grupo de sociedad', 'society_groups', 'edit', 'Modify existing society groups', sg.`id`
FROM `SocietyGroup` sg;

INSERT IGNORE INTO `Permission` (`permission_key`, `permission_name`, `module`, `action`, `description`, `society_group_id`)
SELECT 'society_groups:delete', 'Eliminar grupo de sociedad', 'society_groups', 'delete', 'Delete society groups', sg.`id`
FROM `SocietyGroup` sg;

INSERT IGNORE INTO `Role_Permission` (`role_id`, `permission_id`)
SELECT r.`role_id`, p.`permission_id`
FROM `Role` r
JOIN `Permission` p ON p.`society_group_id` <=> r.`society_group_id`
WHERE r.`role_name` = 'Administrador'
  AND p.`permission_key` IN (
    'societies:view',
    'societies:create',
    'societies:edit',
    'societies:delete',
    'society_groups:view',
    'society_groups:create',
    'society_groups:edit',
    'society_groups:delete'
  );