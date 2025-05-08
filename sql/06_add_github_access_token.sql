-- Add github_access_token column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS github_access_token TEXT;

-- Add comment to the column
COMMENT ON COLUMN public.users.github_access_token IS 'GitHub OAuth access token for API calls';

-- Update policies to include the new column
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
GRANT SELECT, UPDATE (github_access_token) ON public.users TO authenticated;

-- Add index for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_users_github_username ON public.users(github_username); 