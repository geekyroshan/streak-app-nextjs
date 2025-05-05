"use client";

import { DashboardLayout } from '@/components/dashboard-layout/DashboardLayout';
import { ActivityChart } from '@/components/charts/ActivityChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch, BarChart2, Activity, Calendar } from 'lucide-react';

export default function AnalyticsPage() {
  // Mock data for analytics charts
  const monthlyData = [
    { name: 'Jan', value: 120 },
    { name: 'Feb', value: 98 },
    { name: 'Mar', value: 142 },
    { name: 'Apr', value: 85 },
    { name: 'May', value: 110 },
    { name: 'Jun', value: 75 },
    { name: 'Jul', value: 95 },
    { name: 'Aug', value: 118 },
    { name: 'Sep', value: 125 },
    { name: 'Oct', value: 156 },
    { name: 'Nov', value: 132 },
    { name: 'Dec', value: 114 },
  ];
  
  const repoActivityData = [
    { name: 'github-streak-manager', value: 45 },
    { name: 'react-contribution-heatmap', value: 32 },
    { name: 'developer-portfolio', value: 28 },
    { name: 'ts-utils', value: 18 },
    { name: 'github-api-wrapper', value: 15 },
    { name: 'markdown-blog-starter', value: 12 },
  ];

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <div className="space-x-2">
          <select className="bg-secondary text-secondary-foreground px-3 py-2 rounded-md text-sm">
            <option>Last 12 months</option>
            <option>Last 6 months</option>
            <option>Last 3 months</option>
            <option>Last month</option>
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
            <div className="flex items-center">
              <Activity className="w-4 h-4 mr-2 text-muted-foreground" />
              <div className="text-2xl font-bold">1,248</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">+12.3% from last year</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <div className="text-2xl font-bold">32 days</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Current streak</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Repositories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <GitBranch className="w-4 h-4 mr-2 text-muted-foreground" />
              <div className="text-2xl font-bold">8</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across 3 organizations</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Contribution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BarChart2 className="w-4 h-4 mr-2 text-muted-foreground" />
              <div className="text-2xl font-bold">3.4/day</div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Avg over last 30 days</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Contribution Trends */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Contribution Trends</h2>
        <Card>
          <CardHeader>
            <CardTitle>Monthly Activity</CardTitle>
            <CardDescription>Contributions over the past year</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart 
              title="Contributions by Month" 
              data={monthlyData} 
              color="#66D9C2"
            />
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
            <ActivityChart 
              title="Contributions by Repository" 
              data={repoActivityData} 
              color="#9b87f5"
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 