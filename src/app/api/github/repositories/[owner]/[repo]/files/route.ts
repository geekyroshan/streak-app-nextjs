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

    // Fetch repository contents
    const { data: contents } = await octokit.repos.getContent({
      owner,
      repo,
      path,
    });

    // Format the response
    const files = Array.isArray(contents) 
      ? contents.map(item => ({
          name: item.name,
          path: item.path,
          type: item.type,
          sha: item.sha
        }))
      : [];

    return NextResponse.json({
      success: true,
      data: files,
    });
  } catch (error: any) {
    console.error('Error fetching repository files:', error);
    
    return NextResponse.json(
      {
        error: {
          code: 'internal_server_error',
          message: error.message || 'Failed to fetch repository files',
        },
      },
      { status: 500 }
    );
  }
} 