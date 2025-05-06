import { gql } from '@apollo/client';

/**
 * GraphQL query to fetch a user's contribution data
 */
export const GET_USER_CONTRIBUTIONS = gql`
  query GetUserContributions($username: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $username) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
              color
              weekday
            }
            firstDay
          }
        }
        
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        totalRepositoriesWithContributedCommits
        totalRepositoriesWithContributedIssues
        totalRepositoriesWithContributedPullRequests
        totalRepositoriesWithContributedPullRequestReviews

        commitContributionsByRepository(maxRepositories: 10) {
          repository {
            name
            nameWithOwner
            url
          }
          contributions {
            totalCount
          }
        }

        issueContributionsByRepository(maxRepositories: 10) {
          repository {
            name
            nameWithOwner
            url
          }
          contributions {
            totalCount
          }
        }

        pullRequestContributionsByRepository(maxRepositories: 10) {
          repository {
            name
            nameWithOwner
            url
          }
          contributions {
            totalCount
          }
        }
      }
    }
  }
`;

/**
 * GraphQL query to fetch contribution stats by time period
 */
export const GET_CONTRIBUTION_STATS = gql`
  query GetContributionStats($username: String!) {
    user(login: $username) {
      # Last 30 days
      last30Days: contributionsCollection(from: "${getDateXDaysAgo(30)}", to: "${getCurrentDate()}") {
        contributionCalendar {
          totalContributions
        }
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
      }
      
      # Last 90 days
      last90Days: contributionsCollection(from: "${getDateXDaysAgo(90)}", to: "${getCurrentDate()}") {
        contributionCalendar {
          totalContributions
        }
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
      }
      
      # Last 365 days
      lastYear: contributionsCollection(from: "${getDateXDaysAgo(365)}", to: "${getCurrentDate()}") {
        contributionCalendar {
          totalContributions
        }
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
      }
    }
  }
`;

// Helper functions to generate date strings in ISO format
function getCurrentDate(): string {
  return new Date().toISOString();
}

function getDateXDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
} 