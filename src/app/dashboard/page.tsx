"use client";

import { DashboardLayout } from '@/components/dashboard-layout/DashboardLayout';
import { ActivityChart } from '@/components/charts/ActivityChart';
import { ContributionCalendar } from '@/components/contribution-calendar/ContributionCalendar';
import { StatsCard } from '@/components/stats/StatsCard';
import { RepositoryCard } from '@/components/repository/RepositoryCard';
import { Calendar, GitBranch, BarChart2, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Mock data for ActivityChart
  const dayData = [
    { name: 'Mon', value: 12 },
    { name: 'Tue', value: 8 },
    { name: 'Wed', value: 15 },
    { name: 'Thu', value: 6 },
    { name: 'Fri', value: 18 },
    { name: 'Sat', value: 10 },
    { name: 'Sun', value: 5 },
  ];
  
  const timeData = [
    { name: '12AM', value: 2 },
    { name: '3AM', value: 1 },
    { name: '6AM', value: 5 },
    { name: '9AM', value: 10 },
    { name: '12PM', value: 8 },
    { name: '3PM', value: 14 },
    { name: '6PM', value: 12 },
    { name: '9PM', value: 5 },
  ];

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      {/* Welcome Message */}
      {user && (
        <div className="bg-card p-4 rounded-lg shadow-sm mb-6">
          <h2 className="text-xl font-semibold">Welcome, {user.user_metadata?.full_name || user.user_metadata?.user_name || user.email}</h2>
        </div>
      )}
      
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard 
          title="Current Streak"
          subtitle="Days in a row"
          value={14}
          change={{ value: 27, label: "last month", isPositive: true }}
          icon={<Calendar className="h-5 w-5" />}
        />
        <StatsCard 
          title="Longest Streak"
          subtitle="Your record"
          value={32}
          change={{ value: 0, label: "unchanged", isPositive: true }}
          icon={<GitBranch className="h-5 w-5" />}
        />
        <StatsCard 
          title="Weekly Average"
          subtitle="Contributions"
          value={8.3}
          change={{ value: 12, label: "last week", isPositive: true }}
          icon={<BarChart2 className="h-5 w-5" />}
        />
        <StatsCard 
          title="Best Time"
          subtitle="For contributions"
          value="3PM"
          change={{ value: 5, label: "last month", isPositive: false }}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>
      
      {/* Contribution Calendar */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Contribution Activity</h2>
        <div className="bg-card border border-border rounded-lg p-6">
          <ContributionCalendar />
        </div>
      </div>
      
      {/* Activity Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <ActivityChart 
          title="Contributions by Day of Week" 
          data={dayData} 
          color="#9b87f5"
        />
        <ActivityChart 
          title="Contributions by Time of Day" 
          data={timeData} 
          color="#3abff8"
        />
      </div>
      
      {/* Recent Repositories */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Active Repositories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RepositoryCard 
            name="github-streak-manager"
            description="Manage your GitHub contribution streak efficiently"
            language="TypeScript"
            stars={48}
            forks={12}
            lastCommit="2 days ago"
            activity="Active"
            onSelect={() => console.log('Selected repo')}
          />
          <RepositoryCard 
            name="react-contribution-heatmap"
            description="A customizable React component for GitHub-style contribution calendars"
            language="JavaScript"
            stars={156}
            forks={34}
            lastCommit="1 week ago"
            activity="Moderate"
            onSelect={() => console.log('Selected repo')}
          />
        </div>
      </div>
    </DashboardLayout>
  );
} 