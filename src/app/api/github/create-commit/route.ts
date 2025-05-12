import { createServerSupabaseClient } from '@/lib/server-supabase';
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
 * Verify that git is available in the environment
 */
async function checkGitAvailability() {
  try {
    // Check if git is in PATH
    const { stdout } = await execAsync('which git || echo "not found"');
    if (stdout.trim() === 'not found') {
      throw new Error('Git command not found in PATH');
    }
    
    // Verify git version
    const { stdout: versionOutput } = await execAsync('git --version');
    console.log('Git version:', versionOutput.trim());
    return true;
  } catch (error) {
    console.error('Git availability check failed:', error);
    return false;
  }
}

/**
 * POST handler for /api/github/create-commit
 * Creates a properly backdated commit on GitHub by using Git CLI
 */
export async function POST(request: NextRequest) {
  let tempDir = '';
  
  try {
    // Ensure git is available
    const gitAvailable = await checkGitAvailability();
    if (!gitAvailable) {
      return NextResponse.json(
        { error: 'Git is not available in the environment. Please contact support.' },
        { status: 500 }
      );
    }
    
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
      
    const repoUrl = `https://${userData.github_access_token}@github.com/${owner}/${repo}.git`;
    
    // Create file directory structure if needed
    const fileDir = path.dirname(path.join(tempDir, body.filePath));
    await fs.promises.mkdir(fileDir, { recursive: true });
    
    // Format the backdated timestamp
    const [year, month, day] = body.date.split('-').map(Number);
    const [hour, minute] = body.time.split(':').map(Number);
    const backdatedDate = new Date(year, month - 1, day, hour, minute);
    const formattedDate = backdatedDate.toISOString();
    
    // Define git path explicitly
    const gitPath = process.env.GIT_EXECUTABLE_PATH || 'git';
    
    // Clone the repository (shallow clone to save time/bandwidth)
    console.log(`Cloning repository: ${owner}/${repo}`);
    try {
      const cloneResult = await execAsync(`${gitPath} clone --depth 1 ${repoUrl} ${tempDir}`);
      console.log('Clone output:', cloneResult.stdout);
    } catch (error: any) {
      console.error('Clone error:', error);
      throw new Error(`Failed to clone repository: ${error.message || 'Unknown error'}`);
    }
    
    // Change to the repo directory
    const originalDir = process.cwd();
    process.chdir(tempDir);
    
    try {
      // Create or update the file with new content
      console.log(`Writing file: ${body.filePath}`);
      await fs.promises.writeFile(path.join(tempDir, body.filePath), body.fileContent);
      
      // Configure git user
      await execAsync(`${gitPath} config user.name "${userData.github_username || 'GitHub User'}"`);
      await execAsync(`${gitPath} config user.email "${session.user.email || 'user@example.com'}"`);
      
      // Add the file to git
      await execAsync(`${gitPath} add "${body.filePath}"`);
      
      // Make the backdated commit using environment variables
      // The --allow-empty flag permits commits with no changes
      console.log(`Creating backdated commit for: ${formattedDate}`);
      const commitCommand = `
        GIT_AUTHOR_DATE="${formattedDate}" \
        GIT_COMMITTER_DATE="${formattedDate}" \
        ${gitPath} commit --allow-empty -m "${body.commitMessage.replace(/"/g, '\\"')} [${new Date().toISOString()}]"
      `;
      
      const { stdout: commitOutput } = await execAsync(commitCommand);
      console.log('Commit output:', commitOutput);
      
      // Extract commit hash from the output
      const commitHash = commitOutput.match(/\[(main|master)?\s*([0-9a-f]+)\]/)?.[2] || '';
      
      // Push the changes to GitHub
      console.log('Pushing changes to GitHub');
      await execAsync(`${gitPath} push origin HEAD:main`);
      
      // Construct commit URL
      const commitUrl = `https://github.com/${owner}/${repo}/commit/${commitHash}`;
      
      // Return successful response
      return NextResponse.json({
        success: true,
        commitUrl,
        commitHash,
        timestamp: formattedDate,
        message: 'Successfully created backdated commit'
      });
    } finally {
      // Always make sure to change back to the original directory
      process.chdir(originalDir);
      
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
        const originalDir = process.cwd();
        // Only change directory if we're currently in the temp dir
        if (process.cwd().includes(tempDir)) {
          process.chdir(os.tmpdir());
        } else {
          process.chdir(originalDir);
        }
        
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