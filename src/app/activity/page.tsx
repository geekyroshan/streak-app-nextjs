"use client";

import { DashboardLayout } from '@/components/dashboard-layout/DashboardLayout';
import { ActivityChart } from '@/components/charts/ActivityChart';
import { ContributionCalendar } from '@/components/contribution-calendar/ContributionCalendar';

export default function ActivityPage() {
  // Mock data for activity charts
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

  const monthData = [
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

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Activity</h1>
        <div className="space-x-2">
          <select className="bg-secondary text-secondary-foreground px-3 py-2 rounded-md text-sm">
            <option>Last 12 months</option>
            <option>Last 6 months</option>
            <option>Last 3 months</option>
            <option>Last month</option>
          </select>
        </div>
      </div>
      
      {/* Contribution Calendar */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Contribution Activity</h2>
        <div className="bg-card border border-border rounded-lg p-6">
          <ContributionCalendar />
        </div>
      </div>
      
      {/* Activity Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
      
      {/* Monthly Activity */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Monthly Activity</h2>
        <div className="bg-card border border-border rounded-lg p-6">
          <ActivityChart 
            title="Contributions by Month" 
            data={monthData} 
            color="#66D9C2"
          />
        </div>
      </div>
      
      {/* Activity Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium mb-2">Most Active Day</h3>
          <p className="text-3xl font-bold">Friday</p>
          <p className="text-sm text-muted-foreground mt-1">18 contributions on average</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium mb-2">Peak Hours</h3>
          <p className="text-3xl font-bold">3PM - 6PM</p>
          <p className="text-sm text-muted-foreground mt-1">42% of all contributions</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-medium mb-2">Most Productive Month</h3>
          <p className="text-3xl font-bold">October</p>
          <p className="text-sm text-muted-foreground mt-1">156 contributions total</p>
        </div>
      </div>
    </DashboardLayout>
  );
} 