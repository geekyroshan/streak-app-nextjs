import { supabase } from '@/lib/supabase';
import { GitHubUser, GitHubRepository } from '@/types/github';

/**
 * Types for Supabase storage
 */
interface StoredUserProfile {
  auth_id: string;
  email: string;
  github_username: string;
  display_name: string | null;
  avatar_url: string | null;
  github_data: Record<string, any>;
  last_synced: string;
}

interface StoredRepository {
  id: string;
  user_id: string;
  name: string;
  url: string;
  description: string | null;
  github_id: string;
  is_private: boolean;
  github_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface StoredContribution {
  id: string;
  user_id: string;
  date: string;
  count: number;
  details: Record<string, any>;
  created_at: string;
  updated_at: string;
}

/**
 * Syncs GitHub user profile data to Supabase
 */
export async function syncUserProfile(
  userId: string,
  userData: GitHubUser
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // Map GitHub data to our Supabase structure
    const userProfile: StoredUserProfile = {
      auth_id: userId,
      email: userData.email || '',
      github_username: userData.login,
      display_name: userData.name,
      avatar_url: userData.avatar_url,
      github_data: userData, // Store the full GitHub response for reference
      last_synced: new Date().toISOString()
    };

    // Update user record in Supabase
    const { error } = await supabase
      .from('users')
      .upsert(userProfile, { onConflict: 'auth_id' });

    if (error) {
      console.error('Error syncing user profile to Supabase:', error);
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Exception syncing user profile:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown error syncing user profile')
    };
  }
}

/**
 * Syncs GitHub repositories to Supabase
 */
export async function syncUserRepositories(
  userId: string,
  repositories: GitHubRepository[]
): Promise<{ success: boolean; error: Error | null; syncedCount: number }> {
  try {
    // Map repositories to our Supabase structure
    const storedRepos: StoredRepository[] = repositories.map(repo => ({
      id: repo.id.toString(),
      user_id: userId,
      name: repo.name,
      url: repo.html_url,
      description: repo.description,
      github_id: repo.id.toString(),
      is_private: repo.private,
      github_data: repo, // Store the full GitHub response for reference
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Update repositories in Supabase in batches (to handle many repositories)
    const BATCH_SIZE = 20;
    let syncedCount = 0;

    for (let i = 0; i < storedRepos.length; i += BATCH_SIZE) {
      const batch = storedRepos.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('repositories')
        .upsert(batch, { onConflict: 'github_id' });

      if (error) {
        console.error(`Error syncing repositories batch ${i}/${storedRepos.length}:`, error);
        // Continue with next batch rather than failing completely
      } else {
        syncedCount += batch.length;
      }
    }

    return { 
      success: syncedCount > 0,
      error: null,
      syncedCount
    };
  } catch (error) {
    console.error('Exception syncing repositories:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown error syncing repositories'),
      syncedCount: 0
    };
  }
}

/**
 * Syncs GitHub contribution history to Supabase
 */
export async function syncContributionHistory(
  userId: string,
  contributions: { date: string; count: number }[]
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // Map contributions to our Supabase structure
    const storedContributions: StoredContribution[] = contributions.map(contrib => ({
      id: `${userId}_${contrib.date}`, // Composite ID from user ID and date
      user_id: userId,
      date: contrib.date,
      count: contrib.count,
      details: { count: contrib.count }, // Additional details if needed later
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Update contributions in Supabase in batches
    const BATCH_SIZE = 50; // Contributions can be numerous
    let syncedCount = 0;

    for (let i = 0; i < storedContributions.length; i += BATCH_SIZE) {
      const batch = storedContributions.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('contributions')
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        console.error(`Error syncing contributions batch ${i}/${storedContributions.length}:`, error);
        // Continue with next batch rather than failing completely
      } else {
        syncedCount += batch.length;
      }
    }

    return { 
      success: syncedCount > 0,
      error: null
    };
  } catch (error) {
    console.error('Exception syncing contributions:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown error syncing contributions')
    };
  }
}

/**
 * Fetches user GitHub data from Supabase
 */
export async function fetchUserGitHubData(userId: string) {
  try {
    // Fetch user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('github_username, github_data, last_synced')
      .eq('auth_id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user GitHub data:', userError);
      return { userData: null, repositories: [], contributions: [], error: userError };
    }

    // Fetch repositories
    const { data: repositories, error: repoError } = await supabase
      .from('repositories')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (repoError) {
      console.error('Error fetching repositories:', repoError);
      // Continue with next query rather than failing completely
    }

    // Fetch contributions (last 365 days)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const { data: contributions, error: contribError } = await supabase
      .from('contributions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', oneYearAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (contribError) {
      console.error('Error fetching contributions:', contribError);
      // Continue rather than failing completely
    }

    return {
      userData,
      repositories: repositories || [],
      contributions: contributions || [],
      error: userError || repoError || contribError || null
    };
  } catch (error) {
    console.error('Exception fetching GitHub data from Supabase:', error);
    return {
      userData: null,
      repositories: [],
      contributions: [],
      error: error instanceof Error ? error : new Error('Unknown error fetching GitHub data')
    };
  }
}

/**
 * Determines if data needs to be refreshed from GitHub API
 */
export function shouldRefreshFromGitHub(lastSynced: string | null): boolean {
  if (!lastSynced) return true;
  
  const lastSync = new Date(lastSynced);
  const now = new Date();
  
  // Check if last sync was more than 1 hour ago
  const hoursSinceLastSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60);
  
  return hoursSinceLastSync > 1;
} 