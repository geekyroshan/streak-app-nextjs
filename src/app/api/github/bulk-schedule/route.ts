import { createServerSupabaseClient } from '@/lib/server-supabase';
import { NextRequest, NextResponse } from 'next/server';

// Define body type for the request
interface BulkScheduleBody {
  repoName: string;        // Full repository name (owner/name)
  filePaths: string[];     // Paths to the files to modify
  commitMessageTemplate: string; // Template for commit messages, e.g., "Update docs for {{date}}"
  fileContents: Record<string, string>; // Map of file paths to content
  startDate: string;      // ISO date string for start date 
  endDate: string;        // ISO date string for end date
  timeOfDay: string;      // Time string in HH:MM format for all commits
  frequency: 'daily' | 'weekdays' | 'weekends' | 'weekly'; // How often to schedule commits
}

/**
 * POST handler for /api/github/bulk-schedule
 * Creates multiple scheduled commits at once based on date range and frequency
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: BulkScheduleBody = await request.json();
    
    console.log('Scheduling bulk commits with payload:', {
      repoName: body.repoName,
      filePaths: body.filePaths,
      messageTemplate: body.commitMessageTemplate,
      startDate: body.startDate,
      endDate: body.endDate,
      timeOfDay: body.timeOfDay,
      frequency: body.frequency
    });
    
    // Validate required fields
    if (!body.repoName || !body.filePaths.length || !body.commitMessageTemplate || 
        !body.startDate || !body.endDate || !body.timeOfDay || !body.frequency) {
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
    
    // Calculate dates in the range based on frequency
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    const commitDates: Date[] = [];
    
    // Helper to check if a date should be included based on frequency
    const shouldIncludeDate = (date: Date) => {
      const day = date.getDay();
      switch (body.frequency) {
        case 'daily':
          return true;
        case 'weekdays':
          return day >= 1 && day <= 5; // Monday-Friday
        case 'weekends':
          return day === 0 || day === 6; // Sunday or Saturday
        case 'weekly':
          return date.getDay() === startDate.getDay(); // Same day of week as start date
        default:
          return false;
      }
    };
    
    // Generate all dates in the range
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      if (shouldIncludeDate(date)) {
        commitDates.push(new Date(date));
      }
    }
    
    // Limit the number of commits to prevent abuse (max 30)
    if (commitDates.length > 30) {
      return NextResponse.json(
        { error: 'Too many commits requested. Please limit to 30 or fewer scheduled commits.' },
        { status: 400 }
      );
    }
    
    // Generate scheduled commits for each date
    const scheduledCommits = [];
    
    for (const commitDate of commitDates) {
      // Format date for commit message template
      const formattedDate = commitDate.toISOString().split('T')[0];
      const commitMessage = body.commitMessageTemplate.replace('{{date}}', formattedDate);
      
      // Set the time part of the date
      const [hours, minutes] = body.timeOfDay.split(':').map(Number);
      commitDate.setHours(hours, minutes, 0, 0);
      
      // For each file path, create a scheduled commit
      for (const filePath of body.filePaths) {
        const fileContent = body.fileContents[filePath] || '';
        
        const { data: commit, error: commitError } = await supabase
          .from('scheduled_commits')
          .insert({
            repository_id: repositoryId,
            commit_message: commitMessage,
            file_path: filePath,
            file_content: fileContent,
            scheduled_time: commitDate.toISOString(),
            status: 'pending'
          })
          .select('id, scheduled_time')
          .single();
        
        if (commitError) {
          console.error(`Error scheduling commit for ${formattedDate}:`, commitError);
          continue; // Skip this commit but continue with others
        }
        
        scheduledCommits.push({
          id: commit.id,
          date: formattedDate,
          time: body.timeOfDay,
          filePath
        });
      }
    }
    
    // Return successful response
    return NextResponse.json({
      success: true,
      data: {
        scheduledCommits,
        totalCommits: scheduledCommits.length
      },
      message: `Successfully scheduled ${scheduledCommits.length} commits`
    });
    
  } catch (error: unknown) {
    console.error('Error scheduling bulk commits:', error);
    
    // Get error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Return appropriate error response
    return NextResponse.json(
      { error: `Failed to schedule bulk commits: ${errorMessage}` },
      { status: 500 }
    );
  }
} 