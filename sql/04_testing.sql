-- Testing SQL script for database functions and triggers
-- Run this in the Supabase SQL Editor to test the functionality

-- 1. Create test data
-- Insert a test user
INSERT INTO public.users (email, auth_id)
VALUES ('test@example.com', 'auth0|test123');

-- Get the user ID for reference
DO $$ 
DECLARE 
  test_user_id UUID;
BEGIN
  SELECT id INTO test_user_id FROM public.users WHERE email = 'test@example.com';
  
  -- Insert user preferences
  INSERT INTO public.user_preferences (user_id, theme, notification_settings)
  VALUES (test_user_id, 'dark', '{"streak_reminder": true, "commit_success": true}'::jsonb);
  
  -- Insert test repositories
  INSERT INTO public.repositories (user_id, name, url, description)
  VALUES 
    (test_user_id, 'Test Repo 1', 'https://github.com/test/repo1', 'First test repository'),
    (test_user_id, 'Test Repo 2', 'https://github.com/test/repo2', 'Second test repository');
  
  -- Get repository ID for scheduled commits
  DECLARE
    test_repo_id UUID;
  BEGIN
    SELECT id INTO test_repo_id FROM public.repositories WHERE name = 'Test Repo 1';
    
    -- Insert scheduled commits
    INSERT INTO public.scheduled_commits (repository_id, commit_message, file_path, scheduled_time, status)
    VALUES 
      (test_repo_id, 'Test commit 1', 'README.md', NOW() + INTERVAL '1 day', 'scheduled'),
      (test_repo_id, 'Test commit 2', 'src/index.js', NOW() + INTERVAL '2 days', 'scheduled');
  END;
END $$;

-- 2. Test database functions
-- Test get_user_repositories function
SELECT * FROM get_user_repositories(
  (SELECT id FROM public.users WHERE email = 'test@example.com')
);

-- Test get_repository_commits function
SELECT * FROM get_repository_commits(
  (SELECT id FROM public.repositories WHERE name = 'Test Repo 1')
);

-- Test update_commit_status function
SELECT * FROM update_commit_status(
  (SELECT id FROM public.scheduled_commits LIMIT 1),
  'processing',
  '{"started_at": "2023-05-04T15:00:00Z"}'::jsonb
);

-- 3. Test triggers
-- Test updated_at trigger
UPDATE public.repositories 
SET description = 'Updated description'
WHERE name = 'Test Repo 1';

-- Verify updated_at has been set to now
SELECT name, description, created_at, updated_at 
FROM public.repositories 
WHERE name = 'Test Repo 1';

-- Test notification trigger
-- Note: This will send a notification event, but you would need a subscription to capture it
UPDATE public.scheduled_commits
SET scheduled_time = NOW() + INTERVAL '3 days'
WHERE commit_message = 'Test commit 1';

-- 4. Clean up test data (optional)
-- DELETE FROM public.scheduled_commits WHERE repository_id IN (SELECT id FROM public.repositories WHERE user_id = (SELECT id FROM public.users WHERE email = 'test@example.com'));
-- DELETE FROM public.repositories WHERE user_id = (SELECT id FROM public.users WHERE email = 'test@example.com');
-- DELETE FROM public.user_preferences WHERE user_id = (SELECT id FROM public.users WHERE email = 'test@example.com');
-- DELETE FROM public.users WHERE email = 'test@example.com'; 