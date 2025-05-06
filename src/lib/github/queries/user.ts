import { gql } from '@apollo/client';

/**
 * GraphQL query to fetch a user's profile information
 */
export const GET_USER_PROFILE = gql`
  query GetUserProfile($username: String!) {
    user(login: $username) {
      login
      name
      avatarUrl
      bio
      company
      location
      websiteUrl
      twitterUsername
      email
      followers {
        totalCount
      }
      following {
        totalCount
      }
      repositories {
        totalCount
      }
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
            }
          }
        }
      }
      status {
        message
        emoji
      }
      createdAt
      updatedAt
    }
  }
`;

/**
 * GraphQL query to fetch rate limit information
 */
export const GET_RATE_LIMIT = gql`
  query GetRateLimit {
    rateLimit {
      limit
      cost
      remaining
      resetAt
    }
  }
`; 