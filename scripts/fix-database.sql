-- Fix Database Schema for Course Portal
-- Run this in your Neon SQL console or via psql

-- 1. Make columns nullable for portal users
ALTER TABLE users ALTER COLUMN store_id DROP NOT NULL;
ALTER TABLE users ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE users ALTER COLUMN last_name DROP NOT NULL;
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE users ALTER COLUMN avatar_url DROP NOT NULL;

-- 2. Add columns needed for course portal
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS airwallex_customer_id VARCHAR(255);

-- 3. Add unique constraint on email if not exists
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);

-- 4. Create test user
INSERT INTO users (id, email, password_hash, full_name, first_name, last_name, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'test@advancedmarketing.co',
    '516f65e0c26a3003c9102801c791be43f153101b7d4d6d7e5e2b87ef18254994',
    'Test User',
    'Test',
    'User',
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = '516f65e0c26a3003c9102801c791be43f153101b7d4d6d7e5e2b87ef18254994',
    full_name = 'Test User';

-- 5. Enroll test user in course
INSERT INTO enrollments (id, user_id, course_id, status, enrolled_at)
SELECT
    gen_random_uuid(),
    u.id,
    c.id,
    'active',
    NOW()
FROM users u, courses c
WHERE u.email = 'test@advancedmarketing.co'
AND c.slug = 'shopify-branding-blueprint'
AND NOT EXISTS (
    SELECT 1 FROM enrollments e
    WHERE e.user_id = u.id AND e.course_id = c.id
);

-- Verify
SELECT 'Test user created:' as status, email, full_name FROM users WHERE email = 'test@advancedmarketing.co';
SELECT 'Enrollment created:' as status, u.email, c.title
FROM enrollments e
JOIN users u ON e.user_id = u.id
JOIN courses c ON e.course_id = c.id
WHERE u.email = 'test@advancedmarketing.co';
