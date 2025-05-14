"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, GitBranchIcon, GitForkIcon, GithubIcon, AlertCircle, LinkIcon, StarIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface RepositoryDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repository: {
    name: string;
    fullName: string;
    description: string;
    url: string;
    homepage?: string | null;
    isPrivate: boolean;
    isFork: boolean;
    language?: string | null;
    starCount: number;
    forkCount: number;
    openIssuesCount: number;
    defaultBranch: string;
    createdAt?: Date;
    updatedAt: Date;
    pushedAt?: Date | null;
    topics?: string[];
    licenses?: string | null;
    watchers?: number;
    size?: number;
    lastCommitMessage?: string;
    lastCommitAuthor?: string;
    lastCommitSha?: string;
  };
}

export function RepositoryDetails({
  open,
  onOpenChange,
  repository
}: RepositoryDetailsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GithubIcon className="h-5 w-5" />
            {repository.name}
          </DialogTitle>
          <DialogDescription>
            {repository.description || "No description provided"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex flex-wrap gap-2">
            {repository.isPrivate ? (
              <div className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs">Private</div>
            ) : (
              <div className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs">Public</div>
            )}
            
            {repository.language && (
              <div className="border border-input bg-background hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-full text-xs">
                {repository.language}
              </div>
            )}
            
            {repository.isFork && (
              <div className="border border-input bg-background hover:bg-accent hover:text-accent-foreground px-2 py-1 rounded-full text-xs">
                Fork
              </div>
            )}
            
            {repository.topics?.map((topic) => (
              <div key={topic} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs">
                {topic}
              </div>
            ))}
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Repository Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                      <p className="text-sm">{repository.fullName}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Default Branch</p>
                      <p className="text-sm">{repository.defaultBranch}</p>
                    </div>
                    
                    {repository.createdAt && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Created</p>
                        <p className="text-sm">{formatDistanceToNow(repository.createdAt, { addSuffix: true })}</p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                      <p className="text-sm">{formatDistanceToNow(repository.updatedAt, { addSuffix: true })}</p>
                    </div>
                    
                    {repository.pushedAt && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Last Push</p>
                        <p className="text-sm">{formatDistanceToNow(repository.pushedAt, { addSuffix: true })}</p>
                      </div>
                    )}
                    
                    {repository.size && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Size</p>
                        <p className="text-sm">{repository.size} KB</p>
                      </div>
                    )}

                    {repository.licenses && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">License</p>
                        <p className="text-sm">{repository.licenses}</p>
                      </div>
                    )}
                  </div>
                  
                  {repository.homepage && (
                    <div className="pt-4">
                      <p className="text-sm font-medium text-muted-foreground">Homepage</p>
                      <a 
                        href={repository.homepage} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                      >
                        <LinkIcon className="h-3 w-3" />
                        {repository.homepage}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {repository.lastCommitMessage && (
                <Card>
                  <CardHeader>
                    <CardTitle>Latest Commit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{repository.lastCommitMessage}</p>
                    {repository.lastCommitAuthor && (
                      <p className="text-xs text-muted-foreground mt-2">
                        by {repository.lastCommitAuthor}
                      </p>
                    )}
                  </CardContent>
                  {repository.lastCommitSha && (
                    <CardFooter>
                      <p className="text-xs text-muted-foreground">
                        {repository.lastCommitSha.substring(0, 7)}
                      </p>
                    </CardFooter>
                  )}
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="stats">
              <Card>
                <CardHeader>
                  <CardTitle>Repository Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex flex-col items-center justify-center p-4 bg-secondary rounded-lg">
                      <StarIcon className="h-5 w-5 mb-2" />
                      <p className="text-2xl font-bold">{repository.starCount}</p>
                      <p className="text-xs text-muted-foreground">Stars</p>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center p-4 bg-secondary rounded-lg">
                      <GitForkIcon className="h-5 w-5 mb-2" />
                      <p className="text-2xl font-bold">{repository.forkCount}</p>
                      <p className="text-xs text-muted-foreground">Forks</p>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center p-4 bg-secondary rounded-lg">
                      <AlertCircle className="h-5 w-5 mb-2" />
                      <p className="text-2xl font-bold">{repository.openIssuesCount}</p>
                      <p className="text-xs text-muted-foreground">Open Issues</p>
                    </div>
                    
                    {repository.watchers !== undefined && (
                      <div className="flex flex-col items-center justify-center p-4 bg-secondary rounded-lg">
                        <CalendarIcon className="h-5 w-5 mb-2" />
                        <p className="text-2xl font-bold">{repository.watchers}</p>
                        <p className="text-xs text-muted-foreground">Watchers</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="activity">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {repository.pushedAt 
                      ? `Last pushed ${formatDistanceToNow(repository.pushedAt, { addSuffix: true })}`
                      : 'No recent activity information available'}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button asChild variant="outline">
            <a href={repository.url} target="_blank" rel="noopener noreferrer">
              View on GitHub
            </a>
          </Button>
          
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 