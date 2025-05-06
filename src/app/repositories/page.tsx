"use client";

import { DashboardLayout } from '@/components/dashboard-layout/DashboardLayout';
import { RepositoryCard } from '@/components/repository/RepositoryCard';
import { useGitHubRepositories, transformRepositoryData } from '@/hooks/github/use-github-repositories';
import { useAuth } from '@/context/AuthContext';
import { useState, useMemo } from 'react';
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

  // Fetch GitHub repositories with filters
  const {
    data: repositoriesData,
    isLoading,
    error,
    refetch
  } = useGitHubRepositories(githubUsername, {
    language,
    sort: sortOption,
    direction: sortDirection,
    perPage: 20,
    enabled: !!githubUsername
  });

  // Process repositories data
  const repositories = useMemo(() => {
    if (!repositoriesData?.data) return [];
    return transformRepositoryData(repositoriesData.data);
  }, [repositoriesData]);

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
  const getRelativeTimeString = (date: Date): string => {
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
              key={repo.id}
              name={repo.name}
              description={repo.description}
              language={repo.language || "Unknown"}
              stars={repo.starCount}
              forks={repo.forkCount}
              lastCommit={getRelativeTimeString(repo.pushedAt || repo.updatedAt)}
              activity={repo.activity as any}
              onSelect={() => window.open(repo.url, '_blank')}
            />
          ))}
        </div>
      )}
      
      {/* Pagination info */}
      {repositories.length > 0 && repositoriesData?.metadata?.pagination && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Showing {repositories.length} of {repositoriesData.metadata.pagination.totalCount} repositories
        </div>
      )}
    </DashboardLayout>
  );
} 