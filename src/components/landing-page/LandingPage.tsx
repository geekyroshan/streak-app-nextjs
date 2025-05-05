"use client";

import { GitBranch, Calendar, BarChart } from 'lucide-react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { GitHubSignInButton } from '@/components/auth/GitHubSignInButton';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export function LandingPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [showLogoutMessage, setShowLogoutMessage] = useState(false);
  
  useEffect(() => {
    // Handle various URL parameters
    const error = searchParams.get('error');
    const logout = searchParams.get('logout');
    const redirect = searchParams.get('redirect');
    
    // Show error message if there's an error
    if (error) {
      showToast(`Authentication error: ${error}`, 'error', 5000);
    }
    
    // Show logout success message
    if (logout === 'success') {
      setShowLogoutMessage(true);
      showToast('Successfully logged out', 'success', 3000);
    }
    
    // If user is already logged in, redirect to dashboard or the requested page
    if (user && !isLoading) {
      console.log('User already logged in, redirecting...');
      if (redirect && redirect.startsWith('/') && !redirect.includes('//')) {
        router.push(redirect);
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, router, searchParams, showToast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1A1F2C]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#66D9C2]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1F2C] text-white flex flex-col">
      <main className="flex-1">
        <div className="container max-w-5xl mx-auto px-4 py-16 md:py-24 flex flex-col items-center">
          <h1 className="text-4xl md:text-6xl font-bold text-center bg-gradient-to-r from-[#66D9C2] to-[#9b87f5] bg-clip-text text-transparent mb-4">
            GitHub Streak Manager
          </h1>
          <p className="text-lg md:text-xl text-center text-gray-300 max-w-3xl mx-auto mb-10">
            Maintain your GitHub contribution streak with ease. Analyze patterns, backdate
            commits, and keep your coding momentum going.
          </p>

          {showLogoutMessage && (
            <div className="bg-[#2D3548] text-white p-4 mb-8 rounded-md border border-[#66D9C2]">
              You have been successfully logged out. Sign in again to access your dashboard.
            </div>
          )}

          <div className="mb-16 flex justify-center">
            <GitHubSignInButton className="bg-[#2D3548] hover:bg-[#3D455E] text-white py-2 px-4 rounded-md" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
            <div className="bg-[#222836] rounded-lg p-6 border border-gray-800 flex flex-col items-center text-center">
              <div className="bg-[#2D3548] p-3 rounded-full mb-4">
                <Calendar className="h-6 w-6 text-[#66D9C2]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Track Contributions</h3>
              <p className="text-gray-400">
                Visualize your GitHub activity with an interactive calendar and detailed analytics.
              </p>
            </div>

            <div className="bg-[#222836] rounded-lg p-6 border border-gray-800 flex flex-col items-center text-center">
              <div className="bg-[#2D3548] p-3 rounded-full mb-4">
                <GitBranch className="h-6 w-6 text-[#9b87f5]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Backdate Commits</h3>
              <p className="text-gray-400">
                Create legitimate commits for days when you worked locally but forgot to push your changes.
              </p>
            </div>

            <div className="bg-[#222836] rounded-lg p-6 border border-gray-800 flex flex-col items-center text-center">
              <div className="bg-[#2D3548] p-3 rounded-full mb-4">
                <BarChart className="h-6 w-6 text-[#6397B5]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Streak Analytics</h3>
              <p className="text-gray-400">
                Get insights into your coding patterns and maintain consistent GitHub activity.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-800 py-6">
        <div className="container mx-auto px-4 text-center text-gray-400 text-sm">
          <p>GitHub Streak Manager · Maintain your coding momentum</p>
          <p className="mt-1">Designed with ❤️ for developers</p>
        </div>
      </footer>
    </div>
  );
} 