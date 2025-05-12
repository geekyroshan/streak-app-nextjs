import { createServerSupabaseClient } from '@/lib/server-supabase';
import { NextRequest, NextResponse } from 'next/server';

// Define body type for the request
interface ScheduleCommitBody {
  repoName: string;       // Full repository name (owner/name)
  filePath: string;       // Path to the file to modify
  commitMessage: string;  // Commit message
  fileContent: string;    // New content for the file
  date: string;           // ISO date string for scheduled date
  time: string;           // Time string in HH:MM format
}

/**
 * POST handler for /api/github/schedule-commit
 * Creates a scheduled commit to be executed at the specified time
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ScheduleCommitBody = await request.json();
    
    console.log('Scheduling commit with payload:', {
      repoName: body.repoName,
      filePath: body.filePath,
      message: body.commitMessage,
      hasContent: !!body.fileContent,
      date: body.date,
      time: body.time
    });
    
    // Validate required fields
    if (!body.repoName || !body.filePath || !body.commitMessage || !body.fileContent || !body.date || !body.time) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create server-side Supabase client to access authenticated session
    const supabase = await createServerSupabaseClient();
    
    // Get session and verify user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get user data including GitHub access token
    const { data: userData } = await supabase
      .from('users')
      .select('id, github_access_token, github_username')
      .eq('id', session.user.id)
      .single();
    
    if (!userData || !userData.github_access_token) {
      return NextResponse.json(
        { error: 'GitHub token not found for user' },
        { status: 400 }
      );
    }
    
    // Get or create repository record
    const [owner, repo] = body.repoName.includes('/') 
      ? body.repoName.split('/')
      : [userData.github_username, body.repoName];
    
    const repoFullName = `${owner}/${repo}`;
    
    // Check if repository exists in our database
    const { data: existingRepo } = await supabase
      .from('repositories')
      .select('id')
      .eq('user_id', userData.id)
      .eq('name', repoFullName)
      .single();
    
    let repositoryId = existingRepo?.id;
    
    // If repository doesn't exist, create it
    if (!repositoryId) {
      const { data: newRepo, error: repoError } = await supabase
        .from('repositories')
        .insert({
          user_id: userData.id,
          name: repoFullName,
          url: `https://github.com/${repoFullName}`,
          is_private: false // We don't know, but it doesn't matter for this purpose
        })
        .select('id')
        .single();
      
      if (repoError) {
        console.error('Error creating repository record:', repoError);
        return NextResponse.json(
          { error: 'Failed to create repository record' },
          { status: 500 }
        );
      }
      
      repositoryId = newRepo.id;
    }
    
    // Format the scheduled timestamp
    const [year, month, day] = body.date.split('-').map(Number);
    const [hour, minute] = body.time.split(':').map(Number);
    const scheduledDate = new Date(year, month - 1, day, hour, minute);
    
    // Make sure the scheduled date is in the future
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      );
    }
    
    // Store the scheduled commit in Supabase
    const { data: scheduledCommit, error: commitError } = await supabase
      .from('scheduled_commits')
      .insert({
        repository_id: repositoryId,
        commit_message: body.commitMessage,
        file_path: body.filePath,
        file_content: body.fileContent,
        scheduled_time: scheduledDate.toISOString(),
        status: 'pending'
      })
      .select('id, scheduled_time')
      .single();
    
    if (commitError) {
      console.error('Error scheduling commit:', commitError);
      return NextResponse.json(
        { error: 'Failed to schedule commit' },
        { status: 500 }
      );
    }
    
    // Return successful response
    return NextResponse.json({
      success: true,
      data: {
        commitId: scheduledCommit.id,
        scheduledTime: scheduledCommit.scheduled_time,
        repository: repoFullName,
        filePath: body.filePath
      },
      message: 'Commit scheduled successfully'
    });
    
  } catch (error: unknown) {
    console.error('Error scheduling commit:', error);
    
    // Get error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Return appropriate error response
    return NextResponse.json(
      { error: `Failed to schedule commit: ${errorMessage}` },
      { status: 500 }
    );
  }
} 