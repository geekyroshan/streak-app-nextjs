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
4. **04_testing.sql** - Contains SQL for testing the database setup
5. **05_add_github_username.sql** - Adds the github_username column to the users table

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

## GitHub Streak Manager Database Setup

### SQL Files

1. `01_create_tables.sql` - Creates the initial database tables
2. `02_row_level_security.sql` - Sets up row-level security policies
3. `03_functions_and_triggers.sql` - Defines database functions and triggers
4. `04_testing.sql` - Contains SQL for testing the database setup
5. `05_add_github_username.sql` - Adds the github_username column to the users table

### How to Run the SQL

#### Using Supabase Dashboard

1. Log in to your Supabase project dashboard
2. Navigate to the "SQL Editor" section
3. Create a new query
4. Copy the contents of the SQL file you want to run
5. Paste it into the query editor
6. Click "Run" to execute the SQL

#### Recent Updates

**IMPORTANT: github_username Column**

We've added a `github_username` column to the `users` table in `05_add_github_username.sql`. This field is used to store the GitHub username from OAuth login data. If you're experiencing issues with GitHub data not appearing in the settings page, follow these steps:

1. Navigate to your Supabase dashboard's SQL Editor
2. Create a new query
3. Copy the contents from `05_add_github_username.sql`
4. Click "Run" to add the column and update existing records
5. Restart your application

After running this SQL, log out and log back in to your application to ensure the GitHub username is properly stored and displayed.

#### Troubleshooting

If you see warnings about missing columns in the browser console, make sure you've run all SQL files in sequence. The warnings should appear like:

```
SettingsPage: 'github_username' field missing from database. This field may need to be added to your Supabase table schema.
```

This indicates you need to run the `05_add_github_username.sql` file. 