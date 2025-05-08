import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from './supabase';

// Create a server-side client (for use in Server Components)
export async function createServerSupabaseClient() {
  const cookieStore = cookies();
  return createServerComponentClient<Database>({ 
    cookies: () => cookieStore 
  });
}

// Create a server-side client directly (for middleware)
export async function createRouteHandlerSupabaseClient() {
  const cookieStore = cookies();
  return createServerComponentClient<Database>({ 
    cookies: () => cookieStore 
  });
} 