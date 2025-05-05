# GitHub Streak Manager Database Schema

This document describes the database schema for the GitHub Streak Manager application.

## Tables

### users

Stores user information and authentication details.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, automatically generated |
| email | TEXT | User's email address (unique) |
| auth_id | TEXT | ID from auth provider (GitHub) |
| created_at | TIMESTAMPTZ | When the user was created |
| last_login | TIMESTAMPTZ | When the user last logged in |
| avatar_url | TEXT | URL to user's avatar |
| display_name | TEXT | User's display name |

### user_preferences

Stores user preferences and settings.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, automatically generated |
| user_id | UUID | Foreign key to users table |
| theme | TEXT | UI theme preference (default: 'dark') |
| notification_settings | JSONB | JSON object for notification preferences |
| timezone | TEXT | User's preferred timezone (default: 'UTC') |
| created_at | TIMESTAMPTZ | When the preference was created |
| updated_at | TIMESTAMPTZ | When the preference was last updated |

### repositories

Stores GitHub repositories the user has connected to the application.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, automatically generated |
| user_id | UUID | Foreign key to users table |
| name | TEXT | Repository name |
| url | TEXT | Repository URL |
| description | TEXT | Repository description |
| github_id | TEXT | GitHub's repository ID |
| is_private | BOOLEAN | Whether the repository is private |
| created_at | TIMESTAMPTZ | When the repository was added |
| updated_at | TIMESTAMPTZ | When the repository was last updated |

### scheduled_commits

Stores scheduled commits for backdating functionality.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, automatically generated |
| repository_id | UUID | Foreign key to repositories table |
| commit_message | TEXT | Message for the scheduled commit |
| file_path | TEXT | Path to the file to be modified |
| file_content | TEXT | Content to be written to the file |
| scheduled_time | TIMESTAMPTZ | When the commit should be made |
| status | TEXT | Status of the scheduled commit (pending, completed, failed) |
| result | JSONB | Result information after execution |
| created_at | TIMESTAMPTZ | When the scheduled commit was created |
| updated_at | TIMESTAMPTZ | When the scheduled commit was last updated |

## Relationships

- A user can have one set of preferences (1:1)
- A user can have many repositories (1:N)
- A repository can have many scheduled commits (1:N)

## Indexes

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| user_preferences | idx_user_preferences_user_id | user_id | Fast lookup of user preferences by user ID |
| repositories | idx_repositories_user_id | user_id | Fast lookup of repositories by user ID |
| scheduled_commits | idx_scheduled_commits_repository_id | repository_id | Fast lookup of scheduled commits by repository |
| scheduled_commits | idx_scheduled_commits_status | status | Filter commits by status |
| scheduled_commits | idx_scheduled_commits_scheduled_time | scheduled_time | Time-based queries for scheduled operations |

## Security Policies

Row Level Security (RLS) is implemented to ensure users can only access their own data:

- Users can only read/write their own records
- Users can only access repositories they've created
- Users can only schedule commits for repositories they own

## Database Functions

| Function | Parameters | Return Type | Description |
|----------|------------|-------------|-------------|
| get_user_repositories | user_uuid UUID | SETOF repositories | Returns all repositories for a specific user |
| get_repository_commits | repo_uuid UUID | SETOF scheduled_commits | Returns all scheduled commits for a repository |
| update_commit_status | commit_uuid UUID, new_status TEXT, result_json JSONB | scheduled_commits | Updates the status of a scheduled commit |

## Triggers

| Trigger | Table | Event | Function | Description |
|---------|-------|-------|----------|-------------|
| update_user_preferences_updated_at | user_preferences | BEFORE UPDATE | update_updated_at() | Updates the updated_at timestamp |
| update_repositories_updated_at | repositories | BEFORE UPDATE | update_updated_at() | Updates the updated_at timestamp |
| update_scheduled_commits_updated_at | scheduled_commits | BEFORE UPDATE | update_updated_at() | Updates the updated_at timestamp |
| notify_upcoming_commits_trigger | scheduled_commits | AFTER INSERT OR UPDATE | notify_upcoming_commits() | Sends notifications for scheduled commits |

## Environment Configuration

The application requires the following environment variables to connect to Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Migration Strategy

For future schema updates, we'll adopt the following approach:

1. Create SQL migration scripts with sequential numbering (e.g., `01_create_tables.sql`, `02_row_level_security.sql`)
2. Store migration scripts in the `sql/` directory
3. Track applied migrations using a migrations table (future enhancement)
4. Apply migrations in order through the Supabase SQL Editor
5. Update TypeScript types in `src/lib/supabase.ts` to reflect schema changes

## Diagram

```
┌───────────┐       ┌─────────────────┐
│   users   │       │ user_preferences │
├───────────┤       ├─────────────────┤
│ id        │──1:1──┤ user_id         │
│ email     │       │ theme           │
│ auth_id   │       │ notifications   │
│ created_at│       │ timezone        │
└───────────┘       └─────────────────┘
      │
      │ 1:N
      ▼
┌────────────────┐
│  repositories  │
├────────────────┤
│ id             │
│ user_id        │
│ name           │
│ url            │
│ github_id      │
└────────────────┘
      │
      │ 1:N
      ▼
┌────────────────────┐
│ scheduled_commits  │
├────────────────────┤
│ id                 │
│ repository_id      │
│ commit_message     │
│ file_path          │
│ scheduled_time     │
│ status             │
└────────────────────┘
``` 