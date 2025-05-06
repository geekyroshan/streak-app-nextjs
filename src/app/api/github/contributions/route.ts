import { NextRequest, NextResponse } from 'next/server';
import { createGitHubClient } from '@/lib/github-client';
import { GET_USER_CONTRIBUTIONS } from '@/lib/github/queries/contributions';
import { withGitHubAuth, addRateLimitHeaders, addCacheHeaders, githubErrorResponse } from '../middleware';

/**
 * GET /api/github/contributions
 * 
 * Fetches a user's GitHub contribution data
 * Query params:
 *   - username: GitHub username to fetch contributions for
 *   - from: Start date (ISO format: YYYY-MM-DD)
 *   - to: End date (ISO format: YYYY-MM-DD)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  return withGitHubAuth(req, async (req, token) => {
    try {
      // Get query parameters
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
      
      // Parse date range parameters
      const now = new Date();
      let fromDate = new Date(now);
      fromDate.setFullYear(fromDate.getFullYear() - 1); // Default to 1 year ago
      
      let toDate = now;
      
      // Use custom date range if provided
      if (searchParams.has('from')) {
        const fromStr = searchParams.get('from');
        if (fromStr) {
          const parsedFrom = new Date(fromStr);
          if (!isNaN(parsedFrom.getTime())) {
            fromDate = parsedFrom;
          }
        }
      }
      
      if (searchParams.has('to')) {
        const toStr = searchParams.get('to');
        if (toStr) {
          const parsedTo = new Date(toStr);
          if (!isNaN(parsedTo.getTime())) {
            toDate = parsedTo;
          }
        }
      }
      
      // Create Apollo client with token
      const client = createGitHubClient(token);
      
      // Execute GraphQL query
      const { data, errors } = await client.query({
        query: GET_USER_CONTRIBUTIONS,
        variables: {
          username,
          from: fromDate.toISOString(),
          to: toDate.toISOString()
        }
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
      
      // Check if user or contribution data exists
      if (!data.user || !data.user.contributionsCollection) {
        return githubErrorResponse(
          {
            code: 'NOT_FOUND',
            message: `GitHub user '${username}' or their contributions not found`
          },
          404
        );
      }
      
      // Transform contribution data
      const contributionCollection = data.user.contributionsCollection;
      
      const contributions = {
        // Total statistics
        totalContributions: contributionCollection.contributionCalendar.totalContributions,
        totalCommits: contributionCollection.totalCommitContributions,
        totalIssues: contributionCollection.totalIssueContributions,
        totalPullRequests: contributionCollection.totalPullRequestContributions,
        totalPullRequestReviews: contributionCollection.totalPullRequestReviewContributions,
        totalRepositoriesWithCommits: contributionCollection.totalRepositoriesWithContributedCommits,
        totalRepositoriesWithIssues: contributionCollection.totalRepositoriesWithContributedIssues,
        totalRepositoriesWithPullRequests: contributionCollection.totalRepositoriesWithContributedPullRequests,
        
        // Detailed contribution calendar
        calendar: contributionCollection.contributionCalendar.weeks.flatMap((week: any) => 
          week.contributionDays.map((day: any) => ({
            date: day.date,
            count: day.contributionCount,
            color: day.color,
            weekday: day.weekday
          }))
        ),
        
        // Repository-specific contributions
        commitsByRepository: contributionCollection.commitContributionsByRepository.map((repo: any) => ({
          repository: {
            name: repo.repository.name,
            nameWithOwner: repo.repository.nameWithOwner,
            url: repo.repository.url
          },
          count: repo.contributions.totalCount
        })),
        
        issuesByRepository: contributionCollection.issueContributionsByRepository.map((repo: any) => ({
          repository: {
            name: repo.repository.name,
            nameWithOwner: repo.repository.nameWithOwner,
            url: repo.repository.url
          },
          count: repo.contributions.totalCount
        })),
        
        pullRequestsByRepository: contributionCollection.pullRequestContributionsByRepository.map((repo: any) => ({
          repository: {
            name: repo.repository.name,
            nameWithOwner: repo.repository.nameWithOwner,
            url: repo.repository.url
          },
          count: repo.contributions.totalCount
        }))
      };
      
      // Create the response
      const response = NextResponse.json({
        data: contributions,
        error: null,
        metadata: {
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString(),
          cached: false,
          timestamp: new Date().toISOString()
        }
      });
      
      // Add rate limit and cache headers
      addRateLimitHeaders(response);
      addCacheHeaders(response, 60 * 60); // Cache for 1 hour (contribution data changes less frequently)
      
      return response;
    } catch (error: any) {
      console.error('GitHub contributions API error:', error);
      
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