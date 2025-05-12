-- Create the scheduled_commits table to store commits that will be executed at specified times
CREATE TABLE IF NOT EXISTS public.scheduled_commits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
    commit_message TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_content TEXT NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add an index for faster querying of commits by status
CREATE INDEX IF NOT EXISTS idx_scheduled_commits_status ON public.scheduled_commits(status);

-- Add an index for querying by repository
CREATE INDEX IF NOT EXISTS idx_scheduled_commits_repository ON public.scheduled_commits(repository_id);

-- Add an index for querying by scheduled time
CREATE INDEX IF NOT EXISTS idx_scheduled_commits_time ON public.scheduled_commits(scheduled_time);

-- Grant permissions to authenticated users
ALTER TABLE public.scheduled_commits ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own scheduled commits
CREATE POLICY select_scheduled_commits ON public.scheduled_commits 
    FOR SELECT 
    USING (
        repository_id IN (
            SELECT id FROM public.repositories WHERE user_id = auth.uid()
        )
    );

-- Create policy to allow users to insert their own scheduled commits
CREATE POLICY insert_scheduled_commits ON public.scheduled_commits 
    FOR INSERT 
    WITH CHECK (
        repository_id IN (
            SELECT id FROM public.repositories WHERE user_id = auth.uid()
        )
    );

-- Create policy to allow users to update their own scheduled commits
CREATE POLICY update_scheduled_commits ON public.scheduled_commits 
    FOR UPDATE 
    USING (
        repository_id IN (
            SELECT id FROM public.repositories WHERE user_id = auth.uid()
        )
    );

-- Create policy to allow users to delete their own scheduled commits
CREATE POLICY delete_scheduled_commits ON public.scheduled_commits 
    FOR DELETE 
    USING (
        repository_id IN (
            SELECT id FROM public.repositories WHERE user_id = auth.uid()
        )
    );

-- Comment on the table and columns for better database documentation
COMMENT ON TABLE public.scheduled_commits IS 'Stores commits that will be executed at scheduled times';
COMMENT ON COLUMN public.scheduled_commits.id IS 'Unique identifier for the scheduled commit';
COMMENT ON COLUMN public.scheduled_commits.repository_id IS 'Foreign key to the repositories table';
COMMENT ON COLUMN public.scheduled_commits.commit_message IS 'Message used when creating the commit';
COMMENT ON COLUMN public.scheduled_commits.file_path IS 'Path to the file being modified';
COMMENT ON COLUMN public.scheduled_commits.file_content IS 'Content that will be written to the file';
COMMENT ON COLUMN public.scheduled_commits.scheduled_time IS 'When the commit should be executed';
COMMENT ON COLUMN public.scheduled_commits.status IS 'Current status (pending, completed, failed)';
COMMENT ON COLUMN public.scheduled_commits.result IS 'JSON object containing results of execution';
COMMENT ON COLUMN public.scheduled_commits.created_at IS 'When the scheduled commit was created';
COMMENT ON COLUMN public.scheduled_commits.updated_at IS 'When the scheduled commit was last updated'; 