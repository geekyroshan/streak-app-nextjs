import { useQuery } from '@tanstack/react-query';

interface RepositoryContribution {
  repository: {
    name: string;
    nameWithOwner: string;
    url: string;
  };
  count: number;
}

interface ContributionData {
  // Total statistics
  totalContributions: number;
  totalCommits: number;
  totalIssues: number;
  totalPullRequests: number;
  totalPullRequestReviews: number;
  totalRepositoriesWithCommits: number;
  totalRepositoriesWithIssues: number;
  totalRepositoriesWithPullRequests: number;
  
  // Detailed contribution calendar
  calendar: {
    date: string;
    count: number;
    color: string;
    weekday: number;
  }[];
  
  // Repository-specific contributions
  commitsByRepository: RepositoryContribution[];
  issuesByRepository: RepositoryContribution[];
  pullRequestsByRepository: RepositoryContribution[];
}

interface ContributionsResponse {
  data: ContributionData;
  error: null | {
    code: string;
    message: string;
  };
  metadata?: {
    fromDate: string;
    toDate: string;
    cached: boolean;
    timestamp: string;
  };
}

interface ContributionsOptions {
  fromDate?: Date;
  toDate?: Date;
  enabled?: boolean;
}

/**
 * React Query hook for fetching GitHub contribution data
 */
export function useGitHubContributions(
  username: string | undefined,
  options: ContributionsOptions = {}
) {
  const { fromDate, toDate, enabled = true, ...queryOptions } = options;
  
  return useQuery<ContributionsResponse>({
    queryKey: ['github', 'contributions', username, { fromDate, toDate }],
    queryFn: async () => {
      if (!username) {
        throw new Error('GitHub username is required');
      }
      
      // Build query parameters
      const params = new URLSearchParams({
        username
      });
      
      // Add date range if provided
      if (fromDate) {
        params.append('from', fromDate.toISOString().split('T')[0]);
      }
      
      if (toDate) {
        params.append('to', toDate.toISOString().split('T')[0]);
      }
      
      const response = await fetch(`/api/github/contributions?${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch GitHub contributions');
      }
      
      return response.json();
    },
    enabled: !!username && enabled,
    staleTime: 60 * 60 * 1000, // 1 hour (contributions change less frequently)
    ...queryOptions
  });
}

/**
 * Transform contributions data for heatmap display
 */
export function transformContributionsData(data: ContributionData) {
  // Format calendar data for heatmap visualization
  const heatmapData = data.calendar.map(day => ({
    date: day.date,
    count: day.count,
    level: getContributionLevel(day.count),
    color: day.color
  }));
  
  // Calculate streaks
  const { currentStreak, longestStreak, totalDaysWithContributions } = calculateStreaks(data.calendar);
  
  // Format repository contributions for display
  const repositoryData = {
    commits: data.commitsByRepository.map(formatRepositoryContribution),
    issues: data.issuesByRepository.map(formatRepositoryContribution),
    pullRequests: data.pullRequestsByRepository.map(formatRepositoryContribution)
  };
  
  return {
    calendar: heatmapData,
    stats: {
      totalContributions: data.totalContributions,
      totalCommits: data.totalCommits,
      totalIssues: data.totalIssues,
      totalPullRequests: data.totalPullRequests,
      totalPullRequestReviews: data.totalPullRequestReviews,
      totalRepositories: Math.max(
        data.totalRepositoriesWithCommits,
        data.totalRepositoriesWithIssues,
        data.totalRepositoriesWithPullRequests
      ),
      currentStreak,
      longestStreak,
      totalDaysWithContributions
    },
    repositories: repositoryData
  };
}

/**
 * Format repository contribution for display
 */
function formatRepositoryContribution(contribution: RepositoryContribution) {
  return {
    name: contribution.repository.name,
    fullName: contribution.repository.nameWithOwner,
    url: contribution.repository.url,
    count: contribution.count
  };
}

/**
 * Calculate user contribution streaks and other stats
 */
function calculateStreaks(calendar: { date: string; count: number; }[]) {
  // Sort calendar by date (newest first)
  const sortedDays = [...calendar].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  let currentStreak = 0;
  let longestStreak = 0;
  let currentStreakDays = 0;
  let totalDaysWithContributions = 0;
  
  // Calculate current streak (continuous days with contributions from today backwards)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (const day of sortedDays) {
    const date = new Date(day.date);
    date.setHours(0, 0, 0, 0);
    
    // Count total days with contributions
    if (day.count > 0) {
      totalDaysWithContributions++;
    }
    
    // If this day has contributions and is part of the current streak
    if (day.count > 0) {
      currentStreakDays++;
    } else {
      break; // End of current streak
    }
  }
  
  currentStreak = currentStreakDays;
  
  // Calculate longest streak
  let streakCount = 0;
  
  // Sort calendar by date (oldest first)
  const chronologicalDays = [...calendar].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  for (const day of chronologicalDays) {
    if (day.count > 0) {
      streakCount++;
      longestStreak = Math.max(longestStreak, streakCount);
    } else {
      streakCount = 0;
    }
  }
  
  return {
    currentStreak,
    longestStreak,
    totalDaysWithContributions
  };
}

/**
 * Get contribution level (0-4) based on count
 */
function getContributionLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
} 