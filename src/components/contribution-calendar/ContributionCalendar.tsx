"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ContributionCalendarProps {
  className?: string;
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

const YEARS = ['2025', '2024', '2023', '2022', '2021'];

// Mock data for the contribution cells
// 0 = no contribution, 1-4 = level of contribution
const generateMockData = () => {
  const data: number[][] = [];
  
  for (let day = 0; day < 7; day++) {
    data[day] = [];
    for (let week = 0; week < 53; week++) {
      const rand = Math.random();
      if (rand < 0.6) {
        data[day][week] = 0;
      } else if (rand < 0.75) {
        data[day][week] = 1;
      } else if (rand < 0.85) {
        data[day][week] = 2;
      } else if (rand < 0.95) {
        data[day][week] = 3;
      } else {
        data[day][week] = 4;
      }
    }
  }
  return data;
};

export function ContributionCalendar({ className }: ContributionCalendarProps) {
  const [selectedYear, setSelectedYear] = React.useState('2025');
  const contributionData = React.useMemo(() => generateMockData(), []);
  const [hoverInfo, setHoverInfo] = React.useState<string | null>(null);

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
            
            <div className="grid grid-rows-3 gap-4">
              {[0, 1, 2].map((rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-[repeat(52,_minmax(0,_1fr))] gap-1">
                  {Array.from({ length: 52 }).map((_, cellIndex) => {
                    const level = contributionData[rowIndex]?.[cellIndex] || 0;
                    return (
                      <div
                        key={`${rowIndex}-${cellIndex}`}
                        className={cn(
                          "w-4 h-4 rounded-sm cursor-pointer",
                          `contribution-level-${level}`
                        )}
                        onMouseEnter={() => setHoverInfo(`${level} contributions on this day`)}
                        onMouseLeave={() => setHoverInfo(null)}
                        title={`${level} contributions on this day`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-left">
        {hoverInfo && (
          <span className="text-xs text-muted-foreground bg-card p-1 rounded">
            {hoverInfo}
          </span>
        )}
        {!hoverInfo && (
          <a href="#" className="text-xs text-muted-foreground hover:text-foreground">
            Learn how we count contributions
          </a>
        )}
      </div>
    </div>
  );
} 