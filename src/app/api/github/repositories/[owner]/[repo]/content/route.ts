import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Octokit } from '@octokit/rest';

export async function GET(
  request: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  // In Next.js 15, params needs to be awaited
  const owner = params.owner;
  const repo = params.repo;
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '';
  const sha = searchParams.get('sha') || undefined;
  
  try {
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

    // Fetch file content
    const { data: content } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: sha, 
    });

    if (Array.isArray(content)) {
      return NextResponse.json(
        { error: { code: 'bad_request', message: 'Path points to a directory, not a file' } },
        { status: 400 }
      );
    }

    // For TypeScript, we need to check the type before accessing the content property
    if ('content' in content && typeof content.content === 'string') {
      // GitHub returns content as base64, decode it
      const decodedContent = Buffer.from(content.content, 'base64').toString('utf8');

      return NextResponse.json({
        success: true,
        data: {
          content: decodedContent,
          sha: content.sha,
          name: content.name,
          path: content.path,
          size: content.size
        },
      });
    } else {
      return NextResponse.json(
        { error: { code: 'bad_request', message: 'Invalid content type returned from GitHub' } },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error fetching file content:', error);
    
    return NextResponse.json(
      {
        error: {
          code: 'internal_server_error',
          message: error.message || 'Failed to fetch file content',
        },
      },
      { status: 500 }
    );
  }
} 