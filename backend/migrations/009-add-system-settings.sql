-- Migration: Add system settings table
-- Created: 2025-10-01

CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX idx_system_settings_key ON system_settings(setting_key);

-- Add default trusted device duration setting (24 hours)
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('trusted_device_duration', '24', 'Duration in hours that a device stays trusted (skip 2FA)')
ON CONFLICT (setting_key) DO NOTHING;

-- Add comment
COMMENT ON TABLE system_settings IS 'System-wide configuration settings';
COMMENT ON COLUMN system_settings.setting_key IS 'Unique identifier for the setting';
COMMENT ON COLUMN system_settings.setting_value IS 'The value of the setting (stored as text)';
