-- Q-Collector Database Schema v0.2
-- PostgreSQL initialization script

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS forms;
CREATE SCHEMA IF NOT EXISTS submissions;
CREATE SCHEMA IF NOT EXISTS files;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS settings;

-- Grant permissions to app user
GRANT USAGE ON SCHEMA forms TO app_user;
GRANT USAGE ON SCHEMA submissions TO app_user;
GRANT USAGE ON SCHEMA files TO app_user;
GRANT USAGE ON SCHEMA users TO app_user;
GRANT USAGE ON SCHEMA settings TO app_user;

-- Grant all privileges on all tables and sequences to app_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA forms TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA submissions TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA files TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA users TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA settings TO app_user;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA forms TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA submissions TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA files TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA users TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA settings TO app_user;

-- Forms Schema Tables
CREATE TABLE forms.forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    fields JSONB NOT NULL DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users.users(id),
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1
);

CREATE TABLE forms.sub_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    main_form_id UUID NOT NULL REFERENCES forms.forms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    fields JSONB NOT NULL DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0
);

-- Submissions Schema Tables
CREATE TABLE submissions.form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES forms.forms(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    document_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'submitted',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_by UUID REFERENCES users.users(id),
    ip_address INET,
    user_agent TEXT,
    validation_errors JSONB DEFAULT '{}',
    telegram_sent BOOLEAN DEFAULT FALSE,
    telegram_sent_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE submissions.sub_form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    main_submission_id UUID NOT NULL REFERENCES submissions.form_submissions(id) ON DELETE CASCADE,
    sub_form_id UUID NOT NULL REFERENCES forms.sub_forms(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_by UUID REFERENCES users.users(id),
    status VARCHAR(50) DEFAULT 'submitted'
);

-- Files Schema Tables
CREATE TABLE files.uploaded_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions.form_submissions(id) ON DELETE CASCADE,
    sub_submission_id UUID REFERENCES submissions.sub_form_submissions(id) ON DELETE CASCADE,
    field_id VARCHAR(100) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    minio_bucket VARCHAR(100) NOT NULL,
    minio_object_key VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by UUID REFERENCES users.users(id),
    is_active BOOLEAN DEFAULT TRUE,

    CONSTRAINT chk_submission_reference CHECK (
        (submission_id IS NOT NULL AND sub_submission_id IS NULL) OR
        (submission_id IS NULL AND sub_submission_id IS NOT NULL)
    )
);

-- Users Schema Tables
CREATE TABLE users.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email CITEXT UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0
);

CREATE TABLE users.user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Settings Schema Tables
CREATE TABLE settings.app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE settings.telegram_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES forms.forms(id) ON DELETE CASCADE,
    bot_token VARCHAR(255) NOT NULL,
    chat_id VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    fields_to_include JSONB DEFAULT '[]',
    message_template TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE settings.document_numbering (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID NOT NULL REFERENCES forms.forms(id) ON DELETE CASCADE,
    prefix VARCHAR(20) NOT NULL,
    use_thai_year BOOLEAN DEFAULT TRUE,
    year_first BOOLEAN DEFAULT FALSE,
    current_number INTEGER DEFAULT 0,
    current_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(form_id)
);

-- Create indexes for better performance
CREATE INDEX idx_forms_created_at ON forms.forms(created_at);
CREATE INDEX idx_forms_is_active ON forms.forms(is_active);
CREATE INDEX idx_sub_forms_main_form_id ON forms.sub_forms(main_form_id);
CREATE INDEX idx_sub_forms_display_order ON forms.sub_forms(display_order);

CREATE INDEX idx_submissions_form_id ON submissions.form_submissions(form_id);
CREATE INDEX idx_submissions_submitted_at ON submissions.form_submissions(submitted_at);
CREATE INDEX idx_submissions_status ON submissions.form_submissions(status);
CREATE INDEX idx_submissions_document_number ON submissions.form_submissions(document_number);
CREATE INDEX idx_sub_submissions_main_id ON submissions.sub_form_submissions(main_submission_id);
CREATE INDEX idx_sub_submissions_sub_form_id ON submissions.sub_form_submissions(sub_form_id);

CREATE INDEX idx_files_submission_id ON files.uploaded_files(submission_id);
CREATE INDEX idx_files_sub_submission_id ON files.uploaded_files(sub_submission_id);
CREATE INDEX idx_files_field_id ON files.uploaded_files(field_id);
CREATE INDEX idx_files_minio_bucket ON files.uploaded_files(minio_bucket);

CREATE INDEX idx_users_username ON users.users(username);
CREATE INDEX idx_users_email ON users.users(email);
CREATE INDEX idx_users_is_active ON users.users(is_active);
CREATE INDEX idx_sessions_user_id ON users.user_sessions(user_id);
CREATE INDEX idx_sessions_token ON users.user_sessions(session_token);
CREATE INDEX idx_sessions_expires_at ON users.user_sessions(expires_at);

CREATE INDEX idx_settings_key ON settings.app_settings(key);
CREATE INDEX idx_settings_category ON settings.app_settings(category);
CREATE INDEX idx_telegram_form_id ON settings.telegram_settings(form_id);
CREATE INDEX idx_doc_numbering_form_id ON settings.document_numbering(form_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON forms.forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sub_forms_updated_at BEFORE UPDATE ON forms.sub_forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON settings.app_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_telegram_settings_updated_at BEFORE UPDATE ON settings.telegram_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doc_numbering_updated_at BEFORE UPDATE ON settings.document_numbering
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default app settings
INSERT INTO settings.app_settings (key, value, description, category, is_system) VALUES
('app_name', '"Q-Collector"', 'Application name', 'general', true),
('app_version', '"0.2.0"', 'Application version', 'general', true),
('default_language', '"th"', 'Default language', 'general', false),
('max_file_size', '10485760', 'Maximum file upload size in bytes (10MB)', 'files', false),
('allowed_file_types', '["jpg","jpeg","png","gif","pdf","doc","docx","xls","xlsx"]', 'Allowed file extensions', 'files', false),
('telegram_enabled', 'false', 'Enable Telegram notifications', 'notifications', false),
('email_enabled', 'false', 'Enable email notifications', 'notifications', false);

-- Create default admin user (password: admin123)
INSERT INTO users.users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@q-collector.local', '$2b$10$rZ8kv.zJ.qZqJ8OZJ8OZJ8OZJ8OZJ8OZJ8OZJ8OZJ8OZJ8OZJ8OZJ', 'System Administrator', 'admin');

-- Grant future privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA forms GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA submissions GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA files GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA users GRANT ALL ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA settings GRANT ALL ON TABLES TO app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA forms GRANT ALL ON SEQUENCES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA submissions GRANT ALL ON SEQUENCES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA files GRANT ALL ON SEQUENCES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA users GRANT ALL ON SEQUENCES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA settings GRANT ALL ON SEQUENCES TO app_user;