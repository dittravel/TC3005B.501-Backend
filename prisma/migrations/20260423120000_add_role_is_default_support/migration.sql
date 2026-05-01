SET @role_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Role'
    AND COLUMN_NAME = 'is_default'
);

SET @role_col_sql := IF(
  @role_col_exists = 0,
  'ALTER TABLE `Role` ADD COLUMN `is_default` BOOLEAN NOT NULL DEFAULT false',
  'SELECT 1'
);
PREPARE stmt FROM @role_col_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @role_idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Role'
    AND INDEX_NAME = 'idx_role_is_default'
);

SET @role_idx_sql := IF(
  @role_idx_exists = 0,
  'CREATE INDEX `idx_role_is_default` ON `Role`(`is_default`)',
  'SELECT 1'
);
PREPARE stmt FROM @role_idx_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- If multiple defaults exist in the same society group, keep the oldest role as default.
UPDATE `Role` r
JOIN (
  SELECT society_group_id, MIN(role_id) AS keep_role_id
  FROM `Role`
  WHERE is_default = true
  GROUP BY society_group_id
  HAVING COUNT(*) > 1
) d ON (r.society_group_id <=> d.society_group_id)
SET r.is_default = CASE
  WHEN r.role_id = d.keep_role_id THEN true
  ELSE false
END;

-- Ensure each society group has one default when a Solicitante role exists.
UPDATE `Role` r
JOIN (
  SELECT s.min_role_id AS role_id
  FROM (
    SELECT society_group_id, MIN(role_id) AS min_role_id
    FROM `Role`
    WHERE LOWER(role_name) = 'solicitante'
    GROUP BY society_group_id
  ) s
  JOIN (
    SELECT society_group_id
    FROM `Role`
    GROUP BY society_group_id
    HAVING SUM(CASE WHEN is_default = true THEN 1 ELSE 0 END) = 0
  ) g ON (s.society_group_id <=> g.society_group_id)
) target ON r.role_id = target.role_id
SET r.is_default = true;
