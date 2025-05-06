/**
 * GitHub API Type Definitions
 */

// GitHub Rate Limit Types
export interface GitHubRateLimit {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  used: number;
}

// GitHub API Error Types
export type GitHubErrorCode = 
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'BAD_REQUEST'
  | 'INTERNAL_SERVER_ERROR'
  | 'RATE_LIMITED'
  | 'VALIDATION_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export interface GitHubError {
  code: GitHubErrorCode;
  message: string;
  documentation_url?: string;
  status?: number;
}

// GitHub User Types
export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  bio: string | null;
  twitter_username: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

// GitHub Repository Types
export interface GitHubRepository {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
  };
  html_url: string;
  description: string | null;
  fork: boolean;
  url: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  homepage: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  forks_count: number;
  open_issues_count: number;
  license: {
    key: string;
    name: string;
    url: string;
  } | null;
  topics: string[];
  default_branch: string;
  visibility: string;
}

// GitHub Contributions
export interface GitHubContribution {
  date: string;
  count: number;
}

export interface GitHubContributionCalendar {
  total: number;
  weeks: {
    contribution_days: GitHubContribution[];
  }[];
}

// Repository Filters
export interface RepositoryFilters {
  language?: string;
  sort?: 'updated' | 'created' | 'pushed' | 'full_name';
  direction?: 'asc' | 'desc';
  perPage?: number;
  page?: number;
}

// API Response Envelope
export interface ApiResponse<T> {
  data: T;
  error: GitHubError | null;
  metadata?: {
    rateLimit?: GitHubRateLimit;
    totalCount?: number;
    pageCount?: number;
    currentPage?: number;
  };
} 