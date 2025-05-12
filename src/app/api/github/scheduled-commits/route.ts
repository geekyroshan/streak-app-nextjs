import { createServerSupabaseClient } from '@/lib/server-supabase';
import { NextRequest, NextResponse } from 'next/server';

// Define types for the Supabase query results
interface Repository {
  id: string;
  name: string;
  url: string;
  user_id?: string;
}

interface ScheduledCommit {
  id: string;
  commit_message: string;
  file_path: string;
  scheduled_time: string;
  status: string;
  result: any;
  created_at: string;
  repositories: Repository;
}

/**
 * GET handler for /api/github/scheduled-commits
 * Fetches scheduled commits for the authenticated user
 * 
 * Query parameters:
 * - status: Filter by status (e.g., pending, completed, failed)
 * - repository: Filter by repository name (optional)
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const repository = searchParams.get('repository');
    
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
    
    // Build query to fetch scheduled commits
    let query = supabase
      .from('scheduled_commits')
      .select(`
        id,
        commit_message,
        file_path,
        scheduled_time,
        status,
        result,
        created_at,
        repositories(id, name, url)
      `)
      .eq('repositories.user_id', session.user.id);
    
    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    // Apply repository filter if provided
    if (repository) {
      query = query.eq('repositories.name', repository);
    }
    
    // Order by scheduled time (ascending)
    query = query.order('scheduled_time', { ascending: true });
    
    // Execute the query
    const { data: scheduledCommits, error } = await query;
    
    if (error) {
      console.error('Error fetching scheduled commits:', error);
      return NextResponse.json(
        { error: 'Failed to fetch scheduled commits' },
        { status: 500 }
      );
    }
    
    // Format the response data
    const formattedCommits = (scheduledCommits || []).map((commit: any) => ({
      id: commit.id,
      commitMessage: commit.commit_message,
      filePath: commit.file_path,
      scheduledTime: commit.scheduled_time,
      status: commit.status,
      result: commit.result,
      createdAt: commit.created_at,
      repository: {
        id: commit.repositories?.id,
        name: commit.repositories?.name,
        url: commit.repositories?.url
      }
    }));
    
    // Return formatted data
    return NextResponse.json({
      success: true,
      data: formattedCommits
    });
    
  } catch (error: unknown) {
    console.error('Error fetching scheduled commits:', error);
    
    // Get error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Return appropriate error response
    return NextResponse.json(
      { error: `Failed to fetch scheduled commits: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for /api/github/scheduled-commits
 * Cancels a scheduled commit
 * 
 * Body parameters:
 * - id: ID of the scheduled commit to cancel
 */
export async function DELETE(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Commit ID is required' },
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
    
    // Verify that the scheduled commit belongs to the user
    const { data: commit, error: fetchError } = await supabase
      .from('scheduled_commits')
      .select(`
        id,
        repositories!inner(user_id)
      `)
      .eq('id', id)
      .single();
    
    if (fetchError || !commit) {
      return NextResponse.json(
        { error: 'Scheduled commit not found' },
        { status: 404 }
      );
    }
    
    // Check if user owns the commit
    const repoUserId = (commit as any).repositories?.user_id;
    if (repoUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to cancel this scheduled commit' },
        { status: 403 }
      );
    }
    
    // Delete the scheduled commit
    const { error: deleteError } = await supabase
      .from('scheduled_commits')
      .delete()
      .eq('id', id);
    
    if (deleteError) {
      console.error('Error deleting scheduled commit:', deleteError);
      return NextResponse.json(
        { error: 'Failed to cancel scheduled commit' },
        { status: 500 }
      );
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Scheduled commit cancelled successfully'
    });
    
  } catch (error: unknown) {
    console.error('Error cancelling scheduled commit:', error);
    
    // Get error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Return appropriate error response
    return NextResponse.json(
      { error: `Failed to cancel scheduled commit: ${errorMessage}` },
      { status: 500 }
    );
  }
} 