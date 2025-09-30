-- Migration: Add Two-Factor Authentication fields to users table
-- Created: 2025-09-30
-- Description: Adds 2FA support with TOTP secrets, backup codes, and status tracking

-- Add 2FA fields to users table
ALTER TABLE users
ADD COLUMN "twoFactorSecret" TEXT NULL,
ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "twoFactorBackupCodes" TEXT NULL,
ADD COLUMN "twoFactorEnabledAt" TIMESTAMP NULL;

-- Add comments for documentation
COMMENT ON COLUMN users."twoFactorSecret" IS 'Encrypted TOTP secret for two-factor authentication';
COMMENT ON COLUMN users."twoFactorEnabled" IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN users."twoFactorBackupCodes" IS 'JSON array of hashed backup codes for account recovery';
COMMENT ON COLUMN users."twoFactorEnabledAt" IS 'Timestamp when 2FA was first enabled for this user';

-- Add indexes for performance
CREATE INDEX idx_users_two_factor_enabled ON users ("twoFactorEnabled");
CREATE INDEX idx_users_two_factor_enabled_at ON users ("twoFactorEnabledAt");

-- Insert migration record
INSERT INTO migration_history (version, description, executed_at, checksum)
VALUES (
  '007',
  'Add Two-Factor Authentication fields to users table',
  NOW(),
  MD5('add-two-factor-auth-007')
);

COMMIT;