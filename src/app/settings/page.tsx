"use client";

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToastDemo } from '@/components/ui/toast/toast-demo';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [userData, setUserData] = useState<{
    email: string;
    display_name: string | null;
    avatar_url: string | null;
    github_username: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);

  // Add a useEffect that forces a reload if the page is loaded without auth data
  useEffect(() => {
    // Check if we've been waiting too long for auth data
    let authTimeout: NodeJS.Timeout;
    
    if (authLoading) {
      console.log("SettingsPage: Auth loading in progress...");
      // Set a timeout to force reload if auth takes too long
      authTimeout = setTimeout(() => {
        console.log("SettingsPage: Auth loading timeout, forcing reload");
        window.location.href = '/settings?reload=true';
      }, 5000); // 5 second timeout
    } else {
      console.log("SettingsPage: Auth loading complete. User available:", !!user);
      if (user) {
        console.log("SettingsPage: User ID from auth:", user.id);
        console.log("SettingsPage: User metadata available:", !!user.user_metadata);
      }
    }
    
    return () => {
      if (authTimeout) clearTimeout(authTimeout);
    };
  }, [authLoading, user]);

  // Check for reload parameter and refresh page after a delay
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reload = urlParams.get('reload');
    
    if (reload === 'true') {
      console.log("SettingsPage: Reload parameter detected, will refresh soon");
      // Remove from URL without navigation
      const url = new URL(window.location.href);
      url.searchParams.delete('reload');
      window.history.replaceState({}, '', url.toString());
      
      // Schedule reload after a delay
      const reloadTimeout = setTimeout(() => {
        console.log("SettingsPage: Performing scheduled reload");
        window.location.reload();
      }, 2000);
      
      return () => clearTimeout(reloadTimeout);
    }
  }, []);

  // Define fetchUserData as a memoized callback to avoid recreating it on each render
  // Remove showToast from dependencies as it causes unnecessary re-renders
  const fetchUserData = useCallback(async () => {
    if (!user || dataFetched) return;
    
    setIsLoading(true);
    try {
      console.log("SettingsPage: Attempting to fetch data from 'users' table...");
      console.log("SettingsPage: Using auth_id for query:", user.id);
      
      // First try querying by auth_id
      let userRecord = null;
      const { data: authData, error: authError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .single();
      
      if (authError) {
        console.error("SettingsPage: Supabase query error (auth_id):", authError);
        
        // Try with id as fallback
        const { data: idData, error: idError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (idError) {
          console.error("SettingsPage: Both query attempts failed. id query error:", idError);
          
          console.log("SettingsPage: Listing all users records for debugging...");
          const { data: allData } = await supabase
            .from('users')
            .select('id, auth_id, email')
            .limit(5);
          
          console.log("SettingsPage: First 5 user records:", allData);
          throw idError;
        }
        
        if (idData) {
          console.log("SettingsPage: User data retrieved via id query:", idData);
          userRecord = idData;
        }
      } else {
        console.log("SettingsPage: User data retrieved via auth_id query:", authData);
        userRecord = authData;
      }
      
      if (userRecord) {
        console.log("SettingsPage: User data retrieved:", userRecord);
        
        // Check if the github_username field exists
        if (!('github_username' in userRecord)) {
          console.warn("SettingsPage: 'github_username' field missing from database. This field may need to be added to your Supabase table schema.");
        }
        
        // Set user data from database record
        setUserData({
          email: userRecord.email || user.email || '',
          display_name: userRecord.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'GitHub User',
          avatar_url: userRecord.avatar_url || user?.user_metadata?.avatar_url || null,
          github_username: ('github_username' in userRecord && userRecord.github_username) 
            ? userRecord.github_username 
            : user?.user_metadata?.user_name || null
        });
        
        // Only show toast on initial data load, not on re-renders
        if (!dataFetched) {
          showToast("User profile loaded from database", "success");
        }
      } else {
        console.log("SettingsPage: No data found in DB, falling back to auth metadata.");
        
        // Create a new user record if none exists
        if (user && user.id) {
          console.log("SettingsPage: Attempting to create new user record from auth data");
          
          const newUserData = {
            id: user.id,
            auth_id: user.id,
            email: user.email || '',
            display_name: user?.user_metadata?.full_name || user?.user_metadata?.name || 'GitHub User',
            avatar_url: user?.user_metadata?.avatar_url || null,
            last_login: new Date().toISOString(),
            github_username: user?.user_metadata?.user_name || null
          };
          
          try {
            const { error: insertError } = await supabase
              .from('users')
              .upsert([newUserData], { onConflict: 'auth_id' });
              
            if (insertError) {
              console.error("SettingsPage: Failed to create user record:", insertError);
            } else {
              console.log("SettingsPage: Successfully created user record from settings page");
              
              // Set user data directly without fetching again
              setUserData({
                email: newUserData.email,
                display_name: newUserData.display_name,
                avatar_url: newUserData.avatar_url,
                github_username: newUserData.github_username
              });
              
              // Only show toast on initial data load, not on re-renders
              if (!dataFetched) {
                showToast("User profile created", "success");
              }
              
              setDataFetched(true);
              setIsLoading(false);
              return;
            }
          } catch (createError) {
            console.error("SettingsPage: Error creating user record:", createError);
          }
        }
        
        // Fallback to metadata even if record creation failed
        setUserData({
          email: user.email || '',
          display_name: user?.user_metadata?.full_name || user?.user_metadata?.name || 'GitHub User',
          avatar_url: user?.user_metadata?.avatar_url || null,
          github_username: user?.user_metadata?.user_name || null
        });
        
        // Only show toast on initial data load, not on re-renders
        if (!dataFetched) {
          showToast("Using profile data from GitHub login", "info");
        }
      }
    } catch (fetchError) {
      console.error("SettingsPage: Unexpected error during user data fetch:", fetchError);
      
      // Only show toast on initial data load, not on re-renders
      if (!dataFetched) {
        showToast("Failed to load profile", "error");
      }
      
      // Ensure fallback even on unexpected errors
      if (user && user.email) { 
        console.log("SettingsPage: Falling back to auth metadata due to fetch error.");
        setUserData({
          email: user.email || '',
          display_name: user.user_metadata?.full_name || user.user_metadata?.name || 'GitHub User',
          avatar_url: user.user_metadata?.avatar_url || null,
          github_username: user.user_metadata?.user_name || null
        });
      }
    } finally {
      console.log("SettingsPage: Fetch complete, setting isLoading to false.");
      setIsLoading(false);
      setDataFetched(true);
    }
  }, [user, dataFetched]); // Removed showToast from dependencies

  // Effect to trigger data fetching once when auth is ready
  useEffect(() => {
    if (!authLoading && user && !dataFetched) {
      console.log("SettingsPage: Triggering fetchUserData");
      fetchUserData();
    }
  }, [authLoading, user, dataFetched, fetchUserData]);

  // Add an effect to directly use user metadata if we have user data but nothing was fetched yet
  useEffect(() => {
    // If we have a user with metadata but no userData set yet, use the metadata directly
    if (!isLoading && !userData && user && user.user_metadata) {
      console.log("SettingsPage: Using metadata directly as fallback");
      setUserData({
        email: user.email || '',
        display_name: user.user_metadata?.full_name || user.user_metadata?.name || 'GitHub User',
        avatar_url: user.user_metadata?.avatar_url || null,
        github_username: user.user_metadata?.user_name || null
      });
      setDataFetched(true);
    }
  }, [user, userData, isLoading]);

  const handleSaveChanges = () => {
    showToast("Settings saved successfully", "success");
  };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="account" className="mb-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="demo">Demo</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your account information and GitHub integration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <>
              <div className="space-y-2">
                <Label htmlFor="display-name">Display Name</Label>
                    <Skeleton className="h-10 w-full" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                    <Skeleton className="h-10 w-full" />
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium mb-2">GitHub Connection</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Connected Account</Label>
                        <Skeleton className="h-5 w-40 mt-1" />
                      </div>
                      <Skeleton className="h-10 w-24" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Display Name</Label>
                    <Input 
                      id="display-name" 
                      defaultValue={userData?.display_name || ''} 
                      readOnly 
                      disabled 
                      className="bg-muted cursor-not-allowed" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">Display name is synced from your GitHub account</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      defaultValue={userData?.email || ''} 
                      readOnly 
                      disabled 
                      className="bg-muted cursor-not-allowed" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">Email address is synced from your GitHub account</p>
                  </div>
                  
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-lg font-medium mb-2">GitHub Connection</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Connected Account</Label>
                        <div className="flex items-center gap-2 mt-1">
                          {userData?.avatar_url ? (
                            <img 
                              src={userData.avatar_url} 
                              alt="GitHub Avatar" 
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">?</div>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {userData?.github_username ? `@${userData.github_username}` : (userData?.display_name || 'Unknown GitHub user')}
                          </p>
                        </div>
                  </div>
                  <Button variant="outline">Disconnect</Button>
                </div>
              </div>
                </>
              )}
              
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium mb-2">API Access</h3>
                <div className="space-y-2">
                  <Label htmlFor="api-key">Personal Access Token</Label>
                  <div className="flex gap-2">
                    <Input id="api-key" type="password" value="*********************" readOnly />
                    <Button variant="outline">Regenerate</Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your personal access token is used to interact with GitHub API on your behalf
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Manage how and when you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Streak Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications when your streak is about to break
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Get a weekly summary of your GitHub activity
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Achievement Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications when you reach streak milestones
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Configure advanced options and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Timezone</Label>
                  <p className="text-sm text-muted-foreground">
                    Select your preferred timezone for streak calculations
                  </p>
                </div>
                <select className="bg-secondary text-secondary-foreground px-3 py-2 rounded-md text-sm">
                  <option>UTC (Coordinated Universal Time)</option>
                  <option>America/New_York (Eastern Time)</option>
                  <option>America/Los_Angeles (Pacific Time)</option>
                  <option>Europe/London (Greenwich Mean Time)</option>
                  <option>Asia/Tokyo (Japan Standard Time)</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Data Cache</Label>
                  <p className="text-sm text-muted-foreground">
                    Control how long GitHub data is cached locally
                  </p>
                </div>
                <select className="bg-secondary text-secondary-foreground px-3 py-2 rounded-md text-sm">
                  <option>1 hour</option>
                  <option>6 hours</option>
                  <option>12 hours</option>
                  <option>24 hours</option>
                </select>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium mb-2">Danger Zone</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Clear All Data</Label>
                      <p className="text-sm text-muted-foreground">
                        Delete all locally stored data and preferences
                      </p>
                    </div>
                    <Button variant="destructive">Clear Data</Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Delete Account</Label>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all associated data
                      </p>
                    </div>
                    <Button variant="destructive">Delete Account</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="demo">
          <Card>
            <CardHeader>
              <CardTitle>Hooks Demo</CardTitle>
              <CardDescription>Test the useMobile and useToast hooks</CardDescription>
            </CardHeader>
            <CardContent>
              <ToastDemo />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSaveChanges}>Save Changes</Button>
      </div>
    </DashboardLayout>
  );
} 