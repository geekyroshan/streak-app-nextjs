# Environment Variables Setup

For the GitHub Streak Manager application to work correctly, you need to set up your environment variables.

## Required Environment Variables

Create a `.env.local` file in the root directory with the following content:

```env
# Supabase Configuration
# Get these values from your Supabase project settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# GitHub Integration (for future tasks)
# NEXT_PUBLIC_GITHUB_CLIENT_ID=your-github-client-id
# GITHUB_CLIENT_SECRET=your-github-client-secret
```

## How to Get Supabase Credentials

1. Log in to your Supabase account at [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your GitHub Streak Manager project
3. Go to **Project Settings** > **API**
4. Copy your **Project URL** and paste it as the value for `NEXT_PUBLIC_SUPABASE_URL`
5. Under **Project API keys**, copy the **anon public** key and paste it as the value for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Environment Variables in Development

While developing locally, create a `.env.local` file at the root of your project with the above content.

## Environment Variables in Production

In production, you should set these environment variables in your hosting environment:

- If using Vercel, add these variables in the Vercel project settings
- If using Netlify, add these variables in the Netlify dashboard
- For other hosting services, refer to their documentation on environment variables

## Verifying Your Environment

You can verify your environment variables are working by running the following command in your project:

```bash
# Check if environment variables are loaded (will print "true" if they exist)
echo "SUPABASE_URL: $([ -n \"$NEXT_PUBLIC_SUPABASE_URL\" ] && echo 'true' || echo 'false')"
echo "SUPABASE_ANON_KEY: $([ -n \"$NEXT_PUBLIC_SUPABASE_ANON_KEY\" ] && echo 'true' || echo 'false')"
``` 