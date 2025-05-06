import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Octokit } from '@octokit/rest';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    const { repository, filePath, fileContent, message, date } = body;

    if (!repository || !filePath || !fileContent || !message || !date) {
      return NextResponse.json(
        { error: { code: 'bad_request', message: 'Missing required parameters' } },
        { status: 400 }
      );
    }

    // Create a Supabase client with the correct cookie handling for Next.js 15
    const cookieStore = await cookies();
    
    // Use the approach recommended by Supabase for Next.js 15
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Get the user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: { code: 'unauthorized', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Get the user's GitHub access token from Supabase
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('github_token')
      .eq('auth_id', session.user.id)
      .single();

    if (userError || !userData?.github_token) {
      return NextResponse.json(
        { error: { code: 'unauthorized', message: 'GitHub token not found' } },
        { status: 401 }
      );
    }

    // Create an Octokit instance
    const octokit = new Octokit({
      auth: userData.github_token
    });

    // Get the GitHub username from the session
    const githubUsername = session.user.user_metadata?.user_name;

    if (!githubUsername) {
      return NextResponse.json(
        { error: { code: 'bad_request', message: 'GitHub username not found' } },
        { status: 400 }
      );
    }

    // Parse the repository name from the repository fullName
    const [owner, repo] = repository.fullName.split('/');

    // Check if the file exists first to get the SHA
    let fileSha;
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
      });

      // If file exists, get the SHA
      if (!Array.isArray(fileData)) {
        fileSha = fileData.sha;
      }
    } catch (error) {
      // File doesn't exist, which is fine for creating a new file
      console.log('File does not exist, will create new file');
    }

    // Create or update the file with the backdated commit
    const response = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message,
      content: Buffer.from(fileContent).toString('base64'),
      sha: fileSha, // This will be undefined for new files, which is fine
      committer: {
        name: githubUsername,
        email: `${githubUsername}@users.noreply.github.com`,
        date: new Date(date).toISOString(),
      },
      author: {
        name: githubUsername,
        email: `${githubUsername}@users.noreply.github.com`,
        date: new Date(date).toISOString(),
      },
    });

    // Log the commit to the scheduled_commits table in Supabase
    await supabase.from('scheduled_commits').insert({
      user_id: session.user.id,
      repository_name: repository.name,
      repository_full_name: repository.fullName,
      file_path: filePath,
      commit_message: message,
      scheduled_date: new Date(date).toISOString(),
      status: 'completed',
      commit_sha: response.data.commit.sha,
    });

    return NextResponse.json({
      success: true,
      data: {
        commitUrl: response.data.commit.html_url,
        sha: response.data.commit.sha,
      },
    });
  } catch (error: any) {
    console.error('Error creating backdated commit:', error);
    
    return NextResponse.json(
      {
        error: {
          code: 'internal_server_error',
          message: error.message || 'Failed to create backdated commit',
        },
      },
      { status: 500 }
    );
  }
} 