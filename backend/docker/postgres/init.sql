-- ============================================
-- Q-Collector PostgreSQL Initialization Script
-- ============================================
-- This script runs automatically when PostgreSQL container starts
-- It sets up database extensions and initial configuration

-- ============================================
-- Enable Required Extensions
-- ============================================

-- UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptographic functions extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Full-text search extension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Unaccent extension (for accent-insensitive searches)
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================
-- Set Database Configuration
-- ============================================

-- Set timezone to UTC
SET timezone = 'UTC';

-- Set default text search configuration to English
ALTER DATABASE qcollector_db SET default_text_search_config TO 'pg_catalog.english';

-- ============================================
-- Create Custom Types (if needed)
-- ============================================

-- User roles enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'manager', 'user', 'viewer');
    END IF;
END
$$;

-- Submission status enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status') THEN
        CREATE TYPE submission_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'archived');
    END IF;
END
$$;

-- Field types enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'field_type') THEN
        CREATE TYPE field_type AS ENUM (
            'short_answer', 'paragraph', 'email', 'phone', 'number', 'url',
            'file_upload', 'image_upload', 'date', 'time', 'datetime',
            'multiple_choice', 'rating', 'slider', 'lat_long', 'province', 'factory'
        );
    END IF;
END
$$;

-- Audit action enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
        CREATE TYPE audit_action AS ENUM ('create', 'read', 'update', 'delete', 'login', 'logout');
    END IF;
END
$$;

-- ============================================
-- Create Utility Functions
-- ============================================

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate a random encryption key
CREATE OR REPLACE FUNCTION generate_encryption_key()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Performance Optimization Settings
-- ============================================

-- Increase shared_buffers for better caching
ALTER SYSTEM SET shared_buffers = '256MB';

-- Increase effective_cache_size
ALTER SYSTEM SET effective_cache_size = '1GB';

-- Increase maintenance_work_mem for faster index creation
ALTER SYSTEM SET maintenance_work_mem = '128MB';

-- Increase work_mem for better query performance
ALTER SYSTEM SET work_mem = '16MB';

-- Set random_page_cost (lower for SSD)
ALTER SYSTEM SET random_page_cost = 1.1;

-- Enable auto vacuum
ALTER SYSTEM SET autovacuum = on;
ALTER SYSTEM SET track_counts = on;

-- ============================================
-- Create Schemas (if using schema separation)
-- ============================================

-- You can organize tables into schemas for better organization
-- CREATE SCHEMA IF NOT EXISTS qcollector;
-- CREATE SCHEMA IF NOT EXISTS audit;

-- ============================================
-- Initial Data (Optional)
-- ============================================

-- You can insert initial data here if needed
-- For example, create default admin user (will be handled by seeders instead)

-- ============================================
-- Logging and Monitoring
-- ============================================

-- Enable logging of slow queries (queries taking more than 1 second)
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Log all DDL statements
ALTER SYSTEM SET log_statement = 'ddl';

-- ============================================
-- Security Settings
-- ============================================

-- Set password encryption to scram-sha-256
ALTER SYSTEM SET password_encryption = 'scram-sha-256';

-- Set statement timeout to prevent long-running queries (60 seconds)
ALTER SYSTEM SET statement_timeout = '60s';

-- Set idle in transaction timeout (10 minutes)
ALTER SYSTEM SET idle_in_transaction_session_timeout = '10min';

-- ============================================
-- Completion Message
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Q-Collector Database Initialization Complete';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Extensions enabled:';
    RAISE NOTICE '  - uuid-ossp (UUID generation)';
    RAISE NOTICE '  - pgcrypto (cryptographic functions)';
    RAISE NOTICE '  - pg_trgm (full-text search)';
    RAISE NOTICE '  - unaccent (accent-insensitive search)';
    RAISE NOTICE '';
    RAISE NOTICE 'Custom types created:';
    RAISE NOTICE '  - user_role';
    RAISE NOTICE '  - submission_status';
    RAISE NOTICE '  - field_type';
    RAISE NOTICE '  - audit_action';
    RAISE NOTICE '';
    RAISE NOTICE 'Database is ready for Sequelize migrations!';
    RAISE NOTICE '============================================';
END
$$;

-- ============================================
-- Note: Actual table creation will be handled by Sequelize migrations
-- This script only sets up extensions and basic configuration
-- ============================================