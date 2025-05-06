import { 
  ApolloClient, 
  InMemoryCache, 
  HttpLink, 
  ApolloLink, 
  from, 
  NormalizedCacheObject 
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { GitHubError, GitHubRateLimit } from '@/types/github';

// Rate limit tracking
let currentRateLimit: GitHubRateLimit | null = null;

/**
 * Creates an error response object for GitHub API errors
 */
export function createGitHubError(message: string, code: string, status?: number): GitHubError {
  const errorCode = mapGitHubErrorCode(code);
  
  return {
    code: errorCode,
    message,
    status
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
  const errorLink = onError(({ graphQLErrors, networkError }) => {
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
  });

  // Rate limit tracking link
  const rateLimitLink = new ApolloLink((operation, forward) => {
    return forward(operation).map((response) => {
      // Check for rate limit headers
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
        currentRateLimit = rateLimit;
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
  return currentRateLimit;
}

/**
 * Check if we're approaching rate limit and should use caution
 */
export function isApproachingRateLimit(): boolean {
  if (!currentRateLimit) return false;
  
  // Consider it approaching if less than 10% of requests remain
  const threshold = Math.floor(currentRateLimit.limit * 0.1);
  return currentRateLimit.remaining <= threshold;
}

/**
 * Check if we're rate limited and should back off
 */
export function isRateLimited(): boolean {
  if (!currentRateLimit) return false;
  return currentRateLimit.remaining <= 0;
}

/**
 * Get time until rate limit reset in seconds
 */
export function getTimeUntilReset(): number | null {
  if (!currentRateLimit) return null;
  
  const now = Math.floor(Date.now() / 1000); // Current time in seconds
  return Math.max(0, currentRateLimit.reset - now);
} 