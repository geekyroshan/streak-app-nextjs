"use client";

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  subtitle: string;
  value: string | number;
  change: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function StatsCard({
  title,
  subtitle,
  value,
  change,
  icon,
  className,
}: StatsCardProps) {
  return (
    <Card className={cn("border-border bg-card", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-xs text-muted-foreground mb-1">{subtitle}</p>
            <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
            <p className={cn(
              "text-xs flex items-center mt-1",
              change.isPositive ? "text-green-500" : "text-red-500"
            )}>
              {change.isPositive ? '↑' : '↓'} {Math.abs(change.value)}% vs. {change.label}
            </p>
          </div>
          {icon && <div className="text-primary">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
} 