"use client";

import { DashboardLayout } from '@/components/dashboard-layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, GitBranch, MessageSquarePlus, CalendarDays, FileEdit, GitCommit, AlertCircle, RefreshCw, X, FileText, Folder, Briefcase, Coffee, CalendarRange } from 'lucide-react';
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

// Add a FileFolderIcon component since we need a folder icon
const FileFolderIcon = Folder;

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
  const [scheduledCommits, setScheduledCommits] = useState<Array<{
    id: string;
    commitMessage: string;
    filePath: string;
    scheduledTime: string;
    repository: {
      name: string;
    };
  }>>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState<string>("");
  const [bulkEndDate, setBulkEndDate] = useState<string>("");
  const [bulkCommitFrequency, setBulkCommitFrequency] = useState<string>("daily");
  const [bulkCommitMessageTemplate, setBulkCommitMessageTemplate] = useState<string>("");
  const [bulkSelectedFiles, setBulkSelectedFiles] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkOperationType, setBulkOperationType] = useState<'fix' | 'schedule'>('schedule');
  const [bulkTimes, setBulkTimes] = useState<string[]>([]);
  const [selectedBulkTime, setSelectedBulkTime] = useState<string>("");
  const [commonCommitMessages, setCommonCommitMessages] = useState<string[]>([
    "Update documentation",
    "Fix typo in README",
    "Update dependencies",
    "Add comments for clarity",
    "Refactor code for better readability",
    "Fix formatting issues",
    "Update configuration files",
    "Improve error handling"
  ]);
  const [repositoryFiles, setRepositoryFiles] = useState<string[]>([]);
  const [fileSearchQuery, setFileSearchQuery] = useState<string>("");
  const [bulkCommitMessages, setBulkCommitMessages] = useState<string[]>([]);

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

  // Fetch scheduled commits when the schedule tab is selected
  useEffect(() => {
    if (activeTab === "schedule-commits" && user) {
      fetchScheduledCommits();
    }
  }, [activeTab, user]);

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
  const fetchFiles = async (repoName: string, path: string = '') => {
    try {
      setLoading(prevState => ({ ...prevState, files: true }));
      const response = await fetch(`/api/github/files?repoName=${encodeURIComponent(repoName)}&path=${encodeURIComponent(path)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch repository files');
      }
      
      const data = await response.json();
      setFiles(data.files || []);
      setCurrentPath(data.currentPath || '');
    } catch (error) {
      console.error('Error fetching repository files:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to fetch repository files',
        'error'
      );
      setFiles([]);
    } finally {
      setLoading(prevState => ({ ...prevState, files: false }));
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

  // Function to fetch scheduled commits
  const fetchScheduledCommits = async () => {
    try {
      setLoadingScheduled(true);
      const response = await fetch('/api/github/scheduled-commits');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch scheduled commits');
      }
      
      const data = await response.json();
      setScheduledCommits(data.data || []);
    } catch (error) {
      console.error('Error fetching scheduled commits:', error);
      showToast('Failed to fetch scheduled commits', 'error');
    } finally {
      setLoadingScheduled(false);
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

  // Function to schedule a commit
  const handleScheduleCommit = async () => {
    try {
      // Verify that all required fields are present
      if (!selectedRepository || !commitDate || !commitTime || !commitMessage || !selectedFile || !fileContent) {
        showToast('Please fill out all required fields', 'error');
        return;
      }

      // Make sure the scheduled date is in the future
      const scheduledDate = new Date(`${commitDate}T${commitTime}`);
      const now = new Date();
      if (scheduledDate <= now) {
        showToast('Scheduled time must be in the future', 'error');
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
      const response = await fetch('/api/github/schedule-commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      // Handle the response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to schedule commit');
      }
      
      const data = await response.json();
      
      // Show success message
      showToast('Commit scheduled successfully!', 'success');
      
      // Reset form 
      setCommitMessage('');
      
      // Refresh the scheduled commits list
      fetchScheduledCommits();
      
    } catch (error) {
      console.error('Error scheduling commit:', error);
      
      // Try to get more detailed error information
      let errorMessage = '';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        errorMessage = 'Failed to schedule commit. Please try again.';
      }
      
      showToast(errorMessage, 'error', 10000);
    } finally {
      setLoading(prev => ({ ...prev, content: false }));
    }
  };

  // Function to cancel a scheduled commit
  const handleCancelCommit = async (id: string) => {
    try {
      setLoadingScheduled(true);
      
      const response = await fetch('/api/github/scheduled-commits', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel scheduled commit');
      }
      
      showToast('Scheduled commit cancelled successfully', 'success');
      
      // Update the local state by removing the cancelled commit
      setScheduledCommits(prev => prev.filter(commit => commit.id !== id));
      
    } catch (error) {
      console.error('Error cancelling scheduled commit:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to cancel scheduled commit', 
        'error'
      );
    } finally {
      setLoadingScheduled(false);
    }
  };

  // Function to cancel all pending commits
  const handleCancelAllCommits = async () => {
    try {
      setLoadingScheduled(true);
      
      // Get all pending commit IDs
      const pendingIds = scheduledCommits.map(commit => commit.id);
      
      if (pendingIds.length === 0) {
        showToast('No pending commits to cancel', 'info');
        return;
      }
      
      // Cancel each commit one by one
      for (const id of pendingIds) {
        await fetch('/api/github/scheduled-commits', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id })
        });
      }
      
      showToast(`Cancelled ${pendingIds.length} scheduled commits`, 'success');
      
      // Clear the local state
      setScheduledCommits([]);
      
    } catch (error) {
      console.error('Error cancelling all scheduled commits:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to cancel scheduled commits', 
        'error'
      );
    } finally {
      setLoadingScheduled(false);
    }
  };

  // Function to handle adding a file to bulk operations list
  const handleAddFileToBulk = () => {
    if (!selectedFile) return;
    
    // Check if file is already added
    if (bulkSelectedFiles.includes(selectedFile)) {
      showToast('This file is already added to the bulk operation', 'info');
      return;
    }
    
    // Add file to bulk files list
    setBulkSelectedFiles(prev => [...prev, selectedFile]);
    showToast(`Added ${selectedFile} to bulk operation`, 'success');
  };
  
  // Function to remove a file from bulk operations list
  const handleRemoveFileFromBulk = (filePath: string) => {
    setBulkSelectedFiles(prev => prev.filter(path => path !== filePath));
  };
  
  // Function to generate random times
  const generateRandomTimes = () => {
    // Define time ranges for more realistic commit patterns
    const timeRanges = [
      { start: 9, end: 12 },    // Morning: 9am-12pm
      { start: 13, end: 17 },   // Afternoon: 1pm-5pm
      { start: 18, end: 22 },   // Evening: 6pm-10pm
      { start: 22, end: 23.5 }  // Late night: 10pm-11:30pm (occasional)
    ];
    
    const newTimes = new Set<string>(); // Use a Set to avoid duplicates
    
    // Generate at least one time from each main range (morning, afternoon, evening)
    for (let i = 0; i < 3; i++) {
      const range = timeRanges[i];
      const hour = Math.floor(Math.random() * (range.end - range.start + 1)) + range.start;
      const minute = Math.floor(Math.random() * 60);
      const hourStr = hour.toString().padStart(2, '0');
      const minuteStr = minute.toString().padStart(2, '0');
      newTimes.add(`${hourStr}:${minuteStr}`);
    }
    
    // Add a late night commit with lower probability (30%)
    if (Math.random() < 0.3) {
      const hour = Math.floor(Math.random() * 2) + 22; // 10pm to 11pm
      const minute = Math.floor(Math.random() * 60);
      const hourStr = hour.toString().padStart(2, '0');
      const minuteStr = minute.toString().padStart(2, '0');
      newTimes.add(`${hourStr}:${minuteStr}`);
    }
    
    // Add early morning commit with lower probability (20%)
    if (Math.random() < 0.2) {
      const hour = Math.floor(Math.random() * 3) + 6; // 6am to 8am
      const minute = Math.floor(Math.random() * 60);
      const hourStr = hour.toString().padStart(2, '0');
      const minuteStr = minute.toString().padStart(2, '0');
      newTimes.add(`${hourStr}:${minuteStr}`);
    }
    
    // Add more random times to have variety (3-4 more)
    const additionalTimes = Math.floor(Math.random() * 2) + 3; // 3-4 additional times
    for (let i = 0; i < additionalTimes; i++) {
      // Focus on working hours (9am-10pm) with higher probability
      const hour = Math.floor(Math.random() * 14) + 9; // 9am to 10pm
      const minute = Math.floor(Math.random() * 60);
      const hourStr = hour.toString().padStart(2, '0');
      const minuteStr = minute.toString().padStart(2, '0');
      newTimes.add(`${hourStr}:${minuteStr}`);
    }
    
    // Convert set to array and sort by time
    const sortedTimes = Array.from(newTimes).sort();
    setBulkTimes(sortedTimes);
    
    // Also set the selected time to one of these random times
    if (sortedTimes.length > 0) {
      setSelectedBulkTime(sortedTimes[0]);
    }
    
    showToast(`Generated ${sortedTimes.length} random commit times`, 'success');
  };
  
  // Function to select a commit message template
  const selectCommitMessage = (message: string) => {
    const formattedMessage = message + " for {{date}}";
    if (!bulkCommitMessages.includes(formattedMessage)) {
      setBulkCommitMessages([...bulkCommitMessages, formattedMessage]);
    } else {
      // Set it as the current template for editing
      setBulkCommitMessageTemplate(formattedMessage);
    }
  };

  // Function to handle bulk operation execution
  const handleExecuteBulkOperation = async () => {
    try {
      // Validate required fields
      const hasCommitMessages = bulkCommitMessageTemplate || bulkCommitMessages.length > 0;
      if (!selectedRepository || !bulkStartDate || !bulkEndDate || !hasCommitMessages || bulkSelectedFiles.length === 0) {
        showToast('Please fill out all required fields', 'error');
        return;
      }
      
      if (new Date(bulkStartDate) > new Date(bulkEndDate)) {
        showToast('Start date cannot be after end date', 'error');
        return;
      }
      
      // Get file contents for all selected files
      const fileContents: Record<string, string> = {};
      
      setBulkLoading(true);
      
      for (const filePath of bulkSelectedFiles) {
        try {
          // Fetch content for each file
          const response = await fetch(`/api/github/file-content?repoName=${encodeURIComponent(selectedRepository)}&path=${encodeURIComponent(filePath)}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch content for ${filePath}`);
          }
          
          const data = await response.json();
          fileContents[filePath] = data.content;
        } catch (error) {
          console.error(`Error fetching content for ${filePath}:`, error);
          showToast(`Failed to fetch content for ${filePath}`, 'error');
          // Continue with other files, use empty string for content
          fileContents[filePath] = '';
        }
      }
      
      // Make sure we have at least one time selected
      if (!selectedBulkTime && bulkTimes.length === 0) {
        // If no times are selected, use the current time as default
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        setSelectedBulkTime(timeStr);
      }

      // Prepare messages array - use the template if no messages array, otherwise use the array
      const commitMessages = bulkCommitMessages.length > 0 
        ? bulkCommitMessages 
        : bulkCommitMessageTemplate ? [bulkCommitMessageTemplate] : [];
      
      // Prepare payload for bulk scheduling
      const payload = {
        repoName: selectedRepository,
        filePaths: bulkSelectedFiles,
        commitMessageTemplate: bulkCommitMessages.length > 0 ? bulkCommitMessages[0] : bulkCommitMessageTemplate,
        commitMessages: commitMessages,
        fileContents,
        startDate: bulkStartDate,
        endDate: bulkEndDate,
        timeOfDay: selectedBulkTime || '12:00', // Default time if none selected
        frequency: bulkCommitFrequency,
        operationType: bulkOperationType,
        times: bulkTimes.length > 0 ? bulkTimes : undefined // Only include times if we have some
      };
      
      console.log('Sending bulk operation payload:', payload);
      
      // Call the API to schedule bulk commits
      const response = await fetch('/api/github/bulk-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process bulk commits');
      }
      
      const data = await response.json();
      
      // Update recent commits if there were executed commits for past dates
      if (data.data.executedCommits && data.data.executedCommits.length > 0) {
        // Add executed commits to recentCommits
        const newRecentCommits = data.data.executedCommits.map((commit: any) => ({
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
          repoName: selectedRepository,
          date: commit.date,
          time: commit.time,
          commitMessage: commit.message || 'Bulk commit',
          commitSha: commit.commitSha,
          commitUrl: commit.commitUrl // Include the commitUrl from the API response
        }));
        
        setRecentCommits(prev => [...newRecentCommits, ...prev].slice(0, 10)); // Keep only the 10 most recent
      }
      
      // Show success message
      showToast(`Successfully processed ${data.data.totalScheduled + data.data.totalExecuted} commits (${data.data.totalScheduled} scheduled, ${data.data.totalExecuted} executed)`, 'success');
      
      // Reset form
      setBulkSelectedFiles([]);
      setBulkCommitMessageTemplate('');
      setBulkCommitMessages([]);
      
      // If we have executed commits, switch to fix-missed-days tab to see them
      // Otherwise switch to schedule tab to see the scheduled commits
      if (data.data.totalExecuted > 0) {
        setActiveTab("fix-missed-days");
      } else {
        setActiveTab("schedule-commits");
        fetchScheduledCommits();
      }
      
    } catch (error) {
      console.error('Error executing bulk operation:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to execute bulk operation',
        'error'
      );
    } finally {
      setBulkLoading(false);
    }
  };

  // Update the handleFileSelect function to use the correct endpoint
  const handleFileSelect = async (file: RepoFile) => {
    if (file.isDirectory) {
      // If it's a directory, navigate into it
      fetchFiles(selectedRepository!, file.path);
    } else {
      try {
        setSelectedFile(file.path);
        setLoading(prevState => ({ ...prevState, content: true }));
        
        // Fetch file content
        const response = await fetch(`/api/github/file-content?repoName=${encodeURIComponent(selectedRepository || '')}&path=${encodeURIComponent(file.path)}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch file content');
        }
        
        const data = await response.json();
        setFileContent(data.content || '');
      } catch (error) {
        console.error('Error fetching file content:', error);
        showToast(
          error instanceof Error ? error.message : 'Failed to fetch file content',
          'error'
        );
        setFileContent('');
      } finally {
        setLoading(prevState => ({ ...prevState, content: false }));
      }
    }
  };

  // Fix the renderFileSelection function to display files properly
  const renderFileSelection = () => {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Input 
            placeholder="Search files..."
            value={fileSearchQuery}
            onChange={(e) => setFileSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => selectedRepository && fetchFiles(selectedRepository, currentPath)}
            disabled={!selectedRepository}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="max-h-60 overflow-y-auto border rounded-md">
          {files.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {loading.files ? 'Loading files...' : 'No files found. Select a repository and click refresh.'}
            </div>
          ) : (
            <ul className="divide-y">
              {files
                .filter(file => !fileSearchQuery || file.name.toLowerCase().includes(fileSearchQuery.toLowerCase()))
                .map((file, index) => (
                  <li key={index} className="px-3 py-2 hover:bg-muted cursor-pointer" onClick={() => handleFileSelect(file)}>
                    <div className="flex items-center">
                      {file.isDirectory ? (
                        <FileFolderIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                      )}
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>
        
        {selectedFile && (
          <div className="flex items-center justify-between bg-muted p-2 rounded-md">
            <div className="flex items-center">
              <FileText className="h-4 w-4 mr-2 text-primary" />
              <span className="text-sm font-medium truncate">{selectedFile}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedFile('')}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Add this function to render file content editor
  const renderFileContent = () => {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">File Content</label>
        <Textarea 
          value={fileContent} 
          onChange={(e) => setFileContent(e.target.value)}
          className="font-mono text-sm h-40"
          placeholder="File content will appear here"
        />
      </div>
    );
  };

  // Update the repository selection handler
  const handleRepositorySelect = (repoName: string) => {
    setSelectedRepository(repoName);
    setSelectedFile('');
    setFileContent('');
    setCurrentPath('');
    fetchFiles(repoName);
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
            onClick={() => handleRepositorySelect(repo.fullName)}
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

  // Function to format time with AM/PM
  const formatTimeWithAMPM = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Function to convert time with AM/PM to 24-hour format
  const convertTo24Hour = (timeWithAMPM: string): string => {
    const match = timeWithAMPM.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return timeWithAMPM; // Return as is if format doesn't match
    
    let [, hours, minutes, period] = match;
    let hoursNum = parseInt(hours, 10);
    
    // Convert to 24-hour format
    if (period.toUpperCase() === 'PM' && hoursNum < 12) {
      hoursNum += 12;
    } else if (period.toUpperCase() === 'AM' && hoursNum === 12) {
      hoursNum = 0;
    }
    
    return `${hoursNum.toString().padStart(2, '0')}:${minutes}`;
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
          <TabsTrigger value="fix-missed-days" className="flex-1 data-[state=active]:bg-black data-[state=active]:text-white">Fix Missed Days</TabsTrigger>
          <TabsTrigger value="schedule-commits" className="flex-1 data-[state=active]:bg-black data-[state=active]:text-white">Schedule Commits</TabsTrigger>
          <TabsTrigger value="bulk-operations" className="flex-1 data-[state=active]:bg-black data-[state=active]:text-white">Bulk Operations</TabsTrigger>
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
                    onClick={() => handleRepositorySelect(repo.fullName)}
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
                      min={new Date().toISOString().split('T')[0]}
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
                    disabled={!selectedRepository || !commitDate || !commitTime || !commitMessage || !selectedFile || loading.repositories || loading.files || loading.content}
                    onClick={handleScheduleCommit}
                  >
                    {loading.repositories || loading.files || loading.content ? (
                      <span className="flex items-center">
                        <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-primary-foreground rounded-full"></span>
                        Processing...
                      </span>
                    ) : "Schedule Commit"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Scheduled Commits List */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Scheduled Commits</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancelAllCommits}
                  disabled={scheduledCommits.length === 0 || loadingScheduled}
                >
                  {loadingScheduled ? (
                    <span className="flex items-center">
                      <span className="animate-spin h-3 w-3 mr-1 border-t-2 border-b-2 border-primary rounded-full"></span>
                      Processing...
                    </span>
                  ) : "Clean All Pending"}
                </Button>
              </div>
              <Card>
                <CardContent className="p-6">
                  {loadingScheduled ? (
                    <div className="flex justify-center items-center h-40">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : scheduledCommits.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      No scheduled commits found
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {scheduledCommits.map((commit) => (
                        <div key={commit.id} className="border border-border rounded-md p-3 bg-muted/20">
                          <div className="flex justify-between items-start">
                            <div className="flex-grow">
                              <div className="font-medium text-sm">{commit.repository.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Scheduled for {new Date(commit.scheduledTime).toLocaleString()}
                              </div>
                              <div className="text-xs text-primary mt-1">{commit.filePath}</div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs text-destructive hover:text-destructive/80"
                              onClick={() => handleCancelCommit(commit.id)}
                            >
                              Cancel
                            </Button>
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
                    <Input type="date" className="w-full" value={bulkStartDate} onChange={(e) => setBulkStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">End Date</label>
                    <Input type="date" className="w-full" value={bulkEndDate} onChange={(e) => setBulkEndDate(e.target.value)} />
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
                      onClick={() => handleRepositorySelect(repo.fullName)}
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
                      <Button 
                        variant={bulkOperationType === "fix" ? "default" : "outline"} 
                        className="justify-start"
                        onClick={() => setBulkOperationType("fix")}
                      >
                        <GitCommit className="mr-2 h-4 w-4" />
                        Fix Contribution Gaps
                      </Button>
                      <Button 
                        variant={bulkOperationType === "schedule" ? "default" : "outline"} 
                        className="justify-start"
                        onClick={() => setBulkOperationType("schedule")}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        Schedule Regular Commits
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium block mb-2">Commit Time</label>
                    <div className="flex gap-2 mb-2">
                      <Input 
                        type="time" 
                        value={selectedBulkTime}
                        onChange={(e) => setSelectedBulkTime(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          if (selectedBulkTime && !bulkTimes.includes(selectedBulkTime)) {
                            setBulkTimes([...bulkTimes, selectedBulkTime]);
                            setSelectedBulkTime(''); // Clear for next entry
                          } else if (selectedBulkTime) {
                            showToast('This time is already in the list', 'warning');
                          } else {
                            showToast('Please select a time first', 'warning');
                          }
                        }}
                        className="whitespace-nowrap"
                      >
                        Add Time
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={generateRandomTimes}
                        className="whitespace-nowrap"
                      >
                        Generate Random
                      </Button>
                    </div>
                    
                    {bulkTimes.length > 0 && (
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium">Selected Times ({bulkTimes.length})</label>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs"
                            onClick={() => setBulkTimes([])}
                          >
                            Clear All
                          </Button>
                </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {bulkTimes.map((time, index) => (
                            <div key={index} className="flex items-center gap-1 bg-muted rounded-md px-2 py-1">
                              <span className="text-xs">{formatTimeWithAMPM(time)}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => {
                                  const newTimes = [...bulkTimes];
                                  newTimes.splice(index, 1);
                                  setBulkTimes(newTimes);
                                }}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {bulkOperationType === "fix" ? 
                            "For past dates, each commit will use a randomly selected time from this list." :
                            "For scheduled commits, each date will use a randomly selected time from this list."}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium block mb-2">Commit Message Template</label>
                    <div className="flex gap-2 mb-2">
                      <Textarea 
                        placeholder="Update documentation for {{date}}"
                        className="w-full"
                        value={bulkCommitMessageTemplate}
                        onChange={(e) => setBulkCommitMessageTemplate(e.target.value)}
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          if (bulkCommitMessageTemplate && !bulkCommitMessages.includes(bulkCommitMessageTemplate)) {
                            setBulkCommitMessages([...bulkCommitMessages, bulkCommitMessageTemplate]);
                            // Clear the input for next message entry
                            setBulkCommitMessageTemplate('');
                          } else if (bulkCommitMessageTemplate) {
                            showToast('This message is already in the list', 'warning');
                          } else {
                            showToast('Please enter a message first', 'warning');
                          }
                        }}
                        className="whitespace-nowrap"
                      >
                        Add Message
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use {"{{date}}"} to include the date in your message
                    </p>
                    
                    {bulkCommitMessages.length > 0 ? (
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium">Selected Messages ({bulkCommitMessages.length})</label>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs"
                            onClick={() => setBulkCommitMessages([])}
                          >
                            Clear All
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {bulkCommitMessages.map((message, index) => (
                            <div key={index} className="flex items-center gap-1 bg-muted rounded-md px-2 py-1 max-w-full">
                              <span className="text-xs truncate">{message}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                                onClick={() => {
                                  const newMessages = [...bulkCommitMessages];
                                  newMessages.splice(index, 1);
                                  setBulkCommitMessages(newMessages);
                                }}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {bulkOperationType === "fix" ? 
                            "For past dates, each commit will use a randomly selected message from this list." :
                            "For scheduled commits, each date will use a randomly selected message from this list."}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-2">
                        {bulkOperationType === "fix" ? 
                          "For past dates, each commit will use a randomly selected message from this list." :
                          "For scheduled commits, each date will use a randomly selected message from this list."}
                      </p>
                    )}
                    
                    <div className="mt-2">
                      <label className="text-sm font-medium block mb-1">Common Messages:</label>
                      <div className="flex flex-wrap gap-2">
                        {commonCommitMessages.map((message, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => selectCommitMessage(message)}
                          >
                            {message}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium block mb-2">Files to Modify</label>
                    {renderFileSelection()}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-3" 
                      onClick={handleAddFileToBulk}
                      disabled={!selectedFile}
                    >
                      + Add Selected File to Bulk Operation
                    </Button>
                </div>
              </div>
            </CardContent>
          </Card>
            
            {/* Selected Files List */}
            {bulkSelectedFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Selected Files:</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {bulkSelectedFiles.map(filePath => (
                    <div key={filePath} className="flex justify-between items-center p-2 bg-muted/50 rounded-md text-xs">
                      <span className="truncate flex-1">{filePath}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive"
                        onClick={() => handleRemoveFileFromBulk(filePath)}
                      >
                        ×
                      </Button>
        </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Frequency Selection */}
            <div className="mt-4">
              <label className="text-sm font-medium block mb-2">Frequency</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button
                  variant={bulkCommitFrequency === "daily" ? "default" : "outline"}
                  size="sm"
                  className="justify-center"
                  onClick={() => setBulkCommitFrequency("daily")}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Daily
                </Button>
                <Button
                  variant={bulkCommitFrequency === "weekdays" ? "default" : "outline"}
                  size="sm"
                  className="justify-center"
                  onClick={() => setBulkCommitFrequency("weekdays")}
                >
                  <Briefcase className="mr-2 h-4 w-4" />
                  Weekdays
                </Button>
                <Button
                  variant={bulkCommitFrequency === "weekends" ? "default" : "outline"}
                  size="sm"
                  className="justify-center"
                  onClick={() => setBulkCommitFrequency("weekends")}
                >
                  <Coffee className="mr-2 h-4 w-4" />
                  Weekends
                </Button>
                <Button
                  variant={bulkCommitFrequency === "weekly" ? "default" : "outline"}
                  size="sm"
                  className="justify-center"
                  onClick={() => setBulkCommitFrequency("weekly")}
                >
                  <CalendarRange className="mr-2 h-4 w-4" />
                  Weekly
                </Button>
        </div>
              <p className="text-xs text-muted-foreground mt-2">
                {bulkOperationType === "fix" ? 
                  `For past dates, only commits matching the selected frequency (${bulkCommitFrequency}) will be created.` :
                  `For future dates, commits will be scheduled on ${bulkCommitFrequency === "daily" ? "every day" : 
                    bulkCommitFrequency === "weekdays" ? "Monday-Friday" : 
                    bulkCommitFrequency === "weekends" ? "Saturday-Sunday" : 
                    "the same day each week"}.`}
              </p>
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
                    <p className="text-sm text-muted-foreground mb-3">{bulkStartDate || "Not selected"}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Scheduled For:</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {bulkStartDate && bulkEndDate ? `${bulkStartDate} to ${bulkEndDate}` : "Not scheduled"}
                    </p>
                    
                    <h4 className="text-sm font-medium mb-1">Files:</h4>
                    <p className="text-sm text-muted-foreground">{bulkSelectedFiles.length > 0 ? bulkSelectedFiles.join(', ') : "No files selected"}</p>
                  </div>
                </div>
                
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    This will schedule commits to happen automatically on the specified dates.
                  </p>
                  {(!selectedRepository || !bulkStartDate || !bulkEndDate || !bulkCommitMessageTemplate || bulkSelectedFiles.length === 0) && (
                    <div className="text-amber-500 text-sm mb-3">
                      Please complete all fields
                    </div>
                  )}
                  <Button 
                    className="w-full"
                    disabled={!selectedRepository || !bulkStartDate || !bulkEndDate || !bulkCommitMessageTemplate || bulkSelectedFiles.length === 0 || bulkLoading}
                    onClick={handleExecuteBulkOperation}
                  >
                    {bulkLoading ? (
                      <span className="flex items-center">
                        <span className="animate-spin h-4 w-4 mr-2 border-t-2 border-b-2 border-primary-foreground rounded-full"></span>
                        Processing...
                      </span>
                    ) : "Execute Bulk Operation"}
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