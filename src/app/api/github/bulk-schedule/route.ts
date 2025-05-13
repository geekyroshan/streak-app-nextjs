import { createServerSupabaseClient } from '@/lib/server-supabase';
import { createGitHubClient } from '@/lib/github-client';
import { gql } from '@apollo/client';
import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import * as path from 'path';

// Define body type for the request
interface BulkScheduleBody {
  repoName: string;        // Full repository name (owner/name)
  filePaths: string[];     // Paths to the files to modify
  commitMessageTemplate: string; // Template for commit messages, e.g., "Update docs for {{date}}"
  commitMessages?: string[]; // Array of message templates to randomly select from
  fileContents: Record<string, string>; // Map of file paths to content
  startDate: string;      // ISO date string for start date 
  endDate: string;        // ISO date string for end date
  timeOfDay: string;      // Time string in HH:MM format for all commits
  frequency: 'daily' | 'weekdays' | 'weekends' | 'weekly'; // How often to schedule commits
  operationType: 'fix' | 'schedule'; // Whether to fix past contributions or schedule future ones
  times?: string[];       // Optional array of times for randomization
}

/**
 * POST handler for /api/github/bulk-schedule
 * Creates multiple scheduled commits at once based on date range and frequency
 * For past dates (operationType='fix'), executes commits immediately
 * For future dates (operationType='schedule'), schedules them for later execution
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: BulkScheduleBody = await request.json();
    
    console.log('Processing bulk commits with payload:', {
      repoName: body.repoName,
      filePaths: body.filePaths,
      messageTemplate: body.commitMessageTemplate,
      startDate: body.startDate,
      endDate: body.endDate,
      timeOfDay: body.timeOfDay,
      frequency: body.frequency,
      operationType: body.operationType,
      times: body.times || []
    });
    
    // Validate required fields
    if (!body.repoName || !body.filePaths.length || !body.commitMessageTemplate || 
        !body.startDate || !body.endDate || !body.frequency) {
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
    
    const now = new Date();
    const pastDates: Date[] = [];
    const futureDates: Date[] = [];
    
    // Separate past and future dates
    commitDates.forEach(date => {
      if (date < now) {
        pastDates.push(date);
      } else {
        futureDates.push(date);
      }
    });
    
    // Results to return
    const scheduledCommits = [];
    const executedCommits = [];
    
    // Initialize GitHub GraphQL client
    const githubClient = createGitHubClient(userData.github_access_token);
    
    // Initialize GitHub REST API client
    const octokit = new Octokit({
      auth: userData.github_access_token
    });
    
    // Process future dates - schedule them
    for (const commitDate of futureDates) {
      // Format date for commit message template
      const formattedDate = commitDate.toISOString().split('T')[0];
      
      // Choose a commit time - use the specified time or random from the array
      let commitTime = body.timeOfDay;
      if (body.times && body.times.length > 0) {
        // Randomly select a time from the provided times array
        const randomIndex = Math.floor(Math.random() * body.times.length);
        commitTime = body.times[randomIndex];
      }
      
      // Choose a commit message - use the template or random from the array
      let commitMessage = body.commitMessageTemplate.replace('{{date}}', formattedDate);
      if (body.commitMessages && body.commitMessages.length > 0) {
        // Randomly select a message from the provided messages array
        const randomIndex = Math.floor(Math.random() * body.commitMessages.length);
        commitMessage = body.commitMessages[randomIndex].replace('{{date}}', formattedDate);
      }
      
      // Set the time part of the date
      const [hours, minutes] = commitTime.split(':').map(Number);
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
          time: commitTime,
          filePath,
          message: commitMessage
        });
      }
    }
    
    // Process past dates - execute them immediately if operationType is 'fix'
    if (body.operationType === 'fix' && pastDates.length > 0) {
      // GraphQL query to get default branch and latest commit
      const GET_REPO_INFO = gql`
        query GetRepoInfo($owner: String!, $name: String!) {
          repository(owner: $owner, name: $name) {
            defaultBranchRef {
              name
              target {
                ... on Commit {
                  oid
                  tree {
                    oid
                  }
                }
              }
            }
          }
        }
      `;
      
      // Get repository info
      const { data: repoData } = await githubClient.query({
        query: GET_REPO_INFO,
        variables: { owner, name: repo }
      });
      
      const defaultBranch = repoData.repository.defaultBranchRef.name;
      let latestCommitSha = repoData.repository.defaultBranchRef.target.oid;
      
      // Sort past dates from oldest to newest for chronological commits
      pastDates.sort((a, b) => a.getTime() - b.getTime());
      
      // Process each past date
      for (const commitDate of pastDates) {
        // Format date for commit message template
        const formattedDate = commitDate.toISOString().split('T')[0];
        
        // Choose a commit time - use the specified time or random from the array
        let commitTime = body.timeOfDay;
        if (body.times && body.times.length > 0) {
          // Randomly select a time from the provided times array
          const randomIndex = Math.floor(Math.random() * body.times.length);
          commitTime = body.times[randomIndex];
        }
        
        // Choose a commit message - use the template or random from the array
        let commitMessage = body.commitMessageTemplate.replace('{{date}}', formattedDate);
        if (body.commitMessages && body.commitMessages.length > 0) {
          // Randomly select a message from the provided messages array
          const randomIndex = Math.floor(Math.random() * body.commitMessages.length);
          commitMessage = body.commitMessages[randomIndex].replace('{{date}}', formattedDate);
        }
        
        // Set the time part of the date
        const [hours, minutes] = commitTime.split(':').map(Number);
        commitDate.setHours(hours, minutes, 0, 0);
        
        try {
          // Get the latest commit on the default branch
          const { data: latestCommit } = await octokit.git.getCommit({
            owner,
            repo,
            commit_sha: latestCommitSha
          });
          
          // Create a single commit for all files instead of one commit per file
          // First, prepare the tree with all file changes
          const treeEntries = [];
          
          for (const filePath of body.filePaths) {
            const fileContent = body.fileContents[filePath] || '';
            
            try {
              // Create a new blob for the file content
              const { data: blob } = await octokit.git.createBlob({
                owner,
                repo,
                content: Buffer.from(fileContent).toString('base64'),
                encoding: 'base64'
              });
              
              // Add to tree entries
              treeEntries.push({
                path: filePath,
                mode: '100644' as '100644', // Normal file mode
                type: 'blob' as 'blob',
                sha: blob.sha
              });
            } catch (error) {
              console.error(`Error creating blob for ${filePath}:`, error);
              // Continue with other files
            }
          }
          
          if (treeEntries.length === 0) {
            console.log(`No valid files to commit for ${formattedDate}`);
            continue; // Skip to next date if no valid files
          }
          
          // Create a new tree with all updated files
          const { data: tree } = await octokit.git.createTree({
            owner,
            repo,
            base_tree: latestCommit.tree.sha,
            tree: treeEntries
          });
          
          // Create a new commit with the backdate
          const { data: commit } = await octokit.git.createCommit({
            owner,
            repo,
            message: commitMessage,
            tree: tree.sha,
            parents: [latestCommitSha],
            author: {
              name: userData.github_username || 'GitHub User',
              email: `${userData.github_username || 'user'}@users.noreply.github.com`,
              date: commitDate.toISOString()
            },
            committer: {
              name: userData.github_username || 'GitHub User',
              email: `${userData.github_username || 'user'}@users.noreply.github.com`,
              date: commitDate.toISOString()
            }
          });
          
          // Update the reference
          await octokit.git.updateRef({
            owner,
            repo,
            ref: `heads/${defaultBranch}`,
            sha: commit.sha,
            force: true // Use force to ensure the ref is updated regardless of conflicts
          });
          
          // Update latestCommitSha to the new commit SHA for the next iteration
          latestCommitSha = commit.sha;
          
          // Record the successful commit - include commitUrl for frontend display
          const commitUrl = `https://github.com/${owner}/${repo}/commit/${commit.sha}`;
          
          executedCommits.push({
            date: formattedDate,
            time: commitTime,
            filePath: body.filePaths.join(', '), // Join all file paths
            commitSha: commit.sha,
            commitUrl: commitUrl, // Add commit URL
            message: commitMessage
          });
          
        } catch (error) {
          console.error(`Error processing date ${formattedDate}:`, error);
          // Continue with other dates
        }
      }
    }
    
    // Return successful response
    return NextResponse.json({
      success: true,
      data: {
        scheduledCommits,
        executedCommits,
        totalScheduled: scheduledCommits.length,
        totalExecuted: executedCommits.length
      },
      message: `Successfully processed ${scheduledCommits.length + executedCommits.length} commits (${scheduledCommits.length} scheduled, ${executedCommits.length} executed)`
    });
    
  } catch (error: unknown) {
    console.error('Error processing bulk commits:', error);
    
    // Get error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Return appropriate error response
    return NextResponse.json(
      { error: `Failed to process bulk commits: ${errorMessage}` },
      { status: 500 }
    );
  }
} 