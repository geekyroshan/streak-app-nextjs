import { createAdminClient } from '@/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/web';
import LightningFS from '@isomorphic-git/lightning-fs';
import * as path from 'path';

/**
 * POST handler for cron job to process scheduled commits
 * This endpoint should be called by a cron job or scheduler to process pending scheduled commits
 * Requires an API key for authentication in the CRON_SECRET environment variable
 * 
 * Authentication can be provided either:
 * 1. As a Bearer token in the Authorization header
 * 2. As a query parameter '?token=YOUR_CRON_SECRET' (for Vercel cron jobs)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify required environment variables
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'CRON_SECRET'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
      console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
      return NextResponse.json(
        { error: `Server not properly configured: missing ${missingEnvVars.join(', ')}` },
        { status: 500 }
      );
    }
    
    // Get cron secret from environment
    const cronSecret = process.env.CRON_SECRET;
    
    // Check for authentication - support both header and query param
    const authHeader = request.headers.get('authorization');
    const url = new URL(request.url);
    const tokenParam = url.searchParams.get('token');
    
    // Verify authentication using either method
    const headerAuth = authHeader === `Bearer ${cronSecret}`;
    const paramAuth = tokenParam === cronSecret;
    
    if (!headerAuth && !paramAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get admin client to bypass RLS
    const supabase = createAdminClient();
    
    // Get current time
    const now = new Date();
    
    // Get all pending commits that are due
    const { data: pendingCommits, error } = await supabase
      .from('scheduled_commits')
      .select(`
        id,
        commit_message,
        file_path,
        file_content,
        scheduled_time,
        repositories(id, name, url, user_id)
      `)
      .eq('status', 'pending')
      .lte('scheduled_time', now.toISOString())
      .order('scheduled_time', { ascending: true });
    
    if (error) {
      console.error('Error fetching pending commits:', error);
      return NextResponse.json(
        { error: 'Failed to fetch pending commits' },
        { status: 500 }
      );
    }
    
    if (!pendingCommits || pendingCommits.length === 0) {
      // No pending commits to process
      return NextResponse.json({
        success: true,
        message: 'No pending commits to process',
        data: { processed: 0 }
      });
    }
    
    console.log(`Found ${pendingCommits.length} pending commits to process`);
    
    // Process each commit
    const results = [];
    
    for (const commit of pendingCommits) {
      try {
        // Update status to processing
        await supabase
          .from('scheduled_commits')
          .update({ status: 'processing' })
          .eq('id', commit.id);
        
        // Get user info to create the commit
        const repoInfo = commit.repositories as any;
        const userId = repoInfo.user_id;
        
        // Get user's GitHub token
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('github_access_token, github_username')
          .eq('id', userId)
          .single();
        
        if (userError || !userData || !userData.github_access_token) {
          throw new Error('GitHub token not found for user');
        }
        
        // Process the GitHub repository
        const repoFullName = repoInfo.name;
        const [owner, repo] = repoFullName.split('/');
        
        // Create virtual filesystem for git operations
        const fs = new LightningFS('fs');
        
        // Define temp directory path in virtual filesystem
        const dir = `/repo-${Date.now()}`;
        await fs.promises.mkdir(dir);
        
        // Clone the repository
        console.log(`Cloning repository ${repoFullName}...`);
        
        // Set up authentication for Git operations
        const token = userData.github_access_token;
        const onAuth = () => ({ username: token });
        
        await git.clone({
          fs,
          http,
          dir,
          url: `https://github.com/${repoFullName}.git`,
          singleBranch: true,
          depth: 1,
          onAuth
        });
        
        // Ensure the file directory exists
        const filePath = path.join(dir, commit.file_path);
        // Make sure parent directories exist by creating them one by one
        const pathParts = path.dirname(filePath).split('/').filter(Boolean);
        let currentPath = '';
        
        for (const part of pathParts) {
          currentPath += '/' + part;
          try {
            await fs.promises.mkdir(currentPath);
          } catch (err: any) {
            // Ignore directory exists error
            if (err.code !== 'EEXIST') throw err;
          }
        }
        
        // Write file content
        await fs.promises.writeFile(filePath, commit.file_content);
        
        // Add the file
        await git.add({
          fs,
          dir,
          filepath: commit.file_path
        });
        
        // Get user config (needed for the commit)
        const authorName = userData.github_username || 'GitHub User';
        const authorEmail = `${authorName}@users.noreply.github.com`;
        
        // Commit the file
        const commitResult = await git.commit({
          fs,
          dir,
          message: commit.commit_message,
          author: {
            name: authorName,
            email: authorEmail
          }
        });
        
        // Push the commit
        await git.push({
          fs,
          http,
          dir,
          remote: 'origin',
          ref: 'HEAD',
          onAuth
        });
        
        // Update commit status to completed
        await supabase
          .from('scheduled_commits')
          .update({
            status: 'completed',
            result: {
              commitSha: commitResult,
              completedAt: new Date().toISOString()
            }
          })
          .eq('id', commit.id);
        
        // Add to results
        results.push({
          id: commit.id,
          repository: repoFullName,
          status: 'completed',
          commitSha: commitResult
        });
        
      } catch (commitError) {
        console.error(`Error processing commit ${commit.id}:`, commitError);
        
        // Update commit status to failed
        await supabase
          .from('scheduled_commits')
          .update({
            status: 'failed',
            result: {
              error: commitError instanceof Error ? commitError.message : String(commitError),
              failedAt: new Date().toISOString()
            }
          })
          .eq('id', commit.id);
        
        // Add to results
        results.push({
          id: commit.id,
          repository: (commit.repositories as any).name,
          status: 'failed',
          error: commitError instanceof Error ? commitError.message : String(commitError)
        });
      }
    }
    
    // Return response with results
    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} scheduled commits`,
      data: {
        processed: results.length,
        results
      }
    });
    
  } catch (error: unknown) {
    console.error('Error processing scheduled commits:', error);
    
    // Get error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Return appropriate error response
    return NextResponse.json(
      { error: `Failed to process scheduled commits: ${errorMessage}` },
      { status: 500 }
    );
  }
} 