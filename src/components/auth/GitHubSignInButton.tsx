import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { GitHubIcon } from '@/components/icons/GitHubIcon';

interface GitHubSignInButtonProps {
  className?: string;
}

export function GitHubSignInButton({ className }: GitHubSignInButtonProps) {
  const { signInWithGitHub, isLoading } = useAuth();

  const handleSignIn = () => {
    signInWithGitHub();
  };

  return (
    <Button
      variant="outline"
      onClick={handleSignIn}
      disabled={isLoading}
      className={`flex items-center gap-2 ${className}`}
    >
      <GitHubIcon className="h-5 w-5" />
      {isLoading ? 'Signing in...' : 'Sign in with GitHub'}
    </Button>
  );
} 