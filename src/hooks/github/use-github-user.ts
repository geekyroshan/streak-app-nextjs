import { useQuery } from '@tanstack/react-query';
import { GitHubUser } from '@/types/github';

type UserResponse = {
  data: {
    user: GitHubUser;
    contributions: {
      totalContributions: number;
      calendar: {
        date: string;
        count: number;
      }[];
    };
  };
  error: null | {
    code: string;
    message: string;
  };
  metadata?: {
    cached: boolean;
    timestamp: string;
  };
};

/**
 * React Query hook for fetching GitHub user profile data
 */
export function useGitHubUser(username: string | undefined, options = {}) {
  return useQuery<UserResponse>({
    queryKey: ['github', 'user', username],
    queryFn: async () => {
      if (!username) {
        throw new Error('GitHub username is required');
      }
      
      const response = await fetch(`/api/github/user?username=${encodeURIComponent(username)}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch GitHub user');
      }
      
      return response.json();
    },
    enabled: !!username,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options
  });
}

/**
 * Transform user data for UI (simplify and normalize)
 */
export function transformUserData(userData: UserResponse['data']) {
  const user = userData.user;
  const contributions = userData.contributions;
  
  return {
    username: user.login,
    displayName: user.name || user.login,
    avatarUrl: user.avatar_url,
    bio: user.bio || '',
    location: user.location || '',
    website: user.blog || '',
    twitter: user.twitter_username || '',
    stats: {
      repos: user.public_repos,
      followers: user.followers,
      following: user.following,
      contributions: contributions.totalContributions
    },
    contributionCalendar: contributions.calendar
  };
} 