-- =============================================================================
-- Migration 010: Seed Default Staff Accounts (Super Admin, Manager, Editor)
-- Applied to PostgreSQL / Supabase for MarsNova Operations Platform
-- =============================================================================

INSERT INTO users (id, role_id, email, password_hash, full_name, phone, status)
SELECT 
    '00000000-0000-0000-0000-000000000001'::uuid,
    r.id,
    'admin@marsnova.in',
    'sha256$a1b2c3d4e5f60718293a4b5c6d7e8f90$cab39170dd13a923435745e2792c9efa7b1a59693e1ff658a451a30881fd6dae',
    'Aditya Verma (Super Admin)',
    '+917208591595',
    'active'
FROM roles r WHERE r.role_name = 'super_admin'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, role_id, email, password_hash, full_name, phone, status)
SELECT 
    '00000000-0000-0000-0000-000000000002'::uuid,
    r.id,
    'manager@marsnova.in',
    'sha256$b2c3d4e5f60718293a4b5c6d7e8f90a1$f02b8a4179bfda3062c570cb3871a58fe10c2ed0a4d0f28211a2f4e744236623',
    'Priya Sharma (Studio Manager)',
    '+919876543210',
    'active'
FROM roles r WHERE r.role_name = 'agency_manager'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, role_id, email, password_hash, full_name, phone, status)
SELECT 
    '00000000-0000-0000-0000-000000000003'::uuid,
    r.id,
    'editor@marsnova.in',
    'sha256$c3d4e5f60718293a4b5c6d7e8f90a1b2$5211f49bede6f7788322cb151ac5116a28b7c026bef271b1f184fadad9bb3e1f',
    'Rohan Das (Lead Video Editor)',
    '+919876543211',
    'active'
FROM roles r WHERE r.role_name = 'editor'
ON CONFLICT (email) DO NOTHING;

-- Record migration in schema_migrations
INSERT INTO schema_migrations (version, name, executed_by)
VALUES ('010', '010_marsnova_seed_staff.sql', 'admin')
ON CONFLICT (version) DO NOTHING;
