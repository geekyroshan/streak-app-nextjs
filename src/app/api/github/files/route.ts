import { createServerSupabaseClient } from '@/lib/server-supabase';
import { createGitHubClient } from '@/lib/github-client';
import { gql } from '@apollo/client';
import { NextRequest, NextResponse } from 'next/server';

// Define types for repository tree data
interface GitHubTreeEntry {
  name: string;
  path: string;
  type: 'blob' | 'tree';
}

/**
 * GET handler for /api/github/files
 * Fetches files and directories for a specific repository
 * 
 * Query parameters:
 * - repoName: Repository name (required)
 * - path: Directory path to fetch files from (optional, defaults to root)
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const repoName = searchParams.get('repoName');
    const path = searchParams.get('path') || '';
    
    if (!repoName) {
      return NextResponse.json(
        { error: 'Repository name is required' },
        { status: 400 }
      );
    }
    
    console.log('Fetching files for repository', { repoName, path });
    
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
    
    console.log('User authenticated', { userId: session.user.id });
    
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
    
    // GraphQL query to fetch repository files at a specific path
    const REPOSITORY_FILES_QUERY = gql`
      query FetchRepositoryFiles($owner: String!, $name: String!, $expression: String!) {
        repository(owner: $owner, name: $name) {
          object(expression: $expression) {
            ... on Tree {
              entries {
                name
                path
                type
              }
            }
          }
          defaultBranchRef {
            name
          }
        }
      }
    `;
    
    // Extract owner and repo name from the full repository name
    const [owner, repo] = repoName.includes('/') 
      ? repoName.split('/')
      : [userData.github_username, repoName];
    
    // Get default branch and files using GraphQL
    const { data } = await githubClient.query({
      query: REPOSITORY_FILES_QUERY,
      variables: {
        owner,
        name: repo,
        expression: path ? `HEAD:${path}` : 'HEAD:'
      }
    });
    
    // Handle case where repository or path doesn't exist
    if (!data.repository || !data.repository.object) {
      return NextResponse.json(
        { error: `Repository ${repoName} or path ${path} not found` },
        { status: 404 }
      );
    }
    
    // Format the files data for the frontend
    const entries = data.repository.object?.entries || [];
    const defaultBranch = data.repository.defaultBranchRef?.name || 'main';
    
    // Sort entries to show directories first, then files, both alphabetically
    // Create a copy of the array before sorting to avoid modifying a read-only array
    const sortedEntries = [...entries].sort((a: GitHubTreeEntry, b: GitHubTreeEntry) => {
      if (a.type !== b.type) {
        return a.type === 'tree' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    
    // Map entries to a more convenient format for the frontend
    const files = sortedEntries.map((entry: GitHubTreeEntry) => ({
      name: entry.name,
      path: entry.path,
      type: entry.type,
      isDirectory: entry.type === 'tree',
      url: `https://github.com/${owner}/${repo}/blob/${defaultBranch}/${entry.path}`
    }));
    
    // Add a parent directory entry if we're not at the root
    const result = {
      repoName: `${owner}/${repo}`,
      currentPath: path,
      defaultBranch,
      files
    };
    
    if (path) {
      // Add a ".." entry to navigate up one level
      const parentPath = path.includes('/') 
        ? path.substring(0, path.lastIndexOf('/')) 
        : '';
      
      result.files.unshift({
        name: '..',
        path: parentPath,
        type: 'tree',
        isDirectory: true,
        url: ''
      });
    }
    
    return NextResponse.json(result);
    
  } catch (error: unknown) {
    console.error('Error fetching repository files:', error);
    
    // Determine if error is related to GitHub API rate limit
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isRateLimitError = errorMessage.includes('API rate limit exceeded');
    
    return NextResponse.json(
      { 
        error: isRateLimitError 
          ? 'GitHub API rate limit exceeded. Please try again later.' 
          : 'Failed to fetch repository files' 
      },
      { status: isRateLimitError ? 429 : 500 }
    );
  }
} 