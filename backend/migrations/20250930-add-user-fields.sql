-- Migration: Add new user fields for Priority 3 features
-- Date: 2025-09-30
-- Description: Add Two-Factor Authentication, Telegram Integration, and Enhanced User fields

-- Add Two-Factor Authentication fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "twoFactorBackupCodes" TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "twoFactorEnabledAt" TIMESTAMP NULL;

-- Add Telegram Integration fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS "telegramUserId" VARCHAR(50) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "telegramUsername" VARCHAR(50) NULL;

-- Add Enhanced User Information fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS "firstName" VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastName" VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "department" VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "notificationPreferences" TEXT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_user_id ON users("telegramUserId");
CREATE INDEX IF NOT EXISTS idx_users_two_factor_enabled ON users("twoFactorEnabled");
CREATE INDEX IF NOT EXISTS idx_users_department ON users("department");

-- Add comments to columns
COMMENT ON COLUMN users."twoFactorSecret" IS 'Encrypted TOTP secret';
COMMENT ON COLUMN users."twoFactorEnabled" IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN users."twoFactorBackupCodes" IS 'JSON array of encrypted backup codes';
COMMENT ON COLUMN users."twoFactorEnabledAt" IS 'When 2FA was first enabled';
COMMENT ON COLUMN users."telegramUserId" IS 'Telegram user ID for bot integration';
COMMENT ON COLUMN users."telegramUsername" IS 'Telegram username';
COMMENT ON COLUMN users."firstName" IS 'User first name';
COMMENT ON COLUMN users."lastName" IS 'User last name';
COMMENT ON COLUMN users."department" IS 'User department';
COMMENT ON COLUMN users."notificationPreferences" IS 'JSON object with notification preferences';