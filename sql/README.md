# Supabase Database Schema for GitHub Streak Manager

This directory contains SQL scripts for setting up the Supabase database for the GitHub Streak Manager application.

## Table Structure

### Users
Stores the application users and their basic information.

| Column      | Type        | Description                       |
|-------------|-------------|-----------------------------------|
| id          | UUID        | Primary key                       |
| email       | TEXT        | User's email address              |
| auth_id     | TEXT        | Supabase Auth ID reference        |
| created_at  | TIMESTAMPTZ | Account creation timestamp        |
| last_login  | TIMESTAMPTZ | Last login timestamp              |
| avatar_url  | TEXT        | User's profile image URL          |
| display_name| TEXT        | User's display name               |

### User Preferences
Stores user-specific settings and preferences.

| Column               | Type        | Description                      |
|----------------------|-------------|----------------------------------|
| id                   | UUID        | Primary key                      |
| user_id              | UUID        | Reference to users table         |
| theme                | TEXT        | UI theme preference              |
| notification_settings| JSONB       | Notification configuration       |
| timezone             | TEXT        | User's timezone                  |
| created_at           | TIMESTAMPTZ | Record creation timestamp        |
| updated_at           | TIMESTAMPTZ | Record update timestamp          |

### Repositories
Tracks GitHub repositories that users interact with.

| Column      | Type        | Description                       |
|-------------|-------------|-----------------------------------|
| id          | UUID        | Primary key                       |
| user_id     | UUID        | Reference to users table          |
| name        | TEXT        | Repository name                   |
| url         | TEXT        | Repository URL                    |
| description | TEXT        | Repository description            |
| github_id   | TEXT        | GitHub's repository ID            |
| is_private  | BOOLEAN     | Whether the repo is private       |
| created_at  | TIMESTAMPTZ | Record creation timestamp         |
| updated_at  | TIMESTAMPTZ | Record update timestamp           |

### Scheduled Commits
Tracks commit tasks scheduled by users.

| Column         | Type        | Description                     |
|----------------|-------------|---------------------------------|
| id             | UUID        | Primary key                     |
| repository_id  | UUID        | Reference to repositories table |
| commit_message | TEXT        | Commit message                  |
| file_path      | TEXT        | Path to file to be committed    |
| file_content   | TEXT        | Content to be committed         |
| scheduled_time | TIMESTAMPTZ | When to make the commit         |
| status         | TEXT        | Current status of the task      |
| result         | JSONB       | Result data after execution     |
| created_at     | TIMESTAMPTZ | Record creation timestamp       |
| updated_at     | TIMESTAMPTZ | Record update timestamp         |

## Scripts

1. **01_create_tables.sql** - Creates all the database tables and indexes
2. **02_row_level_security.sql** - Sets up Row Level Security (RLS) policies
3. **03_functions_and_triggers.sql** - Adds database functions and triggers

## Relationships

- A user can have multiple repositories (one-to-many)
- A user can have one set of preferences (one-to-one)
- A repository can have multiple scheduled commits (one-to-many)

## Row Level Security

Row Level Security is configured to ensure:

- Users can only access their own data
- Authentication is required for all data operations
- Repositories and commits are secured by user ownership

## Database Functions

Several helper functions are provided:

- `get_user_repositories(user_uuid)` - Get all repositories for a user
- `get_repository_commits(repo_uuid)` - Get all scheduled commits for a repository
- `update_commit_status(commit_uuid, new_status, result_json)` - Update a commit's status

## Triggers

Automatic triggers maintain data integrity:

- `update_updated_at()` - Updates the `updated_at` timestamp on record changes

## Implementation Notes

1. Use the Supabase dashboard to run these scripts in order
2. Test the RLS policies to ensure proper security
3. Verify triggers and functions work as expected
4. Use the TypeScript types in `src/lib/supabase.ts` to interact with the database 