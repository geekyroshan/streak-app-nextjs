import { NextRequest, NextResponse } from 'next/server';
import { createGitHubClient } from '@/lib/github-client';
import { GET_USER_REPOSITORIES } from '@/lib/github/queries/repositories';
import { withGitHubAuth, addRateLimitHeaders, addCacheHeaders, githubErrorResponse } from '../middleware';
import { GitHubRepository, RepositoryFilters } from '@/types/github';

/**
 * GET /api/github/repositories
 * 
 * Fetches a user's GitHub repositories
 * Query params:
 *   - username: GitHub username to fetch repositories for
 *   - language: Filter by programming language
 *   - sort: Sort field ('updated', 'created', 'pushed', 'full_name')
 *   - direction: Sort direction ('asc', 'desc')
 *   - per_page: Number of repositories per page (default: 10, max: 100)
 *   - page: Page number (for pagination)
 *   - fork: Include forks ('true', 'false', 'only')
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
      
      // Parse filters
      const filters: RepositoryFilters = {
        sort: searchParams.get('sort') as any || 'updated',
        direction: searchParams.get('direction') as any || 'desc',
        perPage: Math.min(parseInt(searchParams.get('per_page') || '10'), 100),
        page: parseInt(searchParams.get('page') || '1')
      };
      
      // Handle language filter
      if (searchParams.has('language')) {
        filters.language = searchParams.get('language') || undefined;
      }
      
      // Handle fork filter
      let isFork: boolean | null = null;
      const forkParam = searchParams.get('fork');
      if (forkParam === 'only') {
        isFork = true;
      } else if (forkParam === 'true' || forkParam === 'false') {
        isFork = forkParam === 'true';
      }
      
      // Create Apollo client with token
      const client = createGitHubClient(token);
      
      // Build GraphQL variables
      const variables = {
        username,
        first: filters.perPage,
        after: null, // TODO: Implement cursor-based pagination
        orderBy: {
          field: mapSortFieldToGraphQL(filters.sort),
          direction: filters.direction?.toUpperCase()
        },
        isFork
      };
      
      // Execute GraphQL query
      const { data, errors } = await client.query({
        query: GET_USER_REPOSITORIES,
        variables
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
      
      // Check if user or repositories data exists
      if (!data.user || !data.user.repositories) {
        return githubErrorResponse(
          {
            code: 'NOT_FOUND',
            message: `GitHub user '${username}' or their repositories not found`
          },
          404
        );
      }
      
      // Transform the repositories data
      const repositories = data.user.repositories.nodes.map((repo: any): GitHubRepository => ({
        id: repo.id,
        node_id: repo.id,
        name: repo.name,
        full_name: repo.nameWithOwner,
        private: repo.isPrivate,
        owner: {
          login: repo.nameWithOwner.split('/')[0],
          id: 0, // Not available in the current query
          avatar_url: '' // Not available in the current query
        },
        html_url: repo.url,
        description: repo.description,
        fork: repo.isFork,
        url: repo.url,
        created_at: repo.createdAt || '',
        updated_at: repo.updatedAt,
        pushed_at: repo.pushedAt,
        homepage: repo.homepageUrl || null,
        size: repo.diskUsage || 0,
        stargazers_count: repo.stargazerCount,
        watchers_count: repo.stargazerCount, // Same as stargazers in GitHub v3 API
        language: repo.primaryLanguage?.name || null,
        forks_count: repo.forkCount,
        open_issues_count: repo.openIssues?.totalCount || 0,
        license: repo.licenseInfo
          ? {
              key: repo.licenseInfo.spdxId,
              name: repo.licenseInfo.name,
              url: ''
            }
          : null,
        topics: [],
        default_branch: repo.defaultBranchRef?.name || 'main',
        visibility: repo.visibility.toLowerCase()
      }));
      
      // Build pagination metadata
      const pagination = {
        totalCount: data.user.repositories.totalCount,
        currentPage: filters.page,
        perPage: filters.perPage,
        hasNextPage: data.user.repositories.pageInfo.hasNextPage,
        endCursor: data.user.repositories.pageInfo.endCursor
      };
      
      // Create the response
      const response = NextResponse.json({
        data: repositories,
        error: null,
        metadata: {
          pagination,
          cached: false,
          timestamp: new Date().toISOString()
        }
      });
      
      // Add rate limit and cache headers
      addRateLimitHeaders(response);
      addCacheHeaders(response, 60 * 5); // Cache for 5 minutes
      
      return response;
    } catch (error: any) {
      console.error('GitHub repositories API error:', error);
      
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

/**
 * Map sort field from REST API to GraphQL enum
 */
function mapSortFieldToGraphQL(sort: string | undefined): string {
  switch (sort) {
    case 'updated':
      return 'UPDATED_AT';
    case 'created':
      return 'CREATED_AT';
    case 'pushed':
      return 'PUSHED_AT';
    case 'full_name':
      return 'NAME';
    default:
      return 'UPDATED_AT';
  }
} 