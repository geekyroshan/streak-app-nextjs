import { createServerSupabaseClient } from '@/lib/server-supabase';
import { createGitHubClient } from '@/lib/github-client';
import { gql } from '@apollo/client';
import { NextRequest, NextResponse } from 'next/server';

// Define body type for the request
interface CreateCommitBody {
  repoName: string;       // Full repository name (owner/name)
  filePath: string;       // Path to the file to modify
  commitMessage: string;  // Commit message
  fileContent: string;    // New content for the file
  date: string;           // ISO date string for backdated commit
  time: string;           // Time string in HH:MM format
}

/**
 * POST handler for /api/github/create-commit
 * Creates a backdated commit on GitHub
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: CreateCommitBody = await request.json();
    
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
      .select('github_access_token, github_username')
      .eq('id', session.user.id)
      .single();
    
    if (!userData || !userData.github_access_token) {
      return NextResponse.json(
        { error: 'GitHub token not found for user' },
        { status: 400 }
      );
    }
    
    // Create GitHub API client with user's access token
    const githubClient = createGitHubClient(userData.github_access_token);
    
    // Extract owner and repo name from the full repository name
    const [owner, repo] = body.repoName.includes('/') 
      ? body.repoName.split('/')
      : [userData.github_username, body.repoName];
    
    // First, we need to get the repository default branch and the current commit to use as parent
    const REPOSITORY_INFO_QUERY = gql`
      query GetRepositoryInfo($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          defaultBranchRef {
            name
            target {
              ... on Commit {
                oid
              }
            }
          }
        }
      }
    `;
    
    const repoInfoResult = await githubClient.query({
      query: REPOSITORY_INFO_QUERY,
      variables: {
        owner,
        name: repo
      }
    });
    
    if (!repoInfoResult.data.repository) {
      return NextResponse.json(
        { error: `Repository ${body.repoName} not found` },
        { status: 404 }
      );
    }
    
    const defaultBranch = repoInfoResult.data.repository.defaultBranchRef.name;
    const parentCommitId = repoInfoResult.data.repository.defaultBranchRef.target.oid;
    
    // Next, we need to get the current file content to get its blob data
    const GET_FILE_QUERY = gql`
      query GetFileInfo($owner: String!, $name: String!, $expression: String!) {
        repository(owner: $owner, name: $name) {
          object(expression: $expression) {
            ... on Blob {
              oid
              text
            }
          }
        }
      }
    `;
    
    const fileResult = await githubClient.query({
      query: GET_FILE_QUERY,
      variables: {
        owner,
        name: repo,
        expression: `${defaultBranch}:${body.filePath}`
      }
    });
    
    // If file doesn't exist, we'll create it
    const fileExists = fileResult.data.repository?.object;
    
    // Create a commit with the backdated timestamp
    // Combine date and time into a valid ISO string
    const [year, month, day] = body.date.split('-').map(Number);
    const [hour, minute] = body.time.split(':').map(Number);
    
    // Create a valid Date object in local timezone
    const backdatedDate = new Date(year, month - 1, day, hour, minute);
    
    // Create the mutation to create a commit
    const CREATE_COMMIT_MUTATION = gql`
      mutation CreateCommit($input: CreateCommitOnBranchInput!) {
        createCommitOnBranch(input: $input) {
          commit {
            url
            oid
          }
        }
      }
    `;
    
    // Define the file changes
    const fileChanges = {
      path: body.filePath,
      contents: Buffer.from(body.fileContent).toString('base64'),
      encoding: "base64"
    };
    
    // Execute the mutation to create a commit
    const commitResult = await githubClient.mutate({
      mutation: CREATE_COMMIT_MUTATION,
      variables: {
        input: {
          branch: {
            repositoryNameWithOwner: `${owner}/${repo}`,
            branchName: defaultBranch
          },
          message: {
            headline: body.commitMessage
          },
          fileChanges: {
            additions: [fileChanges]
          },
          expectedHeadOid: parentCommitId,
          authorEmail: session.user.email || "user@example.com",
          authorName: userData.github_username || session.user.user_metadata?.full_name || "GitHub User",
          // Use the backdated timestamp
          authoredDate: backdatedDate.toISOString()
        }
      }
    });
    
    // Check if the commit was created successfully
    if (!commitResult.data?.createCommitOnBranch?.commit) {
      return NextResponse.json(
        { error: 'Failed to create commit' },
        { status: 500 }
      );
    }
    
    // Return successful response with commit details
    return NextResponse.json({
      success: true,
      commitUrl: commitResult.data.createCommitOnBranch.commit.url,
      commitId: commitResult.data.createCommitOnBranch.commit.oid,
      timestamp: backdatedDate.toISOString()
    });
    
  } catch (error: unknown) {
    console.error('Error creating backdated commit:', error);
    
    // Get error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check for specific error types
    const isRateLimitError = errorMessage.includes('API rate limit exceeded');
    const isAuthError = errorMessage.includes('authentication') || errorMessage.includes('unauthorized');
    
    // Return appropriate error response
    return NextResponse.json(
      { 
        error: isRateLimitError 
          ? 'GitHub API rate limit exceeded. Please try again later.'
          : isAuthError
            ? 'GitHub authentication error. Please reconnect your GitHub account.'
            : 'Failed to create backdated commit'
      },
      { 
        status: isRateLimitError 
          ? 429 
          : isAuthError 
            ? 401 
            : 500 
      }
    );
  }
} 