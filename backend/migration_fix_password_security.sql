-- ==============================================================================
-- DATABASE MIGRATION: REMOVE PLAINTEXT PASSWORD COLUMN & ENFORCE SECURE HASHES
-- Compatible with MySQL 5.7+ / MySQL 8.0+ / MariaDB / XAMPP phpMyAdmin
-- Database: `digital_journal_db`
-- ==============================================================================

USE `digital_journal_db`;

-- ------------------------------------------------------------------------------
-- STEP 1: Verify and ensure the `password_hash` column exists
-- ------------------------------------------------------------------------------
ALTER TABLE `users` 
  MODIFY COLUMN `password_hash` VARCHAR(255) NULL;

-- ------------------------------------------------------------------------------
-- STEP 2: One-time migration for any existing local accounts that lack bcrypt hashes
-- Updates standard seed users to secure bcrypt hashes (password_hash)
-- ------------------------------------------------------------------------------
-- Admin User (admin123)
UPDATE `users` 
SET `password_hash` = '$2b$10$gyyrusfVDr4wRtloRzoPH.3n1DMqBGfQiR7mzTtINm6IlmH/Oiwgu'
WHERE (`email` = 'admin@digitaljournal.com' OR `email` = 'rushdhiriyaj2005@gmail.com')
  AND (`password_hash` IS NULL OR `password_hash` = '' OR `password_hash` NOT LIKE '$2%');

-- Staff Writer (writer123)
UPDATE `users` 
SET `password_hash` = '$2b$10$dkrirLKY5h3BnVy917SgwuTjOvmbzoN5m0.v3uqCJJTnLjz0X7ks2'
WHERE `email` = 'writer@digitaljournal.com'
  AND (`password_hash` IS NULL OR `password_hash` = '' OR `password_hash` NOT LIKE '$2%');

-- Alex Reader (reader123)
UPDATE `users` 
SET `password_hash` = '$2b$10$1Flzxia.PWNbYTF9265/h.jlnZMSXRJyMOQb1TgK0ERKl6e3gMOPO'
WHERE `email` = 'reader@digitaljournal.com'
  AND (`password_hash` IS NULL OR `password_hash` = '' OR `password_hash` NOT LIKE '$2%');

-- ------------------------------------------------------------------------------
-- STEP 3: Permanently drop the plaintext `password` column from the `users` table
-- ------------------------------------------------------------------------------
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'users' 
  AND COLUMN_NAME = 'password';

SET @drop_stmt = IF(@col_exists > 0, 'ALTER TABLE `users` DROP COLUMN `password`', 'SELECT "Column password already dropped"');
PREPARE stmt FROM @drop_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------------------------
-- STEP 4: Verify schema
-- ------------------------------------------------------------------------------
DESCRIBE `users`;
