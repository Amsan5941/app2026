-- Verify and Fix Database Schema

-- 1. Check if users table exists and has correct foreign key
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'users' AND tc.constraint_type = 'FOREIGN KEY';

-- 2. If the foreign key is wrong, drop and recreate it
-- Run these if needed:

-- Drop existing foreign key if it exists
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_id_fkey;

-- Add correct foreign key (references auth.users ON DELETE CASCADE)
-- ALTER TABLE users 
-- ADD CONSTRAINT users_auth_id_fkey 
-- FOREIGN KEY (auth_id) 
-- REFERENCES auth.users(id) 
-- ON DELETE CASCADE;

-- 3. Check for orphaned records (users with auth_id that doesn't exist)
SELECT u.id, u.auth_id, u.firstname, u.lastname
FROM users u
LEFT JOIN auth.users au ON u.auth_id = au.id
WHERE au.id IS NULL;

-- 4. Clean up orphaned records if any exist
-- DELETE FROM users 
-- WHERE auth_id NOT IN (SELECT id FROM auth.users);

-- 5. Verify auth.users has users
SELECT COUNT(*) as auth_user_count FROM auth.users;
SELECT COUNT(*) as users_count FROM users;
