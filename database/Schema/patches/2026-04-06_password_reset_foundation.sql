-- Password Reset Foundation
-- Adds token and expiry columns to User for the forgot-password / reset-password flow.
-- Token is a 64-char hex string (32 random bytes). Expires after 1 hour.
-- Both columns are cleared after a successful password reset.

ALTER TABLE User
  ADD COLUMN password_reset_token VARCHAR(64) NULL DEFAULT NULL,
  ADD COLUMN password_reset_expires DATETIME NULL DEFAULT NULL;
