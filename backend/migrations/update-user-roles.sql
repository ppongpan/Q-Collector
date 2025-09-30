-- Migration: Update User Roles to Support 8-Role RBAC
-- Date: 2025-09-30
-- Description: Expand role ENUM to support frontend's 8-role system

-- Step 1: Add new role values to existing ENUM type
-- Note: PostgreSQL doesn't allow direct modification of ENUM, so we need to use ALTER TYPE ADD VALUE

-- Add super_admin role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'super_admin' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_users_role')) THEN
        ALTER TYPE enum_users_role ADD VALUE 'super_admin';
    END IF;
END$$;

-- Add moderator role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'moderator' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_users_role')) THEN
        ALTER TYPE enum_users_role ADD VALUE 'moderator';
    END IF;
END$$;

-- Add customer_service role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'customer_service' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_users_role')) THEN
        ALTER TYPE enum_users_role ADD VALUE 'customer_service';
    END IF;
END$$;

-- Add sales role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'sales' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_users_role')) THEN
        ALTER TYPE enum_users_role ADD VALUE 'sales';
    END IF;
END$$;

-- Add marketing role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'marketing' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_users_role')) THEN
        ALTER TYPE enum_users_role ADD VALUE 'marketing';
    END IF;
END$$;

-- Add technic role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'technic' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_users_role')) THEN
        ALTER TYPE enum_users_role ADD VALUE 'technic';
    END IF;
END$$;

-- Add general_user role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'general_user' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_users_role')) THEN
        ALTER TYPE enum_users_role ADD VALUE 'general_user';
    END IF;
END$$;

-- Step 2: Update existing users (Optional - uncomment if needed)
-- Migrate existing 'user' role to 'general_user'
-- UPDATE users SET role = 'general_user' WHERE role = 'user';

-- Migrate existing 'manager' role to 'moderator' or keep as is based on requirements
-- UPDATE users SET role = 'moderator' WHERE role = 'manager';

-- Step 3: Verify migration
SELECT enumlabel, enumsortorder
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_users_role')
ORDER BY enumsortorder;

COMMIT;