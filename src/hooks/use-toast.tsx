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
    duration: number = 5000
  ): void => {
    const id = Date.now().toString();
    const newToast: Toast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, newToast]);

    if (duration !== Infinity) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
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