import { createServerSupabaseClient } from '@/lib/server-supabase';
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

// Define body type for the request
interface CreateCommitBody {
  repoName: string;       // Full repository name (owner/name)
  filePath: string;       // Path to the file to modify
  commitMessage: string;  // Commit message
  fileContent: string;    // New content for the file
  date: string;           // ISO date string for backdated commit
  time: string;           // Time string in HH:MM format
}

/**
 * POST handler for /api/github/create-commit
 * Creates a properly backdated commit on GitHub using isomorphic-git
 */
export async function POST(request: NextRequest) {
  let tempDir = '';
  
  try {
    // Parse request body
    const body: CreateCommitBody = await request.json();
    
    console.log('Creating backdated commit with payload:', {
      repoName: body.repoName,
      filePath: body.filePath,
      message: body.commitMessage,
      hasContent: !!body.fileContent,
      date: body.date,
      time: body.time
    });
    
    // Validate required fields
    if (!body.repoName || !body.filePath || !body.commitMessage || !body.fileContent || !body.date || !body.time) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create server-side Supabase client to access authenticated session
    const supabase = await createServerSupabaseClient();
    
    // Get session and verify user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get user data including GitHub access token
    const { data: userData } = await supabase
      .from('users')
      .select('github_access_token, github_username')
      .eq('id', session.user.id)
      .single();
    
    if (!userData || !userData.github_access_token) {
      return NextResponse.json(
        { error: 'GitHub token not found for user' },
        { status: 400 }
      );
    }
    
    // Create a temporary directory for Git operations
    tempDir = path.join(os.tmpdir(), `git-backdate-${Date.now()}`);
    await fs.promises.mkdir(tempDir, { recursive: true });
    
    console.log(`Created temporary directory: ${tempDir}`);
    
    // Extract owner and repo from repo name
    const [owner, repo] = body.repoName.includes('/') 
      ? body.repoName.split('/')
      : [userData.github_username, body.repoName];
      
    const repoUrl = `https://github.com/${owner}/${repo}.git`;
    
    // Format the backdated timestamp
    const [year, month, day] = body.date.split('-').map(Number);
    const [hour, minute] = body.time.split(':').map(Number);
    const backdatedDate = new Date(year, month - 1, day, hour, minute);
    const formattedDate = backdatedDate.toISOString();
    
    try {
      // Clone the repository
      console.log(`Cloning repository: ${owner}/${repo}`);
      await git.clone({
        fs,
        http,
        dir: tempDir,
        url: repoUrl,
        depth: 1,
        singleBranch: true,
        onAuth: () => ({
          username: userData.github_username || 'github-user',
          password: userData.github_access_token
        })
      });
      
      console.log('Clone completed successfully');
      
      // Create file directory structure if needed
      const fileFullPath = path.join(tempDir, body.filePath);
      const fileDir = path.dirname(fileFullPath);
      await fs.promises.mkdir(fileDir, { recursive: true });
      
      // Create or update the file with new content
      console.log(`Writing file: ${body.filePath}`);
      await fs.promises.writeFile(fileFullPath, body.fileContent);
      
      // Add the file to git
      console.log(`Adding file: ${body.filePath}`);
      await git.add({
        fs,
        dir: tempDir,
        filepath: body.filePath
      });
      
      // Get current status to verify file was added
      const status = await git.status({
        fs,
        dir: tempDir,
        filepath: body.filePath
      });
      console.log(`File status: ${status}`);
      
      // Make the backdated commit
      console.log(`Creating backdated commit for: ${formattedDate}`);
      const commitResult = await git.commit({
        fs,
        dir: tempDir,
        message: `${body.commitMessage} [${new Date().toISOString()}]`,
        author: {
          name: userData.github_username || 'GitHub User',
          email: session.user.email || 'user@example.com',
          timestamp: Math.floor(backdatedDate.getTime() / 1000),
          timezoneOffset: backdatedDate.getTimezoneOffset()
        },
        committer: {
          name: userData.github_username || 'GitHub User',
          email: session.user.email || 'user@example.com',
          timestamp: Math.floor(backdatedDate.getTime() / 1000),
          timezoneOffset: backdatedDate.getTimezoneOffset()
        }
      });
      
      console.log('Commit successful, SHA:', commitResult);
      
      // Push the changes to GitHub
      console.log('Pushing changes to GitHub');
      await git.push({
        fs,
        http,
        dir: tempDir,
        remote: 'origin',
        ref: 'main', // or 'master' depending on your repository
        onAuth: () => ({
          username: userData.github_username || 'github-user',
          password: userData.github_access_token
        })
      });
      
      console.log('Push completed successfully');
      
      // Construct commit URL
      const commitUrl = `https://github.com/${owner}/${repo}/commit/${commitResult}`;
      
      // Return successful response
      return NextResponse.json({
        success: true,
        commitUrl,
        commitHash: commitResult,
        timestamp: formattedDate,
        message: 'Successfully created backdated commit'
      });
    } catch (gitError: any) {
      console.error('Git operation error:', gitError);
      throw new Error(`Git operation failed: ${gitError.message || 'Unknown error'}`);
    } finally {
      // Clean up the temporary directory
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
        console.log(`Temporary directory cleaned up: ${tempDir}`);
      } catch (cleanupError) {
        console.error('Error cleaning up temporary directory:', cleanupError);
      }
    }
  } catch (error: unknown) {
    console.error('Error creating backdated commit:', error);
    
    // Clean up temporary directory if it exists
    if (tempDir) {
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
        console.log(`Temporary directory cleaned up after error: ${tempDir}`);
      } catch (cleanupError) {
        console.error('Error cleaning up temporary directory:', cleanupError);
      }
    }
    
    // Get error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Return appropriate error response
    return NextResponse.json(
      { 
        error: `Failed to create backdated commit: ${errorMessage}`
      },
      { status: 500 }
    );
  }
} 