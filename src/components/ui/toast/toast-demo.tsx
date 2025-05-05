"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";

export function ToastDemo() {
  const { showToast } = useToast();
  const isMobile = useMobile();

  const handleSuccessToast = () => {
    showToast("This is a success message!", "success");
  };

  const handleErrorToast = () => {
    showToast("This is an error message!", "error");
  };

  const handleWarningToast = () => {
    showToast("This is a warning message!", "warning");
  };

  const handleInfoToast = () => {
    showToast("This is an info message!", "info");
  };

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-bold">Toast Demo</h2>
      <p>Current device: {isMobile ? "Mobile" : "Desktop"}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSuccessToast} className="bg-green-600 hover:bg-green-700">
          Success Toast
        </Button>
        <Button onClick={handleErrorToast} className="bg-red-600 hover:bg-red-700">
          Error Toast
        </Button>
        <Button onClick={handleWarningToast} className="bg-yellow-600 hover:bg-yellow-700">
          Warning Toast
        </Button>
        <Button onClick={handleInfoToast} className="bg-blue-600 hover:bg-blue-700">
          Info Toast
        </Button>
      </div>
    </div>
  );
}

export default ToastDemo; 