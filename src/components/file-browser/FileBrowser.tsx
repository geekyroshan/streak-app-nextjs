import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface FileBrowserProps {
  files: Array<{
    name: string;
    path: string;
    type: 'file' | 'dir';
    sha?: string;
  }>;
  isLoading: boolean;
  onSelectFile: (file: { path: string; name: string; sha?: string }) => void;
  onNavigateToFolder: (path: string) => void;
  currentPath: string;
  selectedFilePath?: string;
}

export function FileBrowser({
  files,
  isLoading,
  onSelectFile,
  onNavigateToFolder,
  currentPath,
  selectedFilePath
}: FileBrowserProps) {
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});

  // If navigating to a new path, clear the expanded dirs state
  useEffect(() => {
    setExpandedDirs({});
  }, [currentPath]);

  // Handle back navigation
  const handleBack = () => {
    if (!currentPath) return;
    
    const pathParts = currentPath.split('/');
    pathParts.pop();
    const parentPath = pathParts.join('/');
    onNavigateToFolder(parentPath);
  };

  // Handle expand/collapse of folders
  const toggleDir = (path: string) => {
    setExpandedDirs(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // Extract directories and files
  const directories = files.filter(f => f.type === 'dir').sort((a, b) => a.name.localeCompare(b.name));
  const fileItems = files.filter(f => f.type === 'file').sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="rounded-md border border-border overflow-hidden bg-card">
      {currentPath && (
        <div className="flex items-center justify-between p-2 border-b border-border bg-muted">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div className="text-sm text-muted-foreground px-2">
            {currentPath || 'Root'}
          </div>
        </div>
      )}

      <div className="p-2 max-h-60 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No files found in this directory
          </div>
        ) : (
          <div className="space-y-1">
            {directories.map((dir) => (
              <div key={dir.path} className="text-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start w-full font-normal"
                  onClick={() => toggleDir(dir.path)}
                >
                  {expandedDirs[dir.path] ? (
                    <ChevronDown className="mr-1 h-4 w-4" />
                  ) : (
                    <ChevronRight className="mr-1 h-4 w-4" />
                  )}
                  <Folder className="mr-2 h-4 w-4" />
                  {dir.name}
                </Button>
                {expandedDirs[dir.path] && (
                  <div className="ml-6">
                    {/* We would normally load subdirectories here, but for simplicity just navigate */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start w-full font-normal text-muted-foreground"
                      onClick={() => onNavigateToFolder(dir.path)}
                    >
                      Open folder...
                    </Button>
                  </div>
                )}
              </div>
            ))}
            
            {fileItems.map((file) => (
              <Button
                key={file.path}
                variant="ghost"
                size="sm"
                className={cn(
                  "justify-start w-full font-normal",
                  selectedFilePath === file.path && "bg-secondary"
                )}
                onClick={() => onSelectFile(file)}
              >
                <File className="mr-2 h-4 w-4" />
                {file.name}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 