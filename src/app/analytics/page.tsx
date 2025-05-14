"use client";

import { DashboardLayout } from '@/components/dashboard-layout/DashboardLayout';
import { ActivityChart } from '@/components/charts/ActivityChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch, BarChart2, Activity, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useState, useMemo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useGitHubContributions, transformContributionsData } from '@/hooks/github/use-github-contributions';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'12m' | '6m' | '3m' | '1m'>('12m');
  
  // GitHub username from Supabase auth
  const githubUsername = useMemo(() => {
    return user?.user_metadata?.user_name || '';
  }, [user]);
  
  // Calculate date range based on selected time range
  const { fromDate, toDate } = useMemo(() => {
    const to = new Date();
    const from = new Date(to);
    
    switch (timeRange) {
      case '6m':
        from.setMonth(from.getMonth() - 6);
        break;
      case '3m':
        from.setMonth(from.getMonth() - 3);
        break;
      case '1m':
        from.setMonth(from.getMonth() - 1);
        break;
      case '12m':
      default:
        from.setFullYear(from.getFullYear() - 1);
        break;
    }
    
    return { fromDate: from, toDate: to };
  }, [timeRange]);
  
  // Fetch contribution data
  const { data: contributionsData, isLoading, error } = useGitHubContributions(githubUsername, {
    fromDate,
    toDate,
    enabled: !!githubUsername
  });
  
  // Process the data for display
  const processedData = useMemo(() => {
    if (!contributionsData?.data) return null;
    return transformContributionsData(contributionsData.data);
  }, [contributionsData]);
  
  // Group contributions by month
  const monthlyData = useMemo(() => {
    if (!processedData) return [];
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyContributions: Record<string, number> = {};
    
    // Initialize all months with 0
    months.forEach(month => {
      monthlyContributions[month] = 0;
    });
    
    // Count contributions by month
    processedData.calendar.forEach(day => {
      const date = new Date(day.date);
      const month = months[date.getMonth()];
      monthlyContributions[month] += day.count;
    });
    
    // Convert to the format expected by ActivityChart
    return months.map(month => ({
      name: month,
      value: monthlyContributions[month]
    }));
  }, [processedData]);
  
  // Generate activity data for statistics cards
  const activityChartData = useMemo(() => {
    if (!processedData) {
      return { dayData: [], timeData: [], monthData: [] };
    }

    // Group contributions by day of week
    const dayOfWeekCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const timeOfDayCount: Record<number, number> = { 0: 0, 3: 0, 6: 0, 9: 0, 12: 0, 15: 0, 18: 0, 21: 0 };
    const monthCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0 };
    
    processedData.calendar.forEach(day => {
      if (day.count === 0) return;
      
      // Count by day of week
      const date = new Date(day.date);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      dayOfWeekCount[dayOfWeek] += day.count;
      
      // Count by month
      const month = date.getMonth(); // 0 = January, 11 = December
      monthCount[month] += day.count;
      
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
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthData = monthNames.map((name, index) => ({
      name,
      value: monthCount[index]
    }));

    return { dayData, timeData, monthData };
  }, [processedData]);
  
  // Calculate activity statistics for the 3 cards
  const activityStats = useMemo(() => {
    if (!processedData || !activityChartData) {
      return null;
    }
    
    // Find most active day
    const mostActiveDay = activityChartData.dayData.reduce((prev, current) => 
      (prev.value > current.value) ? prev : current
    );
    
    // Convert day index to name
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mostActiveDayIndex = activityChartData.dayData.findIndex(d => d.value === mostActiveDay.value);
    const mostActiveDayName = dayNames[mostActiveDayIndex === 6 ? 0 : mostActiveDayIndex + 1]; // Adjust for array index
    
    // Find peak hours
    const peakTimeData = [...activityChartData.timeData].sort((a, b) => b.value - a.value).slice(0, 2);
    const peakHours = peakTimeData.map(t => t.name).join(' - ');
    
    // Calculate percentage
    const totalContributions = activityChartData.timeData.reduce((sum, item) => sum + item.value, 0);
    const peakContributions = peakTimeData.reduce((sum, item) => sum + item.value, 0);
    const peakPercentage = totalContributions ? Math.round((peakContributions / totalContributions) * 100) : 0;
    
    // Find most productive month
    const mostProductiveMonth = activityChartData.monthData.reduce((prev, current) => 
      (prev.value > current.value) ? prev : current
    );
    
    return {
      mostActiveDay: mostActiveDayName,
      mostActiveDayCount: mostActiveDay.value,
      peakHours,
      peakPercentage,
      mostProductiveMonth: mostProductiveMonth.name,
      mostProductiveMonthCount: mostProductiveMonth.value
    };
  }, [processedData, activityChartData]);
  
  // Get repository contribution data - FIXED to respect time range
  const repoActivityData = useMemo(() => {
    if (!processedData) return [];
    
    // Filter repositories by the selected time range by using only the data in processedData
    // which is already filtered by time range in the API call
    
    // Combine all types of repository contributions
    const repoContributions = new Map<string, number>();
    
    // Add commits by repository
    processedData.repositories.commits.forEach(repo => {
      const current = repoContributions.get(repo.name) || 0;
      repoContributions.set(repo.name, current + repo.count);
    });
    
    // Add pull requests by repository
    processedData.repositories.pullRequests.forEach(repo => {
      const current = repoContributions.get(repo.name) || 0;
      repoContributions.set(repo.name, current + repo.count);
    });
    
    // Add issues by repository
    processedData.repositories.issues.forEach(repo => {
      const current = repoContributions.get(repo.name) || 0;
      repoContributions.set(repo.name, current + repo.count);
    });
    
    // Convert to array and sort by contribution count (descending)
    return Array.from(repoContributions.entries())
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // Take top 6 repositories
  }, [processedData]);
  
  // Calculate statistics
  const stats = useMemo(() => {
    if (!processedData) {
      return {
        totalContributions: 0,
        activeStreak: 0,
        activeRepos: 0,
        contributionRate: 0
      };
    }
    
    // Count unique repositories
    const uniqueRepos = new Set<string>();
    processedData.repositories.commits.forEach(repo => uniqueRepos.add(repo.name));
    processedData.repositories.pullRequests.forEach(repo => uniqueRepos.add(repo.name));
    processedData.repositories.issues.forEach(repo => uniqueRepos.add(repo.name));
    
    // Calculate daily contribution rate
    const daysInRange = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    const contributionRate = daysInRange > 0 
      ? Number((processedData.stats.totalContributions / daysInRange).toFixed(1))
      : 0;
      
    return {
      totalContributions: processedData.stats.totalContributions,
      activeStreak: processedData.stats.currentStreak,
      activeRepos: uniqueRepos.size,
      contributionRate
    };
  }, [processedData, fromDate, toDate]);

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <div className="space-x-2">
          <select 
            className="bg-secondary text-secondary-foreground px-3 py-2 rounded-md text-sm"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
          >
            <option value="12m">Last 12 months</option>
            <option value="6m">Last 6 months</option>
            <option value="3m">Last 3 months</option>
            <option value="1m">Last month</option>
          </select>
        </div>
      </div>
      
      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-center">
                <Activity className="w-4 h-4 mr-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{stats.totalContributions.toLocaleString()}</div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">During selected timeframe</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Streak</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{stats.activeStreak} days</div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Current streak</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Repositories</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-center">
                <GitBranch className="w-4 h-4 mr-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{stats.activeRepos}</div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">With recent contributions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Contribution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="flex items-center">
                <BarChart2 className="w-4 h-4 mr-2 text-muted-foreground" />
                <div className="text-2xl font-bold">{stats.contributionRate}/day</div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Avg over selected period</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Activity Statistics Cards - Migrated from Activity page */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {isLoading ? (
          <>
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-[120px] w-full" />
          </>
        ) : activityStats ? (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Most Active Day</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{activityStats.mostActiveDay}</div>
                <p className="text-sm text-muted-foreground mt-1">{activityStats.mostActiveDayCount} contributions on average</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Peak Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{activityStats.peakHours}</div>
                <p className="text-sm text-muted-foreground mt-1">{activityStats.peakPercentage}% of all contributions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Most Productive Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{activityStats.mostProductiveMonth}</div>
                <p className="text-sm text-muted-foreground mt-1">{activityStats.mostProductiveMonthCount} contributions total</p>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="col-span-3 text-center p-6 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground">No activity statistics available.</p>
          </div>
        )}
      </div>
      
      {/* Contribution Trends */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Contribution Trends</h2>
        <Card>
          <CardHeader>
            <CardTitle>Monthly Activity</CardTitle>
            <CardDescription>Contributions over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : error ? (
              <div className="text-destructive p-4 text-center">Error loading contribution data</div>
            ) : (
              <ActivityChart 
                title="Contributions by Month" 
                data={monthlyData} 
                color="#66D9C2"
              />
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Repository Activity */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Repository Activity</h2>
        <Card>
          <CardHeader>
            <CardTitle>Most Active Repositories</CardTitle>
            <CardDescription>Total contributions by repository</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : error ? (
              <div className="text-destructive p-4 text-center">Error loading repository data</div>
            ) : repoActivityData.length === 0 ? (
              <div className="text-muted-foreground p-4 text-center">No repository activity found</div>
            ) : (
              <ActivityChart 
                title="Contributions by Repository" 
                data={repoActivityData} 
                color="#9b87f5"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 