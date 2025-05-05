import { createClient } from '@supabase/supabase-js';

// Define database types based on our schema
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          auth_id: string | null;
          created_at: string;
          last_login: string | null;
          avatar_url: string | null;
          display_name: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          auth_id?: string | null;
          created_at?: string;
          last_login?: string | null;
          avatar_url?: string | null;
          display_name?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          auth_id?: string | null;
          created_at?: string;
          last_login?: string | null;
          avatar_url?: string | null;
          display_name?: string | null;
        };
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          theme: string;
          notification_settings: any;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme?: string;
          notification_settings?: any;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          theme?: string;
          notification_settings?: any;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      repositories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          url: string;
          description: string | null;
          github_id: string | null;
          is_private: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          url: string;
          description?: string | null;
          github_id?: string | null;
          is_private?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          url?: string;
          description?: string | null;
          github_id?: string | null;
          is_private?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      scheduled_commits: {
        Row: {
          id: string;
          repository_id: string;
          commit_message: string;
          file_path: string;
          file_content: string | null;
          scheduled_time: string;
          status: string;
          result: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          repository_id: string;
          commit_message: string;
          file_path: string;
          file_content?: string | null;
          scheduled_time: string;
          status?: string;
          result?: any | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          repository_id?: string;
          commit_message?: string;
          file_path?: string;
          file_content?: string | null;
          scheduled_time?: string;
          status?: string;
          result?: any | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};

// Supabase client with types
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export default supabase; 