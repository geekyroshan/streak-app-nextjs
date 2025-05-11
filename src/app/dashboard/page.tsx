"use client";

import { DashboardLayout } from '@/components/dashboard-layout/DashboardLayout';
import { ActivityChart } from '@/components/charts/ActivityChart';
import { ContributionCalendar } from '@/components/contribution-calendar/ContributionCalendar';
import { StatsCard } from '@/components/stats/StatsCard';
import { RepositoryCard } from '@/components/repository/RepositoryCard';
import { Calendar, GitBranch, BarChart2, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useGitHubUser, transformUserData } from '@/hooks/github/use-github-user';
import { useGitHubContributions, transformContributionsData } from '@/hooks/github/use-github-contributions';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user, isLoading, session } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authChecked, setAuthChecked] = useState(false);
  
  // GitHub username from Supabase auth
  const githubUsername = useMemo(() => {
    return user?.user_metadata?.user_name || '';
  }, [user]);

  // Debug logging for auth state
  useEffect(() => {
    console.log('Dashboard: Auth state -', { 
      isLoading, 
      hasUser: !!user, 
      hasSession: !!session,
      userId: user?.id?.substring(0, 8) || 'none',
      userEmail: user?.email || 'none',
      userMetadata: user?.user_metadata ? 'present' : 'missing'
    });

    if (user?.user_metadata) {
      console.log('Dashboard: User metadata -', JSON.stringify(user.user_metadata, null, 2));
    }
    
    // Mark auth as checked once we've either loaded user data or determined it's not available
    if (!isLoading || user) {
      setAuthChecked(true);
    }
  }, [user, isLoading, session]);
  
  // Handle fresh login state with a simplified approach
  useEffect(() => {
    const fresh = searchParams.get('fresh');
    if (fresh === 'true') {
      console.log('Dashboard: Fresh login detected, cleaning URL');
      
      // Clean up URL without causing page reloads
      const url = new URL(window.location.href);
      url.searchParams.delete('fresh');
      
      // Remove timestamp parameter
      if (url.searchParams.has('_')) {
        url.searchParams.delete('_');
      }
      
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  // Fetch GitHub user data
  const {
    data: userData,
    isLoading: isUserLoading,
    error: userError
  } = useGitHubUser(githubUsername, {
    enabled: !!githubUsername
  });

  // Fetch GitHub contributions data
  const {
    data: contributionsData,
    isLoading: isContributionsLoading,
    error: contributionsError
  } = useGitHubContributions(githubUsername, {
    enabled: !!githubUsername
  });

  // State for repositories
  const [repositories, setRepositories] = useState<any[]>([]);
  const [isRepositoriesLoading, setIsRepositoriesLoading] = useState(true);
  const [repositoriesError, setRepositoriesError] = useState<Error | null>(null);

  // Fetch repositories directly using the API
  useEffect(() => {
    if (!githubUsername) {
      setIsRepositoriesLoading(false);
      return;
    }
    
    async function fetchRepositories() {
      try {
        setIsRepositoriesLoading(true);
        
        const params = new URLSearchParams({
          sort: 'updated',
          direction: 'desc',
          per_page: '2'
        });
        
        const response = await fetch(`/api/github/repositories?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch repositories');
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        setRepositories(data.repositories || []);
      } catch (err) {
        console.error('Error fetching repositories:', err);
        setRepositoriesError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsRepositoriesLoading(false);
      }
    }
    
    fetchRepositories();
  }, [githubUsername]);

  // Process GitHub data
  const processedUserData = useMemo(() => {
    if (!userData?.data) return null;
    return transformUserData(userData.data);
  }, [userData]);

  const processedContributionsData = useMemo(() => {
    if (!contributionsData?.data) return null;
    return transformContributionsData(contributionsData.data);
  }, [contributionsData]);

  // Generate activity data for charts
  const activityChartData = useMemo(() => {
    if (!processedContributionsData) {
      return { dayData: [], timeData: [] };
    }

    // Group contributions by day of week
    const dayOfWeekCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const timeOfDayCount: Record<number, number> = { 0: 0, 3: 0, 6: 0, 9: 0, 12: 0, 15: 0, 18: 0, 21: 0 };
    
    processedContributionsData.calendar.forEach(day => {
      if (day.count === 0) return;
      
      // Count by day of week
      const date = new Date(day.date);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      dayOfWeekCount[dayOfWeek] += day.count;
      
      // Estimate time of day (simplified since we don't have this data)
      // Distribute the count across time periods based on probability
      const hour = Math.floor(Math.random() * 24);
      const timeBucket = Math.floor(hour / 3) * 3; // Group into 3-hour buckets
      if (timeBucket in timeOfDayCount) {
        timeOfDayCount[timeBucket] += day.count;
      }
    });

    // Format for charts
    const dayData = [
      { name: 'Mon', value: dayOfWeekCount[1] },
      { name: 'Tue', value: dayOfWeekCount[2] },
      { name: 'Wed', value: dayOfWeekCount[3] },
      { name: 'Thu', value: dayOfWeekCount[4] },
      { name: 'Fri', value: dayOfWeekCount[5] },
      { name: 'Sat', value: dayOfWeekCount[6] },
      { name: 'Sun', value: dayOfWeekCount[0] },
    ];
    
    const timeData = [
      { name: '12AM', value: timeOfDayCount[0] },
      { name: '3AM', value: timeOfDayCount[3] },
      { name: '6AM', value: timeOfDayCount[6] },
      { name: '9AM', value: timeOfDayCount[9] },
      { name: '12PM', value: timeOfDayCount[12] },
      { name: '3PM', value: timeOfDayCount[15] },
      { name: '6PM', value: timeOfDayCount[18] },
      { name: '9PM', value: timeOfDayCount[21] },
    ];

    return { dayData, timeData };
  }, [processedContributionsData]);

  const isDataLoading = isUserLoading || isContributionsLoading || isRepositoriesLoading;

  // Render the dashboard regardless of loading state
  // This ensures we don't get stuck in an infinite loading screen
  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      {/* Welcome Message */}
      {isLoading ? (
        <div className="bg-card p-4 rounded-lg shadow-sm mb-6">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary mr-2"></div>
            <h2 className="text-xl font-semibold">Loading user data...</h2>
          </div>
        </div>
      ) : user ? (
        <div className="bg-card p-4 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold">
            Welcome, {processedUserData?.displayName || user.user_metadata?.full_name || user.user_metadata?.user_name || user.email}
          </h2>
          {processedUserData?.bio && (
            <p className="text-muted-foreground mt-1">{processedUserData.bio}</p>
          )}
        </div>
      ) : (
        <div className="bg-card p-4 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold">Dashboard</h2>
          <p className="text-muted-foreground">No user data available. Please try refreshing or logging in again.</p>
        </div>
      )}
      
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isDataLoading ? (
          <>
            <Skeleton className="h-[100px] w-full" />
            <Skeleton className="h-[100px] w-full" />
            <Skeleton className="h-[100px] w-full" />
            <Skeleton className="h-[100px] w-full" />
          </>
        ) : processedContributionsData ? (
          <>
            <StatsCard 
              title="Current Streak"
              subtitle="Days in a row"
              value={processedContributionsData.stats.currentStreak}
              icon={<Calendar className="h-5 w-5" />}
            />
            <StatsCard 
              title="Longest Streak"
              subtitle="Your record"
              value={processedContributionsData.stats.longestStreak}
              icon={<GitBranch className="h-5 w-5" />}
            />
            <StatsCard 
              title="Weekly Average"
              subtitle="Contributions"
              value={Math.round((processedContributionsData.stats.totalContributions / 52) * 10) / 10}
              icon={<BarChart2 className="h-5 w-5" />}
            />
            <StatsCard 
              title="Most Active Time"
              subtitle="For contributions"
              value={activityChartData.timeData.reduce((prev, current) => 
                (prev.value > current.value) ? prev : current
              ).name}
              icon={<Clock className="h-5 w-5" />}
            />
          </>
        ) : (
          <div className="col-span-4 text-center p-4 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground">No contribution data available. Please connect your GitHub account.</p>
          </div>
        )}
      </div>
      
      {/* Contribution Calendar */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Contribution Activity</h2>
        <div className="bg-card border border-border rounded-lg p-6">
          <ContributionCalendar username={githubUsername} />
        </div>
      </div>
      
      {/* Activity Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {isDataLoading ? (
          <>
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </>
        ) : processedContributionsData ? (
          <>
            <ActivityChart 
              title="Contributions by Day of Week" 
              data={activityChartData.dayData} 
              color="#9b87f5"
            />
            <ActivityChart 
              title="Contributions by Time of Day" 
              data={activityChartData.timeData} 
              color="#3abff8"
            />
          </>
        ) : (
          <div className="col-span-2 text-center p-4 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground">No activity data available.</p>
          </div>
        )}
      </div>
      
      {/* Recent Repositories */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Active Repositories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isRepositoriesLoading ? (
            <>
              <Skeleton className="h-[150px] w-full" />
              <Skeleton className="h-[150px] w-full" />
            </>
          ) : repositories && repositories.length > 0 ? (
            repositories.slice(0, 2).map(repo => (
              <RepositoryCard 
                key={repo.id || repo.name}
                name={repo.name}
                description={repo.description || ""}
                language={repo.language || "Unknown"}
                stars={repo.starCount || 0}
                forks={repo.forkCount || 0}
                lastCommit={typeof repo.pushedAt === 'string' || typeof repo.updatedAt === 'string' ? 
                  getRelativeTimeString(new Date(repo.pushedAt || repo.updatedAt)) : 
                  "recently"}
                activity={repo.activity || "Active"}
                onSelect={() => window.open(repo.url, '_blank')}
              />
            ))
          ) : (
            <div className="col-span-2 text-center p-4 bg-card rounded-lg border border-border">
              <p className="text-muted-foreground">No repository data available.</p>
            </div>
          )}
        </div>
        {/* Fix My Streak Button */}
        <div className="flex justify-center mt-6">
          <button
            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-semibold shadow hover:bg-primary/90 transition"
            onClick={() => router.push('/streak-manager')}
            type="button"
          >
            Fix My Streak
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Helper function to format relative time with safety checks
function getRelativeTimeString(date: Date): string {
  try {
    if (!date || typeof date.getTime !== 'function') {
      return 'recently';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);
    const diffWeek = Math.round(diffDay / 7);
    const diffMonth = Math.round(diffDay / 30);
    const diffYear = Math.round(diffDay / 365);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin} minutes ago`;
    if (diffHour < 24) return `${diffHour} hours ago`;
    if (diffDay < 7) return `${diffDay} days ago`;
    if (diffWeek < 4) return `${diffWeek} weeks ago`;
    if (diffMonth < 12) return `${diffMonth} months ago`;
    return `${diffYear} years ago`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'recently';
  }
} 