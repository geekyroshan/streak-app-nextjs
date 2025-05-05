-- Add github_username column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS github_username TEXT;

-- Update existing user records with github_username from auth metadata if available
-- This helps backfill existing records
UPDATE public.users 
SET github_username = auth.users.raw_user_meta_data->>'user_name'
FROM auth.users 
WHERE public.users.auth_id = auth.users.id::text AND public.users.github_username IS NULL;

-- Add comment to the column
COMMENT ON COLUMN public.users.github_username IS 'GitHub username from OAuth login';

-- Update policy to include the new column
DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own ON public.users 
  FOR SELECT USING (auth.uid()::text = auth_id);
  
DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users 
  FOR UPDATE USING (auth.uid()::text = auth_id);
  
DROP POLICY IF EXISTS users_insert_own ON public.users;
CREATE POLICY users_insert_own ON public.users 
  FOR INSERT WITH CHECK (auth.uid()::text = auth_id);

-- Grant access to the column
GRANT SELECT, UPDATE (github_username) ON public.users TO authenticated; 