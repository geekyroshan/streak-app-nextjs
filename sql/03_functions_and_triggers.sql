-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the updated_at trigger to all tables with updated_at column
DO $$
BEGIN
  -- Check and create trigger for user_preferences
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_user_preferences_updated_at'
  ) THEN
    CREATE TRIGGER update_user_preferences_updated_at
      BEFORE UPDATE ON public.user_preferences
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;

  -- Check and create trigger for repositories
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_repositories_updated_at'
  ) THEN
    CREATE TRIGGER update_repositories_updated_at
      BEFORE UPDATE ON public.repositories
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;

  -- Check and create trigger for scheduled_commits
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_scheduled_commits_updated_at'
  ) THEN
    CREATE TRIGGER update_scheduled_commits_updated_at
      BEFORE UPDATE ON public.scheduled_commits
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at();
  END IF;
END
$$;

-- Function to get all repositories for a user
CREATE OR REPLACE FUNCTION get_user_repositories(user_uuid UUID)
RETURNS SETOF public.repositories AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.repositories
  WHERE user_id = user_uuid
  ORDER BY updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all scheduled commits for a repository
CREATE OR REPLACE FUNCTION get_repository_commits(repo_uuid UUID)
RETURNS SETOF public.scheduled_commits AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.scheduled_commits
  WHERE repository_id = repo_uuid
  ORDER BY scheduled_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update commit status
CREATE OR REPLACE FUNCTION update_commit_status(commit_uuid UUID, new_status TEXT, result_json JSONB DEFAULT NULL)
RETURNS public.scheduled_commits AS $$
DECLARE
  updated_commit public.scheduled_commits;
BEGIN
  UPDATE public.scheduled_commits
  SET 
    status = new_status,
    result = COALESCE(result_json, result),
    updated_at = NOW()
  WHERE id = commit_uuid
  RETURNING * INTO updated_commit;
  
  RETURN updated_commit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify when commits are approaching their scheduled time
CREATE OR REPLACE FUNCTION notify_upcoming_commits()
RETURNS TRIGGER AS $$
BEGIN
  -- If a new commit is scheduled or an existing one is updated
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.scheduled_time <> NEW.scheduled_time)) THEN
    -- Create a notification for commits approaching their time
    PERFORM pg_notify(
      'upcoming_commits', 
      json_build_object(
        'commit_id', NEW.id,
        'repository_id', NEW.repository_id,
        'scheduled_time', NEW.scheduled_time,
        'operation', TG_OP
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the notification trigger to scheduled_commits
DO $$
BEGIN
  -- Check and create notification trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'notify_upcoming_commits_trigger'
  ) THEN
    CREATE TRIGGER notify_upcoming_commits_trigger
      AFTER INSERT OR UPDATE ON public.scheduled_commits
      FOR EACH ROW
      EXECUTE FUNCTION notify_upcoming_commits();
  END IF;
END
$$; 