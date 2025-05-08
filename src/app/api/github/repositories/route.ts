import { createServerSupabaseClient } from '@/lib/server-supabase';
import { createGitHubClient } from '@/lib/github-client';
import { gql } from '@apollo/client';
import { NextResponse } from 'next/server';

// Define types for the repository data
interface GitHubRepository {
  name: string;
  nameWithOwner: string;
  url: string;
  isPrivate: boolean;
  defaultBranchRef?: {
    name: string;
  } | null;
  updatedAt: string;
  pushedAt: string;
}

/**
 * GET handler for /api/github/repositories
 * Fetches all repositories for the authenticated user
 */
export async function GET() {
  try {
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

    // For debugging
    console.log('User authenticated', { userId: session.user.id });
    
    // Get user data including GitHub access token
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
    
    if (!userData || !userData.github_access_token) {
      console.error('GitHub token not found for user', { 
        userId: session.user.id,
        hasUserData: !!userData,
        hasToken: userData ? !!userData.github_access_token : false
      });
      
      return NextResponse.json(
        { error: 'GitHub token not found for user' },
        { status: 400 }
      );
    }
    
    // Create GitHub API client with user's access token
    const githubClient = createGitHubClient(userData.github_access_token);
    
    // GraphQL query to fetch repositories
    const REPOSITORIES_QUERY = gql`
      query FetchUserRepositories {
        viewer {
          repositories(
            first: 50, 
            orderBy: {field: UPDATED_AT, direction: DESC},
            ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
          ) {
            nodes {
              name
              nameWithOwner
              url
              isPrivate
              defaultBranchRef {
                name
              }
              updatedAt
              pushedAt
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `;
    
    // Execute the query
    const { data } = await githubClient.query({
      query: REPOSITORIES_QUERY,
    });
    
    // Format repository data for the frontend
    const repositories = data.viewer.repositories.nodes.map((repo: GitHubRepository) => ({
      name: repo.name,
      fullName: repo.nameWithOwner,
      url: repo.url,
      isPrivate: repo.isPrivate,
      defaultBranch: repo.defaultBranchRef?.name || 'main',
      updatedAt: repo.updatedAt,
      lastPushedAt: repo.pushedAt,
      // Calculate "last updated" text for display
      lastUpdatedText: getTimeAgoText(new Date(repo.pushedAt))
    }));
    
    return NextResponse.json({ repositories });
    
  } catch (error: unknown) {
    console.error('Error fetching repositories:', error);
    
    // Determine if error is related to GitHub API rate limit
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isRateLimitError = errorMessage.includes('API rate limit exceeded');
    
    return NextResponse.json(
      { 
        error: isRateLimitError 
          ? 'GitHub API rate limit exceeded. Please try again later.' 
          : 'Failed to fetch repositories' 
      },
      { status: isRateLimitError ? 429 : 500 }
    );
  }
}

/**
 * Helper function to format time ago text
 */
function getTimeAgoText(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} year${diffInYears === 1 ? '' : 's'} ago`;
} 