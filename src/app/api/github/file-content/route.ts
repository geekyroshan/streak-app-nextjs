import { createServerSupabaseClient } from '@/lib/server-supabase';
import { createGitHubClient } from '@/lib/github-client';
import { gql } from '@apollo/client';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET handler for /api/github/file-content
 * Fetches content of a file from a GitHub repository
 * 
 * Query parameters:
 * - repoName: Repository name (required)
 * - path: File path within the repository (required)
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const repoName = searchParams.get('repoName');
    const path = searchParams.get('path');
    
    if (!repoName) {
      return NextResponse.json(
        { error: 'Repository name is required' },
        { status: 400 }
      );
    }
    
    if (!path) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }
    
    console.log('Fetching file content:', { repoName, path });
    
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
    
    console.log('User authenticated:', { userId: session.user.id });
    
    // Get user data including GitHub access token and username
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('github_access_token, github_username')
      .eq('id', session.user.id)
      .single();
    
    if (userError) {
      console.error('Error fetching user data:', userError);
      return NextResponse.json(
        { error: `Error fetching user data: ${userError.message}` },
        { status: 500 }
      );
    }
    
    if (!userData || !userData.github_access_token || !userData.github_username) {
      console.error('GitHub token or username not found for user', { 
        userId: session.user.id,
        hasUserData: !!userData,
        hasToken: userData ? !!userData.github_access_token : false,
        hasUsername: userData ? !!userData.github_username : false
      });
      
      return NextResponse.json(
        { error: 'GitHub token or username not found for user' },
        { status: 400 }
      );
    }
    
    // Create GitHub API client with user's access token
    const githubClient = createGitHubClient(userData.github_access_token);
    
    // GraphQL query to fetch file content
    const FILE_CONTENT_QUERY = gql`
      query GetFileContent($owner: String!, $name: String!, $expression: String!) {
        repository(owner: $owner, name: $name) {
          object(expression: $expression) {
            ... on Blob {
              text
              byteSize
              isBinary
            }
          }
        }
      }
    `;
    
    // Extract owner and repo name from the full repository name
    const [owner, repo] = repoName.includes('/') 
      ? repoName.split('/')
      : [userData.github_username, repoName];
    
    // Get file content using GraphQL
    const { data } = await githubClient.query({
      query: FILE_CONTENT_QUERY,
      variables: {
        owner,
        name: repo,
        expression: `HEAD:${path}`
      }
    });
    
    // Handle case where repository or file doesn't exist
    if (!data.repository || !data.repository.object) {
      return NextResponse.json(
        { error: `File ${path} not found in repository ${repoName}` },
        { status: 404 }
      );
    }
    
    const fileObject = data.repository.object;
    
    // Check if the file is binary
    if (fileObject.isBinary) {
      return NextResponse.json(
        { error: 'Cannot display binary file content' },
        { status: 400 }
      );
    }
    
    // Check if file is too large (>1MB)
    if (fileObject.byteSize > 1024 * 1024) {
      return NextResponse.json(
        { error: 'File is too large to display' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      content: fileObject.text,
      path,
      size: fileObject.byteSize,
      repoName: `${owner}/${repo}`
    });
    
  } catch (error: unknown) {
    console.error('Error fetching file content:', error);
    
    // Determine if error is related to GitHub API rate limit
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isRateLimitError = errorMessage.includes('API rate limit exceeded');
    
    return NextResponse.json(
      { 
        error: isRateLimitError 
          ? 'GitHub API rate limit exceeded. Please try again later.' 
          : 'Failed to fetch file content' 
      },
      { status: isRateLimitError ? 429 : 500 }
    );
  }
} 