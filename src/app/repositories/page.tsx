"use client";

import { DashboardLayout } from '@/components/dashboard-layout/DashboardLayout';
import { RepositoryCard } from '@/components/repository/RepositoryCard';
import { useAuth } from '@/context/AuthContext';
import { useState, useMemo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function RepositoriesPage() {
  const { user } = useAuth();
  const [language, setLanguage] = useState<string | undefined>(undefined);
  const [sortOption, setSortOption] = useState<'updated' | 'created' | 'pushed' | 'full_name'>('updated');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // GitHub username from Supabase auth
  const githubUsername = useMemo(() => {
    return user?.user_metadata?.user_name || '';
  }, [user]);

  // State for direct API call
  const [repositories, setRepositories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch repositories directly using the API
  useEffect(() => {
    if (!githubUsername) {
      setIsLoading(false);
      return;
    }
    
    async function fetchRepositories() {
      try {
        setIsLoading(true);
        setError(null);
        
        // Build params for filtering
        const params = new URLSearchParams({
          sort: sortOption,
          direction: sortDirection,
          per_page: '20',
        });
        
        // Add language filter if set
        if (language && language !== 'All languages') {
          params.append('language', language);
        }
        
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
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchRepositories();
  }, [githubUsername, language, sortOption, sortDirection]);

  // Extract available languages for the filter
  const availableLanguages = useMemo(() => {
    if (!repositories) return [];
    
    const languages = new Set<string>();
    repositories.forEach(repo => {
      if (repo.language) {
        languages.add(repo.language);
      }
    });
    
    return Array.from(languages).sort();
  }, [repositories]);

  // Handle language filter change
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setLanguage(value === 'All languages' ? undefined : value);
  };

  // Handle sort option change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    
    if (value === 'Name') {
      setSortOption('full_name');
      setSortDirection('asc');
    } else if (value === 'Stars') {
      setSortOption('full_name'); // GitHub API doesn't support sorting by stars directly
      setSortDirection('desc');
    } else if (value === 'Last updated') {
      setSortOption('updated');
      setSortDirection('desc');
    } else if (value === 'Recently created') {
      setSortOption('created');
      setSortDirection('desc');
    } else if (value === 'Recently pushed') {
      setSortOption('pushed');
      setSortDirection('desc');
    }
  };

  // Helper function to format relative time
  const getRelativeTimeString = (dateInput: Date | string | null | undefined): string => {
    let date: Date | null = null;
    if (!dateInput) return 'recently';
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      const parsed = new Date(dateInput);
      if (!isNaN(parsed.getTime())) {
        date = parsed;
      } else {
        return 'recently';
      }
    } else {
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
  };

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Repositories</h1>
        <div className="space-x-2">
          <select 
            className="bg-secondary text-secondary-foreground px-3 py-2 rounded-md text-sm"
            onChange={handleLanguageChange}
            value={language || 'All languages'}
          >
            <option>All languages</option>
            {availableLanguages.map(lang => (
              <option key={lang}>{lang}</option>
            ))}
          </select>
          <select 
            className="bg-secondary text-secondary-foreground px-3 py-2 rounded-md text-sm"
            onChange={handleSortChange}
            value={
              sortOption === 'updated' && sortDirection === 'desc' ? 'Last updated' :
              sortOption === 'created' && sortDirection === 'desc' ? 'Recently created' :
              sortOption === 'pushed' && sortDirection === 'desc' ? 'Recently pushed' :
              sortOption === 'full_name' && sortDirection === 'asc' ? 'Name' :
              'Last updated'
            }
          >
            <option>Last updated</option>
            <option>Recently created</option>
            <option>Recently pushed</option>
            <option>Name</option>
            <option>Stars</option>
          </select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[150px] w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center p-8 bg-card rounded-lg border border-border">
          <p className="text-destructive">Error loading repositories. Please try again later.</p>
        </div>
      ) : repositories.length === 0 ? (
        <div className="text-center p-8 bg-card rounded-lg border border-border">
          <p className="text-muted-foreground">No repositories found. Try adjusting your filters or connecting your GitHub account.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {repositories.map((repo) => (
            <RepositoryCard 
              key={repo.id || repo.name}
              name={repo.name}
              description={repo.description || ""}
              language={repo.language || "Unknown"}
              stars={repo.starCount || 0}
              forks={repo.forkCount || 0}
              lastCommit={getRelativeTimeString(repo.pushedAt || repo.updatedAt)}
              activity={repo.activity || "Active"}
              onSelect={() => window.open(repo.url, '_blank')}
            />
          ))}
        </div>
      )}
      
      {/* Pagination info - simplified */}
      {repositories.length > 0 && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Showing {repositories.length} repositories
        </div>
      )}
    </DashboardLayout>
  );
} 