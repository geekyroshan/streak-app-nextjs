-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_commits ENABLE ROW LEVEL SECURITY;

-- RLS policies for users table
CREATE POLICY users_select_own ON public.users 
  FOR SELECT USING (auth.uid()::text = auth_id);
  
CREATE POLICY users_update_own ON public.users 
  FOR UPDATE USING (auth.uid()::text = auth_id);
  
CREATE POLICY users_insert_own ON public.users 
  FOR INSERT WITH CHECK (auth.uid()::text = auth_id);

-- RLS policies for user_preferences table
CREATE POLICY user_preferences_select_own ON public.user_preferences 
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()::text)
  );
  
CREATE POLICY user_preferences_insert_own ON public.user_preferences 
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()::text)
  );
  
CREATE POLICY user_preferences_update_own ON public.user_preferences 
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()::text)
  );
  
CREATE POLICY user_preferences_delete_own ON public.user_preferences 
  FOR DELETE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()::text)
  );

-- RLS policies for repositories table
CREATE POLICY repositories_select_own ON public.repositories 
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()::text)
  );
  
CREATE POLICY repositories_insert_own ON public.repositories 
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()::text)
  );
  
CREATE POLICY repositories_update_own ON public.repositories 
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()::text)
  );
  
CREATE POLICY repositories_delete_own ON public.repositories 
  FOR DELETE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()::text)
  );

-- RLS policies for scheduled_commits table
CREATE POLICY scheduled_commits_select_own ON public.scheduled_commits 
  FOR SELECT USING (
    repository_id IN (
      SELECT id FROM public.repositories 
      WHERE user_id IN (
        SELECT id FROM public.users WHERE auth_id = auth.uid()::text
      )
    )
  );
  
CREATE POLICY scheduled_commits_insert_own ON public.scheduled_commits 
  FOR INSERT WITH CHECK (
    repository_id IN (
      SELECT id FROM public.repositories 
      WHERE user_id IN (
        SELECT id FROM public.users WHERE auth_id = auth.uid()::text
      )
    )
  );
  
CREATE POLICY scheduled_commits_update_own ON public.scheduled_commits 
  FOR UPDATE USING (
    repository_id IN (
      SELECT id FROM public.repositories 
      WHERE user_id IN (
        SELECT id FROM public.users WHERE auth_id = auth.uid()::text
      )
    )
  );
  
CREATE POLICY scheduled_commits_delete_own ON public.scheduled_commits 
  FOR DELETE USING (
    repository_id IN (
      SELECT id FROM public.repositories 
      WHERE user_id IN (
        SELECT id FROM public.users WHERE auth_id = auth.uid()::text
      )
    )
  );