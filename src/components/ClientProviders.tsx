"use client";

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ReactQueryProvider } from '@/components/providers/ReactQueryProvider';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ReactQueryProvider>
        {children}
      </ReactQueryProvider>
    </AuthProvider>
  );
} 