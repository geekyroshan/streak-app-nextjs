import { gql } from '@apollo/client';

/**
 * GraphQL query to fetch a user's repositories
 */
export const GET_USER_REPOSITORIES = gql`
  query GetUserRepositories(
    $username: String!
    $first: Int = 10
    $after: String
    $orderBy: RepositoryOrder = {field: UPDATED_AT, direction: DESC}
    $isFork: Boolean
    $privacy: RepositoryPrivacy
  ) {
    user(login: $username) {
      repositories(
        first: $first
        after: $after
        orderBy: $orderBy
        isFork: $isFork
        privacy: $privacy
      ) {
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          name
          nameWithOwner
          description
          url
          homepageUrl
          isPrivate
          isArchived
          isDisabled
          isFork
          isTemplate
          stargazerCount
          forkCount
          primaryLanguage {
            name
            color
          }
          languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
            nodes {
              name
              color
            }
          }
          licenseInfo {
            name
            spdxId
          }
          updatedAt
          pushedAt
          diskUsage
          visibility
          openIssues: issues(states: OPEN) {
            totalCount
          }
          openPullRequests: pullRequests(states: OPEN) {
            totalCount
          }
          mergedPullRequests: pullRequests(states: MERGED) {
            totalCount
          }
          defaultBranchRef {
            name
            target {
              ... on Commit {
                history(first: 10) {
                  totalCount
                  nodes {
                    messageHeadline
                    committedDate
                    author {
                      name
                      email
                      avatarUrl
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * GraphQL query to fetch repository details
 */
export const GET_REPOSITORY_DETAILS = gql`
  query GetRepositoryDetails($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      id
      name
      nameWithOwner
      description
      url
      homepageUrl
      isPrivate
      isArchived
      isDisabled
      isFork
      stargazerCount
      forkCount
      primaryLanguage {
        name
        color
      }
      languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
        nodes {
          name
          color
        }
        totalCount
      }
      licenseInfo {
        name
        spdxId
      }
      updatedAt
      pushedAt
      createdAt
      diskUsage
      visibility
      openIssues: issues(states: OPEN) {
        totalCount
      }
      openPullRequests: pullRequests(states: OPEN) {
        totalCount
      }
      mergedPullRequests: pullRequests(states: MERGED) {
        totalCount
      }
      defaultBranchRef {
        name
        target {
          ... on Commit {
            history(first: 10) {
              totalCount
              nodes {
                messageHeadline
                committedDate
                author {
                  name
                  email
                  avatarUrl
                }
              }
            }
          }
        }
      }
      readme: object(expression: "HEAD:README.md") {
        ... on Blob {
          text
        }
      }
    }
  }
`; 