import { NextRequest, NextResponse } from 'next/server';
import { createGitHubClient } from '@/lib/github-client';
import { GET_USER_PROFILE } from '@/lib/github/queries/user';
import { withGitHubAuth, addRateLimitHeaders, addCacheHeaders, githubErrorResponse } from '../middleware';
import { GitHubUser } from '@/types/github';

// Define types for the contribution calendar response
interface ContributionDay {
  date: string;
  contributionCount: number;
}

interface ContributionWeek {
  contributionDays: ContributionDay[];
}

/**
 * GET /api/github/user
 * 
 * Fetches a GitHub user profile
 * Query params:
 *   - username: GitHub username to fetch
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  return withGitHubAuth(req, async (req, token) => {
    try {
      // Get username from query params
      const { searchParams } = new URL(req.url);
      const username = searchParams.get('username');
      
      if (!username) {
        return githubErrorResponse(
          {
            code: 'BAD_REQUEST',
            message: 'GitHub username is required'
          },
          400
        );
      }
      
      // Create Apollo client with token
      const client = createGitHubClient(token);
      
      // Execute the GraphQL query
      const { data, errors } = await client.query({
        query: GET_USER_PROFILE,
        variables: { username },
      });
      
      // Check for GraphQL errors
      if (errors && errors.length > 0) {
        const error = errors[0];
        console.error('GitHub API GraphQL Error:', error);
        
        return githubErrorResponse(
          {
            code: error.extensions?.code as any || 'UNKNOWN_ERROR',
            message: error.message || 'Unknown GraphQL error',
          },
          error.extensions?.code === 'NOT_FOUND' ? 404 : 500
        );
      }
      
      // Check if user was found
      if (!data.user) {
        return githubErrorResponse(
          {
            code: 'NOT_FOUND',
            message: `GitHub user '${username}' not found`
          },
          404
        );
      }
      
      // Transform the GraphQL response to our API model
      const user: GitHubUser = {
        login: data.user.login,
        id: data.user.id,
        avatar_url: data.user.avatarUrl,
        html_url: `https://github.com/${data.user.login}`,
        name: data.user.name,
        company: data.user.company,
        blog: data.user.websiteUrl,
        location: data.user.location,
        email: data.user.email,
        bio: data.user.bio,
        twitter_username: data.user.twitterUsername,
        public_repos: data.user.repositories.totalCount,
        public_gists: 0, // Not included in the GraphQL query
        followers: data.user.followers.totalCount,
        following: data.user.following.totalCount,
        created_at: data.user.createdAt,
        updated_at: data.user.updatedAt
      };
      
      // Add contribution data
      const contributionData = {
        totalContributions: data.user.contributionsCollection.contributionCalendar.totalContributions,
        calendar: data.user.contributionsCollection.contributionCalendar.weeks.flatMap((week: ContributionWeek) => 
          week.contributionDays.map((day: ContributionDay) => ({
            date: day.date,
            count: day.contributionCount
          }))
        )
      };
      
      // Create the response
      const response = NextResponse.json({
        data: {
          user,
          contributions: contributionData
        },
        error: null,
        metadata: {
          cached: false,
          timestamp: new Date().toISOString()
        }
      });
      
      // Add rate limit and cache headers
      addRateLimitHeaders(response);
      addCacheHeaders(response, 60 * 10); // Cache for 10 minutes
      
      return response;
    } catch (error: any) {
      console.error('GitHub user API error:', error);
      
      return githubErrorResponse(
        {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Internal server error'
        },
        500
      );
    }
  });
} 