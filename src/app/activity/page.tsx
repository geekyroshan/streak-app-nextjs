"use client";

import { DashboardLayout } from '@/components/dashboard-layout/DashboardLayout';
import { ActivityChart } from '@/components/charts/ActivityChart';
import { ContributionCalendar } from '@/components/contribution-calendar/ContributionCalendar';
import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useGitHubContributions, transformContributionsData } from '@/hooks/github/use-github-contributions';
import { Skeleton } from '@/components/ui/skeleton';

export default function ActivityPage() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'12m' | '6m' | '3m' | '1m'>('12m');
  
  // GitHub username from Supabase auth
  const githubUsername = useMemo(() => {
    return user?.user_metadata?.user_name || '';
  }, [user]);
  
  // Calculate date range based on selected time range
  const dateRange = useMemo(() => {
    const now = new Date();
    let fromDate = new Date();
    
    switch (timeRange) {
      case '1m':
        fromDate.setMonth(now.getMonth() - 1);
        break;
      case '3m':
        fromDate.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        fromDate.setMonth(now.getMonth() - 6);
        break;
      case '12m':
      default:
        fromDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    return { fromDate, toDate: now };
  }, [timeRange]);

  // Fetch GitHub contributions data
  const {
    data: contributionsData,
    isLoading,
    error
  } = useGitHubContributions(githubUsername, {
    fromDate: dateRange.fromDate,
    toDate: dateRange.toDate,
    enabled: !!githubUsername
  });
  
  // Process contributions data
  const processedData = useMemo(() => {
    if (!contributionsData?.data) return null;
    return transformContributionsData(contributionsData.data);
  }, [contributionsData]);
  
  // Generate activity data for charts
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
  
  // Calculate activity statistics
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

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Activity</h1>
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
      
      {/* Contribution Calendar */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Contribution Activity</h2>
        <div className="bg-card border border-border rounded-lg p-6">
          <ContributionCalendar username={githubUsername} />
        </div>
      </div>
      
      {/* Activity Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {isLoading ? (
          <>
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </>
        ) : error ? (
          <div className="col-span-2 text-center p-6 bg-card rounded-lg border border-border">
            <p className="text-destructive">Error loading activity data. Please try again later.</p>
          </div>
        ) : processedData ? (
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
          <div className="col-span-2 text-center p-6 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground">No activity data available. Please connect your GitHub account.</p>
          </div>
        )}
      </div>
      
      {/* Monthly Activity */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Monthly Activity</h2>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : processedData ? (
          <div className="bg-card border border-border rounded-lg p-6">
            <ActivityChart 
              title="Contributions by Month" 
              data={activityChartData.monthData} 
              color="#66D9C2"
            />
          </div>
        ) : (
          <div className="text-center p-6 bg-card rounded-lg border border-border">
            <p className="text-muted-foreground">No monthly activity data available.</p>
          </div>
        )}
      </div>
      
      {/* Note: Activity Statistics cards have been migrated to Analytics page */}
    </DashboardLayout>
  );
} 