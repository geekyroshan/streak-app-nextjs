"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect if the viewport is mobile-sized
 * @param breakpoint - The max width in pixels to consider as mobile (default: 768px)
 * @returns boolean indicating if the viewport is mobile-sized
 */
export function useMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Initial check
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    
    // Check on mount
    checkIfMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkIfMobile);
    
    // Clean up event listener
    return () => window.removeEventListener("resize", checkIfMobile);
  }, [breakpoint]);

  return isMobile;
}

export default useMobile;
