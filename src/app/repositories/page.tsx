"use client";

import { DashboardLayout } from '@/components/dashboard-layout/DashboardLayout';
import { RepositoryCard } from '@/components/repository/RepositoryCard';
import { RepositoryDetails } from '@/components/repository/RepositoryDetails';
import { useAuth } from '@/context/AuthContext';
import { useState, useMemo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious
} from '@/components/ui/pagination';

export default function RepositoriesPage() {
  const { user } = useAuth();
  const [language, setLanguage] = useState<string | undefined>(undefined);
  const [sortOption, setSortOption] = useState<'updated' | 'created' | 'pushed' | 'full_name'>('updated');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRepo, setSelectedRepo] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const perPage = 10;
  
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
          per_page: '50', // Fetch more to handle client-side filtering
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
    setCurrentPage(1); // Reset to first page
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
    
    setCurrentPage(1); // Reset to first page
  };

  // Handle search query change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page
  };

  // Filter repositories by search query
  const filteredRepositories = useMemo(() => {
    if (!searchQuery.trim()) return repositories;
    
    const query = searchQuery.toLowerCase();
    return repositories.filter(repo => 
      repo.name.toLowerCase().includes(query) || 
      (repo.description && repo.description.toLowerCase().includes(query))
    );
  }, [repositories, searchQuery]);

  // Calculate pagination
  const paginatedRepositories = useMemo(() => {
    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    return filteredRepositories.slice(startIndex, endIndex);
  }, [filteredRepositories, currentPage, perPage]);

  const totalPages = Math.ceil(filteredRepositories.length / perPage);

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

  // Handle opening repository details
  const handleViewDetails = (repo: any) => {
    setSelectedRepo({
      ...repo,
      updatedAt: new Date(repo.updatedAt),
      pushedAt: repo.lastPushedAt ? new Date(repo.lastPushedAt) : null,
    });
    setIsDetailsOpen(true);
  };

  // For future implementation
  const handleAddRepository = () => {
    // To be implemented in future updates
    alert('This feature will be available in a future update.');
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Repositories</h1>
          <Button onClick={handleAddRepository} className="flex items-center">
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Repository
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="relative w-full md:w-1/3">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-8"
            />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
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
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[180px] w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center p-8 bg-card rounded-lg border border-border mt-6">
          <p className="text-destructive">Error loading repositories. Please try again later.</p>
        </div>
      ) : filteredRepositories.length === 0 ? (
        <div className="text-center p-8 bg-card rounded-lg border border-border mt-6">
          <p className="text-muted-foreground">
            {searchQuery ? 'No repositories found matching your search' : 'No repositories found. Try adjusting your filters or connecting your GitHub account.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {paginatedRepositories.map((repo) => (
              <RepositoryCard 
                key={repo.id || repo.name}
                name={repo.name}
                description={repo.description || ""}
                language={repo.language || "Unknown"}
                stars={repo.starCount || 0}
                forks={repo.forkCount || 0}
                lastCommit={getRelativeTimeString(repo.pushedAt || repo.updatedAt)}
                activity={repo.activity || "Active"}
                onViewOnGitHub={() => window.open(repo.url, '_blank')}
                onViewDetails={() => handleViewDetails(repo)}
              />
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {/* Show first page */}
                {currentPage > 2 && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
                  </PaginationItem>
                )}
                
                {/* Ellipsis */}
                {currentPage > 3 && (
                  <PaginationItem>
                    <span className="px-4">...</span>
                  </PaginationItem>
                )}
                
                {/* Current page -1 (if available) */}
                {currentPage > 1 && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setCurrentPage(currentPage - 1)}>
                      {currentPage - 1}
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                {/* Current page */}
                <PaginationItem>
                  <PaginationLink isActive>{currentPage}</PaginationLink>
                </PaginationItem>
                
                {/* Current page +1 (if available) */}
                {currentPage < totalPages && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setCurrentPage(currentPage + 1)}>
                      {currentPage + 1}
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                {/* Ellipsis */}
                {currentPage < totalPages - 2 && (
                  <PaginationItem>
                    <span className="px-4">...</span>
                  </PaginationItem>
                )}
                
                {/* Last page */}
                {currentPage < totalPages - 1 && (
                  <PaginationItem>
                    <PaginationLink onClick={() => setCurrentPage(totalPages)}>
                      {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                )}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
          
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Showing {paginatedRepositories.length} of {filteredRepositories.length} repositories
          </div>
        </>
      )}
      
      {/* Repository Details Dialog */}
      {selectedRepo && (
        <RepositoryDetails
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          repository={selectedRepo}
        />
      )}
    </DashboardLayout>
  );
} 