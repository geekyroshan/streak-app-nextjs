# Supabase Project Setup Guide

This guide walks you through setting up a Supabase project for the GitHub Streak Manager application.

## 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign in or create an account
2. Click "New Project" to create a new project
3. Enter the following details:
   - **Name**: GitHub Streak Manager (or your preferred name)
   - **Database Password**: Create a strong password
   - **Region**: Choose the region closest to your users
4. Click "Create new project" and wait for it to be provisioned (this may take a few minutes)

## 2. Get API Credentials

1. Once your project is created, go to the project dashboard
2. Navigate to "Settings" > "API" in the sidebar
3. You'll find two important values here:
   - **Project URL**: Copy this to your `.env.local` file as `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key: Copy this to your `.env.local` file as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 3. Set Up Database Tables

Run the SQL scripts in the following order using the Supabase SQL Editor:

1. Go to the "SQL Editor" section in the Supabase dashboard
2. Click "New Query"
3. Copy the contents of `sql/01_create_tables.sql` and run it
4. Verify that all tables were created in the "Table Editor" section

## 4. Configure Row Level Security

1. Go back to the SQL Editor and create a new query
2. Copy the contents of `sql/02_row_level_security.sql` and run it
3. Verify RLS is enabled by going to "Authentication" > "Policies"
4. Check that each table has the appropriate policies applied

## 5. Create Database Functions and Triggers

1. Create a new query in the SQL Editor
2. Copy the contents of `sql/03_functions_and_triggers.sql` and run it
3. These functions and triggers will now be available for your application

## 6. Set Up Environment Variables

1. Create a `.env.local` file in your project root (if it doesn't exist)
2. Add the following variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 7. Configure GitHub OAuth (For Later Tasks)

This will be implemented in a future task, but here's an overview:

1. Go to "Authentication" > "Providers" in Supabase
2. Enable the GitHub provider
3. Create a GitHub OAuth app (instructions will be provided in the authentication task)
4. Add the GitHub Client ID and Secret to Supabase

## 8. Testing Your Setup

To verify your Supabase setup is working correctly:

1. Use the Supabase Table Editor to insert a test record into the `users` table
2. Try querying data using the SQL Editor
3. Verify RLS by attempting to access data with and without authentication

## 9. Next Steps

With your Supabase project set up, you're ready to:

1. Connect your Next.js application to Supabase using the provided client in `src/lib/supabase.ts`
2. Implement the authentication flow with GitHub OAuth
3. Develop the data access layer for repositories and commits

## Troubleshooting

- **SQL Errors**: Double-check syntax and ensure scripts are run in the correct order
- **RLS Issues**: Make sure policies are correctly defined and authentication is working
- **Environment Variables**: Verify your `.env.local` file has the correct values from Supabase

For more help, refer to the [Supabase documentation](https://supabase.com/docs). 