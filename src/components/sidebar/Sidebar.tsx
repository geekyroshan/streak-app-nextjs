"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Calendar,
  GitBranch,
  Activity,
  Settings,
  BarChart2,
  LogOut,
  GitCommit
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type NavItem = {
  label: string;
  icon: React.ReactNode;
  href: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: <Home className="w-5 h-5" />, href: "/dashboard" },
  {
    label: "Repositories",
    icon: <GitBranch className="w-5 h-5" />,
    href: "/repositories",
  },
  {
    label: "Streak Manager",
    icon: <GitCommit className="w-5 h-5" />,
    href: "/streak-manager",
  },
  {
    label: "Activity",
    icon: <Calendar className="w-5 h-5" />,
    href: "/activity",
  },
  {
    label: "Analytics",
    icon: <BarChart2 className="w-5 h-5" />,
    href: "/analytics",
  },
  {
    label: "Settings",
    icon: <Settings className="w-5 h-5" />,
    href: "/settings",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const { signOut, isLoading } = useAuth();

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Show toast before signOut to ensure it's displayed
      showToast("Signing out...", "info", 2000);
      
      // Add a failsafe redirect in case signOut fails to redirect
      const redirectTimeout = setTimeout(() => {
        console.log("Fallback redirect to landing page");
        window.location.replace('/');
      }, 3000);
      
      // Call the auth context signOut method
      await signOut();
      
      // Clear the failsafe if signOut completes
      clearTimeout(redirectTimeout);
      
      // Let the AuthContext handle the redirect
    } catch (error) {
      console.error("Sign out error:", error);
      showToast("Failed to sign out, redirecting anyway", "error", 3000);
      
      // Force redirect even if there's an error
      window.location.replace('/');
    }
  };
  
  // Prevent sign out button from rendering until auth is ready
  const renderSignOutButton = () => {
    if (isLoading) {
      return <div className="h-12 w-12 mx-auto"></div>;
    }
    
    return (
      <button
        onClick={handleSignOut}
        className="flex flex-col items-center justify-center h-12 w-12 mx-auto rounded hover:bg-secondary group"
        aria-label="Sign Out"
      >
        <LogOut className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
        <span className="sr-only">Sign Out</span>
      </button>
    );
  };

  return (
    <aside className="fixed top-0 left-0 h-full w-16 border-r border-border flex flex-col justify-between py-4 bg-background">
      <div>
        <div className="h-12 w-12 bg-primary rounded-full mx-auto mb-6 flex items-center justify-center text-primary-foreground font-bold">
          GSM
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
            <Link
              key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center h-12 w-12 mx-auto rounded hover:bg-secondary group",
                  isActive && "bg-secondary"
                )}
              >
                <span
              className={cn(
                    "text-muted-foreground transition-colors group-hover:text-foreground",
                    isActive && "text-foreground"
              )}
            >
              {item.icon}
                </span>
                <span className="sr-only">{item.label}</span>
            </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="space-y-4">
        <ThemeToggle className="h-12 w-12 mx-auto" />
        {renderSignOutButton()}
      </div>
    </aside>
  );
}
