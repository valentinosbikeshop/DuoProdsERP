'use client';

import { useEffect, useRef } from 'react';

interface UseDragAutoScrollOptions {
  isDragging: boolean;
  threshold?: number; // Distance in px from edge to trigger auto-scroll
  maxSpeed?: number;  // Max px to scroll per frame
}

/**
 * Hook to automatically and smoothly scroll the page/container when dragging an item
 * near the top or bottom edge of the viewport.
 */
export function useDragAutoScroll({
  isDragging,
  threshold = 130,
  maxSpeed = 22,
}: UseDragAutoScrollOptions) {
  const currentYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isDragging) {
      currentYRef.current = null;
      return;
    }

    let animationFrameId: number;

    const handleWindowDragOver = (e: DragEvent) => {
      currentYRef.current = e.clientY;
    };

    const handleDragEnd = () => {
      currentYRef.current = null;
    };

    const scrollLoop = () => {
      const y = currentYRef.current;
      if (y !== null && y !== undefined) {
        // Find the main scrollable container in DashboardLayout, or fallback to root
        const scrollContainer = document.querySelector('main') || document.documentElement;

        if (y > 0 && y < threshold) {
          // Near top of viewport
          const intensity = (threshold - y) / threshold;
          const speed = Math.max(3, Math.round(intensity * maxSpeed));
          scrollContainer.scrollTop -= speed;
          if (scrollContainer !== document.documentElement) {
            window.scrollBy(0, -speed);
          }
        } else if (y > window.innerHeight - threshold) {
          // Near bottom of viewport
          const intensity = (y - (window.innerHeight - threshold)) / threshold;
          const speed = Math.max(3, Math.round(intensity * maxSpeed));
          scrollContainer.scrollTop += speed;
          if (scrollContainer !== document.documentElement) {
            window.scrollBy(0, speed);
          }
        }
      }

      animationFrameId = requestAnimationFrame(scrollLoop);
    };

    window.addEventListener('dragover', handleWindowDragOver, { passive: true });
    window.addEventListener('dragend', handleDragEnd, { passive: true });
    window.addEventListener('drop', handleDragEnd, { passive: true });
    animationFrameId = requestAnimationFrame(scrollLoop);

    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragend', handleDragEnd);
      window.removeEventListener('drop', handleDragEnd);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isDragging, threshold, maxSpeed]);
}
