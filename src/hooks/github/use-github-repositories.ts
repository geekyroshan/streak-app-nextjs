import { useQuery } from '@tanstack/react-query';
import { GitHubRepository, RepositoryFilters } from '@/types/github';

interface RepositoriesResponse {
  data: GitHubRepository[];
  error: null | {
    code: string;
    message: string;
  };
  metadata?: {
    pagination: {
      totalCount: number;
      currentPage: number;
      perPage: number;
      hasNextPage: boolean;
      endCursor: string;
    };
    cached: boolean;
    timestamp: string;
  };
}

interface RepositoryQueryOptions extends Partial<RepositoryFilters> {
  enabled?: boolean;
}

/**
 * React Query hook for fetching user's GitHub repositories
 */
export function useGitHubRepositories(
  username: string | undefined, 
  options: RepositoryQueryOptions = {}
) {
  const { 
    language, 
    sort = 'updated',
    direction = 'desc',
    perPage = 10,
    page = 1,
    enabled = true,
    ...queryOptions 
  } = options;
  
  return useQuery<RepositoriesResponse>({
    queryKey: ['github', 'repositories', username, { language, sort, direction, perPage, page }],
    queryFn: async () => {
      if (!username) {
        throw new Error('GitHub username is required');
      }
      
      // Build the query string
      const params = new URLSearchParams({
        username: username,
        sort: sort,
        direction: direction,
        per_page: perPage.toString(),
        page: page.toString()
      });
      
      // Add optional parameters
      if (language) {
        params.append('language', language);
      }
      
      const response = await fetch(`/api/github/repositories?${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch GitHub repositories');
      }
      
      return response.json();
    },
    enabled: !!username && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions
  });
}

/**
 * Transform repository data for UI display
 */
export function transformRepositoryData(repositories: GitHubRepository[]) {
  return repositories.map(repo => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description || '',
    url: repo.html_url,
    homepage: repo.homepage,
    isPrivate: repo.private,
    isFork: repo.fork,
    language: repo.language,
    starCount: repo.stargazers_count,
    forkCount: repo.forks_count,
    openIssuesCount: repo.open_issues_count,
    updatedAt: new Date(repo.updated_at),
    pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
    // Calculate repository activity level
    activity: calculateActivityLevel(repo.pushed_at)
  }));
}

/**
 * Calculate repository activity level based on last push date
 */
function calculateActivityLevel(pushedAt: string | null): 'Active' | 'Moderate' | 'Low activity' | 'Inactive' {
  if (!pushedAt) return 'Inactive';
  
  const now = new Date();
  const lastPush = new Date(pushedAt);
  const daysSinceLastPush = Math.floor((now.getTime() - lastPush.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceLastPush < 7) {
    return 'Active';
  } else if (daysSinceLastPush < 30) {
    return 'Moderate';
  } else if (daysSinceLastPush < 90) {
    return 'Low activity';
  } else {
    return 'Inactive';
  }
} 