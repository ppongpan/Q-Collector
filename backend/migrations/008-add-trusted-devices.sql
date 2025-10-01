-- Migration: Add trusted devices table for 2FA remember device feature
-- Created: 2025-10-01

CREATE TABLE IF NOT EXISTS trusted_devices (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_fingerprint VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  user_agent TEXT,
  ip_address VARCHAR(45),
  trusted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX idx_trusted_devices_fingerprint ON trusted_devices(device_fingerprint);
CREATE INDEX idx_trusted_devices_expires_at ON trusted_devices(expires_at);

-- Unique constraint: one device fingerprint per user
CREATE UNIQUE INDEX idx_trusted_devices_user_device ON trusted_devices(user_id, device_fingerprint);

-- Add comment
COMMENT ON TABLE trusted_devices IS 'Stores trusted devices for 2FA skip functionality';
COMMENT ON COLUMN trusted_devices.device_fingerprint IS 'Unique device identifier generated from browser fingerprint';
COMMENT ON COLUMN trusted_devices.expires_at IS 'When the trust expires (24 hours from creation)';
COMMENT ON COLUMN trusted_devices.last_used_at IS 'Last time this device was used for login';
