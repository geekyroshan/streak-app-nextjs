"use client";

import { DashboardLayout } from '@/components/dashboard-layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, GitBranch, MessageSquarePlus } from 'lucide-react';

export default function StreakManagerPage() {
  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-2">Streak Manager</h1>
      <p className="text-muted-foreground mb-6">Backdate commits to maintain your contribution streak</p>
      
      {/* Repository selection */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Select Repository</h2>
        <Card>
          <CardHeader>
            <CardTitle>Choose a repository</CardTitle>
            <CardDescription>Select a repository to make backdated commits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto py-6 flex flex-col items-center justify-center gap-2 text-left">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-2">
                  <GitBranch className="w-6 h-6" />
                </div>
                <div className="font-medium">github-streak-manager</div>
                <div className="text-xs text-muted-foreground">Last commit 2 days ago</div>
              </Button>
              
              <Button variant="outline" className="h-auto py-6 flex flex-col items-center justify-center gap-2 text-left">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-2">
                  <GitBranch className="w-6 h-6" />
                </div>
                <div className="font-medium">developer-portfolio</div>
                <div className="text-xs text-muted-foreground">Last commit 3 weeks ago</div>
              </Button>
              
              <Button variant="outline" className="h-auto py-6 flex flex-col items-center justify-center gap-2 text-left">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-2">
                  <GitBranch className="w-6 h-6" />
                </div>
                <div className="font-medium">markdown-blog-starter</div>
                <div className="text-xs text-muted-foreground">Last commit 3 days ago</div>
              </Button>
            </div>
            
            <div className="mt-4">
              <Button className="w-full sm:w-auto">Use Selected Repository</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Backdating options */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Backdating Options</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Date Selection</CardTitle>
              <CardDescription>Choose date and time for the backdated commit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div className="text-sm font-medium">Select Date</div>
                </div>
                <div className="bg-muted p-4 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">Calendar placeholder</p>
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div className="text-sm font-medium">Select Time</div>
                </div>
                <div className="flex gap-2">
                  <select className="flex-1 bg-secondary text-secondary-foreground px-3 py-2 rounded-md text-sm">
                    <option>Hour</option>
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={i}>{i.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                  
                  <select className="flex-1 bg-secondary text-secondary-foreground px-3 py-2 rounded-md text-sm">
                    <option>Minute</option>
                    {Array.from({ length: 60 }).map((_, i) => (
                      <option key={i}>{i.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Commit Details</CardTitle>
              <CardDescription>Enter commit message and select file(s) to modify</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-center gap-2">
                  <MessageSquarePlus className="h-5 w-5 text-muted-foreground" />
                  <div className="text-sm font-medium">Commit Message</div>
                </div>
                <textarea 
                  className="w-full min-h-[100px] p-3 bg-secondary text-secondary-foreground rounded-md text-sm" 
                  placeholder="Enter commit message..."
                />
                
                <div className="flex items-center gap-2 mt-2">
                  <GitBranch className="h-5 w-5 text-muted-foreground" />
                  <div className="text-sm font-medium">Select File</div>
                </div>
                <div className="bg-muted p-4 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">File browser placeholder</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline">Cancel</Button>
          <Button>Create Backdated Commit</Button>
        </div>
      </div>
    </DashboardLayout>
  );
} 