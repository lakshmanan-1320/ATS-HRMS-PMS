-- Migration 044: Fix client_admins_created_by_fkey to reference users(user_id) instead of super_admins
ALTER TABLE client_admins DROP CONSTRAINT IF EXISTS client_admins_created_by_fkey;

ALTER TABLE client_admins 
ADD CONSTRAINT client_admins_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL;
