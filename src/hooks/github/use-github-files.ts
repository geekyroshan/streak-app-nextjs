import { useQuery } from '@tanstack/react-query';

interface RepoFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  sha: string;
}

interface FileContentResponse {
  content: string;
  encoding: string;
  sha: string;
}

/**
 * React Query hook for fetching repository files
 */
export function useRepositoryFiles(owner: string, repo: string, path: string = '') {
  return useQuery<RepoFile[]>({
    queryKey: ['github', 'files', owner, repo, path],
    queryFn: async () => {
      if (!owner || !repo) {
        return [];
      }
      
      const response = await fetch(`/api/github/repositories/${owner}/${repo}/files?path=${path}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch repository files');
      }
      
      const data = await response.json();
      return data.data || [];
    },
    enabled: !!owner && !!repo,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * React Query hook for fetching file content
 */
export function useFileContent(owner: string, repo: string, path: string, sha?: string) {
  return useQuery<string>({
    queryKey: ['github', 'file', owner, repo, path, sha],
    queryFn: async () => {
      if (!owner || !repo || !path) {
        return '';
      }
      
      const params = new URLSearchParams();
      if (sha) params.append('sha', sha);
      
      const response = await fetch(`/api/github/repositories/${owner}/${repo}/content?path=${path}&${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to fetch file content');
      }
      
      const data: FileContentResponse = await response.json();
      // GitHub API returns base64 encoded content
      return atob(data.content);
    },
    enabled: !!owner && !!repo && !!path,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
} 