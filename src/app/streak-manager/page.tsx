"use client";

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, GitBranch, MessageSquarePlus, CalendarDays, ClipboardList, AlertTriangle, FolderOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useGitHubRepositories, transformRepositoryData } from '@/hooks/github/use-github-repositories';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { FileBrowser } from '@/components/file-browser/FileBrowser';
import { useRepositoryFiles, useFileContent } from '@/hooks/github/use-github-files';
import { useBackdatedCommit } from '@/hooks/github/use-github-commits';

// Type for repository selection
type Repository = {
  id: number;
  name: string;
  fullName: string;
  lastCommit: string;
};

export default function StreakManagerPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("missed-days");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState({ hour: "14", minute: "30" });
  const [commitMessage, setCommitMessage] = useState("");
  const [filePath, setFilePath] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [isFileContentModified, setIsFileContentModified] = useState(false);
  
  // GitHub username from auth context
  const githubUsername = user?.user_metadata?.user_name || '';
  
  // Extract owner/repo from the selected repository
  const [owner, repo] = selectedRepo ? (selectedRepo.fullName.split('/') || []) : ['', ''];
  
  // Fetch repositories data
  const {
    data: repositoriesData,
    isLoading: isRepositoriesLoading,
    error: repositoriesError
  } = useGitHubRepositories(githubUsername, {
    sort: 'updated',
    perPage: 10,
    enabled: !!githubUsername
  });

  // Process repositories data
  const repositories = repositoriesData?.data 
    ? transformRepositoryData(repositoriesData.data) 
    : [];
    
  // Fetch repository files
  const {
    data: files = [],
    isLoading: isFilesLoading
  } = useRepositoryFiles(owner, repo, currentPath);
  
  // Fetch file content when a file is selected
  const {
    data: fetchedFileContent = '',
    isLoading: isFileContentLoading
  } = useFileContent(owner, repo, filePath);
  
  // Create backdated commit mutation
  const { mutate: createBackdatedCommit, isPending: isCommitPending } = useBackdatedCommit({
    onSuccess: (data) => {
      showToast(`Backdated commit created successfully`, "success");
      // Reset form
      setFilePath("");
      setFileContent("");
      setCommitMessage("");
    },
    onError: (error) => {
      showToast(`Error creating backdated commit: ${error.message}`, "error");
    }
  });

  // Set default date to today
  useEffect(() => {
    setSelectedDate(new Date());
  }, []);
  
  // Update file content when fetched content changes
  useEffect(() => {
    if (fetchedFileContent && !isFileContentModified) {
      setFileContent(fetchedFileContent);
    }
  }, [fetchedFileContent, isFileContentModified]);
  
  // Reset file content modified flag when selecting a new file
  useEffect(() => {
    setIsFileContentModified(false);
  }, [filePath]);

  // Handle repository selection
  const handleSelectRepo = (repo: Repository) => {
    setSelectedRepo(repo);
    setCurrentPath("");
    setFilePath("");
    setFileContent("");
  };
  
  // Handle file selection
  const handleSelectFile = (file: { path: string; name: string }) => {
    setFilePath(file.path);
  };
  
  // Handle folder navigation
  const handleNavigateToFolder = (path: string) => {
    setCurrentPath(path);
  };
  
  // Handle file content change
  const handleFileContentChange = (content: string) => {
    setFileContent(content);
    setIsFileContentModified(true);
  };

  // Handle backdated commit creation
  const handleCreateBackdatedCommit = () => {
    // Validation checks
    if (!selectedRepo) {
      showToast("Please select a repository", "error");
      return;
    }
    
    if (!selectedDate) {
      showToast("Please select a date", "error");
      return;
    }
    
    if (!commitMessage.trim()) {
      showToast("Please enter a commit message", "error");
      return;
    }
    
    if (!filePath.trim()) {
      showToast("Please select a file", "error");
      return;
    }
    
    if (!fileContent.trim()) {
      showToast("File content cannot be empty", "error");
      return;
    }
    
    // Create commit date/time
    const commitDate = new Date(selectedDate);
    commitDate.setHours(parseInt(selectedTime.hour, 10));
    commitDate.setMinutes(parseInt(selectedTime.minute, 10));
    
    // Create backdated commit
    createBackdatedCommit({
      repository: selectedRepo,
      filePath,
      fileContent,
      message: commitMessage,
      date: commitDate
    });
  };

  // Handle schedule commit
  const handleScheduleCommit = () => {
    showToast("Commit scheduled successfully", "success");
  };

  // Handle bulk operations
  const handleBulkOperation = () => {
    showToast("Bulk operation scheduled", "success");
  };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-2">Streak Manager</h1>
      <p className="text-muted-foreground mb-6">Fix gaps in your contribution timeline</p>
      
      <Alert className="mb-6 bg-amber-500/10 text-amber-500 border-amber-500/20">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This application helps you recover missed GitHub contributions for legitimate work. Please use responsibly to reflect actual work done, not to create misleading activity patterns.
        </AlertDescription>
      </Alert>
      
      <Tabs defaultValue="missed-days" value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="missed-days">Fix Missed Days</TabsTrigger>
          <TabsTrigger value="schedule">Schedule Commits</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
        </TabsList>
        
        {/* Fix Missed Days Tab */}
        <TabsContent value="missed-days">
          {/* Repository selection */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Select Repository</h2>
            <Card>
              <CardHeader>
                <CardTitle>Choose a repository</CardTitle>
                <CardDescription>Select a repository to make backdated commits</CardDescription>
              </CardHeader>
              <CardContent>
                {isRepositoriesLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : repositories && repositories.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {repositories.map(repo => (
                      <Button
                        key={repo.id}
                        variant={selectedRepo?.id === repo.id ? "default" : "outline"}
                        className="h-auto py-6 flex flex-col items-center justify-center gap-2 text-left"
                        onClick={() => handleSelectRepo({
                          id: repo.id,
                          name: repo.name,
                          fullName: repo.fullName,
                          lastCommit: getRelativeTimeString(repo.pushedAt || repo.updatedAt)
                        })}
                      >
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-2">
                          <GitBranch className="w-6 h-6" />
                        </div>
                        <div className="font-medium">{repo.name}</div>
                        <div className="text-xs text-muted-foreground">Last commit {getRelativeTimeString(repo.pushedAt || repo.updatedAt)}</div>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <p className="text-muted-foreground">No repositories found. Please connect your GitHub account.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Backdating options */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Backdating Options</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Date Selection</CardTitle>
                  <CardDescription>Choose date and time for the backdated commit</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div className="text-sm font-medium">Select Date</div>
                    </div>
                    <div className="bg-muted p-4 rounded-lg text-center">
                      <Input 
                        type="date" 
                        value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''} 
                        onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : null)}
                        className="bg-secondary text-secondary-foreground"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div className="text-sm font-medium">Select Time</div>
                    </div>
                    <div className="flex gap-2">
                      <select 
                        className="flex-1 bg-secondary text-secondary-foreground px-3 py-2 rounded-md text-sm"
                        value={selectedTime.hour}
                        onChange={(e) => setSelectedTime({ ...selectedTime, hour: e.target.value })}
                      >
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                        ))}
                      </select>
                      
                      <select 
                        className="flex-1 bg-secondary text-secondary-foreground px-3 py-2 rounded-md text-sm"
                        value={selectedTime.minute}
                        onChange={(e) => setSelectedTime({ ...selectedTime, minute: e.target.value })}
                      >
                        {Array.from({ length: 60 }).map((_, i) => (
                          <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Commit Details</CardTitle>
                  <CardDescription>Enter commit message and select file(s) to modify</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="flex items-center gap-2">
                      <MessageSquarePlus className="h-5 w-5 text-muted-foreground" />
                      <div className="text-sm font-medium">Commit Message</div>
                    </div>
                    <Textarea 
                      className="w-full min-h-[80px] p-3 bg-secondary text-secondary-foreground rounded-md text-sm" 
                      placeholder="Enter commit message..."
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                    />
                    
                    <div className="flex items-center gap-2 mt-2">
                      <FolderOpen className="h-5 w-5 text-muted-foreground" />
                      <div className="text-sm font-medium">Select File</div>
                    </div>
                    
                    {selectedRepo ? (
                      <div className="space-y-2">
                        <FileBrowser 
                          files={files}
                          isLoading={isFilesLoading}
                          onSelectFile={handleSelectFile}
                          onNavigateToFolder={handleNavigateToFolder}
                          currentPath={currentPath}
                          selectedFilePath={filePath}
                        />
                        
                        {filePath && (
                          <div className="mt-2">
                            <div className="text-sm font-medium mb-1">Selected: {filePath}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-muted p-4 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">Please select a repository first</p>
                      </div>
                    )}
                    
                    {filePath && (
                      <>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="text-sm font-medium">File Content</div>
                        </div>
                        {isFileContentLoading ? (
                          <Skeleton className="h-[120px] w-full" />
                        ) : (
                          <Textarea 
                            className="w-full min-h-[200px] p-3 bg-secondary text-secondary-foreground rounded-md text-sm font-mono" 
                            placeholder="Edit file content to include with your commit"
                            value={fileContent}
                            onChange={(e) => handleFileContentChange(e.target.value)}
                          />
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline">Cancel</Button>
              <Button 
                onClick={handleCreateBackdatedCommit} 
                disabled={isCommitPending || !selectedRepo || !filePath || !commitMessage || !fileContent}
              >
                {isCommitPending ? 'Creating...' : 'Create Backdated Commit'}
              </Button>
            </div>
          </div>
          
          {/* Verification Panel */}
          {selectedRepo && selectedDate && commitMessage && filePath && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Verification</CardTitle>
                <CardDescription>Check details before creating commit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-sm font-medium">Repository</div>
                      <div className="text-sm text-muted-foreground">{selectedRepo.name}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Date</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedDate ? format(selectedDate, 'PPP') : 'Not selected'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Time</div>
                      <div className="text-sm text-muted-foreground">
                        {selectedTime.hour}:{selectedTime.minute}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">File</div>
                      <div className="text-sm text-muted-foreground">{filePath}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Message</div>
                    <div className="text-sm text-muted-foreground">{commitMessage}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Schedule Commits Tab */}
        <TabsContent value="schedule">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Schedule Future Commits</CardTitle>
              <CardDescription>Plan contributions ahead of time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-4">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-muted-foreground" />
                    <div className="text-sm font-medium">Select Repository</div>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    {isRepositoriesLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : repositories && repositories.length > 0 ? (
                      <select className="w-full bg-secondary text-secondary-foreground px-3 py-2 rounded-md text-sm">
                        <option value="">Select a repository</option>
                        {repositories.map(repo => (
                          <option key={repo.id} value={repo.id}>{repo.name}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-muted-foreground">No repositories available</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    <div className="text-sm font-medium">Schedule Date</div>
                  </div>
                  <Input type="date" className="bg-secondary text-secondary-foreground" />
                  
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div className="text-sm font-medium">Schedule Time</div>
                  </div>
                  <Input type="time" className="bg-secondary text-secondary-foreground" />
                </div>
                
                <div className="grid gap-4">
                  <div className="flex items-center gap-2">
                    <MessageSquarePlus className="h-5 w-5 text-muted-foreground" />
                    <div className="text-sm font-medium">Commit Message</div>
                  </div>
                  <Textarea 
                    className="w-full min-h-[100px] p-3 bg-secondary text-secondary-foreground rounded-md text-sm" 
                    placeholder="Enter commit message..."
                  />
                  
                  <div className="flex items-center gap-2 mt-2">
                    <GitBranch className="h-5 w-5 text-muted-foreground" />
                    <div className="text-sm font-medium">Select File</div>
                  </div>
                  <Input 
                    className="bg-secondary text-secondary-foreground" 
                    placeholder="docs/changelog.md"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button onClick={handleScheduleCommit}>Schedule Commit</Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Commits</CardTitle>
              <CardDescription>View and manage your scheduled contributions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-4">No scheduled commits yet.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Bulk Operations Tab */}
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Operations</CardTitle>
              <CardDescription>Create multiple commits using a pattern</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-4">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-muted-foreground" />
                    <div className="text-sm font-medium">Select Repository</div>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    {isRepositoriesLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : repositories && repositories.length > 0 ? (
                      <select className="w-full bg-secondary text-secondary-foreground px-3 py-2 rounded-md text-sm">
                        <option value="">Select a repository</option>
                        {repositories.map(repo => (
                          <option key={repo.id} value={repo.id}>{repo.name}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-muted-foreground">No repositories available</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <ClipboardList className="h-5 w-5 text-muted-foreground" />
                    <div className="text-sm font-medium">Operation Type</div>
                  </div>
                  <select className="w-full bg-secondary text-secondary-foreground px-3 py-2 rounded-md text-sm">
                    <option value="pattern">Fill Pattern (Regular Schedule)</option>
                    <option value="recovery">Recovery (Fill Gaps)</option>
                    <option value="randomize">Randomize (Natural Pattern)</option>
                  </select>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    <div className="text-sm font-medium">Date Range</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Start Date</div>
                      <Input type="date" className="bg-secondary text-secondary-foreground" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">End Date</div>
                      <Input type="date" className="bg-secondary text-secondary-foreground" />
                    </div>
                  </div>
                </div>
                
                <div className="grid gap-4">
                  <div className="flex items-center gap-2">
                    <MessageSquarePlus className="h-5 w-5 text-muted-foreground" />
                    <div className="text-sm font-medium">Commit Message Template</div>
                  </div>
                  <Textarea 
                    className="w-full min-h-[100px] p-3 bg-secondary text-secondary-foreground rounded-md text-sm" 
                    placeholder="Enter commit message template..."
                    defaultValue="Update documentation for {{date}}"
                  />
                  
                  <div className="flex items-center gap-2 mt-2">
                    <GitBranch className="h-5 w-5 text-muted-foreground" />
                    <div className="text-sm font-medium">Files to Modify</div>
                  </div>
                  <Input 
                    className="bg-secondary text-secondary-foreground" 
                    placeholder="docs/changelog.md, README.md"
                  />
                  
                  <div className="flex items-center gap-2 mt-2">
                    <div className="text-sm font-medium">Frequency</div>
                  </div>
                  <select className="w-full bg-secondary text-secondary-foreground px-3 py-2 rounded-md text-sm">
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays Only</option>
                    <option value="weekends">Weekends Only</option>
                    <option value="custom">Custom Pattern</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button onClick={handleBulkOperation}>Create Bulk Operations</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

// Helper function to format relative time
function getRelativeTimeString(date: Date): string {
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
} 