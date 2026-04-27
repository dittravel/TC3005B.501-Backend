-- AlterTable
ALTER TABLE `Role` ADD COLUMN `society_id` INT NULL;
CREATE INDEX `idx_role_society` ON `Role`(`society_id`);
-- Update
UPDATE `Role` r
JOIN (
  SELECT
    role_id,
    MIN(society_id) AS single_society_id,
    COUNT(DISTINCT society_id) AS society_count
  FROM `User`
  WHERE active = 1 AND society_id IS NOT NULL
  GROUP BY role_id
) u ON u.role_id = r.role_id
SET r.society_id = CASE WHEN u.society_count = 1 THEN u.single_society_id ELSE NULL END
WHERE r.society_id IS NULL;
