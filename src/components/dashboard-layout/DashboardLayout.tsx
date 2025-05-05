"use client";

import { Sidebar } from "@/components/sidebar/Sidebar";

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 pl-16">
        <div className="container mx-auto py-8">
          {children}
        </div>
      </div>
    </div>
  );
} 