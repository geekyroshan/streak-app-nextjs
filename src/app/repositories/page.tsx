"use client";

import { DashboardLayout } from '@/components/dashboard-layout/DashboardLayout';
import { RepositoryCard } from '@/components/repository/RepositoryCard';

export default function RepositoriesPage() {
  // Mock repository data
  const repositories = [
    {
      name: "github-streak-manager",
      description: "Manage your GitHub contribution streak efficiently",
      language: "TypeScript",
      stars: 48,
      forks: 12,
      lastCommit: "2 days ago",
      activity: "Active" as const
    },
    {
      name: "react-contribution-heatmap",
      description: "A customizable React component for GitHub-style contribution calendars",
      language: "JavaScript",
      stars: 156,
      forks: 34,
      lastCommit: "1 week ago",
      activity: "Moderate" as const
    },
    {
      name: "developer-portfolio",
      description: "A clean and minimalist portfolio template for developers",
      language: "TypeScript",
      stars: 89,
      forks: 24,
      lastCommit: "3 weeks ago",
      activity: "Low activity" as const
    },
    {
      name: "ts-utils",
      description: "Collection of TypeScript utility functions and helpers",
      language: "TypeScript",
      stars: 32,
      forks: 8,
      lastCommit: "1 month ago",
      activity: "Low activity" as const
    },
    {
      name: "github-api-wrapper",
      description: "A lightweight wrapper around the GitHub REST API",
      language: "JavaScript",
      stars: 74,
      forks: 16,
      lastCommit: "2 months ago",
      activity: "Inactive" as const
    },
    {
      name: "markdown-blog-starter",
      description: "A starter template for creating a markdown-based blog",
      language: "MDX",
      stars: 125,
      forks: 42,
      lastCommit: "3 days ago",
      activity: "Active" as const
    }
  ];

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Repositories</h1>
        <div className="space-x-2">
          <select className="bg-secondary text-secondary-foreground px-3 py-2 rounded-md text-sm">
            <option>All languages</option>
            <option>TypeScript</option>
            <option>JavaScript</option>
            <option>Python</option>
            <option>MDX</option>
          </select>
          <select className="bg-secondary text-secondary-foreground px-3 py-2 rounded-md text-sm">
            <option>Last updated</option>
            <option>Name</option>
            <option>Stars</option>
            <option>Forks</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {repositories.map((repo) => (
          <RepositoryCard 
            key={repo.name}
            name={repo.name}
            description={repo.description}
            language={repo.language}
            stars={repo.stars}
            forks={repo.forks}
            lastCommit={repo.lastCommit}
            activity={repo.activity}
            onSelect={() => console.log(`Selected ${repo.name}`)}
          />
        ))}
      </div>
    </DashboardLayout>
  );
} 