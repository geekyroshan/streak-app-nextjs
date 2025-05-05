"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface RepositoryCardProps {
  name: string;
  description?: string;
  language: string;
  stars: number;
  forks: number;
  lastCommit: string;
  activity: 'Active' | 'Moderate' | 'Low activity' | 'Inactive';
  onSelect: () => void;
}

export function RepositoryCard({
  name,
  description,
  language,
  stars,
  forks,
  lastCommit,
  activity,
  onSelect,
}: RepositoryCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div>
              <h3 className="text-lg font-medium">{name}</h3>
              <p className="text-sm text-muted-foreground">
                {description || 'No description provided'}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="bg-secondary px-2 py-1 rounded-full text-xs flex items-center gap-1">
                <span className={cn(
                  "w-3 h-3 rounded-full",
                  language === 'TypeScript' ? "bg-blue-500" :
                  language === 'JavaScript' ? "bg-yellow-500" : 
                  language === 'Python' ? "bg-blue-600" :
                  language === 'Go' ? "bg-cyan-500" :
                  language === 'MDX' ? "bg-purple-500" : "bg-gray-500"
                )}></span>
                {language}
              </div>
              
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"></path>
                </svg>
                {stars}
              </div>
              
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-.878a2.25 2.25 0 111.5 0v.878a2.25 2.25 0 01-2.25 2.25h-1.5v2.128a2.251 2.251 0 11-1.5 0V8.5h-1.5A2.25 2.25 0 013 6.25v-.878a2.25 2.25 0 115 0zM5.75 4a.75.75 0 00-.75.75v.878A2.25 2.25 0 013.75 3a.75.75 0 00-.75.75v.878a2.25 2.25 0 110 4.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878A2.25 2.25 0 008.25 3a.75.75 0 00-.75.75v.878a2.25 2.25 0 01-1.75 2.25h-.986c-.422-.273-.704-.756-.764-1.304V4.75A.75.75 0 005.75 4z"></path>
                </svg>
                {forks}
              </div>
            </div>
          </div>
          
          <Button variant="outline" onClick={onSelect}>Select</Button>
        </div>
        
        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
          <div>Updated {lastCommit}</div>
          <div className="flex items-center gap-1">
            <span className={cn(
              "w-2 h-2 rounded-full",
              activity === 'Active' ? "bg-green-500" :
              activity === 'Moderate' ? "bg-yellow-500" :
              activity === 'Low activity' ? "bg-orange-500" : "bg-gray-500"
            )}></span>
            {activity}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 