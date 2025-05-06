"use client";

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGitHubContributions, transformContributionsData } from '@/hooks/github/use-github-contributions';
import { useAuth } from '@/context/AuthContext';

interface ContributionCalendarProps {
  className?: string;
  username?: string;
}

type Month = {
  name: string;
  abbreviation: string;
};

const MONTHS: Month[] = [
  { name: 'January', abbreviation: 'Jan' },
  { name: 'February', abbreviation: 'Feb' },
  { name: 'March', abbreviation: 'Mar' },
  { name: 'April', abbreviation: 'Apr' },
  { name: 'May', abbreviation: 'May' },
  { name: 'June', abbreviation: 'Jun' },
  { name: 'July', abbreviation: 'Jul' },
  { name: 'August', abbreviation: 'Aug' },
  { name: 'September', abbreviation: 'Sep' },
  { name: 'October', abbreviation: 'Oct' },
  { name: 'November', abbreviation: 'Nov' },
  { name: 'December', abbreviation: 'Dec' },
];

const DAYS = ['Mon', 'Wed', 'Fri'];

// Calculate the last 5 years for the year selection
const getCurrentYears = () => {
  const currentYear = new Date().getFullYear();
  return [
    currentYear.toString(),
    (currentYear - 1).toString(),
    (currentYear - 2).toString(),
    (currentYear - 3).toString(),
    (currentYear - 4).toString(),
  ];
};

const YEARS = getCurrentYears();

// Map GitHub contribution count to level (0-4)
const getContributionLevel = (count: number): 0 | 1 | 2 | 3 | 4 => {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
};

export function ContributionCalendar({ className, username: propUsername }: ContributionCalendarProps) {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(YEARS[0]);
  const [hoverInfo, setHoverInfo] = useState<string | null>(null);
  
  // Determine which username to use (prop or authenticated user)
  const username = propUsername || user?.user_metadata?.user_name || '';

  // Calculate date range for the selected year
  const dateRange = useMemo(() => {
    const year = parseInt(selectedYear);
    const fromDate = new Date(year, 0, 1); // Jan 1
    const toDate = new Date(year, 11, 31); // Dec 31
    return { fromDate, toDate };
  }, [selectedYear]);

  // Fetch contribution data
  const { data, isLoading, error } = useGitHubContributions(username, {
    fromDate: dateRange.fromDate, 
    toDate: dateRange.toDate,
    enabled: !!username
  });

  // Process contribution data into calendar format
  const contributionData = useMemo(() => {
    if (!data?.data) return null;
    
    return transformContributionsData(data.data);
  }, [data]);

  // Format data for the calendar grid
  const calendarData = useMemo(() => {
    if (!contributionData) return null;
    
    // Create a map of date -> contribution count
    const dateMap = new Map();
    contributionData.calendar.forEach(day => {
      dateMap.set(day.date, day.count);
    });
    
    // Build the calendar grid (7 days x 52 weeks)
    const grid: number[][] = [];
    
    // Starting from the first day of the selected year
    const startDate = new Date(parseInt(selectedYear), 0, 1);
    
    // Adjust to start from the first day of the week (Monday)
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    // Generate the grid
    for (let row = 0; row < 7; row++) {
      grid[row] = [];
      for (let col = 0; col < 53; col++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + (row + col * 7));
        
        // Format the date as YYYY-MM-DD
        const formattedDate = currentDate.toISOString().split('T')[0];
        
        // Get contribution count for this date (default to 0)
        const count = dateMap.get(formattedDate) || 0;
        
        grid[row][col] = count;
      }
    }
    
    return grid;
  }, [contributionData, selectedYear]);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center gap-2 mb-4">
        {YEARS.map((year) => (
          <Button
            key={year}
            variant={selectedYear === year ? "default" : "outline"}
            className={cn(
              "h-8 px-3 py-1 rounded-md",
              selectedYear === year 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary text-secondary-foreground"
            )}
            onClick={() => setSelectedYear(year)}
          >
            {year}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Less</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm contribution-level-0"></div>
            <div className="w-3 h-3 rounded-sm contribution-level-1"></div>
            <div className="w-3 h-3 rounded-sm contribution-level-2"></div>
            <div className="w-3 h-3 rounded-sm contribution-level-3"></div>
            <div className="w-3 h-3 rounded-sm contribution-level-4"></div>
          </div>
          <span className="text-sm text-muted-foreground">More</span>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        {isLoading && (
          <div className="flex justify-center items-center h-60">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Loading contribution data...</span>
          </div>
        )}
        
        {error && (
          <div className="flex justify-center items-center h-60 text-destructive">
            <p>Failed to load contribution data. Please try again later.</p>
          </div>
        )}
        
        {!isLoading && !error && calendarData && (
          <div className="flex">
            <div className="flex flex-col mr-4 mt-6 gap-4">
              {DAYS.map((day) => (
                <div key={day} className="h-4 text-xs text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="flex flex-col flex-grow">
              <div className="flex mb-2 justify-between">
                {MONTHS.map((month) => (
                  <div
                    key={month.name}
                    className="text-xs text-muted-foreground"
                  >
                    {month.abbreviation}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-rows-7 gap-1">
                {Array.from({ length: 7 }).map((_, rowIndex) => (
                  <div key={rowIndex} className="grid grid-cols-[repeat(53,_minmax(0,_1fr))] gap-1">
                    {Array.from({ length: 53 }).map((_, colIndex) => {
                      const count = calendarData[rowIndex]?.[colIndex] || 0;
                      const level = getContributionLevel(count);
                      
                      return (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className={cn(
                            "w-3 h-3 rounded-sm cursor-pointer",
                            `contribution-level-${level}`
                          )}
                          onMouseEnter={() => setHoverInfo(`${count} contributions on this day`)}
                          onMouseLeave={() => setHoverInfo(null)}
                          title={`${count} contributions on this day`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-left">
        {hoverInfo && (
          <span className="text-xs text-muted-foreground bg-card p-1 rounded">
            {hoverInfo}
          </span>
        )}
        {!hoverInfo && contributionData && (
          <span className="text-xs text-muted-foreground">
            {contributionData.stats.totalContributions} contributions in {selectedYear}
          </span>
        )}
      </div>
    </div>
  );
} 