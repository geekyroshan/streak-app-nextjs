import { useMutation, useQueryClient } from '@tanstack/react-query';

interface SyncResponse {
  success: boolean;
  data: {
    userSync: boolean;
    repositorySync: {
      success: boolean;
      count: number;
    };
    contributionSync: boolean;
    timestamp: string;
  };
  error: null | {
    code: string;
    message: string;
  };
}

interface SyncOptions {
  onSuccess?: (data: SyncResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * React Query hook for syncing GitHub data to Supabase
 */
export function useGitHubSync(options: SyncOptions = {}) {
  const queryClient = useQueryClient();
  
  return useMutation<SyncResponse, Error, { username: string, force?: boolean }>({
    mutationFn: async ({ username, force = false }) => {
      const params = new URLSearchParams({
        username
      });
      
      if (force) {
        params.append('force', 'true');
      }
      
      const response = await fetch(`/api/github/sync?${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to sync GitHub data');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate relevant queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['github', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['github', 'repositories'] });
      queryClient.invalidateQueries({ queryKey: ['github', 'contributions'] });
      
      // Call user-provided onSuccess handler if provided
      if (options.onSuccess) {
        options.onSuccess(data);
      }
    },
    onError: (error) => {
      console.error('GitHub sync error:', error);
      
      // Call user-provided onError handler if provided
      if (options.onError) {
        options.onError(error);
      }
    }
  });
} 