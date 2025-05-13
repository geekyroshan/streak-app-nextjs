import { 
  ApolloClient, 
  InMemoryCache, 
  HttpLink, 
  ApolloLink, 
  from, 
  NormalizedCacheObject 
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { GitHubError, GitHubErrorCode, GitHubRateLimit } from '@/types/github';

// Global rate limit tracking
let rateLimitRemaining: number | null = null;
let rateLimitLimit: number | null = null;
let rateLimitReset: number | null = null;
let rateLimitUsed: number | null = null;

/**
 * Create a GitHub error object
 */
export function createGitHubError(
  message: string,
  code: GitHubErrorCode = 'UNKNOWN_ERROR',
  status: number = 500
): GitHubError {
  return {
    message,
    code,
    status,
  };
}

/**
 * Maps GitHub error codes to our standardized error codes
 */
function mapGitHubErrorCode(code: string): GitHubError['code'] {
  switch (code) {
    case 'NOT_FOUND':
      return 'NOT_FOUND';
    case 'UNAUTHORIZED':
      return 'UNAUTHORIZED';
    case 'FORBIDDEN':
      return 'FORBIDDEN';
    case 'BAD_REQUEST':
      return 'BAD_REQUEST';
    case 'RATE_LIMITED':
      return 'RATE_LIMITED';
    case 'VALIDATION_FAILED':
      return 'VALIDATION_FAILED';
    case 'NETWORK_ERROR':
      return 'NETWORK_ERROR';
    default:
      return 'UNKNOWN_ERROR';
  }
}

/**
 * Create the Apollo Client for GitHub GraphQL API
 */
export function createGitHubClient(token: string): ApolloClient<NormalizedCacheObject> {
  // Create the HTTP link that connects to the GitHub GraphQL API
  const httpLink = new HttpLink({
    uri: 'https://api.github.com/graphql',
    headers: {
      authorization: `Bearer ${token}`
    }
  });

  // Error handling link for Apollo
  const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message, extensions }) => {
        console.error(
          `[GitHub API GraphQL Error]: ${message}`,
          extensions
        );
      });
    }

    if (networkError) {
      console.error(`[GitHub API Network Error]: ${networkError}`);
    }

    return forward(operation);
  });

  // Rate limit tracking link
  const rateLimitLink = new ApolloLink((operation, forward) => {
    return forward(operation).map((response) => {
      const context = operation.getContext();
      const headers = context.response?.headers;

      if (headers) {
        const rateLimit = {
          limit: parseInt(headers.get('x-ratelimit-limit') || '0'),
          remaining: parseInt(headers.get('x-ratelimit-remaining') || '0'),
          reset: parseInt(headers.get('x-ratelimit-reset') || '0'),
          used: parseInt(headers.get('x-ratelimit-used') || '0')
        };

        // Update our current rate limit tracking
        rateLimitRemaining = rateLimit.remaining;
        rateLimitLimit = rateLimit.limit;
        rateLimitReset = rateLimit.reset;
        rateLimitUsed = rateLimit.used;
      }

      return response;
    });
  });

  // Create the Apollo Client
  return new ApolloClient({
    link: from([errorLink, rateLimitLink, httpLink]),
    cache: new InMemoryCache(),
    defaultOptions: {
      query: {
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
      },
      watchQuery: {
        fetchPolicy: 'cache-and-network',
        errorPolicy: 'all',
      },
    },
  });
}

/**
 * Get current GitHub API rate limit information
 */
export function getCurrentRateLimit(): GitHubRateLimit | null {
  if (rateLimitLimit === null || rateLimitRemaining === null || rateLimitReset === null) {
    return null;
  }
  
  return {
    limit: rateLimitLimit,
    remaining: rateLimitRemaining,
    reset: rateLimitReset,
    used: rateLimitUsed ?? 0,
  };
}

/**
 * Check if we're approaching rate limit and should use caution
 */
export function isApproachingRateLimit(): boolean {
  if (rateLimitRemaining === null || rateLimitLimit === null) return false;
  
  // Consider it approaching if less than 10% of requests remain
  const threshold = Math.floor(rateLimitLimit * 0.1);
  return rateLimitRemaining <= threshold;
}

/**
 * Check if we're rate limited and should back off
 */
export function isRateLimited(): boolean {
  if (rateLimitRemaining === null) return false;
  
  // If we have 0 remaining requests, check if the reset time has passed
  if (rateLimitRemaining <= 0) {
    if (rateLimitReset && Date.now() / 1000 > rateLimitReset) {
      // Reset time has passed, reset our tracking
      rateLimitRemaining = null;
      rateLimitReset = null;
      return false;
    }
    return true;
  }
  
  return false;
}

/**
 * Get time until rate limit reset in seconds
 */
export function getTimeUntilReset(): number | null {
  if (rateLimitReset === null) return null;
  
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  return Math.max(0, rateLimitReset - now);
} 