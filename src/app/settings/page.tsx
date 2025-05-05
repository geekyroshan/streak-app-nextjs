"use client";

import { DashboardLayout } from '@/components/dashboard-layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToastDemo } from '@/components/ui/toast/toast-demo';

export default function SettingsPage() {
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
              <div className="space-y-2">
                <Label htmlFor="display-name">Display Name</Label>
                <Input id="display-name" defaultValue="John Developer" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" defaultValue="john@example.com" />
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h3 className="text-lg font-medium mb-2">GitHub Connection</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Connected Account</Label>
                    <p className="text-sm text-muted-foreground">johndev (John Developer)</p>
                  </div>
                  <Button variant="outline">Disconnect</Button>
                </div>
              </div>
              
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
        <Button>Save Changes</Button>
      </div>
    </DashboardLayout>
  );
} 