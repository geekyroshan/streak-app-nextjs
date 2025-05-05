"use client";

import { Toast } from "./toast";
import { useToast, Toast as ToastType } from "@/hooks/use-toast";

interface ToastContainerProps {
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

const positionStyles = {
  "top-right": "top-0 right-0",
  "top-left": "top-0 left-0",
  "bottom-right": "bottom-0 right-0",
  "bottom-left": "bottom-0 left-0",
};

export function ToastContainer({ position = "top-right" }: ToastContainerProps) {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div 
      className={`fixed z-50 m-4 flex flex-col ${positionStyles[position]}`}
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast: ToastType) => (
        <Toast 
          key={toast.id} 
          toast={toast} 
          onDismiss={dismissToast} 
        />
      ))}
    </div>
  );
}

export default ToastContainer; 