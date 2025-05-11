"use client";

import { DashboardLayout } from '@/components/dashboard-layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, GitBranch, MessageSquarePlus, CalendarDays, FileEdit, GitCommit, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

// GitHub repository type
interface Repository {
  name: string;
  fullName: string;
  url: string;
  lastUpdatedText: string;
  isPrivate: boolean;
}

// GitHub file type
interface RepoFile {
  name: string;
  path: string;
  type: string;
  isDirectory: boolean;
  url: string;
}

// Add toasts component to show notifications
const ToastContainer = () => {
  const { toasts, dismissToast } = useToast();
  
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={cn(
            "p-4 rounded-md shadow-md text-sm flex justify-between items-start",
            {
              "bg-green-500 text-white": toast.type === "success",
              "bg-red-500 text-white": toast.type === "error",
              "bg-blue-500 text-white": toast.type === "info",
              "bg-yellow-500 text-white": toast.type === "warning"
            }
          )}
        >
          <span>{toast.message}</span>
          <button 
            onClick={() => dismissToast(toast.id)}
            className="ml-2 text-white/80 hover:text-white"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default function StreakManagerPage() {
  const [activeTab, setActiveTab] = useState("fix-missed-days");
  const [selectedRepository, setSelectedRepository] = useState<string | null>(null);
  const [commitDate, setCommitDate] = useState<string>("");
  const [commitTime, setCommitTime] = useState<string>("");
  const [commitMessage, setCommitMessage] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [fileContent, setFileContent] = useState<string>("");
  const [loading, setLoading] = useState({
    repositories: false,
    files: false,
    content: false
  });
  const [error, setError] = useState<string | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [files, setFiles] = useState<RepoFile[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const { showToast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [recentCommits, setRecentCommits] = useState<Array<{
    id: string;
    repoName: string;
    date: string;
    time: string;
    commitMessage: string;
    commitUrl?: string;
  }>>([]);

  // Fetch repositories when component mounts
  useEffect(() => {
    // Only fetch repositories if user is authenticated
    if (!authLoading && user) {
      fetchRepositories();
    }
  }, [user, authLoading]);

  // Fetch repository files when a repository is selected
  useEffect(() => {
    if (selectedRepository) {
      fetchFiles(selectedRepository, "");
    }
  }, [selectedRepository]);

  // Fetch file content when a file is selected
  useEffect(() => {
    if (selectedRepository && selectedFile && !isDirectory(selectedFile)) {
      fetchFileContent(selectedRepository, selectedFile);
    }
  }, [selectedFile]);

  // Function to fetch repositories from our API
  const fetchRepositories = async () => {
    try {
      setLoading(prev => ({ ...prev, repositories: true }));
      setError(null);
      
      const response = await fetch('/api/github/repositories');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch repositories');
      }
      
      const data = await response.json();
      setRepositories(data.repositories);
    } catch (error) {
      console.error('Error fetching repositories:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch repositories');
      showToast('Failed to fetch repositories', 'error');
    } finally {
      setLoading(prev => ({ ...prev, repositories: false }));
    }
  };

  // Function to fetch files from a repository
  const fetchFiles = async (repoName: string, path: string) => {
    try {
      setLoading(prev => ({ ...prev, files: true }));
      setError(null);
      
      console.log('Fetching files:', { repoName, path });
      
      const response = await fetch(`/api/github/files?repoName=${encodeURIComponent(repoName)}&path=${encodeURIComponent(path)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch files');
      }
      
      const data = await response.json();
      setFiles(data.files);
      setCurrentPath(data.currentPath);
    } catch (error) {
      console.error('Error fetching files:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch files');
      showToast('Failed to fetch repository files', 'error');
    } finally {
      setLoading(prev => ({ ...prev, files: false }));
    }
  };

  // Function to fetch file content
  const fetchFileContent = async (repoName: string, path: string) => {
    try {
      setLoading(prev => ({ ...prev, content: true }));
      setError(null);
      
      const response = await fetch(`/api/github/file-content?repoName=${encodeURIComponent(repoName)}&path=${encodeURIComponent(path)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch file content');
      }
      
      const data = await response.json();
      setFileContent(data.content);
      // Set the file as selected
      setSelectedFile(path);
    } catch (error) {
      console.error('Error fetching file content:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch file content');
      showToast('Failed to fetch file content', 'error');
    } finally {
      setLoading(prev => ({ ...prev, content: false }));
    }
  };

  // Handle file or directory click
  const handleFileClick = (file: RepoFile) => {
    if (file.isDirectory) {
      // If it's a directory and ".." (parent), navigate up
      if (file.name === '..') {
        fetchFiles(selectedRepository!, file.path);
      } else {
        // Otherwise navigate into the directory
        fetchFiles(selectedRepository!, file.path);
      }
    } else {
      // If it's a file, fetch its content
      console.log('File clicked, fetching content:', { file, repository: selectedRepository });
      fetchFileContent(selectedRepository!, file.path);
    }
  };

  // Check if a path is a directory based on lack of extension
  const isDirectory = (path: string): boolean => {
    const fileExtension = path.split('.').pop();
    // If no extension or the path ends with a slash, consider it a directory
    return !fileExtension || path.endsWith('/');
  };

  // Function to handle creating a backdated commit
  const handleCreateBackdatedCommit = async () => {
    try {
      // Verify that all required fields are present
      if (!selectedRepository || !commitDate || !commitTime || !commitMessage || !selectedFile || !fileContent) {
        showToast('Please fill out all required fields', 'error');
        return;
      }

      // Set loading state
      setLoading(prev => ({ ...prev, content: true }));
      
      // Prepare the request body
      const payload = {
        repoName: selectedRepository,
        filePath: selectedFile,
        commitMessage,
        fileContent,
        date: commitDate,
        time: commitTime
      };
      
      // Make the API request
      const response = await fetch('/api/github/create-commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      // Handle the response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create backdated commit');
      }
      
      const data = await response.json();
      
      // Show success message
      showToast('Backdated commit created successfully!', 'success');
      
      // Reset form 
      setFileContent('');
      setCommitMessage('');
      
      // Show the commit URL if available
      if (data.commitUrl) {
        showToast(
          `Backdated commit created! View on GitHub: ${data.commitUrl}`,
          'success',
          10000
        );
      }
      
      // Add to recent commits
      setRecentCommits(prev => {
        // Create new commit object
        const newCommit = {
          id: Date.now().toString(),
          repoName: selectedRepository,
          date: commitDate,
          time: commitTime,
          commitMessage: commitMessage,
          commitUrl: data.commitUrl
        };
        
        // Add to front of array, limit to 5 items
        const updatedCommits = [newCommit, ...prev].slice(0, 5);
        return updatedCommits;
      });
      
      console.log('Backdated commit created:', data);
      
    } catch (error) {
      console.error('Error creating backdated commit:', error);
      
      // Try to get more detailed error information
      let errorMessage = '';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check if the error message contains "nothing to commit"
        if (errorMessage.includes('nothing to commit')) {
          errorMessage = 'No changes detected. Try modifying the file content or using a different file.';
        }
      } else {
        errorMessage = 'Failed to create backdated commit. Please try again.';
      }
      
      showToast(errorMessage, 'error', 10000);
    } finally {
      setLoading(prev => ({ ...prev, content: false }));
    }
  };

  // Loading repositories state
  const renderRepositories = () => {
    if (loading.repositories) {
      return (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-red-500 text-center p-4 border border-red-300 rounded-md bg-red-50 dark:bg-red-900/20">
          {error}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {repositories.map((repo) => (
          <Button
            key={repo.fullName}
            variant={selectedRepository === repo.fullName ? "default" : "outline"}
            className="h-auto py-6 flex flex-col items-center justify-center gap-2 text-left"
            onClick={() => setSelectedRepository(repo.fullName)}
          >
            <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
              selectedRepository === repo.fullName ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
            } mb-2`}>
              <GitBranch className="w-6 h-6" />
            </div>
            <div className="font-medium">{repo.name}</div>
            <div className="text-xs text-muted-foreground">Last commit {repo.lastUpdatedText}</div>
          </Button>
        ))}
      </div>
    );
  };

  // Render file content or loading state
  const renderFileContent = () => {
    if (loading.content) {
      return (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!selectedFile) {
      return (
        <div className="text-center text-muted-foreground p-4">
          Please select a file to edit
        </div>
      );
    }

    return (
      <div>
        <h4 className="text-sm font-medium mb-2">File Content</h4>
        <div className="bg-muted/30 border border-border rounded-md p-3 min-h-[500px] text-sm">
          {fileContent ? (
            <textarea 
              className="w-full min-h-[500px] h-[70vh] bg-transparent focus:outline-none resize-y"
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
            />
          ) : (
            <div className="text-muted-foreground text-center py-2">
              // No content or binary file
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render file selection interface
  const renderFileSelection = () => {
    if (!selectedRepository) {
      return (
        <div className="text-center text-muted-foreground p-4">
          Please select a repository first
        </div>
      );
    }

    if (loading.files) {
      return (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="text-sm font-medium mb-1">Current path: /{currentPath}</div>
        <div className="border border-border rounded-md max-h-[200px] overflow-y-auto">
          {files.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No files found in this directory
            </div>
          ) : (
            <div className="divide-y divide-border">
              {files.map((file) => (
                <div 
                  key={file.path} 
                  className={`p-2 flex items-center hover:bg-muted cursor-pointer ${
                    selectedFile === file.path ? 'bg-muted' : ''
                  }`}
                  onClick={() => handleFileClick(file)}
                >
                  {file.isDirectory ? (
                    <div className="mr-2 text-primary">
                      <div className="flex items-center justify-center w-5 h-5">
                        📁
                      </div>
                    </div>
                  ) : (
                    <div className="mr-2 text-muted-foreground">
                      <div className="flex items-center justify-center w-5 h-5">
                        📄
                      </div>
                    </div>
                  )}
                  <span className="text-sm">{file.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <ToastContainer />
      <h1 className="text-3xl font-bold mb-2">Streak Manager</h1>
      <p className="text-muted-foreground mb-6">Fix gaps in your contribution timeline</p>
      
      <div className="mb-6 bg-primary-foreground/10 p-4 rounded-lg border border-muted">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-primary w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">
            This application helps you recover missed GitHub contributions for legitimate work. Please use responsibly to reflect actual work done, not to create misleading activity patterns.
          </p>
        </div>
      </div>

      <Tabs defaultValue="fix-missed-days" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full mb-6 bg-background border border-border">
          <TabsTrigger value="fix-missed-days" className="flex-1">Fix Missed Days</TabsTrigger>
          <TabsTrigger value="schedule-commits" className="flex-1">Schedule Commits</TabsTrigger>
          <TabsTrigger value="bulk-operations" className="flex-1">Bulk Operations</TabsTrigger>
        </TabsList>
        
        {/* Fix Missed Days Tab */}
        <TabsContent value="fix-missed-days" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Fix Missed Contribution</h2>
            <p className="text-muted-foreground mb-4">Create a legitimate commit for a day when local work wasn't pushed</p>
            
            {/* Repository selection */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Select Repository</h3>
              {renderRepositories()}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column */}
              <div className="space-y-6">
                {/* Date Selection */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Select Date
                    </CardTitle>
                    <CardDescription>Choose the date for your backdated commit</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Input
                      type="date"
                      value={commitDate}
                      onChange={(e) => setCommitDate(e.target.value)}
                      className="w-full"
                    />
                    {commitDate && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(commitDate).toLocaleDateString('en-US', { 
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Time Selection */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Select Time
                    </CardTitle>
                    <CardDescription>Choose a time that matches your typical activity pattern</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Input
                      type="time"
                      value={commitTime}
                      onChange={(e) => setCommitTime(e.target.value)}
                      className="w-full"
                    />
                  </CardContent>
                </Card>
              </div>
              
              {/* Right column */}
              <div className="space-y-6">
                {/* Commit Message */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquarePlus className="h-5 w-5 text-primary" />
                      Commit Message
                    </CardTitle>
                    <CardDescription>Enter a descriptive commit message for the work done</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea 
                      placeholder="Update documentation with new API endpoints"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      className="w-full min-h-[100px]"
                    />
                  </CardContent>
                </Card>
                
                {/* File Selection */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileEdit className="h-5 w-5 text-primary" />
                      File to Change
                    </CardTitle>
                    <CardDescription>Select a file to be modified with your commit</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderFileSelection()}
                    {selectedFile && (
                      <div className="mt-3">
                        {renderFileContent()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Verification panel */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Verification</CardTitle>
                <CardDescription>Check details before creating commit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Repository</h4>
                    <p className="text-sm text-muted-foreground mb-3">{selectedRepository || "Not selected"}</p>
                    
                    <h4 className="text-sm font-medium mb-1">Date</h4>
                    <p className="text-sm text-muted-foreground mb-3">{commitDate || "Not selected"}</p>
                    
                    <h4 className="text-sm font-medium mb-1">Time</h4>
                    <p className="text-sm text-muted-foreground">{commitTime || "Not selected"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Message</h4>
                    <p className="text-sm text-muted-foreground mb-3">{commitMessage || "No message"}</p>
                    
                    <h4 className="text-sm font-medium mb-1">File</h4>
                    <p className="text-sm text-muted-foreground">{selectedFile || "No file selected"}</p>
                  </div>
                </div>
                
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    This will create a commit with the selected date and time. The commit will appear in your GitHub contribution graph with the chosen backdated timestamp.
                  </p>
                  <div className="p-3 mb-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
                    <div className="flex gap-2 text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      <p className="text-sm">
                        Use this feature responsibly to reflect actual work you've done. Excessive backdating may violate GitHub's terms of service.
                      </p>
                    </div>
                  </div>
                  {(!selectedRepository || !commitDate || !commitTime || !commitMessage || !selectedFile) && (
                    <div className="text-amber-500 text-sm mb-3">
                      Please complete all fields
                    </div>
                  )}
                  <Button 
                    className="w-full"
                    disabled={!selectedRepository || !commitDate || !commitTime || !commitMessage || !selectedFile || loading.repositories || loading.files || loading.content}
                    onClick={handleCreateBackdatedCommit}
                  >
                    {loading.repositories || loading.files || loading.content ? (
                      <span className="flex items-center">
                        <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-primary-foreground rounded-full"></span>
                        Processing...
                      </span>
                    ) : "Create Backdated Commit"}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Add Recent Backdate Commits card here */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Recent Backdate Commits</CardTitle>
                <CardDescription>View your most recent backdated commits</CardDescription>
              </CardHeader>
              <CardContent>
                {recentCommits.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No recent backdated commits found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentCommits.map((commit) => (
                      <div key={commit.id} className="border border-border rounded-md p-3 bg-muted/20">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-sm">{commit.repoName}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(`${commit.date}T${commit.time}`).toLocaleString()}
                            </div>
                          </div>
                          {commit.commitUrl && (
                            <a 
                              href={commit.commitUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:text-primary/80"
                            >
                              View on GitHub
                            </a>
                          )}
                        </div>
                        <div className="mt-2">
                          <div className="text-sm mt-1 break-words">{commit.commitMessage}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Schedule Commits Tab */}
        <TabsContent value="schedule-commits" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Schedule Future Commits</h2>
            <p className="text-muted-foreground mb-4">Plan commits for days when you know you'll be away</p>
            
            {/* Repository selection */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Select Repository</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {repositories.map((repo) => (
                  <Button
                    key={repo.fullName}
                    variant={selectedRepository === repo.fullName ? "default" : "outline"}
                    className="h-auto py-6 flex flex-col items-center justify-center gap-2 text-left"
                    onClick={() => setSelectedRepository(repo.fullName)}
                  >
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                      selectedRepository === repo.fullName ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    } mb-2`}>
                      <GitBranch className="w-6 h-6" />
                    </div>
                    <div className="font-medium">{repo.name}</div>
                    <div className="text-xs text-muted-foreground">Last commit {repo.lastUpdatedText}</div>
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column */}
              <div className="space-y-6">
                {/* Date Selection */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      Schedule Date
                    </CardTitle>
                    <CardDescription>Choose the future date for your scheduled commit</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Input
                      type="date"
                      value={commitDate}
                      onChange={(e) => setCommitDate(e.target.value)}
                      className="w-full"
                    />
                    <div className="text-xs text-muted-foreground mt-2">
                      Saturday
                    </div>
                  </CardContent>
                </Card>
                
                {/* Time Selection */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      Commit Time
                    </CardTitle>
                    <CardDescription>Select a time that matches your typical activity pattern</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Input
                      type="time"
                      value={commitTime}
                      onChange={(e) => setCommitTime(e.target.value)}
                      className="w-full"
                    />
                  </CardContent>
                </Card>
              </div>
              
              {/* Right column */}
              <div className="space-y-6">
                {/* Commit Message */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquarePlus className="h-5 w-5 text-primary" />
                      Commit Message
                    </CardTitle>
                    <CardDescription>Enter a descriptive commit message for the work to be done</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea 
                      placeholder="Update documentation with new API endpoints"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      className="w-full min-h-[100px]"
                    />
                  </CardContent>
                </Card>
                
                {/* Files to Change */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileEdit className="h-5 w-5 text-primary" />
                      Files to Change
                    </CardTitle>
                    <CardDescription>Add one or more files to be modified with each commit</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Input 
                      placeholder="docs/api-reference.md"
                      value={selectedFile}
                      onChange={(e) => setSelectedFile(e.target.value)}
                      className="w-full mb-2"
                    />
                    <Button variant="outline" size="sm" className="w-full mb-3">
                      + Add to List
                    </Button>
                    <div className="text-xs text-muted-foreground mb-2">
                      Add one or more files to be modified with each commit
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Schedule Summary */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Schedule Summary</CardTitle>
                <CardDescription>Verify details before scheduling</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Repository:</h4>
                    <p className="text-sm text-muted-foreground mb-3">{selectedRepository || "Not selected"}</p>
                    
                    <h4 className="text-sm font-medium mb-1">Date Range:</h4>
                    <p className="text-sm text-muted-foreground mb-3">{commitDate || "Not selected"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Scheduled For:</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {commitDate && commitTime ? `${commitDate} at ${commitTime}` : "Not scheduled"}
                    </p>
                    
                    <h4 className="text-sm font-medium mb-1">Files:</h4>
                    <p className="text-sm text-muted-foreground">{selectedFile || "No files selected"}</p>
                  </div>
                </div>
                
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    This will schedule a commit to happen automatically on the specified date and time.
                  </p>
                  {(!selectedRepository || !commitDate || !commitTime || !commitMessage || !selectedFile) && (
                    <div className="text-amber-500 text-sm mb-3">
                      Please complete all fields
                    </div>
                  )}
                  <Button 
                    className="w-full"
                    disabled={!selectedRepository || !commitDate || !commitTime || !commitMessage || !selectedFile}
                  >
                    Schedule Commit
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Scheduled Commits List */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Scheduled Commits</h3>
                <Button variant="outline" size="sm">
                  Clean All Pending
                </Button>
              </div>
              <Card>
                <CardContent className="p-6">
                  <div className="text-center py-6 text-muted-foreground">
                    No scheduled commits found
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Bulk Operations Tab */}
        <TabsContent value="bulk-operations" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Bulk Operations</h2>
            <p className="text-muted-foreground mb-4">Perform actions across multiple dates at once</p>
            
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Date Range Selection</CardTitle>
                <CardDescription>Select a range of dates to operate on</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">Start Date</label>
                    <Input type="date" className="w-full" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">End Date</label>
                    <Input type="date" className="w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Select Repository</CardTitle>
                <CardDescription>Choose which repository to apply bulk operations to</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {repositories.map((repo) => (
                    <Button
                      key={repo.fullName}
                      variant={selectedRepository === repo.fullName ? "default" : "outline"}
                      className="h-auto py-6 flex flex-col items-center justify-center gap-2 text-left"
                      onClick={() => setSelectedRepository(repo.fullName)}
                    >
                      <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                        selectedRepository === repo.fullName ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                      } mb-2`}>
                        <GitBranch className="w-6 h-6" />
                      </div>
                      <div className="font-medium">{repo.name}</div>
                      <div className="text-xs text-muted-foreground">Last commit {repo.lastUpdatedText}</div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Operation Settings</CardTitle>
                <CardDescription>Configure how the bulk operation should work</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">Operation Type</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button variant="outline" className="justify-start">
                        <GitCommit className="mr-2 h-4 w-4" />
                        Fix Contribution Gaps
                      </Button>
                      <Button variant="outline" className="justify-start">
                        <CalendarDays className="mr-2 h-4 w-4" />
                        Schedule Regular Commits
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium block mb-2">Commit Message Template</label>
                    <Textarea 
                      placeholder="Update documentation for {'{{date}}'}"
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use {"{{date}}"} to include the date in your message
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium block mb-2">Files to Modify</label>
                    <Input placeholder="docs/README.md" className="w-full mb-2" />
                    <Button variant="outline" size="sm" className="w-full">
                      + Add File
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Confirmation</CardTitle>
                <CardDescription>Review details before proceeding with bulk operation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    You are about to perform a bulk operation that will create commits across multiple dates. 
                    Please use this feature responsibly.
                  </p>
                  
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-md">
                    <div className="flex gap-2 text-amber-500">
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      <p className="text-sm">
                        This will create multiple commits at once. Make sure these reflect actual work you've done.
                      </p>
                    </div>
                  </div>
                  
                  <Button className="w-full">
                    Execute Bulk Operation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
} 