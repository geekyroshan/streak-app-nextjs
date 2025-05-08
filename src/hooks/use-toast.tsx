"use client";

import { useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export interface ToastHookReturn {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  dismissToast: (id: string) => void;
  dismissAllToasts: () => void;
}

/**
 * Hook for managing toast notifications
 * @returns Object with toast state and methods to show/dismiss toasts
 */
export function useToast(): ToastHookReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (
    message: string, 
    type: ToastType = "info", 
    duration: number | { duration?: number } = 5000
  ): void => {
    const id = Date.now().toString();
    
    // Handle if duration is passed as an object
    const actualDuration = typeof duration === 'object' && duration.duration !== undefined 
      ? duration.duration 
      : typeof duration === 'number' 
        ? duration 
        : 5000;
        
    const newToast: Toast = { id, message, type, duration: actualDuration };
    
    setToasts((prev) => [...prev, newToast]);

    if (actualDuration !== Infinity) {
      setTimeout(() => {
        dismissToast(id);
      }, actualDuration);
    }
  };

  const dismissToast = (id: string): void => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const dismissAllToasts = (): void => {
    setToasts([]);
  };

  return {
    toasts,
    showToast,
    dismissToast,
    dismissAllToasts,
  };
}

export default useToast; 