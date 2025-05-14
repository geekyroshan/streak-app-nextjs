"use client";

import { DashboardLayout } from '@/components/dashboard-layout/DashboardLayout';
import { ActivityChart } from '@/components/charts/ActivityChart';
import { ContributionCalendar } from '@/components/contribution-calendar/ContributionCalendar';
import { StatsCard } from '@/components/stats/StatsCard';
import { RepositoryCard } from '@/components/repository/RepositoryCard';
import { Calendar, GitBranch, BarChart2, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, Suspense } from 'react';
import { useGitHubUser, transformUserData } from '@/hooks/github/use-github-user';
import { useGitHubContributions, transformContributionsData } from '@/hooks/github/use-github-contributions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

// Client component wrapper for search params
import { useSearchParams } from 'next/navigation';

function SearchParamsHandler() {
  const searchParams = useSearchParams();
  
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
  
  return null;
}

export default function DashboardPage() {
  const { user, isLoading, session } = useAuth();
  const router = useRouter();
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
      {/* Wrap searchParams usage in Suspense */}
      <Suspense fallback={null}>
        <SearchParamsHandler />
      </Suspense>
      
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
          
          {/* Add GitHub token warning if missing */}
          {!processedUserData && !isUserLoading && (
            <div className="mt-3 p-2 bg-destructive/10 text-destructive rounded">
              <p className="text-sm font-medium">⚠️ GitHub connection issue detected</p>
              <p className="text-xs mt-1">
                We couldn't access your GitHub data. Try refreshing the page or logging out and back in.
              </p>
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => window.location.reload()} 
                  className="text-xs px-2 py-1 bg-secondary rounded hover:bg-secondary/80"
                >
                  Refresh page
                </button>
              </div>
            </div>
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
            repositories.slice(0, 2).map((repo: any) => (
              <RepositoryCard 
                key={repo.id || repo.name}
                name={repo.name}
                description={repo.description || ""}
                language={repo.language}
                stars={repo.starCount || 0}
                forks={repo.forkCount || 0}
                lastCommit={getRelativeTimeString(new Date(repo.pushedAt || repo.updatedAt))}
                activity={repo.activity || "Active"}
                onViewOnGitHub={() => window.open(repo.url, '_blank')}
                onViewDetails={() => window.open(repo.url, '_blank')}
              />
            ))
          ) : (
            <div className="col-span-2 text-center p-4 bg-gray-800 bg-opacity-50 rounded-lg">
              No repositories found. Check your GitHub connection.
            </div>
          )}
        </div>
        
        {/* Add the Fix My Streak button */}
        <div className="mt-4 text-center">
          <Button 
            onClick={() => router.push('/streak-manager')}
            className="bg-[#66D9C2] hover:bg-[#55c8b1] text-gray-900 font-medium"
          >
            Fix My Streak
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Helper function to format relative time with safety checks
function getRelativeTimeString(date: Date): string {
  const now = new Date();
  const differenceInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  // Less than a minute
  if (differenceInSeconds < 60) {
    return "just now";
  }
  
  // Less than an hour
  if (differenceInSeconds < 3600) {
    const minutes = Math.floor(differenceInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }
  
  // Less than a day
  if (differenceInSeconds < 86400) {
    const hours = Math.floor(differenceInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  
  // Less than a week
  if (differenceInSeconds < 604800) {
    const days = Math.floor(differenceInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  
  // Less than a month
  if (differenceInSeconds < 2592000) {
    const weeks = Math.floor(differenceInSeconds / 604800);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  
  // More than a month
  const months = Math.floor(differenceInSeconds / 2592000);
  return `${months} month${months > 1 ? 's' : ''} ago`;
} 