import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Repository {
  id: number;
  name: string;
  fullName: string;
}

interface BackdatedCommitData {
  repository: Repository;
  filePath: string;
  fileContent: string;
  message: string;
  date: Date;
}

interface CommitResponse {
  success: boolean;
  data?: {
    commitUrl: string;
    sha: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface CommitOptions {
  onSuccess?: (data: CommitResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * React Query hook for creating backdated commits
 */
export function useBackdatedCommit(options: CommitOptions = {}) {
  const queryClient = useQueryClient();
  
  return useMutation<CommitResponse, Error, BackdatedCommitData>({
    mutationFn: async (commitData) => {
      // Format the date as ISO string for the API
      const formattedData = {
        ...commitData,
        date: commitData.date.toISOString()
      };
      
      const response = await fetch('/api/github/repositories/backdated-commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create backdated commit');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate relevant queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['github', 'contributions'] });
      
      // Call user-provided onSuccess handler if provided
      if (options.onSuccess) {
        options.onSuccess(data);
      }
    },
    onError: (error) => {
      console.error('Backdated commit error:', error);
      
      // Call user-provided onError handler if provided
      if (options.onError) {
        options.onError(error);
      }
    }
  });
}

/**
 * React Query hook for scheduling commits for future execution
 */
export function useScheduleCommit(options: CommitOptions = {}) {
  const queryClient = useQueryClient();
  
  return useMutation<CommitResponse, Error, BackdatedCommitData>({
    mutationFn: async (commitData) => {
      // Format the date as ISO string for the API
      const formattedData = {
        ...commitData,
        date: commitData.date.toISOString(),
        scheduled: true
      };
      
      const response = await fetch('/api/github/repositories/schedule-commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to schedule commit');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Call user-provided onSuccess handler if provided
      if (options.onSuccess) {
        options.onSuccess(data);
      }
    },
    onError: (error) => {
      console.error('Schedule commit error:', error);
      
      // Call user-provided onError handler if provided
      if (options.onError) {
        options.onError(error);
      }
    }
  });
} 