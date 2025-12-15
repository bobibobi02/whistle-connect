import { useState, useRef, ReactNode, useCallback } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeToDeleteProps {
  children: ReactNode;
  onDelete: () => void;
  threshold?: number;
}

// Haptic feedback utility
const triggerHaptic = (pattern: number | number[]) => {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
};

export const SwipeToDelete = ({ 
  children, 
  onDelete, 
  threshold = 100 
}: SwipeToDeleteProps) => {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const hasReachedThreshold = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    hasReachedThreshold.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    
    currentX.current = e.touches[0].clientX;
    const diff = startX.current - currentX.current;
    
    // Only allow swiping left (positive diff)
    if (diff > 0) {
      const newTranslateX = Math.min(diff, threshold + 50);
      setTranslateX(newTranslateX);
      
      // Trigger haptic when crossing threshold
      if (newTranslateX >= threshold && !hasReachedThreshold.current) {
        hasReachedThreshold.current = true;
        triggerHaptic(20); // Light vibration when threshold reached
      } else if (newTranslateX < threshold && hasReachedThreshold.current) {
        hasReachedThreshold.current = false;
        triggerHaptic(10); // Very light vibration when going back
      }
    }
  }, [isDragging, threshold]);

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    if (translateX >= threshold) {
      // Strong haptic feedback on delete
      triggerHaptic([30, 50, 30]);
      
      // Animate off screen then delete
      setTranslateX(window.innerWidth);
      setTimeout(() => {
        onDelete();
      }, 200);
    } else {
      // Snap back
      setTranslateX(0);
    }
  };

  const deleteProgress = Math.min(translateX / threshold, 1);

  return (
    <div className="relative overflow-hidden">
      {/* Delete background */}
      <div 
        className={cn(
          "absolute inset-y-0 right-0 flex items-center justify-end px-6 bg-destructive transition-opacity",
          translateX > 0 ? "opacity-100" : "opacity-0"
        )}
        style={{ width: translateX + 20 }}
      >
        <Trash2 
          className="h-5 w-5 text-destructive-foreground transition-transform"
          style={{ 
            transform: `scale(${0.8 + deleteProgress * 0.4})`,
            opacity: deleteProgress 
          }}
        />
      </div>
      
      {/* Swipeable content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "relative bg-card",
          !isDragging && "transition-transform duration-200"
        )}
        style={{ transform: `translateX(-${translateX}px)` }}
      >
        {children}
      </div>
    </div>
  );
};
