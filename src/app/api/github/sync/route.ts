import { NextRequest, NextResponse } from 'next/server';
import { createGitHubClient } from '@/lib/github-client';
import { GET_USER_PROFILE } from '@/lib/github/queries/user';
import { GET_USER_REPOSITORIES } from '@/lib/github/queries/repositories';
import { GET_USER_CONTRIBUTIONS } from '@/lib/github/queries/contributions';
import { withGitHubAuth, githubErrorResponse } from '../middleware';
import { syncUserProfile, syncUserRepositories, syncContributionHistory } from '@/lib/github/persistence';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

/**
 * GET /api/github/sync
 * 
 * Syncs GitHub data to Supabase for the authenticated user
 * Query params:
 *   - username: GitHub username to sync (optional, defaults to authenticated user)
 *   - force: Force sync even if data is recent (optional, defaults to false)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  return withGitHubAuth(req, async (req, token) => {
    try {
      // Get auth session for user ID
      const cookieStore = await cookies();
      const supabase = createRouteHandlerClient({ 
        cookies: () => cookieStore
      });
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return githubErrorResponse(
          {
            code: 'UNAUTHORIZED',
            message: 'Authentication required for sync operation'
          },
          401
        );
      }
      
      // Get query parameters
      const { searchParams } = new URL(req.url);
      const username = searchParams.get('username');
      const force = searchParams.get('force') === 'true';
      
      if (!username) {
        return githubErrorResponse(
          {
            code: 'BAD_REQUEST',
            message: 'GitHub username is required'
          },
          400
        );
      }
      
      // Create Apollo client with token
      const client = createGitHubClient(token);
      
      // 1. Fetch user profile
      const { data: userData, errors: userErrors } = await client.query({
        query: GET_USER_PROFILE,
        variables: { username }
      });
      
      if (userErrors && userErrors.length > 0) {
        return githubErrorResponse({
          code: 'UNKNOWN_ERROR',
          message: userErrors[0].message
        }, 500);
      }
      
      if (!userData.user) {
        return githubErrorResponse({
          code: 'NOT_FOUND',
          message: `GitHub user '${username}' not found`
        }, 404);
      }
      
      // 2. Sync user profile to Supabase
      const { success: userSyncSuccess, error: userSyncError } = await syncUserProfile(
        session.user.id,
        {
          login: userData.user.login,
          id: parseInt(userData.user.id || '0'),
          avatar_url: userData.user.avatarUrl,
          html_url: `https://github.com/${userData.user.login}`,
          name: userData.user.name,
          company: userData.user.company,
          blog: userData.user.websiteUrl,
          location: userData.user.location,
          email: userData.user.email,
          bio: userData.user.bio,
          twitter_username: userData.user.twitterUsername,
          public_repos: userData.user.repositories.totalCount,
          public_gists: 0,
          followers: userData.user.followers.totalCount,
          following: userData.user.following.totalCount,
          created_at: userData.user.createdAt,
          updated_at: userData.user.updatedAt
        }
      );
      
      if (!userSyncSuccess) {
        console.error('Error syncing user profile:', userSyncError);
        // Continue with other syncs rather than failing completely
      }
      
      // 3. Fetch repositories
      const { data: repoData, errors: repoErrors } = await client.query({
        query: GET_USER_REPOSITORIES,
        variables: { 
          username,
          first: 100 // Fetch up to 100 repositories
        }
      });
      
      if (repoErrors && repoErrors.length > 0) {
        console.error('Error fetching repositories:', repoErrors[0]);
        // Continue with other operations rather than failing completely
      }
      
      let repoSyncSuccess = false;
      let repoSyncCount = 0;
      
      if (repoData?.user?.repositories?.nodes) {
        // Sync repositories to Supabase
        const { success, syncedCount } = await syncUserRepositories(
          session.user.id,
          repoData.user.repositories.nodes
        );
        
        repoSyncSuccess = success;
        repoSyncCount = syncedCount;
      }
      
      // 4. Fetch contributions (last year)
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      
      const { data: contribData, errors: contribErrors } = await client.query({
        query: GET_USER_CONTRIBUTIONS,
        variables: { 
          username,
          from: oneYearAgo.toISOString(),
          to: now.toISOString()
        }
      });
      
      if (contribErrors && contribErrors.length > 0) {
        console.error('Error fetching contributions:', contribErrors[0]);
        // Continue with other operations rather than failing completely
      }
      
      let contribSyncSuccess = false;
      
      if (contribData?.user?.contributionsCollection?.contributionCalendar?.weeks) {
        // Extract contribution data from nested structure
        const contributions = contribData.user.contributionsCollection.contributionCalendar.weeks.flatMap(
          (week: any) => week.contributionDays.map((day: any) => ({
            date: day.date,
            count: day.contributionCount
          }))
        );
        
        // Sync contributions to Supabase
        const { success } = await syncContributionHistory(session.user.id, contributions);
        contribSyncSuccess = success;
      }
      
      // Return success response
      return NextResponse.json({
        success: true,
        data: {
          userSync: userSyncSuccess,
          repositorySync: {
            success: repoSyncSuccess,
            count: repoSyncCount
          },
          contributionSync: contribSyncSuccess,
          timestamp: new Date().toISOString()
        },
        error: null
      });
    } catch (error: any) {
      console.error('GitHub sync API error:', error);
      
      return githubErrorResponse(
        {
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Internal server error during GitHub sync'
        },
        500
      );
    }
  });
} 